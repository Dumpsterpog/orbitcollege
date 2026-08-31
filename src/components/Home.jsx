import { useState, useMemo, useEffect } from "react";
import { CATEGORIES } from "../data/constants.js";
import { communityTrendScore, interestMatchCount } from "../utils/helpers.js";
import { Icon, Avatar, Button, IconButton, Textarea, cx } from "./ui/Primitives.jsx";
import { Screen, Modal } from "./ui/Layout.jsx";

// Home is the feed. Nothing else.
//
// The previous version turned Home into a getting-started page whenever the
// feed was empty — steps, a community grid, an events grid. That answered
// "what is this app" at the cost of the app never looking like what it is,
// and it duplicated Explore. The split is now the conventional one:
//
//   Home     posts, and the box you write one in
//   Explore  communities
//
// An empty feed is an empty feed. It says so, points at Explore, and gets
// out of the way — it does not become a different screen.

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

// Per-category mark tint, whole class strings so Tailwind's scanner sees
// them. Colour identifies the community; it never fills a container.
const MARK = {
  "text-c-blue": "bg-c-blue/10",
  "text-c-violet": "bg-c-violet/10",
  "text-c-pink": "bg-c-pink/10",
  "text-c-orange": "bg-c-orange/10",
  "text-c-amber": "bg-c-amber/10",
  "text-c-green": "bg-c-green/10",
  "text-c-teal": "bg-c-teal/10",
  "text-c-red": "bg-c-red/10",
};

function CommunityMark({ c, size = 40 }) {
  const cat = CATEGORIES.find((x) => x.name === c?.category);
  if (c?.avatarUrl) return <Avatar src={c.avatarUrl} name={c.name} size={size} />;
  return (
    <span
      className={cx("grid place-items-center rounded-full shrink-0 ring-1 ring-line", MARK[cat?.tint] || MARK["text-c-blue"])}
      style={{ width: size, height: size }}
    >
      <Icon name={cat?.msr || "groups"} size={Math.round(size * 0.48)} className={cat?.tint} />
    </span>
  );
}

/* ------------------------------------------------------------ Skeletons */

// Shaped like the real post card, so nothing shifts when content lands.
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
        <span className="block h-3 w-[60%] rounded-full bg-bg-sunken" />
      </div>
      <div className="h-[280px] rounded-lg bg-bg-sunken mt-4" />
      <div className="flex gap-6 mt-4">
        <span className="h-4 w-16 rounded-full bg-bg-sunken" />
        <span className="h-4 w-16 rounded-full bg-bg-sunken" />
        <span className="h-4 w-16 rounded-full bg-bg-sunken" />
      </div>
    </article>
  );
}

function RailSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2 animate-pulse">
      <span className="w-10 h-10 rounded-full bg-bg-sunken shrink-0" />
      <span className="min-w-0 flex-1 space-y-2">
        <span className="block h-3 w-28 rounded-full bg-bg-sunken" />
        <span className="block h-2.5 w-20 rounded-full bg-bg-sunken" />
      </span>
      <span className="h-7 w-14 rounded-full bg-bg-sunken shrink-0" />
    </div>
  );
}

/* ----------------------------------------------------------- Active row */

