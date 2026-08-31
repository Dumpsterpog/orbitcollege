import { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { CATEGORIES } from "../data/constants.js";
import { communityTrendScore, interestMatchCount } from "../utils/helpers.js";
import { SkeletonFeed } from "./Skeleton.jsx";
import { EmptyState } from "./EmptyState.jsx";
import { Icon, cx } from "./ui/Primitives.jsx";

// Home, rebuilt to the Stitch mock (home.html): welcome headline, a
// three-up stat bento, then a 12-column grid — feed across 8, context rail
// across 4 (trending communities, upcoming events, campus map).
//
// Everything is driven by the real data App.jsx already passes. Where the
// mock showed invented content the honest equivalent is used instead: the
// stat tiles read from live counts, and the campus-map tile is labelled as
// not-yet-wired rather than showing a screenshot of Stanford.

const initialsOf = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

const formatCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

/* -------------------------------------------------------------- Stat tile */

function StatTile({ label, icon, tint, value, unit }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-lg shadow-sm flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
        <span className="text-label-md font-medium text-on-surface-variant uppercase tracking-wider">{label}</span>
        <Icon name={icon} size={22} className={tint} />
      </div>
      <div>
        <span className="text-headline-lg font-bold text-on-surface tabular-nums">{value}</span>
        <span className="text-body-sm text-on-surface-variant ml-xs">{unit}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Post card */

function PostCard({ post, community, sparked, onSpark, onOpen }) {
  const cat = community ? CATEGORIES.find((x) => x.name === community.category) : null;

  return (
    <article className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-md flex items-center justify-between border-b border-outline-variant/10">
        <button onClick={() => community && onOpen(community)} className="flex items-center gap-sm text-left min-w-0 group">
          <span className="w-10 h-10 rounded bg-surface-container grid place-items-center text-on-surface text-label-md font-medium shrink-0 overflow-hidden">
            {community?.avatarUrl
              ? <img src={community.avatarUrl} alt="" className="w-full h-full object-cover" />
              : cat ? <Icon name={cat.msr} size={20} className={cat.tint} /> : initialsOf(community?.name)}
          </span>
          <span className="min-w-0">
            <span className="block text-label-md font-medium text-on-surface truncate group-hover:text-primary transition-colors">
              {community?.name || "Orbit"}
            </span>
            <span className="block text-body-sm text-on-surface-variant truncate">
              Posted by {post.who} • {post.time}
            </span>
          </span>
        </button>
        <button
          aria-label="More"
          className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0 p-xs rounded-full hover:bg-surface-container"
        >
          <Icon name="more_horiz" size={20} />
        </button>
      </div>

      {(post.title || post.text || post.imageUrl) && (
        <div className="p-md">
          {post.title && <h4 className="text-headline-sm font-semibold text-on-surface mb-sm">{post.title}</h4>}
          {post.text && <p className="text-body-md text-on-surface-variant mb-md leading-relaxed">{post.text}</p>}
          {post.imageUrl && (
            <button onClick={() => community && onOpen(community)} className="block w-full">
              <img
                src={post.imageUrl}
                alt=""
                loading="lazy"
                className="w-full h-64 object-cover rounded border border-outline-variant/20"
              />
            </button>
          )}
        </div>
      )}

      <div className="p-sm px-md bg-surface border-t border-outline-variant/10 flex items-center justify-between">
        <div className="flex gap-md">
          <button
            onClick={() => onSpark(post.id)}
            aria-pressed={sparked}
            className={cx(
              "flex items-center gap-xs text-label-sm font-medium transition-colors",
              sparked ? "text-primary" : "text-on-surface-variant hover:text-primary"
            )}
          >
            <Icon name="thumb_up" size={20} className={sparked ? "text-icon-blue" : ""} />
            <span className="tabular-nums">{post.sparks}</span>
          </button>
          <button
            onClick={() => community && onOpen(community)}
            className="flex items-center gap-xs text-label-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            <Icon name="chat_bubble" size={20} className="text-icon-teal" />
            {/* community_posts carries no comment count, so the number is
                omitted rather than hard-coded to 0 — the icon still opens
                the community where the replies actually live. */}
            {typeof post.commentCount === "number" && (
              <span className="tabular-nums">{post.commentCount}</span>
            )}
          </button>
        </div>
        <button className="text-on-surface-variant hover:text-primary transition-colors text-label-sm font-medium flex items-center gap-xs">
          <Icon name="bookmark" size={20} className="text-icon-amber" />Save
        </button>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ Rail */

function RailCard({ title, action, children, className }) {
  return (
    <section className={cx("bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-sm p-lg", className)}>
      <div className="flex items-center justify-between mb-md">
        <h2 className="text-headline-sm font-semibold text-on-surface">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function TrendingRow({ c, joined, onOpen, onJoin }) {
  const cat = CATEGORIES.find((x) => x.name === c.category);
  return (
    <div className="flex items-center justify-between gap-sm group">
      <button onClick={() => onOpen(c)} className="flex items-center gap-sm min-w-0 text-left">
        <span className="w-8 h-8 rounded bg-surface-container grid place-items-center text-on-surface text-label-sm font-medium shrink-0 overflow-hidden">
          {c.avatarUrl
            ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
            : cat ? <Icon name={cat.msr} size={17} className={cat.tint} /> : initialsOf(c.name)}
        </span>
        <span className="min-w-0">
          <span className="block text-label-md font-medium text-on-surface truncate group-hover:text-primary transition-colors">
            {c.name}
          </span>
          <span className="block text-label-sm text-on-surface-variant">{formatCount(c.members)} members</span>
        </span>
      </button>
      {joined ? (
        <span className="text-label-sm text-on-surface-variant px-sm py-xs shrink-0">Joined</span>
      ) : (
        <button
          onClick={() => onJoin(c.id)}
          className="text-label-sm font-medium text-primary bg-primary/10 px-sm py-xs rounded hover:bg-primary hover:text-on-primary transition-colors shrink-0"
        >
          Join
        </button>
      )}
    </div>
  );
}

function EventTimeline({ events, onViewAll }) {
  if (events.length === 0) {
    return <p className="text-body-sm text-on-surface-variant">Nothing scheduled yet.</p>;
  }
  return (
    <div className="relative pl-md border-l-2 border-outline-variant/20 space-y-lg">
      {events.map((e) => (
        <div key={e.id} className="relative">
          <span className="absolute -left-[23px] top-1 w-3 h-3 bg-surface-variant rounded-full border-2 border-surface-container-lowest" />
          <h3 className="text-label-md font-medium text-on-surface">{e.title}</h3>
          <p className="text-body-sm text-on-surface-variant mt-xs">{e.when}</p>
          <p className="text-label-sm text-on-surface-variant flex items-center gap-xs mt-xs">
            <Icon name="location_on" size={14} className="text-icon-pink" />{e.where}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- Screen */

export function HomeScreen({
  communities, joinedIds, onOpen, onCreateClick, interests,
  feedPosts, feedSparkIds, onSparkPost, onAdClick,
  events = [], userName, onJoinToggle, onGoToEvents, onGoToTea,
}) {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  const trending = useMemo(
    () => [...communities].sort((a, b) => communityTrendScore(b) - communityTrendScore(a)).slice(0, 3),
    [communities]
  );

  const upcoming = useMemo(() => events.slice(0, 2), [events]);

  // "Important" = posts from communities you've actually joined. The mock's
  // second tab had no defined meaning, and a filter that returns an
  // arbitrary subset is worse than one that returns a meaningful one.
  const visiblePosts = useMemo(() => {
    const list = feedPosts || [];
    return filter === "important" ? list.filter((p) => joinedIds.includes(p.communityId)) : list;
  }, [feedPosts, filter, joinedIds]);

  const firstName = (userName || "").split(" ")[0];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-surface">
      <div className="px-md lg:px-margin-desktop py-xl max-w-[1400px] mx-auto flex flex-col gap-xl">

        {/* Welcome + stats */}
        <div className="flex flex-col gap-lg">
          <div className="flex flex-wrap items-end justify-between gap-md">
            <div className="min-w-0">
              <h1 className="text-headline-lg-mobile lg:text-headline-xl font-bold text-on-surface">
                {firstName ? `Welcome back, ${firstName}.` : "Welcome to Orbit."}
              </h1>
              <p className="text-body-lg text-on-surface-variant mt-xs">
                Here is what's happening around campus today.
              </p>
            </div>
            <button
              onClick={onCreateClick}
              className="bg-primary text-on-primary text-label-md font-medium px-lg py-md rounded-lg flex items-center gap-sm hover:bg-on-primary-fixed-variant transition-colors shadow-sm shrink-0"
            >
              <Plus size={18} />New Post
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <StatTile label="Communities" icon="groups" tint="text-icon-blue" value={joinedIds.length} unit="joined" />
            <StatTile label="Upcoming" icon="event" tint="text-icon-amber" value={events.length} unit="events listed" />
            <StatTile label="Activity" icon="bolt" tint="text-icon-violet" value={(feedPosts || []).length} unit="recent posts" />
          </div>
        </div>

        {/* Feed + rail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <div className="lg:col-span-8 flex flex-col gap-lg min-w-0">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-sm gap-md">
              <h2 className="text-headline-md font-semibold text-on-surface min-w-0 truncate">
                Latest from your communities
              </h2>
              <div className="flex gap-sm shrink-0">
                {[{ k: "all", l: "All" }, { k: "important", l: "Important" }].map((t) => (
                  <button
                    key={t.k}
                    onClick={() => setFilter(t.k)}
                    className={cx(
                      "text-label-sm font-medium px-md py-xs rounded-full transition-colors",
                      filter === t.k
                        ? "text-primary bg-primary/10"
                        : "text-on-surface-variant hover:bg-surface-container"
                    )}
                  >
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <SkeletonFeed count={3} />
            ) : visiblePosts.length === 0 ? (
              <EmptyState
                title={filter === "important" ? "Nothing from your communities yet" : "No posts yet"}
                subtitle={
                  filter === "important"
                    ? "Join a community, or switch to All to see everything happening on campus."
                    : "Posts from every community land here, newest first, as they're made."
                }
              />
            ) : (
              <div className="flex flex-col gap-md">
                {visiblePosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    community={communities.find((c) => c.id === post.communityId)}
                    sparked={(feedSparkIds || []).includes(post.id)}
                    onSpark={onSparkPost}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 flex flex-col gap-xl min-w-0">
            <RailCard title="Trending Communities">
              <div className="flex flex-col gap-md">
                {trending.length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant">Nothing trending yet.</p>
                ) : (
                  trending.map((c) => (
                    <TrendingRow
                      key={c.id}
                      c={c}
                      joined={joinedIds.includes(c.id)}
                      onOpen={onOpen}
                      onJoin={onJoinToggle}
                    />
                  ))
                )}
              </div>
            </RailCard>

            <RailCard
              title="Upcoming Events"
              action={
                <button onClick={onGoToEvents} className="text-label-sm font-medium text-primary hover:underline">
                  View All
                </button>
              }
            >
              <EventTimeline events={upcoming} />
            </RailCard>

            {/* Campus map. The mock used a stock screenshot of Stanford; this
                is a real, live OpenStreetMap view of Manipal University
                Jaipur — no API key, no billing, and it's actually the
                campus the app is for. */}
            <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-sm overflow-hidden p-xs">
              <div className="w-full h-48 rounded overflow-hidden bg-surface-container">
                <iframe
                  title="Manipal University Jaipur campus map"
                  loading="lazy"
                  className="w-full h-full border-0"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=75.5510%2C26.8360%2C75.5800%2C26.8520&layer=mapnik&marker=26.8438%2C75.5651"
                />
              </div>
              <div className="p-sm text-center">
                <a
                  href="https://www.openstreetmap.org/?mlat=26.8438&mlon=75.5651#map=15/26.8438/75.5651"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-label-sm font-medium text-on-surface-variant uppercase tracking-widest hover:text-primary transition-colors"
                >
                  Campus Map
                </a>
              </div>
            </section>

            <RailCard title="Locali-Tea">
              <p className="text-body-sm text-on-surface-variant mb-md leading-relaxed">
                Anonymous campus confessions and gossip. Everything posted disappears after 48 hours.
              </p>
              <button
                onClick={onGoToTea}
                className="w-full py-md border border-outline-variant/40 rounded-lg text-label-md font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                Open Locali-Tea
              </button>
            </RailCard>
          </div>
        </div>
      </div>
    </div>
  );
}
