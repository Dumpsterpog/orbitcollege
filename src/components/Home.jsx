import { useState, useMemo, useEffect } from "react";
import { CATEGORIES } from "../data/constants.js";
import { Icon, Avatar, Button, IconButton, Textarea, cx } from "./ui/Primitives.jsx";
import { Screen, Modal } from "./ui/Layout.jsx";

// Home is the campus feed: every post from every community, newest first.
//
// Discovery lives in the right rail, not in the feed column. Earlier versions
// put a community directory *inside* the feed whenever it ran dry, which read
// as filler because it was — the page changed shape depending on whether
// anyone had posted. The rail fixes that: it is always there, so the layout
// is the same on an empty campus and a busy one, and the feed column is only
// ever the feed.
//
// The rail carries two things and no more. Communities you have not joined,
// because joining is what makes the feed fill up. And upcoming events, which
// expire whether or not you visit.

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

// Names carry a human-written subtitle after an em dash ("DSA Grinders — 6AM
// Batch"); the head is what belongs in a byline.
const nameHead = (name = "") => name.split(" — ")[0];

/* ------------------------------------------------------------ Skeleton */

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

/* --------------------------------------------------------------- Search */

// Lives at the top of the rail, the way X's does, rather than above the feed.
// A feed column should start with the feed; search is a tool you reach for, so
// it belongs in the column of tools.
//
// Still a button rather than a field: typing here and having the keystrokes
// thrown away on navigation is worse than not looking like a field at all, so
// it hands off to the real search surface on the first key.
function SearchBar({ onOpen }) {
  return (
    <div className="relative">
      <Icon
        name="search"
        size={19}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
      />
      <input
        readOnly
        onFocus={onOpen}
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key !== "Tab") onOpen(); }}
        placeholder="Search Orbit"
        className="w-full h-11 pl-11 pr-4 rounded-full bg-bg-sunken text-ink placeholder:text-ink-3 text-base
          border border-transparent cursor-pointer transition-colors
          hover:bg-black/[0.06] dark:hover:bg-white/[0.10]
          focus:outline-none focus:border-line-strong focus:bg-bg"
      />
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
      <Button tone="blue" size="sm" onClick={onOpen} className="shrink-0 hidden sm:inline-flex">Post</Button>
    </div>
  );
}

