// A small read-through cache for the first paint.
//
// Every list in this app comes from an onSnapshot subscription, which is the
// right shape for live data but means a reload shows empty skeletons for as
// long as the round trip takes, every single time, even though the answer is
// almost always what you were already looking at.
//
// So: the last snapshot of each list is kept in sessionStorage and used as the
// initial state. The subscription still runs and still overwrites it the
// moment real data lands -- this only changes what is on screen in between.
// Nothing here is a source of truth, and nothing is read after the first
// render, which is why a stale entry can never outlive one round trip.
//
// sessionStorage, not localStorage, on purpose: it dies with the tab, so a
// shared machine cannot show one student the tail of another's session, and a
// cache bug cannot outlive a browser restart.
//
// Entries are namespaced by uid. Signing in as someone else must not inherit
// the previous account's feed while their subscription is still connecting.

const PREFIX = "orbit_cache:";
const TTL_MS = 10 * 60 * 1000;

let scope = "anon";

/** Call on auth change. Clears everything if the account changed. */
export function setCacheScope(uid) {
  const next = uid || "anon";
  if (next === scope) return;
  scope = next;
  clearCache();
}

const keyFor = (name) => `${PREFIX}${scope}:${name}`;

export function readCache(name, fallback) {
  try {
    const raw = sessionStorage.getItem(keyFor(name));
    if (!raw) return fallback;
    const { at, data } = JSON.parse(raw);
    if (!at || Date.now() - at > TTL_MS) return fallback;
    return data;
  } catch {
    return fallback;
  }
}

export function writeCache(name, data) {
  try {
    sessionStorage.setItem(keyFor(name), JSON.stringify({ at: Date.now(), data }));
  } catch {
    // Quota, private mode, or a value with a cycle in it. The cache is an
    // optimisation; failing to write one is not worth surfacing.
  }
}

export function clearCache() {
  try {
    for (const k of Object.keys(sessionStorage)) {
      if (k.startsWith(PREFIX)) sessionStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}

/**
 * Wraps a watcher so its first callback is served from cache and every
 * subsequent one is written back to it.
 *
 * Dates do not survive JSON, so `revive` is where a caller turns the parsed
 * shape back into what the UI expects. Without it a cached post would arrive
 * with createdAt as a string and every sort comparing it would silently
 * produce NaN.
 */
export function cached(name, set, revive) {
  const seed = readCache(name, null);
  if (seed) {
    try { set(revive ? revive(seed) : seed); }
    catch { /* a shape change since the write; the live data is moments away */ }
  }
  return (rows) => {
    set(rows);
    writeCache(name, rows);
  };
}

/** Re-hydrates ISO strings back into Dates on the fields that hold them. */
export const reviveDates = (fields) => (rows) =>
  (rows || []).map((r) => {
    const out = { ...r };
    for (const f of fields) if (out[f]) out[f] = new Date(out[f]);
    return out;
  });
