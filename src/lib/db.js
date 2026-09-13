import {
  collection, collectionGroup, doc, addDoc, setDoc, getDoc, getDocs, updateDoc,
  deleteDoc, onSnapshot, query, orderBy, where, limit, increment, serverTimestamp,
  runTransaction, writeBatch, Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage, firebaseReady } from "./firebase.js";

// Firestore data layer. Replaces lib/supabaseClient.js and every direct
// Supabase call that used to live in App.jsx and Community.jsx.
//
// Everything Firestore-specific is contained here: collection paths, the
// relational→document remodelling, counter maintenance, and the transactions
// that keep counts honest. The screens keep receiving the exact shapes they
// were written against ({ members, creator, lastActive, desc, ... }), so the
// migration did not require touching their rendering at all.
//
// THREE THINGS POSTGRES DID FOR US THAT FIRESTORE DOES NOT
//
//   Joins. `profiles!author_id(name)` has no equivalent, so an author's name
//   is denormalised onto the post at write time. A renamed user leaves stale
//   names on old posts; that is the accepted cost, and it is cheaper on every
//   read than a lookup per row would be.
//
//   Counters. member_count and spark_count were maintained by triggers. They
//   are now increment() calls issued inside the same batch or transaction as
//   the row they count, so the two cannot drift apart.
//
//   Atomicity across tables. register_for_event() was a plpgsql function that
//   created-or-reused a community and joined the caller in one statement.
//   It is a runTransaction here, with the same guarantee.

/* ------------------------------------------------------------ helpers */

const need = () => {
  if (!firebaseReady) throw new Error("Firebase is not configured. Fill VITE_FIREBASE_* in .env.");
};

// Firestore hands back a Timestamp, a pending null (serverTimestamp has not
// resolved yet), or nothing at all on legacy rows. All three have to become a
// Date without the caller thinking about it.
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

/* ----------------------------------------------------------- mappers */

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
    // A collectionGroup query loses the parent path unless it is read back
    // off the ref, which is how a feed post knows which community it is in.
    // Taken from the document path, never from the stored field.
    //
    // The path cannot lie about where a document lives; a field duplicating it
    // can. Reading the field first meant a root post could set communityId to
    // any community and be rendered as though it belonged there, which is why
    // the create rule had to police the field -- and policing it coupled the
    // rules to the exact shape of one client write, so publishing new rules
    // against an older deployed bundle refused every post.
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

/* ------------------------------------------------------- communities */

// A failed listener used to be indistinguishable from an empty collection:
// every watcher swallowed the error and reported []. The two failures that
// actually happen in this app both look exactly like "nothing here yet" --
// a collectionGroup query with no index, and rules that have not been
// published -- so the console message, which carries Firestore's
// click-to-create index link, is the only way to tell them apart.
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
    // House rules, set at creation and editable by the creator. Stored on the
    // community rather than a subcollection: there are three of them, they are
    // read on every page view, and a subcollection would cost a second query
    // to display a paragraph of text.
    rules: Array.isArray(rules) ? rules.filter((r) => r?.title?.trim()) : [],
    postsAdminOnly: false,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  });

  // The quota the rules read. It has to be maintained here because rules
  // cannot count a collection: they can only look at one document, so the
  // number has to already be on the profile by the time the next create is
  // checked. setDoc with merge so a profile that has never had the field, or
  // does not exist yet, both work.
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
      // uid is duplicated into the document even though it is also the doc id,
      // because fetchMyJoins uses a collectionGroup query and those can only
      // filter on fields, never on the document id.
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

/* ---------------------------------------------------------- members */


// The three "what has this person done" lookups below are collectionGroup
// queries filtered on uid, and each needs its own index. Without it Firestore
// throws failed-precondition, which surfaced as an unhandled promise rejection
// and left the app believing you had joined nothing.
//
// So: try the indexed query, and if the index is missing, walk the parents
// instead. That is N+1 reads rather than one, which is the wrong shape at
// scale and completely fine for one campus -- and it means a fresh project
// works before anyone has opened the Firebase console.
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

