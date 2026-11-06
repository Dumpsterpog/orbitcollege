const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

function normalise(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[013457@$!]/g, (c) => LEET[c] || c)
    .replace(/\b(?:[a-z][\s._\-*]){2,}[a-z]\b/g, (run) => run.replace(/[\s._\-*]/g, ""))
    // three or more of the same letter collapse to one
    .replace(/([a-z])\1{2,}/g, "$1");
}

const EXPLICIT = [
  "porn", "pornhub", "xvideos", "xnxx", "xhamster", "redtube", "youporn",
  "onlyfans", "camgirl", "camwhore", "escort service", "call girl", "callgirl",
  "nudes", "nude pics", "nude pic", "send nudes", "sexting", "sex chat",
  "sexcam", "sex video", "sex videos", "blowjob", "handjob", "creampie",
  "cumshot", "masturbat", "hentai", "rule34", "nsfw pics", "dick pic",
  "horny girls", "horny boys", "hookup tonight", "sex tonight",
];

// Slurs and targeted abuse. Zero tolerance, no context that makes these fine
// on a campus feed.
const ABUSE = [
  "faggot", "fag", "tranny", "nigger", "nigga", "chink", "spic", "kike",
  "retard", "retarded", "rape you", "kill yourself", "kys",
];

const LINK_PATTERNS = [
  { re: /\bt\.me\/\S+/i,                       label: "Telegram invite links" },
  { re: /\btelegram\.(me|dog)\/\S+/i,          label: "Telegram invite links" },
  { re: /\bchat\.whatsapp\.com\/\S+/i,         label: "WhatsApp group invites" },
  { re: /\b(discord\.gg|discord\.com\/invite)\/\S+/i, label: "Discord invites" },
  { re: /\bonlyfans\.com\/\S*/i,               label: "OnlyFans links" },
];

// Shortened links hide where they go. Refused in comments and Locali-Tea,
// sent for review in posts, where a moderator can open them and look.
const SHORTENER = /\b(bit\.ly|tinyurl\.com|cutt\.ly|rb\.gy|is\.gd|shorturl\.at)\/\S+/i;

const SEXUAL = [
  "sex", "sexy", "sexual", "sexually", "nsfw", "nude", "naked", "horny",
  "boobs", "tits", "dick", "pussy", "makeout", "make out", "kinky",
  "one night stand", "fwb", "friends with benefits", "sugar daddy", "sugar mommy",
];
const DATING = [
  "dating", "date me", "looking for a date", "hookup", "hook up", "tinder",
  "bumble", "grindr", "looking for a gf", "looking for a bf", "need a gf", "need a bf",
];

// Adult sites, as links rather than words.
const NSFW_LINK = /\b(pornhub|xvideos|xnxx|xhamster|redtube|youporn|fansly|chaturbate|stripchat|erome|spankbang|rule34)\.[a-z.]{2,}|\breddit\.com\/r\/\w*nsfw/i;

const RULES_MIRROR = /(^|[^a-z])(porn|porno|pornhub|xvideos|xnxx|xhamster|nudes|sexting|hentai)([^a-z]|$)/i;

function hasTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i").test(text);
}

export function checkText(raw) {
  const text = String(raw || "");
  if (!text.trim()) return { ok: true };

  const norm = normalise(text);

  for (const { re, label } of LINK_PATTERNS) {
    if (re.test(text)) {
      return { ok: false, kind: "link", reason: `Orbit does not allow ${label}.` };
    }
  }
  if (SHORTENER.test(text)) {
    return { ok: false, kind: "link", reason: "Orbit does not allow shortened links, because nobody can see where they go." };
  }

  for (const term of ABUSE) {
    if (hasTerm(norm, term)) {
      return {
        ok: false,
        kind: "abuse",
        reason: "That language is not allowed here. Repeated attempts get accounts removed.",
      };
    }
  }

  for (const term of EXPLICIT) {
    if (hasTerm(norm, term)) {
      return {
        ok: false,
        kind: "explicit",
        reason: "Orbit is a campus space and does not allow sexual or explicit content.",
      };
    }
  }

  return { ok: true };
}

export function classifyPost(raw) {
  const text = String(raw || "");
  if (!text.trim()) return { action: "allow" };
  const norm = normalise(text);

  for (const { re, label } of LINK_PATTERNS) {
    if (re.test(text)) return { action: "block", reason: `Orbit does not allow ${label}.` };
  }
  for (const term of ABUSE) {
    if (hasTerm(norm, term)) {
      return { action: "block", reason: "That language is not allowed here. Repeated attempts get accounts removed." };
    }
  }

  const labels = new Set();
  const matched = [];
  const hit = (label, term) => { labels.add(label); if (!matched.includes(term)) matched.push(term); };

  for (const term of EXPLICIT) if (hasTerm(norm, term)) hit("explicit", term);
  const mirror = text.match(RULES_MIRROR);
  if (mirror) hit("explicit", mirror[2].toLowerCase());
  for (const term of SEXUAL) if (hasTerm(norm, term)) hit("sexual", term);
  for (const term of DATING) if (hasTerm(norm, term)) hit("dating", term);
  const link = text.match(NSFW_LINK);
  if (link) hit("nsfw-link", link[0].toLowerCase());
  const short = text.match(SHORTENER);
  if (short) hit("hidden-link", short[0].toLowerCase());

  if (!labels.size) return { action: "allow" };
  return {
    action: "review",
    labels: [...labels],
    matched: matched.slice(0, 8),
    reason: "Your post is waiting for a moderator. It will appear once it is approved.",
  };
}

/** Same check across several fields at once, for forms. */
export function checkFields(fields) {
  for (const value of fields) {
    const result = checkText(value);
    if (!result.ok) return result;
  }
  return { ok: true };
}
