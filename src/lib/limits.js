// Rate limits.
//
// These are enforced in two places and neither is optional.
//
// Here, in the client, so the UI can say "you have hit the limit" before a
// write is attempted and can grey the control out rather than letting someone
// type a post that will be refused. That is the whole value of the client-side
// half: a better message, sooner. It stops nobody who opens a console.
//
// And in firestore.rules, which is the half that actually holds. The community
// cap is enforceable there because it can count what already exists; the post
// window is not, because rules cannot query a collection to count recent
// documents. See the note on POST_WINDOW below for what that means.

export const MAX_COMMUNITIES = 2;
export const POST_LIMIT = 10;
export const POST_WINDOW_MS = 15 * 60 * 1000;

const KEY = "orbit_post_times";

function readTimes() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

function writeTimes(times) {
  try { localStorage.setItem(KEY, JSON.stringify(times)); } catch { /* private mode */ }
}

/** Timestamps inside the current window, oldest first. */
function recentPosts() {
  const cut = Date.now() - POST_WINDOW_MS;
  return readTimes().filter((t) => t > cut).sort((a, b) => a - b);
}

/**
 * Whether another post is allowed right now.
 * Returns { ok } or { ok: false, retryAfterMs, message }.
 */
export function checkPostLimit() {
  const times = recentPosts();
  if (times.length < POST_LIMIT) return { ok: true, remaining: POST_LIMIT - times.length };

  // The oldest post in the window is the one whose expiry frees a slot.
  const retryAfterMs = times[0] + POST_WINDOW_MS - Date.now();
  const mins = Math.max(1, Math.ceil(retryAfterMs / 60000));
  return {
    ok: false,
    remaining: 0,
    retryAfterMs,
    message: `You have posted ${POST_LIMIT} times in the last 15 minutes. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
  };
}

/** Record a post that actually succeeded. Failed writes must not count. */
export function notePost() {
  const times = recentPosts();
  times.push(Date.now());
  writeTimes(times);
}

/**
 * Whether this account may create another community.
 * `owned` is the number they already created.
 */
export function checkCommunityLimit(owned) {
  if (owned < MAX_COMMUNITIES) return { ok: true, remaining: MAX_COMMUNITIES - owned };
  return {
    ok: false,
    remaining: 0,
    message: `You can create ${MAX_COMMUNITIES} communities. Delete one to make room, or ask an admin.`,
  };
}
