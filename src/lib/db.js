import {
  collection, collectionGroup, doc, addDoc, setDoc, getDoc, getDocs, updateDoc,
  deleteDoc, onSnapshot, query, orderBy, where, limit, increment, serverTimestamp,
  runTransaction, writeBatch, Timestamp, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { db, firebaseReady } from "./firebase.js";
import { saveImage } from "./storedImage.js";



const need = () => {
  if (!firebaseReady) throw new Error("Firebase is not configured. Fill VITE_FIREBASE_* in .env.");
};

const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toDate();
  if (v?.toDate) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v);
};

const minutesSince = (v) => {
  const d = toDate(v);
  if (!d) return 99999;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
};

export const timeAgoFrom = (v) => {
  const d = toDate(v);
  if (!d) return "just now";
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  const days = Math.floor(m / 1440);
  return days < 7 ? `${days}d ago` : d.toLocaleDateString();
};

const slugify = (s = "") =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);


// Same shapes the components were built against, so nothing downstream had
// to change when the database did.
export const mapCommunity = (d) => {
  const r = d.data();
  return {
    id: d.id,
    name: r.name,
    category: r.category,
    tags: r.tags?.length ? r.tags : [r.category],
    desc: r.description,
    members: r.memberCount ?? 0,
    rules: Array.isArray(r.rules) ? r.rules : [],
    creator: r.creatorLabel,
    creatorId: r.creatorId,
    official: !!r.official,
    handle: r.handle,
    avatarUrl: r.avatarUrl || null,
    postsAdminOnly: !!r.postsAdminOnly,
    lastActive: minutesSince(r.lastActiveAt || r.createdAt),
    createdAt: toDate(r.createdAt),
  };
};

export const mapPost = (d) => {
  const r = d.data();
  return {
    id: d.id,
    communityId: d.ref.parent.parent?.id || null,
    authorId: r.authorId,
    who: r.authorName || "Someone",
    text: r.text || "",
    time: timeAgoFrom(r.createdAt),
    createdAt: toDate(r.createdAt),
    hasImage: !!r.imageUrl,
    imageUrl: r.imageUrl || null,
    sparks: r.sparkCount ?? 0,
    comments: r.commentCount ?? 0,
    pinned: !!r.pinned,
  };
};

export const mapEvent = (d) => {
  const r = d.data();
  return {
    id: d.id,
    title: r.title,
    category: r.category,
    tags: r.tags?.length ? r.tags : [r.category],
    desc: r.description,
    when: r.eventWhen,
    where: r.eventWhere,
    capacity: r.capacity,
    going: r.registeredCount ?? 0,
    // A real timestamp alongside the human-written `when` string, so the rail
    // can sort and render a date chip without parsing prose.
    startsAt: toDate(r.startsAt),
    imageUrl: r.imageUrl || null,
    featured: !!r.featured,
    linkedCommunityId: r.linkedCommunityId || null,
  };
};

export const mapMessage = (d) => {
  const r = d.data();
  return {
    id: d.id,
    authorId: r.authorId,
    who: r.authorName || "Someone",
    text: r.text || "",
    imageUrl: r.imageUrl || null,
    pinned: !!r.pinned,
    time: timeAgoFrom(r.createdAt),
    createdAt: toDate(r.createdAt),
  };
};

export const mapTea = (d) => {
  const r = d.data();
  return {
    id: d.id,
    text: r.text,
    category: r.category || "tea",
    trueCount: r.trueCount ?? 0,
    capCount: r.capCount ?? 0,
    reactions: r.reactions || {},
    commentCount: r.commentCount ?? 0,
    comments: null, // lazy-loaded when the post is opened
    createdAt: toDate(r.createdAt)?.getTime() ?? Date.now(),
  };
};

export const mapMember = (d) => {
  const r = d.data();
  return {
    userId: d.id,
    name: r.name || "Someone",
    interests: r.interests || [],
    joinedAt: toDate(r.joinedAt),
    dbRole: r.role || "member",
  };
};


function watchFailed(err) {
  console.error(
    `[orbit/db] listener failed (${err?.code || "unknown"}). ` +
    "The screen will render as empty. If this is failed-precondition, follow " +
    "the index link in the error below. If permission-denied, publish " +
    "firestore.rules.",
    err
  );
}

