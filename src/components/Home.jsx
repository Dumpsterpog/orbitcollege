import { useState, useMemo, useEffect } from "react";
import { CATEGORIES } from "../data/constants.js";
import { communityTrendScore, interestMatchCount } from "../utils/helpers.js";
import { Icon, Avatar, Button, IconButton, Textarea, cx } from "./ui/Primitives.jsx";
import { Screen, Modal } from "./ui/Layout.jsx";

// Home.
//
// The card grid read as generated, and the plain table that replaced it read
// as unfinished. This is the third pass and it takes the useful half of each:
// the ranked-list structure, given editorial weight.
//
//   It's a chart. Communities are numbered 01..08 in large light monospace.
//   Ranking is a real editorial form with a long history, it uses data that
//   already exists (trend score), and it gives the eye something to travel
//   down. A numeral is not an icon-in-a-circle.
//
//   The top entry gets a lede. Rank 1 shows its description at reading size;
//   the rest are single lines. That asymmetry is what a template cannot
//   produce, and it stops the section from being a flat wall of rows.
//
//   The empty state is a two-column page, not a column of leftovers.
//   Communities on the left, what's on this week down the right. Different
//   content in each, so nothing is listed twice.
//
//   Colour stays scarce and meaningful: the rank numeral of anything active
//   in the last half hour, and the spark you pressed. Nothing else.

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

// Names carry a human-written subtitle after an em dash ("DSA Grinders — 6AM
// Batch"). Free copy, so it gets used rather than discarded.
const splitName = (name = "") => {
  const [head, ...rest] = name.split(" — ");
  return { head, tail: rest.join(" — ") || null };
};

const since = (m) =>
  m == null ? null : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;

const hasDesc = (d) => d && d !== "No description yet." && d.trim().length > 12;

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

function RankSkeleton({ lede }) {
  return (
    <div className={cx("flex items-start gap-4 animate-pulse", lede ? "py-5" : "py-3.5")}>
      <span className="w-8 h-6 rounded bg-bg-sunken shrink-0" />
      <span className="min-w-0 flex-1 space-y-2">
        <span className="block h-4 w-48 rounded-full bg-bg-sunken" />
        <span className="block h-3 w-32 rounded-full bg-bg-sunken" />
        {lede && <span className="block h-3 w-full rounded-full bg-bg-sunken" />}
      </span>
      <span className="h-7 w-16 rounded-full bg-bg-sunken shrink-0" />
    </div>
  );
}

/* ------------------------------------------------------------ Rank list */

// One entry. `lede` gives rank 1 the description and a larger name, which is
// what turns a list into a page with a top.
function RankRow({ c, rank, joined, onOpen, onJoin, lede }) {
  const { head, tail } = splitName(c.name);
  const live = c.lastActive <= 30;
  const sub = tail || (c.creator ? `Started by ${c.creator}` : null);

  return (
    <div
      className={cx(
        "group flex items-start gap-4 border-b border-line last:border-0",
        lede ? "py-5" : "py-3.5"
      )}
    >
      {/* The numeral. Light, monospace, tabular so the column stays true. */}
      <span
        className={cx(
          "font-mono tabular-nums shrink-0 leading-none pt-0.5 select-none",
          lede ? "text-2xl" : "text-lg",
          live ? "text-accent" : "text-ink-3"
        )}
        style={{ width: lede ? 40 : 32 }}
      >
        {String(rank).padStart(2, "0")}
      </span>

      <div className="min-w-0 flex-1">
        <button onClick={() => onOpen(c)} className="text-left block w-full min-w-0">
          <span
            className={cx(
              "block font-bold text-ink leading-snug group-hover:opacity-70 transition-opacity",
              lede ? "text-xl" : "text-md truncate"
            )}
          >
            {head}
          </span>
        </button>

        <div className="flex items-center flex-wrap gap-x-2 mt-1 text-2xs">
          <span className="uppercase tracking-[0.08em] font-semibold text-ink-3">{c.category}</span>
          {c.official && (
            <>
              <span className="inline-block w-px h-2.5 bg-line" />
              <span className="uppercase tracking-[0.1em] font-semibold text-ink-3">Official</span>
            </>
          )}
          <span className="inline-block w-px h-2.5 bg-line" />
          <span className="font-mono tabular-nums text-ink-2">{compact(c.members || 0)} members</span>
          {live && (
            <>
              <span className="inline-block w-px h-2.5 bg-line" />
              <span className="font-semibold text-accent">Active now</span>
            </>
          )}
        </div>

        {lede && hasDesc(c.desc) && (
          <p className="text-base text-ink-2 leading-relaxed mt-2.5 max-w-[52ch] line-clamp-2">{c.desc}</p>
        )}
        {!lede && sub && <p className="text-xs text-ink-2 truncate mt-1">{sub}</p>}
      </div>

      <Button
        variant="outline"
        size={lede ? "sm" : "xs"}
        onClick={() => onJoin(c.id)}
        disabled={joined}
        className="shrink-0 mt-0.5"
      >
        {joined ? "Joined" : "Join"}
      </Button>
    </div>
  );
}

