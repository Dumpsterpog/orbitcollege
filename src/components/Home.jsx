import { useState, useMemo, useEffect } from "react";
import { CATEGORIES } from "../data/constants.js";
import { communityTrendScore, interestMatchCount } from "../utils/helpers.js";
import { Icon, Avatar, Button, IconButton, Textarea, cx } from "./ui/Primitives.jsx";
import { Screen, Modal } from "./ui/Layout.jsx";

// Home.
//
// Rebuilt after a design review that found the previous version was showing
// the same two lists twice on one screen, and dressing communities up in the
// icon-in-a-tinted-circle + coloured-chip + full-width-fill pattern that any
// generator produces. Four decisions came out of it:
//
//   Communities are a roster, not a gallery. A table with a key row, names
//   at reading size and right-aligned monospace counts. No glyph, no chip, no
//   filled button per row. Eight fit where five cards did.
//
//   Nothing appears twice. Discovery lives in the main column when the feed
//   is empty, and in the rail when it isn't. Never both.
//
//   Two states, two layouts. Nothing to read means one 720px column and no
//   rail — a rail of secondary content beside a column of secondary content
//   has no primary. A populated feed means the two-column grid.
//
//   Colour means something or it goes. Decorative tints on headings, on post
//   actions and on stat numbers are gone; what's left is the category label
//   and the spark state.

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

// Community names carry a human-written subtitle after an em dash
// ("DSA Grinders — 6AM Batch"). It was being thrown away at five call sites;
// it's free copy, so it gets shown.
const splitName = (name = "") => {
  const [head, ...rest] = name.split(" — ");
  return { head, tail: rest.join(" — ") || null };
};

const since = (m) =>
  m == null ? null : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;

const REAL_DESC = (d) => d && d !== "No description yet." && d.trim().length > 12;

/* ------------------------------------------------------------ Skeletons */

function PostSkeleton() {
  return (
    <article className="card p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-bg-sunken shrink-0" />
        <span className="min-w-0 flex-1 space-y-2">
          <span className="block h-3 w-40 rounded-full bg-bg-sunken" />
          <span className="block h-2.5 w-24 rounded-full bg-bg-sunken" />
        </span>
      </div>
      <div className="space-y-2 mt-4">
        <span className="block h-3 w-full rounded-full bg-bg-sunken" />
        <span className="block h-3 w-[85%] rounded-full bg-bg-sunken" />
      </div>
      <div className="h-[240px] rounded-lg bg-bg-sunken mt-4" />
    </article>
  );
}

/* -------------------------------------------------------------- Roster */