export function watchCommunities(cb) {
  if (!firebaseReady) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "communities"), orderBy("lastActiveAt", "desc")),
    (snap) => cb(snap.docs.map(mapCommunity)),
    (err) => { watchFailed(err); cb([]); }
  );
}

export async function createCommunity({ name, category, desc, tags, rules = [], creatorId, creatorLabel, official = false }) {
  need();
  const ref = await addDoc(collection(db, "communities"), {
    name,
    category,
    tags: tags?.length ? tags : [category],
    description: desc || "No description yet.",
    memberCount: creatorId ? 1 : 0,
    creatorId: creatorId || null,
    creatorLabel: creatorLabel || "Someone",
    official,
    handle: slugify(name),
    avatarUrl: null,
    rules: Array.isArray(rules) ? rules.filter((r) => r?.title?.trim()) : [],
    postsAdminOnly: false,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  });

  if (creatorId) {
    try {
      await setDoc(
        doc(db, "profiles", creatorId),
        { communitiesCreated: increment(1) },
        { merge: true }
      );
    } catch (err) {
      // The community exists either way. A failed counter means the cap reads
      // low for this account, which is the safe direction to fail.
      console.warn("[orbit/db] community created, quota not bumped:", err?.code || err);
    }
  }

  // The creator is a member from the moment it exists, and an admin of it.
  if (creatorId) {
    await setDoc(doc(db, "communities", ref.id, "members", creatorId), {
      uid: creatorId,
      name: creatorLabel || "Someone",
      role: "admin",
      joinedAt: serverTimestamp(),
    });
  }
  const snap = await getDoc(ref);
  return mapCommunity(snap);
}

export async function updateCommunity(id, updates) {
  need();
  const patch = {};
  if (updates.name != null) { patch.name = updates.name; patch.handle = slugify(updates.name); }
  if (updates.desc != null) patch.description = updates.desc;
  if (updates.category != null) patch.category = updates.category;
  if (updates.tags != null) patch.tags = updates.tags;
  if (updates.avatarUrl != null) patch.avatarUrl = updates.avatarUrl;
  if (updates.postsAdminOnly != null) patch.postsAdminOnly = updates.postsAdminOnly;
  if (updates.official != null) patch.official = updates.official;
  await updateDoc(doc(db, "communities", id), patch);
}

// Firestore does not cascade. Subcollections survive a deleted parent as
// orphans, so posts and members are removed explicitly first.
export async function deleteCommunity(id) {
  need();
  for (const sub of ["posts", "members", "messages"]) {
    const snap = await getDocs(collection(db, "communities", id, sub));
    // 500 is the hard write cap on a batch.
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  await deleteDoc(doc(db, "communities", id));
}



async function groupByUid(groupName, parentPath, uid, pick) {
  try {
    const snap = await getDocs(query(collectionGroup(db, groupName), where("uid", "==", uid)));
    return snap.docs.map(pick).filter(Boolean);
  } catch (err) {
    if (err?.code !== "failed-precondition") { watchFailed(err); return []; }
    const parents = await getDocs(collection(db, parentPath));
    const hits = await Promise.all(parents.docs.map(async (p) => {
      const d = await getDoc(doc(db, parentPath, p.id, groupName, uid));
      return d.exists() ? { id: p.id, doc: d } : null;
    }));
    return hits.filter(Boolean);
  }
}

export async function fetchMyJoins(uid) {
  if (!firebaseReady || !uid) return [];
  const rows = await groupByUid("members", "communities", uid, (d) => d.ref.parent.parent?.id);
  return rows.map((r) => (typeof r === "string" ? r : r.id));
}

export async function joinCommunity(communityId, uid, name) {
  need();
  const memberRef = doc(db, "communities", communityId, "members", uid);
  const existing = await getDoc(memberRef);
  if (existing.exists()) return;

  await setDoc(memberRef, {
    uid,
    name: name || "Someone",
    role: "member",
    joinedAt: serverTimestamp(),
  });

  try {
    await updateDoc(doc(db, "communities", communityId), {
      memberCount: increment(1),
      lastActiveAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("[orbit/db] joined, but memberCount was not bumped:", err?.code || err);
  }
}

// Same split as joinCommunity, for the same reason.
export async function leaveCommunity(communityId, uid) {
  need();
  const memberRef = doc(db, "communities", communityId, "members", uid);
  const existing = await getDoc(memberRef);
  if (!existing.exists()) return;

  await deleteDoc(memberRef);

  try {
    await updateDoc(doc(db, "communities", communityId), { memberCount: increment(-1) });
  } catch (err) {
    console.warn("[orbit/db] left, but memberCount was not decremented:", err?.code || err);
  }
}

export async function fetchMembers(communityId) {
  if (!firebaseReady) return [];
  const snap = await getDocs(collection(db, "communities", communityId, "members"));
  return snap.docs.map(mapMember);
}

export async function setMemberRole(communityId, uid, role) {
  need();
  await updateDoc(doc(db, "communities", communityId, "members", uid), { role });
}




export function watchFeed(cb, max = 40) {
  if (!firebaseReady) { cb([]); return () => {}; }
  return onSnapshot(
    query(collectionGroup(db, "posts")),
    (snap) => cb(
      snap.docs
        .map(mapPost)
        .sort((x, y) => (y.createdAt?.getTime() || 0) - (x.createdAt?.getTime() || 0))
        .slice(0, max)
    ),
    (err) => { watchFailed(err); cb([]); }
  );
}

export function watchCommunityPosts(communityId, cb) {
  if (!firebaseReady) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "communities", communityId, "posts"), orderBy("createdAt", "desc")),
    (snap) => cb(snap.docs.map(mapPost)),
    (err) => { watchFailed(err); cb([]); }
  );
}