function RankList({ communities, joinedIds, onOpen, onJoin, lede = true }) {
  return (
    <div>
      {communities.map((c, i) => (
        <RankRow
          key={c.id}
          c={c}
          rank={i + 1}
          joined={joinedIds.includes(c.id)}
          onOpen={onOpen}
          onJoin={onJoin}
          lede={lede && i === 0}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- Section */

// One heading treatment, used everywhere. A rule under the title gives each
// section a top edge without wrapping it in a box.
function SectionHead({ title, count, action, onAction, actionLabel }) {
  return (
    <div className="flex items-baseline gap-3 pb-2.5 mb-1 border-b-2 border-ink">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {count != null && <span className="font-mono text-xs tabular-nums text-ink-3">{count}</span>}
      {actionLabel && (
        <button onClick={onAction} className="ml-auto text-xs font-semibold text-accent hover:opacity-70 shrink-0">
          {actionLabel}
        </button>
      )}
      {action}
    </div>
  );
}

/* ---------------------------------------------------------- Event list */

function EventRow({ e, onRegister, onOpen, compactMode }) {
  const [head, ...rest] = String(e.when || "").split(/[\s,]+/).filter(Boolean);
  return (
    <div className="group flex items-start gap-3.5 py-3.5 border-b border-line last:border-0">
      <span className="shrink-0 text-center leading-none pt-0.5" style={{ width: 44 }}>
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
        <p className="text-2xs text-ink-2 truncate mt-1">
          <span className="uppercase tracking-[0.08em] font-semibold text-ink-3">{e.category}</span>
          <span className="inline-block w-px h-2.5 bg-line mx-2 align-middle" />
          {e.where}
        </p>
        {!compactMode && (
          <Button variant="outline" size="xs" onClick={() => onRegister?.(e)} className="mt-2.5">
            Register
          </Button>
        )}
      </div>
      {compactMode && (
        <Button variant="outline" size="xs" onClick={() => onRegister?.(e)} className="shrink-0 mt-0.5">
          Register
        </Button>
      )}
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

/* --------------------------------------------------------------- Screen */

export function HomeScreen({
  communities, joinedIds, onOpen, onCreateClick, interests,
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

  const liveCount = useMemo(() => communities.filter((c) => c.lastActive <= 60).length, [communities]);
  const canPost = !!user?.verified && joined.length > 0;
  const openComposer = () => {
    if (!user?.verified) { onJoinToggle?.(null); return; }
    if (joined.length === 0) { onGoToExplore(); return; }
    setComposing(true);
  };

  const first = (userName || "").split(" ")[0];

  /* ---------------- State A: nothing to read ---------------- */
  if (!loading && allPosts.length === 0) {
    return (
      <Screen>
        <div className="w-full max-w-[1100px] mx-auto px-5 sm:px-8 lg:px-10 pt-10 pb-20">
          {/* Masthead. Gives the page a top edge and a name, and states the
              one live number worth stating. */}
          <header className="pb-7 mb-9 border-b-2 border-ink">
            <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-3 mb-3">
              Manipal University Jaipur
            </p>
            <h1 className="text-4xl font-bold text-ink leading-[1.05] max-w-[18ch]">
              {first ? `Welcome back, ${first}.` : "Every club, in one feed."}
            </h1>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-4 text-base text-ink-2">
              <span>
                <span className="font-mono font-semibold text-ink tabular-nums">{communities.length}</span> communities
              </span>
              <span className="inline-block w-px h-3 bg-line" />
              <span>
                <span className="font-mono font-semibold text-ink tabular-nums">{events.length}</span> events listed
              </span>
              {liveCount > 0 && (
                <>
                  <span className="inline-block w-px h-3 bg-line" />
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span className="font-mono font-semibold text-ink tabular-nums">{liveCount}</span> active today
                  </span>
                </>
              )}
            </div>
          </header>

          {/* Two columns of different content, not a rail of the same. */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-10 lg:gap-14 items-start">
            <div className="min-w-0">
              <SectionHead
                title={interests?.length ? "Matched to your interests" : "Most active right now"}
                count={suggested.length}
                actionLabel="Browse all"
                onAction={onGoToExplore}
              />
              {suggested.length === 0 ? (
                <p className="text-base text-ink-2 py-8">
                  No communities yet. Be the one who starts the first.
                </p>
              ) : (
                <RankList
                  communities={suggested.slice(0, 7)}
                  joinedIds={joinedIds}
                  onOpen={onOpen}
                  onJoin={onJoinToggle}
                />
              )}

              <div className="flex flex-wrap gap-2.5 mt-8">
                <Button tone="violet" size="md" icon="add" onClick={onCreateClick}>Start a community</Button>
                <Button variant="outline" size="md" onClick={onGoToExplore}>Explore everything</Button>
              </div>
            </div>

            <div className="min-w-0 lg:sticky lg:top-6">
              <SectionHead
                title="This week"
                count={openEvents.length}
                actionLabel="All"
                onAction={onGoToEvents}
              />
              {openEvents.length === 0 ? (
                <p className="text-base text-ink-2 py-8">Nothing scheduled yet.</p>
              ) : (
                openEvents.slice(0, 5).map((e) => (
                  <EventRow key={e.id} e={e} onRegister={onRegisterEvent} onOpen={onGoToEvents} compactMode />
                ))
              )}
            </div>
          </div>
        </div>
      </Screen>
    );
  }

  /* ---------------- State B: populated feed ---------------- */
  return (
    <Screen>
      <div className="w-full max-w-[1060px] mx-auto px-5 sm:px-6 grid justify-center gap-8 xl:gap-10 grid-cols-1 lg:grid-cols-[minmax(0,620px)_320px]">
        <div className="min-w-0 pt-6 pb-20">
          <div className="space-y-3">
            {canPost && <ComposerBar user={{ ...user, name: userName }} onOpen={openComposer} />}

            {joined.length > 0 && (
              <div className="card p-3">
                <div className="flex gap-3.5 overflow-x-auto no-scrollbar">
                  {joined.map((c) => {
                    const { head } = splitName(c.name);
                    return (
                      <button key={c.id} onClick={() => onOpen(c)} className="flex flex-col items-center gap-1.5 w-[68px] shrink-0 group">
                        <Avatar src={c.avatarUrl} name={head} size={48} ring={c.lastActive <= 30} />
                        <span className="text-2xs text-ink truncate max-w-full group-hover:opacity-70">{head}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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
                <span className={cx("font-mono tabular-nums", scope === t.key ? "opacity-60" : "text-ink-3")}>{t.n}</span>
              </button>
            ))}
            {joined.length === 0 && <span className="ml-auto text-2xs text-ink-3">Showing all of campus</span>}
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

        <aside className="hidden lg:block pt-6 pb-20">
          <div className="sticky top-6 space-y-9 max-h-[calc(100dvh-3rem)] overflow-y-auto no-scrollbar pr-1">
            {openEvents.length > 0 && (
              <section>
                <SectionHead title="This week" count={openEvents.length} actionLabel="All" onAction={onGoToEvents} />
                {openEvents.slice(0, 3).map((e) => (
                  <EventRow key={e.id} e={e} onRegister={onRegisterEvent} onOpen={onGoToEvents} compactMode />
                ))}
              </section>
            )}

            {suggested.length > 0 && (
              <section>
                <SectionHead title="Worth joining" count={suggested.length} actionLabel="Browse" onAction={onGoToExplore} />
                {loading ? (
                  <><RankSkeleton /><RankSkeleton /><RankSkeleton /></>
                ) : (
                  <RankList
                    communities={suggested.slice(0, 4)}
                    joinedIds={joinedIds}
                    onOpen={onOpen}
                    onJoin={onJoinToggle}
                    lede={false}
                  />
                )}
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