export function ComposerModal({ user, communities, onClose, onSubmit }) {
  // null means campus-wide. That is the default: addressing everyone needs
  // no prior decision, picking a community is the deliberate act.
  const [communityId, setCommunityId] = useState(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  // An object URL is a live handle into memory, not a string. Dropping the
  // reference without revoking it leaks the whole image for the tab's life.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const target = communities.find((c) => c.id === communityId);
  // A photo on its own is a post. Requiring text as well would make the
  // attach button useless for the case people actually want it for.
  const canPost = (!!text.trim() || !!file) && !busy;

  const attach = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearPhoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  };

  const submit = async () => {
    if (!canPost) return;
    setBusy(true);
    const ok = await onSubmit(communityId, text, file);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal
      title="New post"
      onClose={onClose}
      width="max-w-lg"
      footer={
        <div className="flex items-center gap-3">
          <label
            title="Add a photo"
            className="inline-grid place-items-center w-9 h-9 rounded-full shrink-0 cursor-pointer
              text-c-teal hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
          >
            <Icon name="photo_camera" size={20} />
            <input type="file" accept="image/*" className="hidden" onChange={attach} />
          </label>
          <span className="text-xs text-ink-3 tabular-nums">{text.length}/2000</span>
          <Button tone="blue" size="md" onClick={submit} disabled={!canPost} loading={busy} className="ml-auto">
            Post
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <Avatar name={user?.name || "You"} size={40} ring />
        <div className="min-w-0 flex-1">
          {/* Audience, the way X does it: one pill saying where this goes,
              defaulting to everyone. Choosing a community is the option, not
              the requirement -- posting should not depend on having joined
              anything first. */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2.5 -mx-1 px-1">
            <button
              onClick={() => setCommunityId(null)}
              className={cx(
                "inline-flex items-center gap-1.5 h-8 pl-2.5 pr-3 rounded-full text-xs font-semibold shrink-0 transition-colors",
                communityId === null
                  ? "bg-c-blue/15 text-c-blue ring-1 ring-c-blue/40"
                  : "bg-bg-sunken text-ink-2 hover:text-ink"
              )}
            >
              <Icon name="public" size={15} />
              Everyone
            </button>

            {communities.length > 0 && <span className="w-px my-1.5 bg-line shrink-0" />}

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
                  {nameHead(c.name)}
                </button>
              );
            })}
          </div>
          <Textarea
            autoFocus rows={preview ? 3 : 6} maxLength={2000} value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={target ? `Share something with ${nameHead(target.name)}…` : "What's happening on campus?"}
            className="bg-transparent px-0 text-md"
          />

          {preview && (
            <div className="relative mt-1">
              <img src={preview} alt="" className="w-full max-h-72 object-cover rounded-xl border border-line" />
              <button
                onClick={clearPhoto}
                aria-label="Remove photo"
                className="absolute top-2 right-2 grid place-items-center w-7 h-7 rounded-full
                  bg-black/60 text-white backdrop-blur-sm hover:bg-black/75 transition-colors"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------------- Post */

// A feed post carries its source, not just its author: which community it came
// from is the first thing you need in a campus-wide feed, and for a campus post
// there is no community, so the author takes that slot instead.
function Post({ post, community, liked, onLike, onOpen, onShare }) {
  const cat = CATEGORIES.find((x) => x.name === community?.category);
  const source = community ? nameHead(community.name) : (post.who || "Someone");

  return (
    <article className="rounded-2xl border border-line hover:border-line-strong transition-colors overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button onClick={() => community && onOpen(community)} className="shrink-0">
            {community ? (
              <span className="grid place-items-center w-10 h-10 rounded-xl overflow-hidden bg-bg-sunken">
                {community.avatarUrl
                  ? <img src={community.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <Icon name={cat?.msr || "groups"} size={20} className={cat?.tint || "text-ink-3"} />}
              </span>
            ) : (
              <Avatar name={post.who} size={40} />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => community && onOpen(community)}
                className="text-md font-bold text-ink truncate hover:opacity-70 transition-opacity"
              >
                {source}
              </button>
              {community ? (
                <span className="inline-flex items-center h-5 px-2 rounded-full bg-bg-sunken text-ink-2 text-[10px] font-bold">
                  {community.official ? "Club" : "Community"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-c-blue/12 text-c-blue text-[10px] font-bold">
                  <Icon name="public" size={10} />Campus
                </span>
              )}
              <span className="text-base text-ink-3">· {post.time}</span>
            </div>
            {community && (
              <p className="text-2xs text-ink-3 mt-0.5 truncate">Posted by {post.who}</p>
            )}
          </div>
        </div>

        {post.text && (
          <p className="text-md text-ink leading-relaxed mt-3 whitespace-pre-wrap break-words">
            {post.text}
          </p>
        )}
      </div>

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          className="w-full max-h-[560px] object-cover border-y border-line"
        />
      )}

      <div className="flex items-center gap-1 px-4 py-2.5">
        <button
          onClick={() => onLike(post.id)}
          aria-pressed={liked}
          className={cx(
            "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-colors",
            liked ? "bg-accent-wash text-accent" : "text-ink-2 hover:text-ink hover:bg-bg-sunken"
          )}
        >
          <Icon name="local_fire_department" size={16} className="text-c-orange" />
          <span className="tabular-nums">{post.sparks || 0}</span>
        </button>

        <button
          onClick={() => onShare?.(post, community)}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold text-ink-2 hover:text-ink hover:bg-bg-sunken transition-colors"
        >
          <Icon name="share" size={16} className="text-c-teal" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {community && (
          <button
            onClick={() => onOpen(community)}
            className="ml-auto text-xs font-semibold text-accent hover:opacity-70 shrink-0"
          >
            Open
          </button>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------ Suggestion row */

function SuggestionRow({ c, onOpen, onJoin }) {
  // mapCommunity exposes the count as `members`, not `memberCount`.
  const n = c.members ?? 0;
  return (
    <div className="group flex items-center gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-bg-sunken/60 transition-colors">
      <button onClick={() => onOpen(c)} className="shrink-0">
        <Avatar src={c.avatarUrl} name={nameHead(c.name)} size={38} />
      </button>
      <button onClick={() => onOpen(c)} className="min-w-0 flex-1 text-left">
        <span className="block text-base font-semibold text-ink truncate group-hover:opacity-70 transition-opacity">
          {nameHead(c.name)}
        </span>
        <span className="block text-2xs text-ink-2 truncate mt-0.5">
          {compact(n)} {n === 1 ? "member" : "members"}
          {c.official && " · Official"}
        </span>
      </button>
      <Button variant="outline" size="xs" onClick={() => onJoin?.(c)} className="shrink-0">
        Join
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------ Rail card */

// One bordered surface per block, the way X does it, rather than headings and
// rows floating on the page background. The border is what tells you where a
// block starts and ends when the rail has more than one thing in it.
function RailCard({ title, count, action, onAction, children }) {
  return (
    <section className="rounded-2xl border border-line overflow-hidden">
      <div className="flex items-baseline gap-2.5 px-4 pt-3.5 pb-2.5">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {count > 0 && <span className="font-mono text-xs tabular-nums text-ink-3">{count}</span>}
        {action && (
          <button
            onClick={onAction}
            className="ml-auto text-xs font-semibold text-accent hover:opacity-70 shrink-0"
          >
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------- Event row */

// The date reads as a block rather than a sentence, because in a rail the
// thing you scan for is "when", not the title.
function EventRow({ e, onRegister, onOpen }) {
  const [day, ...rest] = String(e.when || "").split(/[\s,]+/).filter(Boolean);
  return (
    <div className="group flex items-start gap-3 px-4 py-3 border-b border-line last:border-0">
      <span className="shrink-0 w-11 rounded-lg bg-bg-sunken text-center py-1.5">
        <span className="block text-[9px] font-bold uppercase tracking-wide text-ink-3">
          {rest.slice(0, 1).join(" ") || "TBA"}
        </span>
        <span className="block font-mono text-md font-bold tabular-nums text-ink leading-tight">
          {day || "--"}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <button onClick={onOpen} className="text-left block w-full min-w-0">
          <span className="block text-base font-semibold text-ink leading-snug group-hover:opacity-70 transition-opacity line-clamp-2">
            {e.title}
          </span>
        </button>
        <p className="text-2xs text-ink-2 truncate mt-0.5">{e.where}</p>
      </div>

      <Button variant="outline" size="xs" onClick={() => onRegister?.(e)} className="shrink-0 mt-0.5">
        RSVP
      </Button>
    </div>
  );
}

/* --------------------------------------------------------------- Screen */

export function HomeScreen({
  communities, joinedIds, onOpen, onCreateClick,
  feedPosts, feedSparkIds, onSparkPost, onCreatePost,
  userName, user, onJoinToggle, onGoToExplore, onSearchClick,
  events = [], registeredEventIds = [], onRegisterEvent, onGoToEvents,
}) {
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

  const canPost = !!user?.verified;
  const openComposer = () => {
    if (!user?.verified) { onJoinToggle?.(null); return; }
    setComposing(true);
  };

  // Biggest first: the rail is a shortcut for someone who has joined nothing,
  // and the busiest communities are the likeliest to have a feed worth seeing.
  const suggested = useMemo(
    () => communities
      .filter((c) => !joinedIds.includes(c.id))
      .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
      .slice(0, 5),
    [communities, joinedIds]
  );

  // Which topics campus is actually posting in, counted from the feed itself.
  // The mock shows hashtags with post counts; Orbit has no hashtags, but it
  // does know every post's community and every community's category, and that
  // answers the same question honestly.
  const trending = useMemo(() => {
    const counts = new Map();
    for (const post of allPosts) {
      const c = communities.find((x) => x.id === post.communityId);
      if (!c?.category) continue;
      const prev = counts.get(c.category) || { posts: 0, communities: new Set() };
      prev.posts += 1;
      prev.communities.add(c.id);
      counts.set(c.category, prev);
    }
    return [...counts.entries()]
      .map(([name, v]) => ({ name, posts: v.posts, communities: v.communities.size }))
      .sort((x, y) => y.posts - x.posts)
      .slice(0, 4);
  }, [allPosts, communities]);

  const showScope = allPosts.length > 0 && joined.length > 0;

  return (
    <Screen>
      <div className="w-full mx-auto px-5 sm:px-6 grid justify-center gap-8 xl:gap-10 grid-cols-1 max-w-[1060px] lg:grid-cols-[minmax(0,620px)_350px]">
        {/* Feed */}
        <div className="min-w-0 pt-6 pb-20">
          <div className="space-y-3">
            {/* Search moved to the rail; on narrow screens there is no rail,
                so it stays reachable here. */}
            <div className="lg:hidden">
              <SearchBar onOpen={onSearchClick} />
            </div>

            {canPost && <ComposerBar user={{ ...user, name: userName }} onOpen={openComposer} />}

          </div>

          {showScope && (
            <div className="sticky top-0 z-10 -mx-5 sm:-mx-6 mt-8 mb-4 px-5 sm:px-6 py-2 bg-bg/85 backdrop-blur-md flex items-center gap-1">
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
                  <span className={cx("font-mono tabular-nums", scope === t.key ? "opacity-60" : "text-ink-3")}>
                    {t.n}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className={cx("space-y-4", !showScope && "mt-4")}>
            {loading ? (
              <><PostSkeleton /><PostSkeleton /></>
            ) : posts.length === 0 ? (
              scope === "following" ? (
                <div className="py-24 text-center">
                  <p className="text-lg font-bold text-ink">Nothing from your communities</p>
                  <p className="text-base text-ink-2 mt-2 max-w-[34ch] mx-auto leading-relaxed">
                    Switch to All posts to see the rest of campus.
                  </p>
                  <Button variant="outline" size="md" onClick={() => setScope("all")} className="mt-6">
                    Show all posts
                  </Button>
                </div>
              ) : (
                // Nobody on campus has posted yet. This says so in one line
                // and gets out of the way: the rail beside it is already
                // showing communities to join and events to register for,
                // which is what a takeover checklist used to say in ten times
                // the space.
                <div className="py-16 text-center">
                  <p className="text-lg font-bold text-ink">No posts yet</p>
                  <p className="text-base text-ink-2 mt-2 max-w-[38ch] mx-auto leading-relaxed">
                    {canPost
                      ? "Nothing has been posted on campus yet. Yours would be the first."
                      : "Sign in to post, or join a community and everything it posts lands here."}
                  </p>
                  <Button
                    tone="blue"
                    size="md"
                    onClick={canPost ? openComposer : onGoToExplore}
                    className="mt-6"
                  >
                    {canPost ? "Write a post" : "Browse communities"}
                  </Button>
                  <p className="text-base text-ink-2 mt-8">
                    Cannot find your club?{" "}
                    <button onClick={onCreateClick} className="font-semibold text-accent hover:opacity-70">
                      Start it yourself
                    </button>
                    .
                  </p>
                </div>
              )
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

        {/* Rail. Always present, so the page does not change shape between an
            empty campus and a busy one. Each block hides only when it has
            genuinely nothing to say. */}
        <aside className="hidden lg:block pt-6 pb-20">
          <div className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto no-scrollbar pr-1 space-y-4">
            <SearchBar onOpen={onSearchClick} />

            {suggested.length > 0 && (
              <RailCard
                title={joined.length ? "More to join" : "Start here"}
                count={suggested.length}
                action="All"
                onAction={onGoToExplore}
              >
                {suggested.map((c) => (
                  <SuggestionRow key={c.id} c={c} onOpen={onOpen} onJoin={onJoinToggle} />
                ))}
              </RailCard>
            )}

            {/* Always rendered, even empty. An events box that vanishes when
                there are no events teaches nobody that events exist. */}
            <RailCard
              title="Upcoming"
              count={openEvents.length}
              action={openEvents.length > 0 ? "All" : undefined}
              onAction={onGoToEvents}
            >
              {openEvents.length > 0 ? (
                openEvents.slice(0, 5).map((e) => (
                  <EventRow key={e.id} e={e} onRegister={onRegisterEvent} onOpen={onGoToEvents} />
                ))
              ) : (
                <p className="text-base text-ink-2 px-4 pb-4 leading-relaxed">
                  No upcoming events.
                </p>
              )}
            </RailCard>

            {trending.length > 0 && (
              <RailCard title="Trending on campus" action="Explore" onAction={onGoToExplore}>
                {trending.map((t) => {
                  const cat = CATEGORIES.find((x) => x.name === t.name);
                  return (
                    <button
                      key={t.name}
                      onClick={onGoToExplore}
                      className="group w-full flex items-center gap-3 px-4 py-3 text-left
                        border-b border-line last:border-0 hover:bg-bg-sunken/60 transition-colors"
                    >
                      <Icon name={cat?.msr || "tag"} size={20} className={cat?.tint || "text-ink-3"} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold text-ink truncate group-hover:opacity-70 transition-opacity">
                          {t.name}
                        </span>
                        <span className="block text-2xs text-ink-2 mt-0.5">
                          {t.posts} {t.posts === 1 ? "post" : "posts"} · {t.communities}{" "}
                          {t.communities === 1 ? "community" : "communities"}
                        </span>
                      </span>
                      <Icon name="chevron_right" size={18} className="text-ink-3 shrink-0" />
                    </button>
                  );
                })}
              </RailCard>
            )}

            <nav className="px-1 pt-1 flex flex-wrap gap-x-3 gap-y-1 text-2xs text-ink-3">
              <a href="/terms" className="hover:text-ink-2 hover:underline transition-colors">Terms</a>
              <a href="/privacy" className="hover:text-ink-2 hover:underline transition-colors">Privacy</a>
              <button onClick={onGoToExplore} className="hover:text-ink-2 hover:underline transition-colors">Explore</button>
              <span className="w-full">&copy; 2026 Orbit</span>
            </nav>
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