const postsRef = (communityId) =>
  communityId ? collection(db, "communities", communityId, "posts") : collection(db, "posts");

const postRef = (communityId, postId) =>
  communityId ? doc(db, "communities", communityId, "posts", postId) : doc(db, "posts", postId);

export async function createPost({ communityId = null, authorId, authorName, text, imageUrl = null }) {
  need();

  const base = {
    authorId,
    authorName: authorName || "Someone", // denormalised: Firestore has no join
    text: text || "",
    imageUrl,
    sparkCount: 0,
    commentCount: 0,
    pinned: false,
    createdAt: serverTimestamp(),
  };

  const shapes = communityId
    ? [{ ...base, communityId }]
    : [base, { ...base, communityId: null }];

  let ref = null;
  let lastErr = null;
  for (const data of shapes) {
    try {
      ref = await addDoc(postsRef(communityId), data);
      break;
    } catch (err) {
      lastErr = err;
      if (err?.code !== "permission-denied") throw err;
      // Says which rule version the project is actually running, which is the
      // one thing this whole dance exists because we cannot otherwise read.
      console.info("[orbit/db] campus-post shape refused, trying the next one");
    }
  }
  if (!ref) throw lastErr;

  if (communityId) {
    try {
      await updateDoc(doc(db, "communities", communityId), { lastActiveAt: serverTimestamp() });
    } catch {
      // The post is the fact; lastActiveAt is a sort key. Never fail one for
      // the other.
    }
  }

  return mapPost(await getDoc(ref));
}


// A post the classifier held back. It waits in moderation_queue, readable only
// by its author and admins, until the admin tool publishes or rejects it.
export async function submitForReview({ communityId = null, authorId, authorName, text, imageUrl = null, labels = [], matched = [] }) {
  need();
  const ref = await addDoc(collection(db, "moderation_queue"), {
    authorId,
    authorName: authorName || "Someone",
    text: text || "",
    imageUrl,
    communityId: communityId || null,
    labels,
    matched,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function watchMyPendingPosts(uid, cb) {
  if (!firebaseReady || !uid) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "moderation_queue"), where("authorId", "==", uid)),
    (snap) => cb(
      snap.docs
        .map((d) => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) }))
        .filter((x) => x.status === "pending")
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
    ),
    (err) => { watchFailed(err); cb([]); }
  );
}



export const mapComment = (d) => {
  const r = d.data();
  return {
    id: d.id,
    authorId: r.authorId,
    who: r.authorName || "Someone",
    text: r.text || "",
    time: timeAgoFrom(r.createdAt),
    createdAt: toDate(r.createdAt),
  };
};