// Membership and the count move together, so they cannot disagree.
// Membership is the fact. memberCount is a cached display of that fact.
//
// These were one transaction so they could never disagree, and that is what
// broke joining: the counter write needs permission on the community document
// itself, and when it was refused the transaction rolled back the membership
// too -- trading the entire feature for the accuracy of a number.
//
// They are separate now, in that order. A refused counter bump is logged and
// swallowed, so the worst case is a count that reads low until the next join
// corrects it. A refused membership write still fails loudly, because that one
// actually means you did not join.
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

/* ------------------------------------------------------------ posts */



// The Home feed: newest posts across every community. collectionGroup is the
// Firestore equivalent of "select from community_posts" with no parent filter,
// and it needs a composite index on (posts, createdAt desc) — Firestore will
// print a click-to-create link the first time this runs.
export function watchFeed(cb, max = 40) {
  if (!firebaseReady) { cb([]); return () => {}; }
  // Deliberately no orderBy.
  //
  // Sorting a collectionGroup on the server needs a COLLECTION_GROUP_DESC
  // index, which does not exist on a fresh project and cannot be created from
  // code -- and the failure renders as an empty feed rather than an error, so
  // it reads as "nothing posted yet". Sorting here is one pass over at most a
  // few hundred documents and removes that setup step entirely.
  //
  // The index is still the right answer once this outgrows a single campus;
  // firestore.indexes.json documents it. Add it and this can go back to an
  // ordered, server-limited query.
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


// Where a post lives.
//
// A post made to a community is a document in that community's subcollection.
// A campus post belongs to no community and goes in a root `posts` collection
// instead. collectionGroup(db, "posts") matches a collection of that name at
// ANY depth, root included, so the home feed picks both up through the query
// it already runs -- no second read, no merging, no ordering to reconcile.
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

  // A campus post is written twice-shaped, on purpose.
  //
  // Three versions of the campus-post rule have been published to this project
  // over its life, and they disagree about one field:
  //
  //   v1  request.resource.data.communityId == null      -- field must be null
  //   v2  !('communityId' in request.resource.data)      -- field must be absent
  //   v3  (no condition)                                 -- either is fine
  //
  // Which one is live is not readable from here: the Rules API needs
  // credentials this app does not have, and the read rule is identical across
  // all three so probing cannot tell them apart. A client that picks one shape
  // is guessing, and guessing wrong is a flat permission-denied.
  //
  // So it does not guess. Absent first, because that satisfies v2 and v3; if
  // the write is refused, null second, which satisfies v1 and v3. One of the
  // two always lands.
  //
  // Delete the fallback once v3 is published everywhere -- the retry costs a
  // round trip on projects still running v1, and nothing at all on v3.
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

/* ------------------------------------------------------ review queue */

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

// The signed-in user's own posts still waiting. Filtered on authorId, which is
// what the read rule requires; status is filtered here rather than in the
// query so no composite index is needed.
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

/* ---------------------------------------------------------- comments */

// Comments hang off whichever post document they belong to, so the same code
// serves a community post and a campus post -- postRef already knows the
// difference.

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

export async function fetchMySparks(uid) {
  if (!firebaseReady || !uid) return [];
  try {
    const snap = await getDocs(query(collectionGroup(db, "sparks"), where("uid", "==", uid)));
    return snap.docs.map((d) => d.ref.parent.parent?.id).filter(Boolean);
  } catch (err) {
    // Sparks hang off posts, which are spread across every community and the
    // root collection, so there is no cheap parent walk. Degrade to "nothing
    // sparked": hearts render unfilled until the index exists, and sparking
    // still works.
    watchFailed(err);
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
  return nowSparked;
}

/* --------------------------------------------------------- messages */

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

/* ----------------------------------------------------------- events */

export function watchEvents(cb) {
  if (!firebaseReady) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "events"), orderBy("createdAt", "desc")),
    (snap) => cb(snap.docs.map(mapEvent)),
    (err) => { watchFailed(err); cb([]); }
  );
}

/* ----------------------------------------------------- announcements */

// Banners published from the admin tool. The newest few, with switched-off and
// expired ones dropped here rather than in the query, so a single-field
// orderBy is all it needs and no composite index has to exist.
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

