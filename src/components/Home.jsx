import { useState, useMemo, useEffect } from "react";
import { CATEGORIES } from "../data/constants.js";
import { communityTrendScore, interestMatchCount } from "../utils/helpers.js";
import { Icon, Avatar, Button, IconButton, cx } from "./ui/Primitives.jsx";
import { Screen } from "./ui/Layout.jsx";

// Home has two distinct jobs, and the previous version only did one of them.
//
// For someone with a populated feed it's a feed. For a brand-new account it
// was a 470px column containing the words "No posts yet" and a camera, with
// every actionable thing — suggestions, events — pushed into a 320px rail.
// The widest, most central area of the screen was the emptiest, and the one
// question a new user has ("what do I do here?") was answered in the margin.
//
// So Home now branches:
//
//   Discover  — shown while the feed has nothing to show. The main column
//               becomes the getting-started surface: what Orbit is, three
//               concrete steps, communities to join at a size you can
//               actually read, and what's on this week.
//   Feed      — the moment there are posts, it's the feed, and discovery
//               drops back to the rail where it belongs.
//
// Same components, same data, different composition per state.

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

// Per-category mark tint, as whole class strings so Tailwind's scanner sees
// them. Colour is confined to the mark and the metadata glyphs — the card
// surface itself stays neutral. A tinted gradient banner across the top of
// every card was the thing that made the grid read as generated: it put the
// loudest element on the least informative part of the card.
const SKIN = {
  "text-c-blue":   { mark: "bg-c-blue/10" },
  "text-c-violet": { mark: "bg-c-violet/10" },
  "text-c-pink":   { mark: "bg-c-pink/10" },
  "text-c-orange": { mark: "bg-c-orange/10" },
  "text-c-amber":  { mark: "bg-c-amber/10" },
  "text-c-green":  { mark: "bg-c-green/10" },
  "text-c-teal":   { mark: "bg-c-teal/10" },
  "text-c-red":    { mark: "bg-c-red/10" },
};
const skinOf = (tint) => SKIN[tint] || SKIN["text-c-blue"];

function CommunityMark({ c, size = 44, ring = true }) {
  const cat = CATEGORIES.find((x) => x.name === c.category);
  if (c.avatarUrl) return <Avatar src={c.avatarUrl} name={c.name} size={size} />;
  return (
    <span
      className={cx("grid place-items-center rounded-full shrink-0", skinOf(cat?.tint).mark, ring && "ring-1 ring-line")}
      style={{ width: size, height: size }}
    >
      <Icon name={cat?.msr || "groups"} size={Math.round(size * 0.46)} className={cat?.tint} />
    </span>
  );
}

/* ------------------------------------------------------------- Discover */