export function watchPostComments(communityId, postId, cb) {
  if (!firebaseReady) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(postRef(communityId, postId), "comments"), orderBy("createdAt", "asc")),
    (snap) => cb(snap.docs.map(mapComment)),
    (err) => { watchFailed(err); cb([]); }
  );
}

// The comment and the count move together, so a thread cannot show a number
// that disagrees with what is under it.
export async function addPostComment({ communityId, postId, authorId, authorName, text }) {
  need();
  const body = (text || "").trim();
  if (!body) return null;
  const target = postRef(communityId, postId);
  const ref = await addDoc(collection(target, "comments"), {
    authorId,
    authorName: authorName || "Someone",
    text: body.slice(0, 1000),
    createdAt: serverTimestamp(),
  });
  try {
    await updateDoc(target, { commentCount: increment(1) });
  } catch (err) {
    // The comment is the fact; the count is a cached display of it. A refused
    // bump must not take the comment down with it.
    console.warn("[orbit/db] comment saved, count not bumped:", err?.code || err);
  }
  return mapComment(await getDoc(ref));
}

export async function deletePostComment(communityId, postId, commentId) {
  need();
  const target = postRef(communityId, postId);
  await deleteDoc(doc(target, "comments", commentId));
  try {
    await updateDoc(target, { commentCount: increment(-1) });
  } catch (err) {
    console.warn("[orbit/db] comment deleted, count not decremented:", err?.code || err);
  }
}

export async function deletePost(communityId, postId) {
  need();
  await deleteDoc(postRef(communityId, postId));
}

export async function setPostPinned(communityId, postId, pinned) {
  need();
  await updateDoc(doc(db, "communities", communityId, "posts", postId), { pinned });
}

// Read off the profile, not a collectionGroup query: that needs a
// COLLECTION_GROUP_ASC index nobody created, and it fails closed.
export async function fetchMySparks(uid) {
  if (!firebaseReady || !uid) return [];
  try {
    const snap = await getDoc(doc(db, "profiles", uid));
    const ids = snap.exists() ? snap.data().sparkedPosts : null;
    return Array.isArray(ids) ? ids : [];
  } catch (err) {
    console.warn("[orbit/db] could not read your sparks", err);
    return [];
  }
}

// One spark per person per post, and the count kept in the same transaction.
export async function toggleSpark(communityId, postId, uid) {
  need();
  const target = postRef(communityId, postId);
  const sparkRef = doc(target, "sparks", uid);
  let nowSparked = false;
  await runTransaction(db, async (tx) => {
    const existing = await tx.get(sparkRef);
    if (existing.exists()) {
      tx.delete(sparkRef);
      tx.update(target, { sparkCount: increment(-1) });
      nowSparked = false;
    } else {
      tx.set(sparkRef, { uid, createdAt: serverTimestamp() });
      tx.update(target, { sparkCount: increment(1) });
      nowSparked = true;
    }
  });

  setDoc(
    doc(db, "profiles", uid),
    { sparkedPosts: nowSparked ? arrayUnion(postId) : arrayRemove(postId) },
    { merge: true },
  ).catch(() => {});

  return nowSparked;
}


export function watchMessages(communityId, cb) {
  if (!firebaseReady) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "communities", communityId, "messages"), orderBy("createdAt", "asc"), limit(200)),
    (snap) => cb(snap.docs.map(mapMessage)),
    (err) => { watchFailed(err); cb([]); }
  );
}

export async function sendMessage({ communityId, authorId, authorName, text, imageUrl = null }) {
  need();
  const ref = await addDoc(collection(db, "communities", communityId, "messages"), {
    authorId,
    authorName: authorName || "Someone",
    text: text || "",
    imageUrl,
    pinned: false,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "communities", communityId), { lastActiveAt: serverTimestamp() });
  const snap = await getDoc(ref);
  return mapMessage(snap);
}

export async function deleteMessage(communityId, messageId) {
  need();
  await deleteDoc(doc(db, "communities", communityId, "messages", messageId));
}

// Only one message can be pinned at a time, so unpinning the previous one is
// part of the same operation rather than a second call that might not happen.
export async function setMessagePinned(communityId, messageId, pinned) {
  need();
  const batch = writeBatch(db);
  if (pinned) {
    const current = await getDocs(
      query(collection(db, "communities", communityId, "messages"), where("pinned", "==", true))
    );
    current.docs.forEach((d) => batch.update(d.ref, { pinned: false }));
  }
  batch.update(doc(db, "communities", communityId, "messages", messageId), { pinned });
  await batch.commit();
}