/* --------------------------------------------------------------- ads */

// Live ads only: the rules refuse to hand anyone else a draft or a paused ad,
// and this equality filter is what lets the query satisfy that rule. The
// schedule is checked here, so an ad with a start date in the future can be
// set live ahead of time and simply appears when the date comes.
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

// The register_for_event() plpgsql function, as a transaction. Registering is
// the access gate to the event's community: the first registration creates
// that community, later ones reuse it, and either way the caller ends up a
// member. All of it commits together or none of it does.
export async function registerForEvent(event, uid, userName) {
  need();
  const eventRef = doc(db, "events", event.id);

  return runTransaction(db, async (tx) => {
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists()) throw new Error("That event no longer exists.");
    const data = eventSnap.data();

    let communityId = data.linkedCommunityId || null;
    let communityRef = communityId ? doc(db, "communities", communityId) : null;
    let existingCommunity = null;
    if (communityRef) {
      existingCommunity = await tx.get(communityRef);
      if (!existingCommunity.exists()) { communityRef = null; communityId = null; }
    }

    const regRef = doc(db, "events", event.id, "registrations", uid);
    const alreadyRegistered = (await tx.get(regRef)).exists();

    if (!communityRef) {
      communityRef = doc(collection(db, "communities"));
      communityId = communityRef.id;
      tx.set(communityRef, {
        name: data.title,
        category: data.category,
        tags: data.tags?.length ? data.tags : [data.category],
        description: `Group chat for ${data.title}.`,
        memberCount: 0,
        creatorId: null,
        creatorLabel: "Orbit",
        official: true,
        handle: slugify(data.title),
        avatarUrl: data.imageUrl || null,
        postsAdminOnly: false,
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      });
      tx.update(eventRef, { linkedCommunityId: communityId });
    }

    if (!alreadyRegistered) {
      // The attendance count lives on the event rather than being counted from
      // the registrations subcollection, which would be a query per event on
      // every paint. It moves in the same transaction as the registration that
      // changes it, and only when the registration is genuinely new -- a
      // re-register must not inflate it.
      tx.update(eventRef, { registeredCount: increment(1) });
      tx.set(regRef, { uid, createdAt: serverTimestamp() });
      const memberRef = doc(db, "communities", communityId, "members", uid);
      const alreadyMember = await tx.get(memberRef);
      if (!alreadyMember.exists()) {
        tx.set(memberRef, { uid, name: userName || "Someone", role: "member", joinedAt: serverTimestamp() });
        tx.update(communityRef, { memberCount: increment(1) });
      }
    }

    return communityId;
  });
}

/* -------------------------------------------------------- Locali-Tea */

// 48 hours, enforced on read as well as by the TTL policy, so an expired post
// is invisible the moment it expires rather than whenever Firestore's sweeper
// next runs.
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
  // authorId is NOT written onto the post. Firestore cannot hide a field of a
  // readable document, so storing it here would make every "anonymous" post
  // attributable to anyone who opened the network tab. It goes into
  // tea_authors instead, which the rules can consult with get() but no client
  // can read. See firestore.rules.
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

/* --------------------------------------------------------- stickers */

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

/* ---------------------------------------------------------- reports */

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

/* ---------------------------------------------------------- storage */

// Buckets became folders. The three Supabase buckets map to three prefixes in
// the single Firebase Storage bucket, so the paths stay recognisable.
export async function uploadImage(folder, file, uid) {
  need();
  const safe = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
  const path = `${folder}/${uid || "anon"}/${Date.now()}-${safe}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type });
  return { url: await getDownloadURL(r), path };
}

export async function deleteImage(path) {
  if (!firebaseReady || !path) return;
  try { await deleteObject(ref(storage, path)); } catch { /* already gone */ }
}

/* ------------------------------------------------------------ admin */

export async function isOrbitAdmin(uid) {
  if (!firebaseReady || !uid) return false;
  const snap = await getDoc(doc(db, "profiles", uid));
  return snap.exists() && snap.data().isAdmin === true;
}