// A join target you can actually read: mark, name, one line of description,
// members, and the action. Two across, so the primary column carries the
// weight instead of the rail.
function JoinCard({ c, joined, onOpen, onJoin }) {
  const cat = CATEGORIES.find((x) => x.name === c.category);
  return (
    <article className="card p-4 flex gap-3.5">
      <button onClick={() => onOpen(c)} className="shrink-0">
        <CommunityMark c={c} size={44} />
      </button>

      <div className="min-w-0 flex-1 flex flex-col">
        <button onClick={() => onOpen(c)} className="text-left min-w-0">
          <h3 className="text-base font-bold text-ink truncate hover:opacity-70 transition-opacity">
            {c.name.split(" — ")[0]}
            {c.official && <Icon name="verified" size={15} className="text-c-blue inline-block ml-1 -mt-0.5" />}
          </h3>
        </button>

        <p className="text-xs text-ink-2 leading-normal line-clamp-2 mt-1">{c.desc}</p>

        <div className="flex items-center justify-between gap-2 mt-3">
          <span className="inline-flex items-center gap-1.5 min-w-0 text-xs">
            <Icon name={cat?.msr || "groups"} size={14} className={cat?.tint} />
            <span className={cx("font-semibold truncate", cat?.tint)}>{c.category}</span>
            <span className="text-ink-3">·</span>
            <span className="text-ink-2 tabular-nums shrink-0">{compact(c.members)}</span>
          </span>
          <Button
            variant={joined ? "outline" : "primary"}
            size="sm"
            onClick={() => onJoin(c.id)}
            className="shrink-0"
          >
            {joined ? "Joined" : "Join"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function EventCard({ e, onOpen }) {
  const cat = CATEGORIES.find((x) => x.name === e.category);
  const parts = String(e.when || "").split(/[\s,]+/).filter(Boolean);
  const day = parts[0];
  const num = parts[1];
  return (
    <button onClick={onOpen} className="card group w-full p-4 flex items-center gap-4 text-left">
      {/* Date. Plain type on the card surface — a tinted well here was doing
          nothing except adding a second background colour to the row. */}
      <span className="w-11 shrink-0 text-center leading-none">
        <span className="block text-2xs font-semibold text-ink-2 uppercase tracking-wide">{day || "TBA"}</span>
        <span className="block text-xl font-bold text-ink tabular-nums mt-1">{num || "—"}</span>
      </span>

      <span className="w-px self-stretch bg-line shrink-0" />

      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-ink truncate group-hover:opacity-70 transition-opacity">
          {e.title}
        </span>
        <span className="flex items-center gap-3 mt-1.5 text-xs text-ink-2">
          <span className="inline-flex items-center gap-1 min-w-0">
            <Icon name={cat?.msr || "confirmation_number"} size={13} className={cat?.tint} />
            <span className={cx("truncate font-semibold", cat?.tint)}>{e.category}</span>
          </span>
          <span className="inline-flex items-center gap-1 min-w-0">
            <Icon name="location_on" size={13} className="text-c-pink" />
            <span className="truncate">{e.where}</span>
          </span>
        </span>
      </span>

      <Icon name="chevron_right" size={20} className="text-ink-3 group-hover:text-ink transition-colors shrink-0" />
    </button>
  );
}

function Step({ n, icon, tint, title, body, done }) {
  return (
    <div className="flex gap-3.5">
      <span
        className={cx(
          "grid place-items-center w-9 h-9 rounded-full shrink-0 text-xs font-bold",
          done ? "bg-c-green text-white" : "bg-bg-sunken text-ink-2"
        )}
      >
        {done ? <Icon name="check" size={18} /> : n}
      </span>
      <span className="min-w-0 pt-1">
        <span className="flex items-center gap-1.5">
          <Icon name={icon} size={17} className={tint} />
          <span className={cx("text-base font-semibold", done ? "text-ink-3 line-through" : "text-ink")}>{title}</span>
        </span>
        <span className="block text-xs text-ink-2 mt-1 leading-normal">{body}</span>
      </span>
    </div>
  );
}

/* ----------------------------------------------------------------- Feed */

function Stories({ communities, onOpen, onCreate }) {
  if (communities.length === 0) return null;
  return (
    <div className="flex gap-4 overflow-x-auto no-scrollbar py-4 border-b border-line">
      <button onClick={onCreate} className="flex flex-col items-center gap-1.5 w-[76px] shrink-0 group">
        <span className="grid place-items-center w-[62px] h-[62px] rounded-full border-2 border-dashed border-line group-hover:border-accent transition-colors">
          <Icon name="add" size={26} className="text-accent" />
        </span>
        <span className="text-xs text-ink-2 truncate max-w-full">New</span>
      </button>
      {communities.map((c) => {
        const cat = CATEGORIES.find((x) => x.name === c.category);
        const live = c.lastActive <= 10;
        return (
          <button key={c.id} onClick={() => onOpen(c)} className="flex flex-col items-center gap-1.5 w-[76px] shrink-0 group">
            <span className={cx("grid place-items-center rounded-full p-[3px]", live ? "story-ring" : "bg-line")}>
              <span className="grid place-items-center w-[56px] h-[56px] rounded-full bg-bg ring-2 ring-bg overflow-hidden">
                {c.avatarUrl
                  ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                  : <Icon name={cat?.msr || "groups"} size={26} className={cat?.tint} />}
              </span>
            </span>
            <span className="text-xs text-ink truncate max-w-full">{c.name.split(" — ")[0]}</span>
          </button>
        );
      })}
    </div>
  );
}

function Post({ post, community, liked, onLike, onOpen }) {
  const cat = community ? CATEGORIES.find((x) => x.name === community.category) : null;
  const [burst, setBurst] = useState(false);
  const like = () => {
    if (!liked) { setBurst(true); setTimeout(() => setBurst(false), 320); }
    onLike(post.id);
  };
  return (
    <article className="py-4 border-b border-line last:border-0">
      <div className="flex items-center gap-3 pb-3">
        <button onClick={() => community && onOpen(community)} className="shrink-0">
          {community ? <CommunityMark c={community} size={34} /> : <Avatar name="Orbit" size={34} />}
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <button onClick={() => community && onOpen(community)} className="block max-w-full text-base font-semibold text-ink truncate hover:opacity-70">
            {community?.name || "Orbit"}
          </button>
          <p className="text-xs text-ink-2 truncate">
            {post.who}<span className="mx-1 text-ink-3">·</span>{post.time}
          </p>
        </div>
        <IconButton icon="more_horiz" label="More" size={20} />
      </div>

      {post.imageUrl && (
        <button onClick={() => community && onOpen(community)} className="block w-full media rounded overflow-hidden mb-3">
          <img src={post.imageUrl} alt="" loading="lazy" className="w-full max-h-[560px] object-cover" />
        </button>
      )}

      <div className="flex items-center gap-1 -ml-2">
        <button
          onClick={like}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          className={cx(
            "grid place-items-center w-9 h-9 rounded-full transition-[background-color,transform] duration-150",
            "hover:bg-black/[0.05] dark:hover:bg-white/[0.08] active:scale-90",
            burst && "animate-heart"
          )}
        >
          <Icon name="favorite" size={24} className={liked ? "text-c-red" : "text-ink"} />
        </button>
        <IconButton icon="mode_comment" label="Comments" size={23} className="text-c-blue" onClick={() => community && onOpen(community)} />
        <IconButton icon="send" label="Share" size={23} className="text-c-violet" onClick={() => community && onOpen(community)} />
        <span className="flex-1" />
        <IconButton icon="bookmark" label="Save" size={23} className="text-c-amber" />
      </div>

      <div className="pt-1.5 space-y-1">
        {post.sparks > 0 && (
          <p className="text-base font-semibold text-ink">
            {compact(post.sparks)} {post.sparks === 1 ? "spark" : "sparks"}
          </p>
        )}
        {post.text && (
          <p className="text-base text-ink leading-normal">
            <span className="font-semibold mr-1.5">{post.who}</span>{post.text}
          </p>
        )}
        <p className="text-2xs text-ink-3 uppercase tracking-wide pt-0.5">{post.time}</p>
      </div>
    </article>
  );
}

/* --------------------------------------------------------------- Screen */

export function HomeScreen({
  communities, joinedIds, onOpen, onCreateClick, interests,
  feedPosts, feedSparkIds, onSparkPost, onAdClick,
  events = [], userName, user, onJoinToggle, onGoToEvents, onGoToTea,
  onGoToExplore,
}) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  const joined = useMemo(
    () => communities.filter((c) => joinedIds.includes(c.id)).sort((a, b) => a.lastActive - b.lastActive),
    [communities, joinedIds]
  );

  const suggested = useMemo(() => {
    const pool = communities.filter((c) => !joinedIds.includes(c.id));
    return interests?.length
      ? [...pool].sort((a, b) => interestMatchCount(b, interests) - interestMatchCount(a, interests))
      : [...pool].sort((a, b) => communityTrendScore(b) - communityTrendScore(a));
  }, [communities, joinedIds, interests]);

  const posts = feedPosts || [];
  const first = (userName || "").split(" ")[0];
  const isGuest = !user?.verified;

  // The branch. Discovery wins whenever the feed would otherwise be an
  // apology for having nothing in it.
  const discoverMode = !loading && posts.length === 0;

  // Identity and the count strip both live on the profile page now. A rail
  // that opens with "who you are" is telling you something you already know;
  // it should only carry what is elsewhere in the product.
  const rail = (
    <div className="sticky top-8 space-y-7">

      {/* In discover mode the main column already lists suggestions, so the
          rail doesn't repeat them. */}
      {!discoverMode && suggested.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-1">
            <p className="text-base font-semibold text-ink-2">Suggested for you</p>
            <button onClick={onGoToExplore} className="text-xs font-semibold text-accent hover:opacity-70">See all</button>
          </div>
          {suggested.slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2">
              <button onClick={() => onOpen(c)} className="shrink-0"><CommunityMark c={c} size={34} /></button>
              <button onClick={() => onOpen(c)} className="min-w-0 flex-1 text-left leading-tight">
                <span className="block text-base font-semibold text-ink truncate hover:opacity-70">{c.name.split(" — ")[0]}</span>
                <span className="block text-xs text-ink-2 truncate">{compact(c.members)} members</span>
              </button>
              <button onClick={() => onJoinToggle(c.id)} className="text-xs font-semibold text-accent hover:opacity-70 shrink-0">Join</button>
            </div>
          ))}
        </section>
      )}

      <button onClick={onGoToTea} className="w-full flex items-center gap-3 py-2 group text-left">
        <span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-bg-sunken ring-1 ring-line shrink-0">
          <Icon name="local_cafe" size={18} className="text-c-pink" />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block text-base font-semibold text-ink group-hover:opacity-70">Locali-Tea</span>
          <span className="block text-xs text-ink-2">Anonymous · gone in 48h</span>
        </span>
      </button>

      <p className="text-2xs text-ink-3 leading-relaxed">
        <a href="/terms" className="hover:underline">Terms</a>
        <span className="mx-1.5">·</span>
        <a href="/privacy" className="hover:underline">Privacy</a>
        <span className="mx-1.5">·</span>
        Built for Manipal University Jaipur
        <br />© 2026 Orbit
      </p>
    </div>
  );

  return (
    <Screen>
      {/* Discover runs full-bleed — it's a browsing surface, so holding it to
          1160px on a wide monitor wasted most of the screen. The feed keeps
          its reading measure (a 1600px-wide line of caption text is
          unreadable) but the page around it is no longer capped. */}
      <div className={cx("w-full flex gap-8 xl:gap-14 px-5 sm:px-8 lg:px-12 xl:px-16", !discoverMode && "max-w-[1100px] mx-auto")}>
        <div className={cx("w-full min-w-0 pb-16", discoverMode ? "" : "max-w-feed mx-auto xl:mx-0")}>

          {/* Greeting. Present in both states — it is the thing that tells you
              the page has loaded and is yours. */}
          <div className="pt-8 pb-6">
            <h1 className="text-3xl font-bold text-ink">
              {isGuest ? (
                <>Welcome to{" "}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-c-violet via-c-pink to-c-orange">Orbit</span>
                </>
              ) : (
                <>{greeting()},{" "}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-c-violet via-c-pink to-c-orange">{first || "there"}</span>
                </>
              )}
            </h1>
            <p className="text-md text-ink-2 mt-1.5">
              {discoverMode
                ? "Every club, community and event at MUJ — in one place."
                : "Here's what's happening around campus."}
            </p>
          </div>

          {loading && (
            <div className="space-y-8 pt-2">
              {[0, 1].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-[34px] h-[34px] rounded-full bg-bg-sunken animate-pulse" />
                    <span className="h-3 w-32 rounded bg-bg-sunken animate-pulse" />
                  </div>
                  <div className="h-[320px] rounded bg-bg-sunken animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {/* ---------------- Discover ---------------- */}
          {discoverMode && (
            <div className="space-y-10">
              {joined.length === 0 && (
                <section className="grid sm:grid-cols-3 gap-6 pb-2">
                  <Step
                    n={1} icon="interests" tint="text-c-violet"
                    title="Join a community"
                    body="Pick a few below. They fill your feed."
                    done={joined.length > 0}
                  />
                  <Step
                    n={2} icon="confirmation_number" tint="text-c-orange"
                    title="Find an event"
                    body="Register and you're in its group chat."
                  />
                  <Step
                    n={3} icon="edit" tint="text-c-blue"
                    title="Post something"
                    body="Your communities see it here."
                  />
                </section>
              )}

              {suggested.length > 0 && (
                <section>
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-bold text-ink">
                      {interests?.length ? "Picked for your interests" : "Popular right now"}
                    </h2>
                    <button onClick={onGoToExplore} className="text-xs font-semibold text-accent hover:opacity-70 shrink-0">
                      Browse all
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 mt-4">
                    {suggested.slice(0, 8).map((c) => (
                      <JoinCard
                        key={c.id}
                        c={c}
                        joined={joinedIds.includes(c.id)}
                        onOpen={onOpen}
                        onJoin={onJoinToggle}
                      />
                    ))}
                  </div>
                </section>
              )}

              {events.length > 0 && (
                <section>
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-bold text-ink">Happening soon</h2>
                    <button onClick={onGoToEvents} className="text-xs font-semibold text-accent hover:opacity-70 shrink-0">
                      All events
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-3 mt-4">
                    {events.slice(0, 6).map((e) => (
                      <EventCard key={e.id} e={e} onOpen={onGoToEvents} />
                    ))}
                  </div>
                </section>
              )}

              <section className="flex flex-wrap items-center gap-3 pt-2">
                <Button variant="primary" size="lg" icon="add" onClick={onCreateClick}>
                  Start your own community
                </Button>
                <Button variant="soft" size="lg" icon="local_cafe" onClick={onGoToTea}>
                  Peek at Locali-Tea
                </Button>
              </section>
            </div>
          )}

          {/* ------------------ Feed ------------------ */}
          {!loading && !discoverMode && (
            <>
              <Stories communities={joined} onOpen={onOpen} onCreate={onCreateClick} />
              {posts.map((p) => (
                <Post
                  key={p.id}
                  post={p}
                  community={communities.find((c) => c.id === p.communityId)}
                  liked={(feedSparkIds || []).includes(p.id)}
                  onLike={onSparkPost}
                  onOpen={onOpen}
                />
              ))}
            </>
          )}
        </div>

        <aside className="hidden xl:block w-aside shrink-0 pt-8 pb-16">{rail}</aside>
      </div>
    </Screen>
  );
}
