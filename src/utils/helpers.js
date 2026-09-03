// Core id generator — kept in one place since both seed data and
// runtime-created communities/posts/chats need a shared counter.
let SEED_ID = 1;
export const nextId = () => String(SEED_ID++);

export const NAME_POOL = [
  "Aarav", "Meher", "Priyanshu", "Simran", "Kabir", "Rehan", "Ishita", "Devika",
  "Yashwin", "Naina", "Aisha", "Rohan", "Tanvi", "Vihaan", "Ananya", "Kunal",
  "Diya", "Arjun", "Sneha", "Rudra", "Zara", "Krish", "Myra", "Advait",
];

export const communityTags = (c) => (c.tags && c.tags.length ? c.tags : [c.category]);

export const interestMatchCount = (c, interests) =>
  interests && interests.length ? communityTags(c).filter((t) => interests.includes(t)).length : 0;

export const baseSparks = (c) => Math.max(2, Math.round(c.members * 0.55));

export function communityTrendScore(c) {
  return c.members * 0.4 + baseSparks(c) * 2 - c.lastActive * 0.6;
}

// Shared relative-time formatter — was duplicated privately in Community.jsx
// (post/message timestamps); the dashboard's "recent in your communities"
// section needs the same formatting, so it now lives here once.
export function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

// Turns a display name into a URL-safe slug — shared by handleFor() below
// and by App.jsx when it needs to generate a @handle client-side before a
// community row (and its DB-assigned id) exists yet.
export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Turns a display name into a unique-ish @handle for community/club pages
// and their QR codes — e.g. "DSA Grinders — 6AM Batch" -> "dsa-grinders-6am-batch".
export function handleFor(name, id) {
  return `${slugify(name)}-${id}`;
}

// Stable numeric hash for a string id — Firestore documents use string ids,
// so anything that used to do `id % N` (fine for the old numeric mock ids)
// needs this instead, or it silently produces NaN.
export function hashId(id) {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Locali-Tea: every post self-destructs 48h after posting, comments included.
export const TEA_LIFESPAN_MS = 48 * 60 * 60 * 1000;

export function isTeaExpired(createdAt) {
  return Date.now() - createdAt >= TEA_LIFESPAN_MS;
}

export function teaTimeLeft(createdAt) {
  const msLeft = TEA_LIFESPAN_MS - (Date.now() - createdAt);
  if (msLeft <= 0) return "Expired";
  const h = Math.floor(msLeft / (60 * 60 * 1000));
  if (h >= 1) return `${h}h left`;
  const m = Math.max(1, Math.floor(msLeft / (60 * 1000)));
  return `${m}m left`;
}

export function genMembers(c) {
  const total = Math.max(1, c.members);
  const idNum = hashId(c.id);
  const creatorName = c.creator === "You" ? "You" : NAME_POOL[idNum % NAME_POOL.length];
  const others = [];
  for (let i = 0; i < Math.min(total - 1, 24); i++) {
    const base = NAME_POOL[(idNum + i * 3) % NAME_POOL.length];
    others.push(i >= NAME_POOL.length ? `${base} ${i}` : base);
  }
  return { creatorName, others, total };
}