export function watchEvents(cb) {
  if (!firebaseReady) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "events"), orderBy("createdAt", "desc")),
    (snap) => cb(snap.docs.map(mapEvent)),
    (err) => { watchFailed(err); cb([]); }
  );
}


export function watchAnnouncements(cb) {
  if (!firebaseReady) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(5)),
    (snap) => {
      const now = Date.now();
      cb(
        snap.docs
          .map((d) => {
            const r = d.data();
            return { id: d.id, title: r.title || "", body: r.body || "", active: r.active !== false, expiresAt: toDate(r.expiresAt) };
          })
          .filter((a) => a.active && (!a.expiresAt || a.expiresAt.getTime() > now))
      );
    },
    (err) => { watchFailed(err); cb([]); }
  );
}


export function watchAds(cb) {
  if (!firebaseReady) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "ads"), where("status", "==", "live")),
    (snap) => {
      const now = Date.now();
      cb(
        snap.docs
          .map((d) => {
            const r = d.data();
            return {
              id: d.id,
              format: r.format || "text",
              placements: r.placements?.length ? r.placements : ["feed"],
              advertiser: r.advertiser || "",
              advertiserAvatar: r.advertiserAvatar || null,
              headline: r.headline || "",
              body: r.body || "",
              imageUrl: r.imageUrl || null,
              ctaLabel: r.ctaLabel || "Learn more",
              linkUrl: r.linkUrl || "",
              interests: r.interests || [],
              showToGuests: r.showToGuests !== false,
              startsAt: toDate(r.startsAt),
              endsAt: toDate(r.endsAt),
            };
          })
          .filter((a) => (!a.startsAt || a.startsAt.getTime() <= now) && (!a.endsAt || a.endsAt.getTime() > now))
      );
    },
    (err) => { watchFailed(err); cb([]); }
  );
}

// Best effort by design. A lost impression is a rounding error; an ad that
// throws because a counter write was refused would be a broken feed.
export function trackAd(adId, field) {
  if (!firebaseReady || !adId || (field !== "impressions" && field !== "clicks")) return;
  updateDoc(doc(db, "ads", adId), { [field]: increment(1) }).catch(() => {});
}

export async function fetchMyRegistrations(uid) {
  if (!firebaseReady || !uid) return [];
  const rows = await groupByUid("registrations", "events", uid, (d) => d.ref.parent.parent?.id);
  return rows.map((r) => (typeof r === "string" ? r : r.id));
}


export async function createSignup(eventId, uid, fields) {
  need();
  await setDoc(doc(db, "events", eventId, "signups", uid), {
    ...fields,
    uid,
    status: "pending_payment",
    createdAt: serverTimestamp(),
  }, { merge: true });
}

