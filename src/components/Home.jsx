import { useState, useMemo, useEffect } from "react";
import { CATEGORIES } from "../data/constants.js";
import { Icon, Avatar, Button, IconButton, Textarea, cx } from "./ui/Primitives.jsx";
import { Screen, Modal } from "./ui/Layout.jsx";
import { PostComments } from "./Common.jsx";
import { Spotlight } from "./home/Spotlight.jsx";
import { CodeBlock, parseSegments } from "./home/CodeBlock.jsx";
import { Recommended, UpcomingEvents, Trending } from "./home/Rail.jsx";

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

function ComposerBar({ user, onOpen, onAttach, target }) {
  return (
    <div className="w-full bg-bg-raised rounded-2xl border border-line p-4 hover:border-line-strong transition-colors">
      <div className="flex items-start gap-3">
        <Avatar name={user?.name || "Guest"} size={36} ring={!!user?.verified} />
        <button
          onClick={onOpen}
          className="flex-1 min-w-0 text-left text-ink-3 text-[13.5px] leading-relaxed pt-1.5 truncate"
        >
          {`What's happening on campus, ${(user?.name || "").split(" ")[0] || "there"}?`}
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-line flex flex-wrap items-center justify-between gap-2">
        {/* Two entry points, both of which do something. The mock also shows
            Poll and Topic; Orbit stores neither a poll nor a tag, and a button
            that opens nothing is worse than a shorter row. */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpen("snippet")}
            className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg
              text-ink-2 hover:bg-bg-sunken hover:text-ink transition-colors"
          >
            <Icon name="code_blocks" size={18} className="text-c-blue" />
            <span>Snippet</span>
          </button>
          <label className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg cursor-pointer
            text-ink-2 hover:bg-bg-sunken hover:text-ink transition-colors">
            <Icon name="image" size={18} className="text-c-green" />
            <span>Media</span>
            <input type="file" accept="image/*" className="hidden" onChange={onAttach} />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpen}
            className="flex items-center gap-1.5 text-xs font-medium text-ink bg-bg-sunken hover:bg-bg-hover
              border border-line px-2.5 py-1.5 rounded-lg transition-colors max-w-[160px]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-c-blue shrink-0" />
            <span className="truncate">{target ? nameHead(target.name) : "Everyone"}</span>
            <Icon name="expand_more" size={15} className="text-ink-3 shrink-0" />
          </button>
          <button
            onClick={onOpen}
            className="bg-c-blue hover:brightness-110 text-white font-semibold text-[13px] px-4 py-1.5
              rounded-lg transition-all active:scale-[0.98]"
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}

