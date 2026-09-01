import { useState, useMemo, useEffect } from "react";
import { Icon, Avatar, Button, IconButton, Textarea, cx } from "./ui/Primitives.jsx";
import { Screen, Modal } from "./ui/Layout.jsx";

// Home is the feed. That is the whole page.
//
// Three versions of a community-discovery block lived here — a card grid, a
// table, a ranked chart — and all three read as filler, because they were.
// Communities you have not joined are Explore's job; putting a directory of
// them under an empty feed was the app padding itself out with a list nobody
// came to Home to read.
//
// So: an empty feed says it is empty in one line and points at Explore. It
// does not become a magazine. The rail carries events only, because events
// are time-sensitive and expire whether or not you visit — the one thing
// that genuinely belongs beside a feed rather than behind a nav item.

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
                  {nameHead(c.name)}
                </button>
              );
            })}
          </div>
          <Textarea
            autoFocus rows={6} maxLength={2000} value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={target ? `Share something with ${nameHead(target.name)}…` : "Pick a community first"}
            className="bg-transparent px-0 text-md"
          />
        </div>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------------- Post */

function Post({ post, community, liked, onLike, onOpen }) {
  const head = nameHead(community?.name || "Orbit");
  return (
    <article className="card card-interactive p-4">
      <div className="flex items-center gap-3">
        <button onClick={() => community && onOpen(community)} className="shrink-0">
          <Avatar src={community?.avatarUrl} name={head} size={40} />
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

/* ---------------------------------------------------------- Event row */

function EventRow({ e, onRegister, onOpen }) {
  const [head, ...rest] = String(e.when || "").split(/[\s,]+/).filter(Boolean);
  return (
    <div className="group flex items-start gap-3.5 py-3.5 border-b border-line last:border-0">
      <span className="shrink-0 text-center leading-none pt-0.5" style={{ width: 42 }}>
        <span className="block font-mono text-lg font-semibold tabular-nums text-ink">{head || "TBA"}</span>
        <span className="block text-2xs font-semibold uppercase tracking-wide text-ink-3 mt-1 truncate">
          {rest.slice(0, 1).join(" ")}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <button onClick={onOpen} className="text-left block w-full min-w-0">
          <span className="block text-md font-semibold text-ink leading-snug group-hover:opacity-70 transition-opacity line-clamp-2">
            {e.title}
          </span>
        </button>
        <p className="text-2xs text-ink-2 truncate mt-1">{e.where}</p>
      </div>
      <Button variant="outline" size="xs" onClick={() => onRegister?.(e)} className="shrink-0 mt-0.5">
        Register
      </Button>
    </div>
  );
}

/* --------------------------------------------------------------- Screen */

export function HomeScreen({
  communities, joinedIds, onOpen, onCreateClick,
  feedPosts, feedSparkIds, onSparkPost, onCreatePost,
  userName, user, onJoinToggle, onGoToExplore,
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

  const canPost = !!user?.verified && joined.length > 0;
  const openComposer = () => {
    if (!user?.verified) { onJoinToggle?.(null); return; }
    if (joined.length === 0) { onGoToExplore(); return; }
    setComposing(true);
  };

  const first = (userName || "").split(" ")[0];
  const showScope = allPosts.length > 0 && joined.length > 0;
  const showRail = !loading && allPosts.length > 0 && openEvents.length > 0;

  return (
    <Screen>
      <div
        className={cx(
          "w-full mx-auto px-5 sm:px-6 grid justify-center gap-8 xl:gap-10 grid-cols-1",
          showRail ? "max-w-[1000px] lg:grid-cols-[minmax(0,620px)_300px]" : "max-w-[620px]"
        )}
      >
        {/* Feed */}
        <div className="min-w-0 pt-6 pb-20">
          <div className="space-y-3">
            {canPost && <ComposerBar user={{ ...user, name: userName }} onOpen={openComposer} />}

            {joined.length > 0 && (
              <div className="card p-3">
                <div className="flex gap-3.5 overflow-x-auto no-scrollbar">
                  {joined.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onOpen(c)}
                      className="flex flex-col items-center gap-1.5 w-[68px] shrink-0 group"
                    >
                      <Avatar src={c.avatarUrl} name={nameHead(c.name)} size={48} ring={c.lastActive <= 30} />
                      <span className="text-2xs text-ink truncate max-w-full group-hover:opacity-70">
                        {nameHead(c.name)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
                // A first visit is the one moment the page has to explain
                // itself. Not a directory of communities, which is Explore's
                // job and read as filler three redesigns running, but the
                // three things this app actually does, in order, with the
                // first one live as a button.
                <div className="py-10">
                  <h1 className="text-3xl font-bold text-ink leading-tight">
                    {first ? `Welcome to Orbit, ${first}.` : "Welcome to Orbit."}
                  </h1>
                  <p className="text-md text-ink-2 mt-2.5 max-w-[46ch] leading-relaxed">
                    Every club, community and event at Manipal University Jaipur, in one place.
                    Here is how it works.
                  </p>

                  <ol className="mt-9 space-y-7">
                    {[
                      {
                        n: 1,
                        title: "Join a few communities",
                        body: "Pick the ones that sound like you. Everything they post lands in this feed.",
                        cta: "Browse communities",
                        onClick: onGoToExplore,
                        primary: true,
                      },
                      {
                        n: 2,
                        title: "Post something",
                        body: "Once you have joined one, the box at the top of this page is yours.",
                      },
                      {
                        n: 3,
                        title: "Register for events",
                        body: "Registering puts you in that event's group chat automatically.",
                        cta: "See events",
                        onClick: onGoToEvents,
                      },
                    ].map((step) => (
                      <li key={step.n} className="flex gap-5">
                        <span className="font-mono text-lg tabular-nums text-ink-3 leading-none pt-1 shrink-0 select-none">
                          {String(step.n).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-ink leading-snug">{step.title}</p>
                          <p className="text-base text-ink-2 mt-1.5 max-w-[48ch] leading-relaxed">{step.body}</p>
                          {step.cta && (
                            <Button
                              tone={step.primary ? "blue" : undefined}
                              variant={step.primary ? undefined : "outline"}
                              size="md"
                              onClick={step.onClick}
                              className="mt-3.5"
                            >
                              {step.cta}
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-10 pt-6 border-t border-line">
                    <p className="text-base text-ink-2">
                      Cannot find your club?{" "}
                      <button onClick={onCreateClick} className="font-semibold text-accent hover:opacity-70">
                        Start it yourself
                      </button>
                      .
                    </p>
                  </div>
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

        {/* Rail: events only, and only once there is a feed to sit beside. */}
        {showRail && (
          <aside className="hidden lg:block pt-6 pb-20">
            <div className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto no-scrollbar pr-1">
              <div className="flex items-baseline gap-3 pb-2.5 border-b-2 border-ink">
                <h2 className="text-base font-bold text-ink">This week</h2>
                <span className="font-mono text-xs tabular-nums text-ink-3">{openEvents.length}</span>
                <button
                  onClick={onGoToEvents}
                  className="ml-auto text-xs font-semibold text-accent hover:opacity-70 shrink-0"
                >
                  All
                </button>
              </div>
              {openEvents.slice(0, 5).map((e) => (
                <EventRow key={e.id} e={e} onRegister={onRegisterEvent} onOpen={onGoToEvents} />
              ))}
            </div>
          </aside>
        )}
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
