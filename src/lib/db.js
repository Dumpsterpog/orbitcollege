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
    creator: r.creatorLabel,
    creatorId: r.creatorId,
    official: !!r.official,
    handle: r.handle,
    avatarUrl: r.avatarUrl || null,
    postsAdminOnly: !!r.postsAdminOnly,
    lastActive: minutesSince(r.lastActiveAt || r.createdAt),
  };
};

export const mapPost = (d) => {
  const r = d.data();
  return {
    id: d.id,
    // A collectionGroup query loses the parent path unless it is read back
    // off the ref, which is how a feed post knows which community it is in.
    communityId: r.communityId || d.ref.parent.parent?.id || null,
    authorId: r.authorId,
    who: r.authorName || "Someone",
    text: r.text || "",
    time: timeAgoFrom(r.createdAt),
    createdAt: toDate(r.createdAt),
    hasImage: !!r.imageUrl,
    imageUrl: r.imageUrl || null,
    sparks: r.sparkCount ?? 0,
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
    imageUrl: r.imageUrl || null,
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

export async function createCommunity({ name, category, desc, tags, creatorId, creatorLabel, official = false }) {
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
    postsAdminOnly: false,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  });

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

export async function fetchMyJoins(uid) {
  if (!firebaseReady || !uid) return [];
  const snap = await getDocs(query(collectionGroup(db, "members"), where("uid", "==", uid)));
  return snap.docs.map((d) => d.ref.parent.parent?.id).filter(Boolean);
}

// Membership and the count move together, so they cannot disagree.
export async function joinCommunity(communityId, uid, name) {
  need();
  const memberRef = doc(db, "communities", communityId, "members", uid);
  await runTransaction(db, async (tx) => {
    const existing = await tx.get(memberRef);
    if (existing.exists()) return;
    tx.set(memberRef, { uid, name: name || "Someone", role: "member", joinedAt: serverTimestamp() });
    tx.update(doc(db, "communities", communityId), {
      memberCount: increment(1),
      lastActiveAt: serverTimestamp(),
    });
  });
}

export async function leaveCommunity(communityId, uid) {
  need();
  const memberRef = doc(db, "communities", communityId, "members", uid);
  await runTransaction(db, async (tx) => {
    const existing = await tx.get(memberRef);
    if (!existing.exists()) return;
    tx.delete(memberRef);
    tx.update(doc(db, "communities", communityId), { memberCount: increment(-1) });
  });
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
  return onSnapshot(
    query(collectionGroup(db, "posts"), orderBy("createdAt", "desc"), limit(max)),
    (snap) => cb(snap.docs.map(mapPost)),
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

export async function createPost({ communityId, authorId, authorName, text, imageUrl = null }) {
  need();
  const ref = await addDoc(collection(db, "communities", communityId, "posts"), {
    communityId,
    authorId,
    authorName: authorName || "Someone", // denormalised: Firestore has no join
    text: text || "",
    imageUrl,
    sparkCount: 0,
    pinned: false,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "communities", communityId), { lastActiveAt: serverTimestamp() });
  const snap = await getDoc(ref);
  return mapPost(snap);
}

export async function deletePost(communityId, postId) {
  need();
  await deleteDoc(doc(db, "communities", communityId, "posts", postId));
}

export async function setPostPinned(communityId, postId, pinned) {
  need();
  await updateDoc(doc(db, "communities", communityId, "posts", postId), { pinned });
}

export async function fetchMySparks(uid) {
  if (!firebaseReady || !uid) return [];
  const snap = await getDocs(query(collectionGroup(db, "sparks"), where("uid", "==", uid)));
  return snap.docs.map((d) => d.ref.parent.parent?.id).filter(Boolean);
}

// One spark per person per post, and the count kept in the same transaction.
export async function toggleSpark(communityId, postId, uid) {
  need();
  const sparkRef = doc(db, "communities", communityId, "posts", postId, "sparks", uid);
  const postRef = doc(db, "communities", communityId, "posts", postId);
  let nowSparked = false;
  await runTransaction(db, async (tx) => {
    const existing = await tx.get(sparkRef);
    if (existing.exists()) {
      tx.delete(sparkRef);
      tx.update(postRef, { sparkCount: increment(-1) });
      nowSparked = false;
    } else {
      tx.set(sparkRef, { uid, createdAt: serverTimestamp() });
      tx.update(postRef, { sparkCount: increment(1) });
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

export async function fetchMyRegistrations(uid) {
  if (!firebaseReady || !uid) return [];
  const snap = await getDocs(query(collectionGroup(db, "registrations"), where("uid", "==", uid)));
  return snap.docs.map((d) => d.ref.parent.parent?.id).filter(Boolean);
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