export function ComposerModal({ user, communities, onClose, onSubmit, seed = "" }) {
  // null means campus-wide. That is the default: addressing everyone needs
  // no prior decision, picking a community is the deliberate act.
  const [communityId, setCommunityId] = useState(null);
  const [text, setText] = useState(seed);
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
function Post({ post, community, liked, onLike, onOpen, onShare, authUserId, myName, canWrite, onBlocked }) {
  const cat = CATEGORIES.find((x) => x.name === community?.category);
  const segments = parseSegments(post.text || "");

  return (
    <article className="w-full bg-bg-raised rounded-2xl border border-line hover:border-line-strong
      transition-all p-5 flex flex-col gap-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={post.who} size={40} />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-ink truncate">{post.who}</span>
              <span className="text-ink-3">·</span>
              <span className="text-ink-3 text-xs">{post.time}</span>
            </div>

            {community ? (
              <button
                onClick={() => onOpen(community)}
                className="flex items-center gap-1.5 mt-0.5 min-w-0 text-ink-2 hover:text-c-blue transition-colors"
              >
                <span className="grid place-items-center w-4 h-4 rounded overflow-hidden bg-bg-sunken shrink-0">
                  {community.avatarUrl
                    ? <img src={community.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : <Icon name={cat?.msr || "groups"} size={11} />}
                </span>
                <span className="text-xs truncate">
                  in {nameHead(community.name)}{community.official && " · Club"}
                </span>
              </button>
            ) : (
              <span className="flex items-center gap-1.5 mt-0.5 text-ink-2">
                <Icon name="public" size={13} />
                <span className="text-xs">to everyone on campus</span>
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onShare?.(post, community)}
          aria-label="Share"
          className="p-1.5 text-ink-3 hover:text-ink rounded-lg hover:bg-bg-sunken transition-colors shrink-0"
        >
          <Icon name="share" size={19} />
        </button>
      </div>

      {segments.map((seg, i) =>
        seg.type === "code" ? (
          <CodeBlock key={i} lang={seg.lang} value={seg.value} filename={post.codeName} />
        ) : (
          <p key={i} className="text-[13.5px] text-ink leading-relaxed whitespace-pre-wrap break-words">
            {seg.value.trim()}
          </p>
        )
      )}

      {post.imageUrl && (
        <div className="w-full rounded-xl overflow-hidden border border-line">
          <img src={post.imageUrl} alt="" loading="lazy" className="w-full max-h-[460px] object-cover" />
        </div>
      )}

      <div className="flex items-center flex-wrap gap-1 pt-1 border-t border-line -mb-1">
        <button
          onClick={() => onLike(post.id)}
          aria-pressed={liked}
          className={cx(
            "inline-flex items-center gap-2 h-9 px-3 rounded-full text-xs font-semibold transition-colors mt-1",
            liked ? "text-c-blue bg-c-blue/10" : "text-ink-2 hover:text-ink hover:bg-bg-sunken"
          )}
        >
          <Icon name="thumb_up" size={16} />
          <span className="tabular-nums">{post.sparks || 0}</span>
        </button>

        <span className="mt-1">
          <PostComments
            communityId={post.communityId}
            postId={post.id}
            count={post.comments}
            authUserId={authUserId}
            myName={myName}
            canWrite={canWrite}
            onBlocked={onBlocked}
          />
        </span>
      </div>
    </article>
  );
}




/* --------------------------------------------------------------- Screen */

export function HomeScreen({
  communities, joinedIds, onOpen, onCreateClick, authUserId,
  feedPosts, feedSparkIds, onSparkPost, onCreatePost,
  userName, user, onJoinToggle, onGoToExplore, onSearchClick,
  events = [], registeredEventIds = [], onRegisterEvent, onGoToEvents,
}) {
  const [loading, setLoading] = useState(() => !(feedPosts || []).length);
  const [composing, setComposing] = useState(false);
  const [composeSeed, setComposeSeed] = useState("");
  const [scope, setScope] = useState("all");
  const [sort, setSort] = useState("relevant");

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
  const posts = useMemo(() => {
    const scoped =
      scope === "following" ? allPosts.filter((p) => joinedIds.includes(p.communityId))
      : scope === "trending" ? allPosts.filter((p) => (p.sparks || 0) + (p.comments || 0) > 0)
      : allPosts;

    const byNew = (x, y) => (y.createdAt?.getTime() || 0) - (x.createdAt?.getTime() || 0);
    const byTop = (x, y) => ((y.sparks || 0) + (y.comments || 0)) - ((x.sparks || 0) + (x.comments || 0)) || byNew(x, y);
    // "Relevant" decays engagement against age, so a busy post from this
    // morning outranks a busier one from last month. Without the decay it
    // would just be Top under another name.
    const heat = (x) => {
      const hours = Math.max(1, (Date.now() - (x.createdAt?.getTime() || 0)) / 3600e3);
      return ((x.sparks || 0) + (x.comments || 0) * 2 + 1) / Math.pow(hours + 2, 0.6);
    };
    const byHot = (x, y) => heat(y) - heat(x) || byNew(x, y);

    return [...scoped].sort(sort === "latest" ? byNew : sort === "top" ? byTop : byHot);
  }, [allPosts, scope, joinedIds, sort]);

  const canPost = !!user?.verified;
  const openComposer = (mode) => {
    if (!user?.verified) { onJoinToggle?.(null); return; }
    // Snippet opens the composer with an empty fence already in place, so the
    // button does the thing it names instead of just opening a blank box.
    setComposeSeed(mode === "snippet" ? "```\n\n```" : "");
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

  // The soonest upcoming event, which is the only one worth a banner.
  const spotlight = useMemo(() => openEvents[0] || events[0] || null, [openEvents, events]);


  return (
    <Screen>
      <div className="w-full mx-auto px-5 sm:px-6 py-6 grid justify-center gap-6 xl:gap-7
        grid-cols-1 max-w-[1180px] lg:grid-cols-[minmax(0,660px)_340px] items-start">

        {/* ------------------------------------------------------- feed */}
        <div className="min-w-0 flex flex-col gap-4">
          <div className="lg:hidden">
            <SearchBar onOpen={onSearchClick} />
          </div>

          <Spotlight
            event={spotlight}
            registered={registeredEventIds.includes(spotlight?.id)}
            onRegister={onRegisterEvent}
            onOpen={onGoToEvents}
          />

          {canPost && (
            <ComposerBar
              user={{ ...user, name: userName }}
              target={null}
              onOpen={openComposer}
              onAttach={openComposer}
            />
          )}

          {/* Tabs and sort. Both change what is on screen; neither is
              decorative, which is why Showcases from the mock is not here --
              Orbit has no showcase to sort into one. */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-bg-sunken p-1 rounded-xl">
              {[
                { key: "all", label: "Campus Feed" },
                { key: "following", label: "My Communities" },
                { key: "trending", label: "Trending" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setScope(t.key)}
                  className={cx(
                    "px-3 py-1.5 rounded-lg text-[12.5px] transition-all",
                    scope === t.key
                      ? "bg-bg-raised text-ink font-semibold shadow-sm"
                      : "text-ink-2 hover:text-ink font-medium"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-1.5 text-xs text-ink-2 shrink-0">
              <span className="hidden sm:inline">Sort by:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-transparent font-semibold text-ink text-xs outline-none cursor-pointer"
              >
                <option value="relevant">Most Relevant</option>
                <option value="latest">Latest</option>
                <option value="top">Top</option>
              </select>
            </label>
          </div>

          {loading ? (
            <><PostSkeleton /><PostSkeleton /></>
          ) : posts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-lg font-bold text-ink">
                {scope === "following" ? "Nothing from your communities" : "No posts yet"}
              </p>
              <p className="text-base text-ink-2 mt-2 max-w-[38ch] mx-auto leading-relaxed">
                {scope === "following"
                  ? "Switch to Campus Feed to see the rest of campus."
                  : canPost
                    ? "Nothing has been posted on campus yet. Yours would be the first."
                    : "Sign in to post, or join a community and everything it posts lands here."}
              </p>
              <Button
                tone="blue"
                size="md"
                onClick={scope === "following" ? () => setScope("all") : canPost ? openComposer : onGoToExplore}
                className="mt-6"
              >
                {scope === "following" ? "Show all posts" : canPost ? "Write a post" : "Browse communities"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {posts.map((p) => (
                <Post
                  key={p.id}
                  post={p}
                  community={communities.find((c) => c.id === p.communityId)}
                  liked={(feedSparkIds || []).includes(p.id)}
                  onLike={onSparkPost}
                  onOpen={onOpen}
                  authUserId={authUserId}
                  myName={userName}
                  canWrite={!!user?.verified}
                  onBlocked={() => onJoinToggle?.(null)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------- rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto no-scrollbar pr-1 flex flex-col gap-4">
            <SearchBar onOpen={onSearchClick} />

            <Recommended
              communities={suggested}
              joinedIds={joinedIds}
              onOpen={onOpen}
              onJoin={onJoinToggle}
              onAll={onGoToExplore}
              onCreate={onCreateClick}
            />

            <UpcomingEvents
              events={openEvents}
              registeredIds={registeredEventIds}
              onRegister={onRegisterEvent}
              onAll={onGoToEvents}
            />

            <Trending topics={trending} onOpen={() => onGoToExplore()} />
          </div>
        </aside>
      </div>


      {composing && (
        <ComposerModal
          user={{ ...user, name: userName }}
          communities={joined}
          seed={composeSeed}
          onClose={() => setComposing(false)}
          onSubmit={onCreatePost}
        />
      )}
    </Screen>
  );
}