// The replacement for the community card grid. A key row plus hairline-
// separated lines: name and subtitle on the left, member count and last
// activity right-aligned in monospace, Join as a quiet outline pill. The one
// piece of colour is a left edge bar on rows active in the last half hour.
function Roster({ communities, joinedIds, onOpen, onJoin, showKey = true }) {
  // Counts are only worth a column once they mean something. On a young app
  // a column of 1 / 3 / 6 is noise, so the emphasis flips to recency.
  const peak = Math.max(...communities.map((c) => c.members || 0), 0);
  const countsMatter = peak >= 25;

  return (
    <div>
      {showKey && (
        <div className="grid grid-cols-[1fr_84px_76px] items-baseline gap-3 px-1 pb-2 border-b border-line">
          <span className="text-2xs font-semibold uppercase tracking-[0.09em] text-ink-3">Community</span>
          <span className="text-2xs font-semibold uppercase tracking-[0.09em] text-ink-3 text-right">
            {countsMatter ? "Members" : "Active"}
          </span>
          <span />
        </div>
      )}

      <div className="divide-y divide-line">
        {communities.map((c) => {
          const { head, tail } = splitName(c.name);
          const joined = joinedIds.includes(c.id);
          const live = c.lastActive <= 30;
          const sub = tail || (REAL_DESC(c.desc) ? c.desc : c.creator ? `Started by ${c.creator}` : null);

          return (
            <div
              key={c.id}
              className="relative grid grid-cols-[1fr_84px_76px] items-center gap-3 py-3 px-1 group"
            >
              {live && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-accent" />}

              <button onClick={() => onOpen(c)} className="min-w-0 text-left">
                <span className="block text-md font-semibold text-ink truncate leading-tight group-hover:opacity-70 transition-opacity">
                  {head}
                </span>
                <span className="flex items-center mt-1 min-w-0 text-2xs">
                  <span className="uppercase tracking-[0.07em] font-semibold text-ink-3 shrink-0">
                    {c.category}
                  </span>
                  {c.official && (
                    <>
                      <span className="inline-block w-px h-2.5 bg-line mx-2 shrink-0" />
                      <span className="uppercase tracking-[0.1em] font-semibold text-ink-3 shrink-0">Official</span>
                    </>
                  )}
                  {sub && (
                    <>
                      <span className="inline-block w-px h-2.5 bg-line mx-2 shrink-0" />
                      <span className="text-ink-2 truncate">{sub}</span>
                    </>
                  )}
                </span>
              </button>

              <span className="text-right leading-tight">
                <span className="block font-mono text-sm tabular-nums text-ink">
                  {countsMatter ? (c.members || 0).toLocaleString() : since(c.lastActive)}
                </span>
                <span className="block font-mono text-2xs text-ink-3">
                  {countsMatter ? since(c.lastActive) : `${c.members || 0} in`}
                </span>
              </span>

              <Button
                variant={joined ? "outline" : "outline"}
                size="xs"
                onClick={() => onJoin(c.id)}
                className="w-full"
                disabled={joined}
              >
                {joined ? "Joined" : "Join"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Event list */

function EventList({ events, onRegister, onOpen }) {
  return (
    <div className="divide-y divide-line">
      {events.map((e) => {
        const [head, ...rest] = String(e.when || "").split(/[\s,]+/).filter(Boolean);
        return (
          <div key={e.id} className="flex items-center gap-4 py-3 px-1 group">
            <span className="w-12 shrink-0 text-center leading-none">
              <span className="block font-mono text-base font-semibold tabular-nums text-ink">{head || "TBA"}</span>
              <span className="block text-2xs font-semibold uppercase tracking-wide text-ink-3 mt-1 truncate">
                {rest.slice(0, 1).join(" ")}
              </span>
            </span>
            <button onClick={onOpen} className="min-w-0 flex-1 text-left">
              <span className="block text-md font-semibold text-ink truncate leading-tight group-hover:opacity-70 transition-opacity">
                {e.title}
              </span>
              <span className="block text-2xs text-ink-2 truncate mt-1">
                <span className="uppercase tracking-[0.07em] font-semibold text-ink-3">{e.category}</span>
                <span className="inline-block w-px h-2.5 bg-line mx-2 align-middle" />
                {e.where}
              </span>
            </button>
            <Button variant="outline" size="xs" onClick={() => onRegister?.(e)} className="shrink-0">
              Register
            </Button>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------- Composer */

function ComposerBar({ user, onOpen }) {
  return (
    <div className="card p-3 flex items-center gap-3">
      <Avatar name={user?.name || "Guest"} size={40} ring={!!user?.verified} />
      <button
        onClick={onOpen}
        className="flex-1 min-w-0 text-left h-10 px-4 rounded-full bg-bg-sunken text-ink-2 text-base
          hover:bg-black/[0.06] dark:hover:bg-white/[0.10] transition-colors truncate"
      >
        {`What's happening, ${(user?.name || "").split(" ")[0] || "there"}?`}
      </button>
      <Button tone="blue" size="sm" onClick={onOpen} className="shrink-0 hidden sm:inline-flex">
        Post
      </Button>
    </div>
  );
}

function ComposerModal({ user, communities, onClose, onSubmit }) {
  const [communityId, setCommunityId] = useState(communities[0]?.id || null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const target = communities.find((c) => c.id === communityId);
  const canPost = !!text.trim() && !!communityId && !busy;

  const submit = async () => {
    if (!canPost) return;
    setBusy(true);
    const ok = await onSubmit(communityId, text);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal
      title="New post"
      onClose={onClose}
      width="max-w-lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-ink-3 tabular-nums">{text.length}/2000</span>
          <Button tone="blue" size="md" onClick={submit} disabled={!canPost} loading={busy}>Post</Button>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <Avatar name={user?.name || "You"} size={40} ring />
        <div className="min-w-0 flex-1">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
            {communities.map((c) => {
              const on = c.id === communityId;
              return (
                <button
                  key={c.id}
                  onClick={() => setCommunityId(c.id)}
                  className={cx(
                    "h-8 px-3 rounded-full text-xs font-semibold shrink-0 transition-colors",
                    on ? "bg-solid text-solid-ink" : "bg-bg-sunken text-ink-2 hover:text-ink"
                  )}
                >
                  {splitName(c.name).head}
                </button>
              );
            })}
          </div>
          <Textarea
            autoFocus rows={6} maxLength={2000} value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={target ? `Share something with ${splitName(target.name).head}…` : "Pick a community first"}
            className="bg-transparent px-0 text-md"
          />
        </div>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------------- Post */

function Post({ post, community, liked, onLike, onOpen }) {
  const { head } = splitName(community?.name || "Orbit");
  return (
    <article className="card card-interactive p-4">
      <div className="flex items-center gap-3">
        <button onClick={() => community && onOpen(community)} className="shrink-0">
          {community?.avatarUrl
            ? <Avatar src={community.avatarUrl} name={head} size={40} />
            : <Avatar name={head} size={40} />}
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <button
            onClick={() => community && onOpen(community)}
            className="block max-w-full text-base font-bold text-ink truncate hover:opacity-70"
          >
            {head}
          </button>
          <p className="text-xs text-ink-2 truncate">
            {post.who}<span className="mx-1 text-ink-3">·</span>{post.time}
          </p>
        </div>
        <IconButton icon="more_horiz" label="More" size={20} />
      </div>

      {post.text && <p className="text-md text-ink leading-relaxed mt-3 whitespace-pre-wrap">{post.text}</p>}

      {post.imageUrl && (
        <button
          onClick={() => community && onOpen(community)}
          className="block w-full media rounded-lg overflow-hidden mt-3 ring-1 ring-line"
        >
          <img src={post.imageUrl} alt="" loading="lazy" className="w-full max-h-[560px] object-cover" />
        </button>
      )}

      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-line">
        <button
          onClick={() => onLike(post.id)}
          aria-pressed={liked}
          className={cx(
            "inline-flex items-center gap-2 h-9 px-3 rounded-full text-base font-semibold transition-colors",
            "hover:bg-black/[0.05] dark:hover:bg-white/[0.08] active:scale-[0.97]",
            // The only coloured icon in the bar, so the colour means "you did
            // this" rather than decorating a row of equal-rank actions.
            liked ? "text-c-orange" : "text-ink-2"
          )}
        >
          <Icon name="local_fire_department" size={20} />
          {post.sparks > 0 ? compact(post.sparks) : "Spark"}
        </button>
        <button
          onClick={() => community && onOpen(community)}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-full text-base font-semibold text-ink-2
            hover:bg-black/[0.05] dark:hover:bg-white/[0.08] active:scale-[0.97] transition-colors"
        >
          <Icon name="mode_comment" size={19} />Comment
        </button>
        <button
          onClick={() => community && onOpen(community)}
          className="ml-auto inline-flex items-center gap-2 h-9 px-3 rounded-full text-base font-semibold text-ink-2
            hover:bg-black/[0.05] dark:hover:bg-white/[0.08] active:scale-[0.97] transition-colors"
        >
          Open
        </button>
      </div>
    </article>
  );
}

/* --------------------------------------------------------------- Screen */

export function HomeScreen({
  communities, joinedIds, onOpen, onCreateClick, interests,
  feedPosts, feedSparkIds, onSparkPost, onCreatePost,
  userName, user, onJoinToggle, onGoToExplore,
  events = [], registeredEventIds = [], onRegisterEvent, onGoToEvents,
}) {
  // Only fake a load when there is genuinely nothing in memory. Firing it on
  // every mount meant tabbing back to Home flashed skeletons over data that
  // was already there, then collapsed the layout by ~1000px.
  const [loading, setLoading] = useState(() => !(feedPosts || []).length);
  const [composing, setComposing] = useState(false);
  const [scope, setScope] = useState("all");

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, [loading]);

  const joined = useMemo(
    () => communities.filter((c) => joinedIds.includes(c.id)),
    [communities, joinedIds]
  );

  const suggested = useMemo(() => {
    const pool = communities.filter((c) => !joinedIds.includes(c.id));
    return interests?.length
      ? [...pool].sort((a, b) => interestMatchCount(b, interests) - interestMatchCount(a, interests))
      : [...pool].sort((a, b) => communityTrendScore(b) - communityTrendScore(a));
  }, [communities, joinedIds, interests]);

  const openEvents = useMemo(
    () => events.filter((e) => !registeredEventIds.includes(e.id)),
    [events, registeredEventIds]
  );

  const allPosts = feedPosts || [];
  const posts = useMemo(
    () => (scope === "following" ? allPosts.filter((p) => joinedIds.includes(p.communityId)) : allPosts),
    [allPosts, scope, joinedIds]
  );
  const followingCount = useMemo(
    () => allPosts.filter((p) => joinedIds.includes(p.communityId)).length,
    [allPosts, joinedIds]
  );

  const canPost = !!user?.verified && joined.length > 0;
  const openComposer = () => {
    if (!user?.verified) { onJoinToggle?.(null); return; }
    if (joined.length === 0) { onGoToExplore(); return; }
    setComposing(true);
  };

  const first = (userName || "").split(" ")[0];

  /* ---------------- State A: nothing to read ---------------- */
  // One column, no rail. A rail of secondary content beside a column of
  // secondary content has no primary, and the two would list the same things.
  if (!loading && allPosts.length === 0) {
    return (
      <Screen>
        <div className="w-full max-w-[720px] mx-auto px-4 sm:px-6 pt-10 pb-16 space-y-10">
          <header>
            <h1 className="text-3xl font-bold text-ink">
              {first ? `Welcome back, ${first}` : "Welcome to Orbit"}
            </h1>
            <p className="text-md text-ink-2 mt-1.5">
              Every club, community and event at MUJ, in one feed. Join a few and this page fills up.
            </p>
          </header>

          {suggested.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-base font-bold text-ink">
                  {interests?.length ? "Matched to your interests" : "Most active right now"}
                </h2>
                <button onClick={onGoToExplore} className="text-xs font-semibold text-accent hover:opacity-70">
                  Browse all
                </button>
              </div>
              <Roster
                communities={suggested.slice(0, 8)}
                joinedIds={joinedIds}
                onOpen={onOpen}
                onJoin={onJoinToggle}
              />
            </section>
          )}

          {openEvents.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-base font-bold text-ink">Happening soon</h2>
                <button onClick={onGoToEvents} className="text-xs font-semibold text-accent hover:opacity-70">
                  All events
                </button>
              </div>
              <EventList events={openEvents.slice(0, 4)} onRegister={onRegisterEvent} onOpen={onGoToEvents} />
            </section>
          )}

          <section className="flex flex-wrap gap-2.5 pt-2">
            <Button tone="violet" size="md" icon="add" onClick={onCreateClick}>Start a community</Button>
            <Button variant="outline" size="md" onClick={onGoToExplore}>Explore everything</Button>
          </section>
        </div>
      </Screen>
    );
  }

  /* ---------------- State B: populated feed ---------------- */
  return (
    <Screen>
      <div className="w-full max-w-[1040px] mx-auto px-4 sm:px-6 grid justify-center gap-8 grid-cols-1 lg:grid-cols-[minmax(0,640px)_320px]">
        {/* Feed */}
        <div className="min-w-0 pt-6 pb-16">
          {/* Cluster: the things that are about you, tight together. */}
          <div className="space-y-3">
            {canPost && <ComposerBar user={{ ...user, name: userName }} onOpen={openComposer} />}

            {joined.length > 0 && (
              <div className="card p-3">
                <div className="flex gap-3.5 overflow-x-auto no-scrollbar">
                  {joined.map((c) => {
                    const { head } = splitName(c.name);
                    const live = c.lastActive <= 30;
                    return (
                      <button key={c.id} onClick={() => onOpen(c)} className="flex flex-col items-center gap-1.5 w-[68px] shrink-0 group">
                        <Avatar src={c.avatarUrl} name={head} size={48} ring={live} />
                        <span className="text-2xs text-ink truncate max-w-full group-hover:opacity-70">{head}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Spine: sticky scope, full-bleed past the container padding. */}
          <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 mt-8 mb-4 px-4 sm:px-6 py-2 bg-bg/85 backdrop-blur-md flex items-center gap-1">
            {[
              { key: "all", label: "All posts", n: allPosts.length },
              { key: "following", label: "Your communities", n: followingCount },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setScope(t.key)}
                className={cx(
                  "inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-semibold transition-colors",
                  scope === t.key ? "bg-solid text-solid-ink" : "text-ink-2 hover:text-ink hover:bg-bg-sunken"
                )}
              >
                {t.label}
                <span className={cx("tabular-nums", scope === t.key ? "opacity-60" : "text-ink-3")}>{t.n}</span>
              </button>
            ))}
            {joined.length === 0 && (
              <span className="ml-auto text-2xs text-ink-3">Showing all of campus</span>
            )}
          </div>

          <div className="space-y-4">
            {loading ? (
              <><PostSkeleton /><PostSkeleton /></>
            ) : posts.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-lg font-bold text-ink">Nothing here yet</p>
                <p className="text-base text-ink-2 mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Nothing from your communities. Switch to All posts to see the rest of campus.
                </p>
                <Button variant="outline" size="md" onClick={() => setScope("all")} className="mt-5">
                  Show all posts
                </Button>
              </div>
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
        </div>

        {/* Rail: two panels, height-capped so nothing sits below the fold
            permanently unreachable. */}
        <aside className="hidden lg:block pt-6 pb-16">
          <div className="sticky top-6 space-y-4 max-h-[calc(100dvh-3rem)] overflow-y-auto no-scrollbar">
            {openEvents.length > 0 && (
              <section className="card p-4">
                <div className="flex items-baseline justify-between mb-1">
                  <h2 className="text-base font-bold text-ink">Registration open</h2>
                  <span className="text-2xs font-semibold text-ink-3 tabular-nums">{openEvents.length}</span>
                </div>
                <EventList events={openEvents.slice(0, 3)} onRegister={onRegisterEvent} onOpen={onGoToEvents} />
                <button
                  onClick={onGoToEvents}
                  className="w-full text-center text-xs font-semibold text-accent hover:opacity-70 pt-3 mt-1 border-t border-line"
                >
                  All events
                </button>
              </section>
            )}

            {suggested.length > 0 && (
              <section className="card p-4">
                <h2 className="text-base font-bold text-ink mb-2">Suggested communities</h2>
                <Roster
                  communities={suggested.slice(0, 3)}
                  joinedIds={joinedIds}
                  onOpen={onOpen}
                  onJoin={onJoinToggle}
                  showKey={false}
                />
                <button
                  onClick={onGoToExplore}
                  className="w-full text-center text-xs font-semibold text-accent hover:opacity-70 pt-3 mt-1 border-t border-line"
                >
                  Browse all communities
                </button>
              </section>
            )}
          </div>
        </aside>
      </div>

      {composing && (
        <ComposerModal
          user={{ ...user, name: userName }}
          communities={joined}
          onClose={() => setComposing(false)}
          onSubmit={onCreatePost}
        />
      )}
    </Screen>
  );
}