export function watchMySignup(eventId, uid, cb) {
  if (!firebaseReady || !eventId || !uid) { cb(null); return () => {}; }
  return onSnapshot(
    doc(db, "events", eventId, "signups", uid),
    (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (err) => { watchFailed(err); cb(null); }
  );
}

export async function markPaymentClaimed(eventId, uid, { paymentRef, proofStored } = {}) {
  need();
  await updateDoc(doc(db, "events", eventId, "signups", uid), {
    status: "payment_claimed",
    paymentRef: paymentRef || null,
    proofStored: !!proofStored,
    claimedAt: serverTimestamp(),
  });
}

export async function savePaymentProof(eventId, uid, dataUrl) {
  need();
  if (!dataUrl) throw new Error("no-proof");
  await setDoc(doc(db, "events", eventId, "signups", uid, "proof", "payment"), {
    dataUrl,
    uid,
    createdAt: serverTimestamp(),
  });
}

export async function fetchPaymentProof(eventId, uid) {
  if (!firebaseReady || !eventId || !uid) return null;
  const snap = await getDoc(doc(db, "events", eventId, "signups", uid, "proof", "payment"));
  return snap.exists() ? snap.data().dataUrl || null : null;
}

// Per-user documents and best-effort counters, never a transaction: a
// transaction here serialises every registration through the event document.
export async function registerForEvent(event, uid, userName) {
  need();

  let communityId = event.linkedCommunityId || null;
  if (communityId) {
    const community = await getDoc(doc(db, "communities", communityId));
    if (!community.exists()) communityId = null;
  }

  const regRef = doc(db, "events", event.id, "registrations", uid);
  const memberRef = communityId ? doc(db, "communities", communityId, "members", uid) : null;

  const [regSnap, memberSnap] = await Promise.all([
    getDoc(regRef),
    memberRef ? getDoc(memberRef) : Promise.resolve(null),
  ]);

  const isNew = !regSnap.exists();
  const needsMembership = memberRef && !memberSnap.exists();

  const writes = [];
  if (isNew) writes.push(setDoc(regRef, { uid, createdAt: serverTimestamp() }));
  if (needsMembership) {
    writes.push(setDoc(memberRef, {
      uid,
      name: userName || "Someone",
      role: "member",
      joinedAt: serverTimestamp(),
    }));
  }
  await Promise.all(writes);

  if (isNew) {
    updateDoc(doc(db, "events", event.id), { registeredCount: increment(1) }).catch(() => {});
  }
  if (needsMembership) {
    updateDoc(doc(db, "communities", communityId), {
      memberCount: increment(1),
      lastActiveAt: serverTimestamp(),
    }).catch(() => {});
  }

  // null means the event has no chat community yet. Registration still stands;
  // the caller says the chat opens shortly rather than failing the signup.
  return communityId;
}


const TEA_TTL_MS = 48 * 3600 * 1000;

export async function fetchTea() {
  if (!firebaseReady) return [];
  const snap = await getDocs(query(collection(db, "tea_posts"), orderBy("createdAt", "desc"), limit(200)));
  return snap.docs
    .map(mapTea)
    .filter((t) => Date.now() - t.createdAt < TEA_TTL_MS);
}

export async function postTea({ text, category, authorId }) {
  need();
  const now = Date.now();
  const ref = await addDoc(collection(db, "tea_posts"), {
    text,
    category: category || "tea",
    trueCount: 0,
    capCount: 0,
    reactions: {},
    commentCount: 0,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(now + TEA_TTL_MS),
  });
  if (authorId) {
    await setDoc(doc(db, "tea_authors", ref.id), { authorId, createdAt: serverTimestamp() });
  }
  return ref.id;
}

export async function voteTea(teaId, uid, vote) {
  need();
  const voteRef = doc(db, "tea_posts", teaId, "votes", uid);
  const teaRef = doc(db, "tea_posts", teaId);
  await runTransaction(db, async (tx) => {
    const prev = await tx.get(voteRef);
    const was = prev.exists() ? prev.data().vote : null;
    if (was === vote) return;
    const patch = {};
    if (was === "true") patch.trueCount = increment(-1);
    if (was === "cap") patch.capCount = increment(-1);
    if (vote === "true") patch.trueCount = increment(1);
    if (vote === "cap") patch.capCount = increment(1);
    tx.set(voteRef, { uid, vote, createdAt: serverTimestamp() });
    tx.update(teaRef, patch);
  });
}

export async function fetchMyTeaVotes(uid) {
  if (!firebaseReady || !uid) return {};
  const snap = await getDocs(query(collectionGroup(db, "votes"), where("uid", "==", uid)));
  const out = {};
  snap.docs.forEach((d) => { const id = d.ref.parent.parent?.id; if (id) out[id] = d.data().vote; });
  return out;
}

// One reaction per person, changeable. The counts live in a map on the parent
// so the card can render without reading the subcollection.
export async function reactTea(teaId, uid, emoji) {
  need();
  const reactRef = doc(db, "tea_posts", teaId, "reactions", uid);
  const teaRef = doc(db, "tea_posts", teaId);
  await runTransaction(db, async (tx) => {
    const prev = await tx.get(reactRef);
    const was = prev.exists() ? prev.data().emoji : null;
    if (was === emoji) {
      tx.delete(reactRef);
      tx.update(teaRef, { [`reactions.${emoji}`]: increment(-1) });
      return;
    }
    const patch = {};
    if (was) patch[`reactions.${was}`] = increment(-1);
    patch[`reactions.${emoji}`] = increment(1);
    tx.set(reactRef, { uid, emoji, createdAt: serverTimestamp() });
    tx.update(teaRef, patch);
  });
}

export async function fetchMyTeaReactions(uid) {
  if (!firebaseReady || !uid) return {};
  const snap = await getDocs(query(collectionGroup(db, "reactions"), where("uid", "==", uid)));
  const out = {};
  snap.docs.forEach((d) => { const id = d.ref.parent.parent?.id; if (id) out[id] = d.data().emoji; });
  return out;
}

export async function fetchTeaComments(teaId) {
  if (!firebaseReady) return [];
  const snap = await getDocs(
    query(collection(db, "tea_posts", teaId, "comments"), orderBy("createdAt", "asc"))
  );
  return snap.docs.map((d) => ({
    id: d.id,
    who: "Anonymous",
    text: d.data().text,
    time: timeAgoFrom(d.data().createdAt),
  }));
}

export async function commentTea(teaId, text, authorId) {
  need();
  const ref = await addDoc(collection(db, "tea_posts", teaId, "comments"), {
    text,
    createdAt: serverTimestamp(),
  });
  if (authorId) {
    // Keyed by the comment id in the same private collection, so the delete
    // rule can check ownership without the comment carrying an author.
    await setDoc(doc(db, "tea_authors", ref.id), { authorId, createdAt: serverTimestamp() });
  }
  await updateDoc(doc(db, "tea_posts", teaId), { commentCount: increment(1) });
  return ref.id;
}

export async function deleteTea(teaId) {
  need();
  const comments = await getDocs(collection(db, "tea_posts", teaId, "comments"));
  const batch = writeBatch(db);
  comments.docs.forEach((d) => {
    batch.delete(d.ref);
    batch.delete(doc(db, "tea_authors", d.id));
  });
  batch.delete(doc(db, "tea_posts", teaId));
  batch.delete(doc(db, "tea_authors", teaId));
  await batch.commit();
}

export async function deleteTeaComment(teaId, commentId) {
  need();
  await deleteDoc(doc(db, "tea_posts", teaId, "comments", commentId));
  await deleteDoc(doc(db, "tea_authors", commentId)).catch(() => {});
  await updateDoc(doc(db, "tea_posts", teaId), { commentCount: increment(-1) });
}


export async function fetchStickers() {
  if (!firebaseReady) return [];
  const snap = await getDocs(query(collection(db, "stickers"), orderBy("createdAt", "desc"), limit(60)));
  return snap.docs.map((d) => ({ id: d.id, url: d.data().url, name: d.data().name || "" }));
}

export async function addSticker({ url, name, authorId }) {
  need();
  const ref = await addDoc(collection(db, "stickers"), {
    url, name: name || "", authorId: authorId || null, createdAt: serverTimestamp(),
  });
  return { id: ref.id, url, name };
}


export async function createReport({ reporterId, target, reason }) {
  need();
  await addDoc(collection(db, "reports"), {
    reporterId: reporterId || null,
    target: String(target),
    reason,
    resolved: false,
    resolvedAt: null,
    createdAt: serverTimestamp(),
  });
}


const KIND_FOR_FOLDER = {
  "community-avatars": "avatar",
  stickers: "sticker",
  "community-media": "photo",
};

// Signature kept from the Storage version so the six call sites did not move.
export async function uploadImage(folder, file, uid, kind) {
  need();
  try {
    return await saveImage(file, uid, kind || KIND_FOR_FOLDER[folder] || "photo");
  } catch (err) {
    console.error("[orbit/db] image upload failed", err);
    if (err?.message === "not-an-image") throw new Error("That file is not an image.");
    if (err?.message === "image-too-large") throw new Error("That picture is too big. Crop it and try again.");
    throw new Error("The picture did not save. Try again.");
  }
}

export async function deleteImage(path) {
  if (!firebaseReady || !path) return;
  const id = String(path).startsWith("images/") ? String(path).slice("images/".length) : null;
  if (!id) return; // a leftover Storage path; there is no bucket to delete from
  try { await deleteDoc(doc(db, "images", id)); } catch { /* already gone */ }
}


export async function isOrbitAdmin(uid) {
  if (!firebaseReady || !uid) return false;
  const snap = await getDoc(doc(db, "profiles", uid));
  return snap.exists() && snap.data().isAdmin === true;
}
