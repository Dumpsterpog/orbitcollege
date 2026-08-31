import { useState, useMemo, useEffect } from "react";
import { CATEGORIES } from "../data/constants.js";
import { communityTrendScore, interestMatchCount } from "../utils/helpers.js";
import { Icon, Avatar, Button, IconButton, Tag, cx } from "./ui/Primitives.jsx";
import { Screen, Empty } from "./ui/Layout.jsx";

// Home.
//
// Two structural decisions carried over from the reference, both of which
// the previous version got wrong:
//
//   1. The three stat cards are gone. Counts now sit in the rail as an
//      inline metric strip — big numeral over a small label, three across,
//      no border, no fill, no shadow. This is the profile-header idiom, and
//      it reads faster than three bordered boxes because the eye lands on
//      the numbers instead of on the containers around them.
//
//   2. Feed posts have no card. They sit directly on the page and are
//      separated by a single hairline and generous space. A 470px measure
//      keeps the caption line length readable, and the media goes edge to
//      edge within it, which is what makes a feed feel like a feed.

const initials = (n = "") => n.trim().charAt(0).toUpperCase() || "?";
const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

/* ---------------------------------------------------------------- Stories */

// Communities you're in, most-recently-active first. The gradient ring is
// the "has activity" signal, so it does the work a badge would otherwise do.
function Stories({ communities, onOpen, onCreate }) {
  if (communities.length === 0) return null;
  return (
    <div className="flex gap-4 overflow-x-auto no-scrollbar py-4 px-1 border-b border-line">
      <button onClick={onCreate} className="flex flex-col items-center gap-1.5 w-[76px] shrink-0 group">
        <span className="grid place-items-center w-[62px] h-[62px] rounded-full border-2 border-dashed border-line
          group-hover:border-accent transition-colors">
          <Icon name="add" size={26} className="text-accent" />
        </span>
        <span className="text-xs text-ink-2 truncate max-w-full">New</span>
      </button>

      {communities.map((c) => {
        const cat = CATEGORIES.find((x) => x.name === c.category);
        const live = c.lastActive <= 10;
        return (
          <button
            key={c.id}
            onClick={() => onOpen(c)}
            className="flex flex-col items-center gap-1.5 w-[76px] shrink-0 group"
          >
            <span className="relative">
              {c.avatarUrl ? (
                <Avatar src={c.avatarUrl} name={c.name} size={56} ring={live} />
              ) : (
                <span
                  className={cx(
                    "grid place-items-center rounded-full",
                    live ? "story-ring p-[3px]" : "p-[3px] bg-line"
                  )}
                >
                  <span className="grid place-items-center w-[56px] h-[56px] rounded-full bg-bg-sunken ring-2 ring-bg">
                    {cat && <Icon name={cat.msr} size={26} className={cat.tint} />}
                  </span>
                </span>
              )}
            </span>
            <span className="text-xs text-ink truncate max-w-full group-hover:text-ink-2 transition-colors">
              {c.name.split(" — ")[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ Post */

function Post({ post, community, liked, onLike, onOpen }) {
  const cat = community ? CATEGORIES.find((x) => x.name === community.category) : null;
  const [burst, setBurst] = useState(false);

  const like = () => {
    if (!liked) { setBurst(true); setTimeout(() => setBurst(false), 320); }
    onLike(post.id);
  };

  return (
    <article className="py-4 border-b border-line last:border-0">
      {/* byline */}
      <div className="flex items-center gap-3 pb-3">
        <button onClick={() => community && onOpen(community)} className="shrink-0">
          {community?.avatarUrl
            ? <Avatar src={community.avatarUrl} name={community.name} size={34} />
            : (
              <span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-bg-sunken ring-1 ring-line">
                {cat ? <Icon name={cat.msr} size={18} className={cat.tint} /> : initials(community?.name)}
              </span>
            )}
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <button onClick={() => community && onOpen(community)} className="text-base font-semibold text-ink hover:opacity-70 truncate block max-w-full">
            {community?.name || "Orbit"}
          </button>
          <p className="text-xs text-ink-2 truncate">
            {post.who}
            <span className="mx-1 text-ink-3">·</span>
            {post.time}
          </p>
        </div>
        <IconButton icon="more_horiz" label="More" size={20} />
      </div>

      {/* media — edge to edge in the column, which is what the card border
          was previously preventing */}
      {post.imageUrl && (
        <button
          onClick={() => community && onOpen(community)}
          className="block w-full media rounded overflow-hidden mb-3"
        >
          <img src={post.imageUrl} alt="" loading="lazy" className="w-full max-h-[560px] object-cover" />
        </button>
      )}

      {/* actions */}
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
          <Icon name={liked ? "favorite" : "favorite"} size={24} className={liked ? "text-c-red" : "text-ink"} />
        </button>
        <IconButton icon="mode_comment" label="Comments" size={23} className="text-c-blue" onClick={() => community && onOpen(community)} />
        <IconButton icon="send" label="Share" size={23} className="text-c-violet" onClick={() => community && onOpen(community)} />
        <span className="flex-1" />
        <IconButton icon="bookmark" label="Save" size={23} className="text-c-amber" />
      </div>

      {/* meta */}
      <div className="pt-1.5 space-y-1">
        {post.sparks > 0 && (
          <p className="text-base font-semibold text-ink">
            {compact(post.sparks)} {post.sparks === 1 ? "spark" : "sparks"}
          </p>
        )}
        {post.text && (
          <p className="text-base text-ink leading-normal">
            <span className="font-semibold mr-1.5">{post.who}</span>
            {post.text}
          </p>
        )}
        <p className="text-2xs text-ink-3 uppercase tracking-wide pt-0.5">{post.time}</p>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ Rail */

// The replacement for the three stat cards: an inline metric strip.
function Metrics({ items }) {
  return (
    <div className="flex items-start">
      {items.map((m, i) => (
        <div key={m.label} className={cx("flex-1 min-w-0", i > 0 && "pl-4")}>
          <p className={cx("text-2xl font-bold tabular-nums leading-none", m.tint)}>{m.value}</p>
          <p className="text-2xs font-semibold text-ink-2 uppercase tracking-wide mt-1.5 truncate">{m.label}</p>
        </div>
      ))}
    </div>
  );
}

function RailRow({ title, meta, glyph, tint, avatarUrl, action, onOpen }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <button onClick={onOpen} className="shrink-0">
        {avatarUrl ? (
          <Avatar src={avatarUrl} name={title} size={34} />
        ) : (
          <span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-bg-sunken ring-1 ring-line">
            <Icon name={glyph} size={18} className={tint} />
          </span>
        )}
      </button>
      <button onClick={onOpen} className="min-w-0 flex-1 text-left leading-tight">
        <span className="block text-base font-semibold text-ink truncate hover:opacity-70">{title}</span>
        <span className="block text-xs text-ink-2 truncate">{meta}</span>
      </button>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------------- Screen */

export function HomeScreen({
  communities, joinedIds, onOpen, onCreateClick, interests,
  feedPosts, feedSparkIds, onSparkPost, onAdClick,
  events = [], userName, user, onJoinToggle, onGoToEvents, onGoToTea, onOpenProfile,
}) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const joined = useMemo(
    () => communities.filter((c) => joinedIds.includes(c.id)).sort((a, b) => a.lastActive - b.lastActive),
    [communities, joinedIds]
  );

  const suggested = useMemo(() => {
    const notJoined = communities.filter((c) => !joinedIds.includes(c.id));
    const byInterest = interests?.length
      ? [...notJoined].sort((a, b) => interestMatchCount(b, interests) - interestMatchCount(a, interests))
      : [...notJoined].sort((a, b) => communityTrendScore(b) - communityTrendScore(a));
    return byInterest.slice(0, 5);
  }, [communities, joinedIds, interests]);

  const upcoming = useMemo(() => events.slice(0, 3), [events]);
  const posts = feedPosts || [];
  const first = (userName || "").split(" ")[0];

  return (
    <Screen>
      <div className="max-w-shell mx-auto flex gap-8 xl:gap-16 px-4 sm:px-6 lg:pl-8">
        {/* Feed */}
        <div className="w-full max-w-feed mx-auto xl:mx-0 pb-16">
          <Stories communities={joined} onOpen={onOpen} onCreate={onCreateClick} />

          {loading ? (
            <div className="pt-6 space-y-8">
              {[0, 1].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-[34px] h-[34px] rounded-full bg-bg-sunken animate-pulse" />
                    <span className="h-3 w-32 rounded bg-bg-sunken animate-pulse" />
                  </div>
                  <div className="h-[380px] rounded bg-bg-sunken animate-pulse" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Empty
              icon="photo_camera"
              title="No posts yet"
              body="Posts from every community land here, newest first, as they're made."
              action={<Button variant="primary" size="md" icon="add" onClick={onCreateClick}>Create a community</Button>}
            />
          ) : (
            posts.map((p) => (
              <Post
                key={p.id}
                post={p}
                community={communities.find((c) => c.id === p.communityId)}
                liked={(feedSparkIds || []).includes(p.id)}
                onLike={onSparkPost}
                onOpen={onOpen}
              />
            ))
          )}
        </div>

        {/* Rail */}
        <aside className="hidden xl:block w-aside shrink-0 pt-8 pb-16">
          <div className="sticky top-8 space-y-7">
            {/* identity */}
            <button onClick={onOpenProfile} className="flex items-center gap-3 w-full text-left group">
              <Avatar name={userName || "Guest"} size={44} ring />
              <span className="min-w-0 leading-tight">
                <span className="block text-base font-semibold text-ink truncate group-hover:opacity-70">
                  {userName || "Guest"}
                </span>
                <span className="block text-xs text-ink-2 truncate">
                  {first ? `Welcome back, ${first}` : "Browsing as a guest"}
                </span>
              </span>
            </button>

            {/* the former stat cards */}
            <Metrics
              items={[
                { label: "Communities", value: joined.length, tint: "text-c-violet" },
                { label: "Events", value: events.length, tint: "text-c-orange" },
                { label: "Posts", value: posts.length, tint: "text-c-blue" },
              ]}
            />

            {suggested.length > 0 && (
              <section>
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-base font-semibold text-ink-2">Suggested for you</p>
                  <button onClick={() => onOpen && null} className="text-xs font-semibold text-ink hover:opacity-60">
                    <span onClick={onGoToTea} className="sr-only">All</span>
                  </button>
                </div>
                {suggested.map((c) => {
                  const cat = CATEGORIES.find((x) => x.name === c.category);
                  return (
                    <RailRow
                      key={c.id}
                      title={c.name.split(" — ")[0]}
                      meta={`${compact(c.members)} members · ${c.category}`}
                      glyph={cat?.msr}
                      tint={cat?.tint}
                      avatarUrl={c.avatarUrl}
                      onOpen={() => onOpen(c)}
                      action={
                        <button
                          onClick={() => onJoinToggle(c.id)}
                          className="text-xs font-semibold text-accent hover:text-accent-press shrink-0"
                        >
                          Join
                        </button>
                      }
                    />
                  );
                })}
              </section>
            )}

            {upcoming.length > 0 && (
              <section>
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-base font-semibold text-ink-2">Upcoming</p>
                  <button onClick={onGoToEvents} className="text-xs font-semibold text-accent hover:text-accent-press">
                    See all
                  </button>
                </div>
                {upcoming.map((e) => {
                  const cat = CATEGORIES.find((x) => x.name === e.category);
                  return (
                    <RailRow
                      key={e.id}
                      title={e.title}
                      meta={`${e.when} · ${e.where}`}
                      glyph={cat?.msr || "confirmation_number"}
                      tint={cat?.tint || "text-c-orange"}
                      onOpen={onGoToEvents}
                    />
                  );
                })}
              </section>
            )}

            <section>
              <button
                onClick={onGoToTea}
                className="w-full flex items-center gap-3 py-2 group text-left"
              >
                <span className="grid place-items-center w-[34px] h-[34px] rounded-full bg-bg-sunken ring-1 ring-line shrink-0">
                  <Icon name="local_cafe" size={18} className="text-c-pink" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-base font-semibold text-ink group-hover:opacity-70">Locali-Tea</span>
                  <span className="block text-xs text-ink-2">Anonymous · gone in 48h</span>
                </span>
              </button>
            </section>

            <p className="text-2xs text-ink-3 leading-relaxed">
              <a href="/terms" className="hover:underline">Terms</a>
              <span className="mx-1.5">·</span>
              <a href="/privacy" className="hover:underline">Privacy</a>
              <span className="mx-1.5">·</span>
              Built for Manipal University Jaipur
              <br />© 2026 Orbit
            </p>
          </div>
        </aside>
      </div>
    </Screen>
  );
}
