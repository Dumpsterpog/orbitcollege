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