// Communities you're in, most recently active first. The accent ring is the
// "something happened here" signal, so it does the work a badge would.
function ActiveRow({ communities, onOpen, onCreate }) {
  if (communities.length === 0) return null;
  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <p className="text-xs font-bold text-ink-2 uppercase tracking-wide">Your communities</p>
        <span className="text-2xs text-ink-3 tabular-nums">{communities.length}</span>
      </div>
      <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-1">
        <button onClick={onCreate} className="flex flex-col items-center gap-1.5 w-[72px] shrink-0 group">
          <span className="grid place-items-center w-14 h-14 rounded-full border-2 border-dashed border-line group-hover:border-c-violet transition-colors">
            <Icon name="add" size={24} className="text-c-violet" />
          </span>
          <span className="text-2xs text-ink-2 truncate max-w-full">New</span>
        </button>
        {communities.map((c) => {
          const cat = CATEGORIES.find((x) => x.name === c.category);
          const live = c.lastActive <= 30;
          return (
            <button key={c.id} onClick={() => onOpen(c)} className="flex flex-col items-center gap-1.5 w-[72px] shrink-0 group">
              <span className={cx("grid place-items-center rounded-full p-[2.5px]", live ? "bg-accent" : "bg-line")}>
                <span className="grid place-items-center w-[52px] h-[52px] rounded-full bg-bg ring-2 ring-bg overflow-hidden">
                  {c.avatarUrl
                    ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                    : <Icon name={cat?.msr || "groups"} size={24} className={cat?.tint} />}
                </span>
              </span>
              <span className="text-2xs text-ink truncate max-w-full group-hover:opacity-70">
                {c.name.split(" — ")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Composer */

// The entry point. Collapsed it is a single tappable row — the pattern every
// feed product uses, because a permanently open textarea at the top of a
// feed is a wall you have to scroll past on every visit.
function ComposerBar({ user, onOpen, disabled, disabledHint }) {
  return (
    <div className="card p-3 flex items-center gap-3">
      <Avatar name={user?.name || "Guest"} size={40} ring={!!user?.verified} />
      <button
        onClick={onOpen}
        className="flex-1 min-w-0 text-left h-10 px-4 rounded-full bg-bg-sunken text-ink-2 text-base
          hover:bg-black/[0.06] dark:hover:bg-white/[0.10] transition-colors truncate"
      >
        {disabled ? disabledHint : `What's happening, ${(user?.name || "").split(" ")[0] || "there"}?`}
      </button>
      <Button tone="blue" size="sm" icon="edit" onClick={onOpen} className="shrink-0 hidden sm:inline-flex">
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
          <Button tone="blue" size="md" onClick={submit} disabled={!canPost} loading={busy}>
            Post
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <Avatar name={user?.name || "You"} size={40} ring />
        <div className="min-w-0 flex-1">
          {/* Community picker. A post has to land somewhere, so this is the
              first decision, not a detail buried under the text field. */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
            {communities.map((c) => {
              const cat = CATEGORIES.find((x) => x.name === c.category);
              const on = c.id === communityId;
              return (
                <button
                  key={c.id}
                  onClick={() => setCommunityId(c.id)}
                  className={cx(
                    "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold shrink-0 transition-colors",
                    on ? "bg-solid text-solid-ink" : "bg-bg-sunken text-ink-2 hover:text-ink"
                  )}
                >
                  <Icon name={cat?.msr || "groups"} size={15} className={on ? "" : cat?.tint} />
                  {c.name.split(" — ")[0]}
                </button>
              );
            })}
          </div>

          <Textarea
            autoFocus
            rows={6}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={target ? `Share something with ${target.name.split(" — ")[0]}…` : "Pick a community first"}
            className="bg-transparent px-0 text-md"
          />
        </div>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------------- Post */

function Post({ post, community, liked, onLike, onOpen }) {
  const [burst, setBurst] = useState(false);
  const like = () => {
    if (!liked) { setBurst(true); setTimeout(() => setBurst(false), 320); }
    onLike(post.id);
  };

  return (
    <article className="card p-4">
      <div className="flex items-center gap-3">
        <button onClick={() => community && onOpen(community)} className="shrink-0">
          <CommunityMark c={community} size={40} />
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <button
            onClick={() => community && onOpen(community)}
            className="block max-w-full text-base font-bold text-ink truncate hover:opacity-70"
          >
            {community?.name?.split(" — ")[0] || "Orbit"}
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

      {post.sparks > 0 && (
        <p className="text-xs text-ink-2 mt-3">
          <Icon name="local_fire_department" size={14} className="text-c-orange inline-block -mt-0.5 mr-1" />
          <span className="font-semibold text-ink tabular-nums">{compact(post.sparks)}</span> sparked this
        </p>
      )}

      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-line">
        <button
          onClick={like}
          aria-pressed={liked}
          className={cx(
            "flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-full text-base font-semibold transition-colors",
            "hover:bg-black/[0.05] dark:hover:bg-white/[0.08] active:scale-[0.97]",
            liked ? "text-c-orange" : "text-ink-2",
            burst && "animate-heart"
          )}
        >
          <Icon name="local_fire_department" size={21} className={liked ? "text-c-orange" : "text-c-orange"} />
          Spark
        </button>
        <button
          onClick={() => community && onOpen(community)}
          className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-full text-base font-semibold text-ink-2
            hover:bg-black/[0.05] dark:hover:bg-white/[0.08] active:scale-[0.97] transition-colors"
        >
          <Icon name="mode_comment" size={20} className="text-c-blue" />
          Comment
        </button>
        <button
          onClick={() => community && onOpen(community)}
          className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-full text-base font-semibold text-ink-2
            hover:bg-black/[0.05] dark:hover:bg-white/[0.08] active:scale-[0.97] transition-colors"
        >
          <Icon name="group" size={20} className="text-c-violet" />
          Community
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
  events = [], registeredEventIds = [], onRegisterEvent, onGoToEvents, onGoToTea,
}) {
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [scope, setScope] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const joined = useMemo(
    () => communities.filter((c) => joinedIds.includes(c.id)),
    [communities, joinedIds]
  );

  const suggested = useMemo(() => {
    const pool = communities.filter((c) => !joinedIds.includes(c.id));
    return (interests?.length
      ? [...pool].sort((a, b) => interestMatchCount(b, interests) - interestMatchCount(a, interests))
      : [...pool].sort((a, b) => communityTrendScore(b) - communityTrendScore(a))
    ).slice(0, 5);
  }, [communities, joinedIds, interests]);

  const liveNow = useMemo(
    () => communities.filter((c) => c.lastActive <= 60).length,
    [communities]
  );

  const openEvents = useMemo(
    () => events.filter((e) => !registeredEventIds.includes(e.id)).slice(0, 3),
    [events, registeredEventIds]
  );

  const allPosts = feedPosts || [];
  // "Following" is posts from communities you're actually in — a real subset,
  // not a re-sort dressed up as a filter.
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

  return (
    <Screen>
      <div className="w-full max-w-[1100px] mx-auto flex gap-8 xl:gap-12 px-4 sm:px-6 lg:px-8">
        {/* Feed */}
        <div className="w-full min-w-0 max-w-[640px] mx-auto lg:mx-0 py-6 space-y-4">
          <ComposerBar
            user={user ? { ...user, name: userName } : null}
            onOpen={openComposer}
            disabled={!canPost}
            disabledHint={
              !user?.verified ? "Sign in to post" : "Join a community to start posting"
            }
          />

          {!loading && joined.length > 0 && (
            <ActiveRow communities={joined} onOpen={onOpen} onCreate={onCreateClick} />
          )}

          {/* Scope. Only worth showing once there is something to narrow. */}
          {!loading && allPosts.length > 0 && joined.length > 0 && (
            <div className="flex items-center gap-1 px-1">
              {[
                { key: "all", label: "All posts", n: allPosts.length },
                { key: "following", label: "Your communities", n: followingCount },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setScope(t.key)}
                  className={cx(
                    "inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-semibold transition-colors",
                    scope === t.key
                      ? "bg-solid text-solid-ink"
                      : "text-ink-2 hover:text-ink hover:bg-bg-sunken"
                  )}
                >
                  {t.label}
                  <span className={cx("tabular-nums", scope === t.key ? "opacity-60" : "text-ink-3")}>{t.n}</span>
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : posts.length === 0 ? (
            // An empty feed, not a different page — but the space under it
            // is filled with the things that would fill the feed, joinable
            // in place rather than one navigation away.
            <>
            <div className="card px-6 py-14 text-center">
              <span className="grid place-items-center w-14 h-14 rounded-full bg-bg-sunken mx-auto mb-4">
                <Icon name="dynamic_feed" size={28} className="text-c-violet" />
              </span>
              <p className="text-lg font-bold text-ink">Your feed is empty</p>
              <p className="text-base text-ink-2 mt-1.5 max-w-sm mx-auto leading-relaxed">
                {scope === "following" && allPosts.length > 0
                  ? "Nothing from your communities yet. Switch to All posts to see the rest of campus."
                  : joined.length === 0
                    ? "Join a few communities and everything they post shows up here."
                    : "Nobody in your communities has posted yet. Be the first."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
                {joined.length === 0 ? (
                  <Button tone="teal" size="md" icon="explore" onClick={onGoToExplore}>
                    Find communities
                  </Button>
                ) : (
                  <Button tone="blue" size="md" icon="edit" onClick={openComposer}>
                    Write a post
                  </Button>
                )}
                <Button tone="violet" size="md" icon="add" onClick={onCreateClick}>
                  Create a community
                </Button>
              </div>
            </div>

            {suggested.length > 0 && (
              <section>
                <div className="flex items-baseline justify-between mb-3 px-1">
                  <h2 className="text-base font-bold text-ink">
                    {interests?.length ? "Picked for you" : "Popular right now"}
                  </h2>
                  <button onClick={onGoToExplore} className="text-xs font-semibold text-accent hover:opacity-70">
                    Browse all
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {suggested.map((c) => {
                    const cat = CATEGORIES.find((x) => x.name === c.category);
                    return (
                      <article key={c.id} className="card p-4 flex flex-col">
                        <div className="flex items-start gap-3">
                          <button onClick={() => onOpen(c)} className="shrink-0">
                            <CommunityMark c={c} size={40} />
                          </button>
                          <div className="min-w-0 flex-1">
                            <button onClick={() => onOpen(c)} className="text-left block w-full min-w-0">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <span className="text-base font-bold text-ink truncate hover:opacity-70">
                                  {c.name.split(" — ")[0]}
                                </span>
                                {c.official && <Icon name="verified" size={14} className="text-c-blue shrink-0" />}
                              </span>
                            </button>
                            <span className="flex items-center gap-1.5 text-xs mt-0.5 min-w-0">
                              <Icon name={cat?.msr || "groups"} size={13} className={cat?.tint} />
                              <span className={cx("font-semibold truncate", cat?.tint)}>{c.category}</span>
                              <span className="text-ink-3">·</span>
                              <span className="text-ink-2 tabular-nums shrink-0">{compact(c.members)}</span>
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-ink-2 leading-normal line-clamp-2 mt-2.5 flex-1">{c.desc}</p>
                        <Button tone="green" size="sm" onClick={() => onJoinToggle(c.id)} className="mt-3 w-full">
                          Join
                        </Button>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {openEvents.length > 0 && (
              <section>
                <div className="flex items-baseline justify-between mb-3 px-1">
                  <h2 className="text-base font-bold text-ink">Happening soon</h2>
                  <button onClick={onGoToEvents} className="text-xs font-semibold text-accent hover:opacity-70">
                    All events
                  </button>
                </div>
                <div className="space-y-2.5">
                  {openEvents.map((e) => {
                    const cat = CATEGORIES.find((x) => x.name === e.category);
                    const [head, ...rest] = String(e.when || "").split(/[\s,]+/).filter(Boolean);
                    return (
                      <article key={e.id} className="card p-4 flex items-center gap-4">
                        <span className="w-12 shrink-0 text-center leading-none">
                          <span className={cx("block text-lg font-bold tabular-nums", cat?.tint || "text-c-orange")}>
                            {head || "TBA"}
                          </span>
                          <span className="block text-2xs font-semibold text-ink-2 uppercase mt-1 truncate">
                            {rest.slice(0, 1).join(" ")}
                          </span>
                        </span>
                        <span className="w-px self-stretch bg-line shrink-0" />
                        <span className="min-w-0 flex-1">
                          <button onClick={onGoToEvents} className="text-left block w-full">
                            <span className="block text-base font-bold text-ink truncate hover:opacity-70">{e.title}</span>
                          </button>
                          <span className="flex items-center gap-3 text-xs text-ink-2 mt-1 min-w-0">
                            <span className="inline-flex items-center gap-1 min-w-0">
                              <Icon name="location_on" size={13} className="text-c-pink shrink-0" />
                              <span className="truncate">{e.where}</span>
                            </span>
                          </span>
                        </span>
                        <Button tone="orange" size="sm" onClick={() => onRegisterEvent && onRegisterEvent(e)} className="shrink-0">
                          Register
                        </Button>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
            </>
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

        {/* Rail — suggestions only. Communities live on Explore; this is the
            shortcut, not the directory. */}
        <aside className="hidden lg:block w-aside shrink-0 py-6">
          <div className="sticky top-6 space-y-6">
            {/* Registration open. Every listed event accepts a registration,
                so "open" here means the ones you haven't taken yet — the
                schema has no open/closed flag to read, and inventing one
                would put a label on the card that nothing backs. */}
            {openEvents.length > 0 && (
              <section className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="confirmation_number" size={18} className="text-c-orange" />
                  <h2 className="text-base font-bold text-ink flex-1">Registration open</h2>
                  <span className="text-2xs font-bold text-c-orange tabular-nums">{openEvents.length}</span>
                </div>

                <div className="space-y-3">
                  {openEvents.map((e) => {
                    const cat = CATEGORIES.find((x) => x.name === e.category);
                    const [head, ...rest] = String(e.when || "").split(/[\s,]+/).filter(Boolean);
                    return (
                      <div key={e.id} className="flex items-start gap-3">
                        <span className="w-10 shrink-0 text-center leading-none pt-0.5">
                          <span className={cx("block text-base font-bold tabular-nums", cat?.tint || "text-c-orange")}>
                            {head || "TBA"}
                          </span>
                          <span className="block text-2xs font-semibold text-ink-2 uppercase mt-1 truncate">
                            {rest.slice(0, 1).join(" ")}
                          </span>
                        </span>

                        <span className="min-w-0 flex-1">
                          <button onClick={onGoToEvents} className="text-left block w-full">
                            <span className="block text-base font-semibold text-ink truncate hover:opacity-70">
                              {e.title}
                            </span>
                          </button>
                          <span className="flex items-center gap-1 text-xs text-ink-2 mt-0.5 min-w-0">
                            <Icon name="location_on" size={13} className="text-c-pink shrink-0" />
                            <span className="truncate">{e.where}</span>
                          </span>
                          <Button
                            tone="orange"
                            size="xs"
                            className="mt-2"
                            onClick={() => onRegisterEvent && onRegisterEvent(e)}
                          >
                            Register
                          </Button>
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={onGoToEvents}
                  className="w-full text-center text-xs font-semibold text-accent hover:opacity-70 pt-3 mt-3 border-t border-line"
                >
                  All events
                </button>
              </section>
            )}

            <section className="card p-4">
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="text-base font-bold text-ink">Suggested communities</h2>
              </div>
              {loading ? (
                <><RailSkeleton /><RailSkeleton /><RailSkeleton /></>
              ) : suggested.length === 0 ? (
                <p className="text-xs text-ink-2 py-2">You've joined everything there is. Try creating one.</p>
              ) : (
                suggested.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-2">
                    <button onClick={() => onOpen(c)} className="shrink-0">
                      <CommunityMark c={c} size={40} />
                    </button>
                    <button onClick={() => onOpen(c)} className="min-w-0 flex-1 text-left leading-tight">
                      <span className="block text-base font-semibold text-ink truncate hover:opacity-70">
                        {c.name.split(" — ")[0]}
                      </span>
                      <span className="block text-xs text-ink-2 truncate">
                        {compact(c.members)} members · {c.category}
                      </span>
                    </button>
                    <Button tone="green" size="xs" onClick={() => onJoinToggle(c.id)} className="shrink-0">
                      Join
                    </Button>
                  </div>
                ))
              )}
              <button
                onClick={onGoToExplore}
                className="w-full text-center text-xs font-semibold text-accent hover:opacity-70 pt-3 mt-1 border-t border-line"
              >
                Browse all communities
              </button>
            </section>

            {/* Campus pulse. Every number here is counted from data already
                on the page — nothing is estimated, and the card disappears
                rather than showing zeroes if there's nothing to count. */}
            {(communities.length > 0 || allPosts.length > 0) && (
              <section className="card p-4">
                <div className="flex items-center gap-2 mb-3.5">
                  <Icon name="insights" size={18} className="text-c-teal" />
                  <h2 className="text-base font-bold text-ink">Campus right now</h2>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { n: communities.length, label: "Communities", tint: "text-c-violet" },
                    { n: allPosts.length, label: "Posts", tint: "text-c-blue" },
                    { n: events.length, label: "Events", tint: "text-c-orange" },
                  ].map((m) => (
                    <div key={m.label} className="text-center">
                      <p className={cx("text-xl font-bold tabular-nums leading-none", m.tint)}>{m.n}</p>
                      <p className="text-2xs text-ink-2 mt-1.5 truncate">{m.label}</p>
                    </div>
                  ))}
                </div>
                {liveNow > 0 && (
                  <p className="flex items-center justify-center gap-1.5 text-xs text-ink-2 mt-3.5 pt-3 border-t border-line">
                    <span className="w-1.5 h-1.5 rounded-full bg-c-green animate-pulse" />
                    <span className="font-bold text-ink tabular-nums">{liveNow}</span>
                    {liveNow === 1 ? "community" : "communities"} active in the last hour
                  </p>
                )}
              </section>
            )}

            {/* Locali-Tea. Its own card rather than a rail row — it's a
                separate surface, not a shortcut to one more list. */}
            <section className="card p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="grid place-items-center w-9 h-9 rounded-full bg-c-pink/10 shrink-0">
                  <Icon name="local_cafe" size={19} className="text-c-pink" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-ink">Locali-Tea</h2>
                  <p className="text-2xs text-ink-2">Anonymous · gone in 48h</p>
                </div>
              </div>
              <p className="text-xs text-ink-2 leading-relaxed mb-3">
                Campus confessions and gossip, posted without a name attached. Everything disappears after two days.
              </p>
              <Button tone="pink" size="sm" icon="local_cafe" onClick={onGoToTea} className="w-full">
                Open Locali-Tea
              </Button>
            </section>

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
