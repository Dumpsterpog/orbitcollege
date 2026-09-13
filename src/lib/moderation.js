// Content filtering.
//
// Two rules shaped everything here.
//
// First: false positives are the expensive failure. A filter that blocks a
// real post is felt immediately by someone who did nothing wrong, while a
// filter that misses one is caught by the report queue. So every term matches
// on word boundaries -- naive substring matching is how "class" and "Scunthorpe"
// get blocked, and how a filter earns the reputation of being broken.
//
// Second: this is a campus app, and campuses have to be able to discuss sexual
// health, consent, harassment and assault. Blanket-banning the word "sex"
// silences exactly the posts a student platform must not silence -- a warning
// about a predator, a link to a clinic, a question about consent. So the list
// targets pornography and explicit solicitation, not the subject.
//
// This is also not a security control. It is client-side, so anyone who opens
// a console can post around it. What it does is stop casual abuse and make the
// rules obvious. The report queue and firestore.rules are the parts that hold.

/* ------------------------------------------------------------ normalise */

// Collapses the usual evasions before matching: leetspeak, repeated letters,
// and separators wedged between characters. Without this, "p0rn", "p.o.r.n"
// and "pooorn" all sail through a list that only knows the spelling.
const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

function normalise(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[013457@$!]/g, (c) => LEET[c] || c)
    // Spaced-out obfuscation only: "p.o.r.n", "p o r n", "p-o-r-n". Matched as
    // a run of single letters each followed by a separator, which is a shape
    // ordinary prose does not have.
    //
    // An earlier version collapsed any separator between word characters. That
    // also ate the ordinary space in "send nudes", turning it into
    // "sendnudes", so every multi-word term in the list silently stopped
    // matching while the filter looked like it was working.
    .replace(/\b(?:[a-z][\s._\-*]){2,}[a-z]\b/g, (run) => run.replace(/[\s._\-*]/g, ""))
    // three or more of the same letter collapse to one
    .replace(/([a-z])\1{2,}/g, "$1");
}

/* -------------------------------------------------------------- lexicon */

// Pornography and explicit solicitation. Deliberately not a general profanity
// list: students swear, and a community app that blocks "shit" is one nobody
// posts on. Harassment and slurs are handled separately below.
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

// Off-platform invite links. The point is not that these services are bad --
// it is that a campus feed is a recruiting ground for scams and porn rings
// that move people to an unmoderated channel as the first step.
//
// Always refused, never queued: firestore.rules refuses the same links on
// every post write, including an admin's, so a queued one could never be
// approved anyway.
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

/* -------------------------------------------------------- review queue */

// Posts about these go to a moderator instead of the feed.
//
// This is where the "campuses must be able to discuss sex" rule from the top
// of the file meets the request to keep dating and sexual posts off the feed.
// A refusal would silence the consent-workshop post along with the hookup
// post; a review queue lets a person tell them apart. So the list can be
// broad -- a false positive costs a short wait, not a lost post.
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

// A byte-for-byte mirror of noExplicit() in firestore.rules, run on the raw
// text.
//
// The lists above match on normalised text, and the rule cannot normalise, so
// the two can disagree: "porn5" normalises to "porns", which the list misses
// and the rule catches. Without this mirror such a post would skip the queue,
// hit the rule, and fail with a bare permission-denied. With it, anything the
// rule would refuse is queued first -- the client is always at least as strict.
const RULES_MIRROR = /(^|[^a-z])(porn|porno|pornhub|xvideos|xnxx|xhamster|nudes|sexting|hentai)([^a-z]|$)/i;

/* --------------------------------------------------------------- match */

// Word-boundary match on the normalised text. \b does not work for phrases
// containing spaces after normalisation, so multi-word entries are matched
// with explicit boundaries on each end.
function hasTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i").test(text);
}

/**
 * Checks a piece of user text.
 * Returns { ok: true } or { ok: false, reason } with a message worth reading.
 */
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

/**
 * Decides what happens to a post: published, refused, or held for review.
 *
 *   { action: "allow" }
 *   { action: "block",  reason }                 slurs, invite links
 *   { action: "review", reason, labels, matched } sexual, dating, NSFW links
 *
 * Posts only. Comments and Locali-Tea have nowhere to wait -- Tea is anonymous,
 * so a queue entry would have to name its author -- and keep using checkText.
 */
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
