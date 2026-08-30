import { useState, useMemo, useEffect } from "react";
import { Plus, Flame, TrendingUp, Image as ImageIcon, Megaphone, Sparkles, Users } from "lucide-react";
import { CATEGORIES } from "../data/constants.js";
import { interestMatchCount, baseSparks, communityTrendScore } from "../utils/helpers.js";
import { SkeletonFeed, SkeletonTile } from "./Skeleton.jsx";
import { EmptyState } from "./EmptyState.jsx";
import { Avatar, Button, Card, Badge, SectionLabel, cx } from "./ui/Primitives.jsx";
import { Screen, PageHeader } from "./ui/Layout.jsx";

// Home, rebuilt as a two-column dashboard.
//
// The old Home was a single centred phone column: a stories rail, a trending
// row, a matched row and then the feed, all stacked and capped at ~32rem. On
// a wide screen that left most of the viewport empty while the secondary
// content (trending, matched) pushed the actual feed below the fold.
//
// Now the feed owns a readable centre column and everything secondary moves
// into a sticky right rail that only exists at xl. Below that it collapses
// back to one column with the rail's content following the feed.

function CommunityMark({ community, size = 26 }) {
  const cat = community ? CATEGORIES.find((x) => x.name === community.category) : null;
  const Icon = cat?.icon;
  if (community?.avatarUrl) {
    return (
      <img
        src={community.avatarUrl}
        alt=""
        className="rounded shrink-0 object-cover border border-line"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="rounded shrink-0 grid place-items-center bg-surface-inset border border-line text-content-secondary"
      style={{ width: size, height: size }}
    >
      {Icon ? <Icon size={Math.round(size * 0.5)} /> : null}
    </span>
  );
}

/* ------------------------------------------------------------------ Feed */

function PostFeedCard({ post, community, sparked, onSpark, onOpen }) {
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => community && onOpen(community)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-surface-inset transition-colors"
      >
        <CommunityMark community={community} size={26} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-content truncate">{community?.name || "Orbit"}</p>
          <p className="text-2xs text-content-muted truncate">{post.who} · {post.time}</p>
        </div>
      </button>

      {post.imageUrl && (
        <button
          onClick={() => community && onOpen(community)}
          className="block w-full aspect-[16/10] bg-surface-inset overflow-hidden border-y border-line"
        >
          <img src={post.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        </button>
      )}

      {post.text && (
        <p className="px-3.5 pt-3 text-sm text-content-secondary leading-relaxed">{post.text}</p>
      )}

      <div className="px-3.5 py-2.5 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSpark(post.id)}
          aria-pressed={sparked}
          className={cx(
            "inline-flex items-center gap-1.5 h-7 px-2 rounded-sm text-xs font-medium transition-colors",
            sparked ? "text-accent bg-accent-subtle" : "text-content-muted hover:text-content hover:bg-surface-inset"
          )}
        >
          <Flame size={14} fill={sparked ? "currentColor" : "none"} />
          <span className="tabular-nums">{post.sparks}</span>
        </button>
      </div>
    </Card>
  );
}

// Demo sponsored content — clearly labelled, not disguised as a real post.
// No ad backend is wired; these are static placeholders so the every-third-
// post slot can actually be seen, and can be swapped for a real network's
// response without touching the layout.
const DEMO_ADS = [
  {
    id: "demo-ad-cafe",
    kind: "Local business",
    title: "Campus Grind Café",
    subtitle: "20% off for MUJ students this week — show your Orbit profile at the counter.",
    cta: "View offer",
    image: "https://loremflickr.com/900/560/coffee,cafe?lock=2001",
  },
  {
    id: "demo-ad-fest",
    kind: "Campus event",
    title: "Zeal 2026 — MUJ Cultural Fest",
    subtitle: "Registrations are open. Headline night passes are going fast.",
    cta: "Learn more",
    image: "https://loremflickr.com/900/560/concert,festival?lock=2002",
  },
  {
    id: "demo-ad-print",
    kind: "Local business",
    title: "PrintHub Jaipur",
    subtitle: "Same-day assignment printing and spiral binding, 5 minutes from the campus gate.",
    cta: "Get directions",
    image: "https://loremflickr.com/900/560/printer,stationery?lock=2003",
  },
];

function AdCard({ ad, onClick }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <span className="h-[26px] w-[26px] rounded shrink-0 grid place-items-center bg-surface-inset border border-line">
          <Megaphone size={13} className="text-content-muted" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-content truncate">{ad.title}</p>
          <p className="text-2xs text-content-faint truncate">Sponsored · {ad.kind}</p>
        </div>
        <Badge tone="neutral">Ad</Badge>
      </div>
      <button onClick={onClick} className="block w-full aspect-[16/10] bg-surface-inset overflow-hidden border-y border-line">
        <img src={ad.image} alt="" className="w-full h-full object-cover" loading="lazy" />
      </button>
      <div className="px-3.5 py-3">
        <p className="text-sm text-content-secondary leading-relaxed">{ad.subtitle}</p>
        <Button variant="secondary" size="sm" onClick={onClick} className="mt-2.5">{ad.cta}</Button>
      </div>
    </Card>
  );
}

function LatestPostsFeed({ feedPosts, communities, sparkIds, onSparkPost, onOpen, onAdClick }) {
  const items = useMemo(() => {
    const out = [];
    feedPosts.forEach((post, i) => {
      out.push({ type: "post", key: post.id, post });
      if ((i + 1) % 3 === 0) {
        out.push({ type: "ad", key: `ad-${i}`, ad: DEMO_ADS[Math.floor(i / 3) % DEMO_ADS.length] });
      }
    });
    return out;
  }, [feedPosts]);

  if (feedPosts.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No posts yet"
        subtitle="Posts from every community land here, newest first, as they're made."
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) =>
        item.type === "post" ? (
          <PostFeedCard
            key={item.key}
            post={item.post}
            community={communities.find((c) => c.id === item.post.communityId)}
            sparked={sparkIds.includes(item.post.id)}
            onSpark={onSparkPost}
            onOpen={onOpen}
          />
        ) : (
          <AdCard key={item.key} ad={item.ad} onClick={onAdClick} />
        )
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Rail */

function RailRow({ community, onOpen, rank, meta }) {
  return (
    <button
      onClick={() => onOpen(community)}
      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-left transition-colors hover:bg-surface-inset"
    >
      {typeof rank === "number" && (
        <span className="w-3.5 text-2xs tabular-nums text-content-faint shrink-0">{rank}</span>
      )}
      <CommunityMark community={community} size={22} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-content truncate leading-tight">
          {community.name.split(" — ")[0]}
        </span>
        <span className="block text-2xs text-content-muted truncate leading-tight mt-0.5">{meta}</span>
      </span>
    </button>
  );
}

function RailSection({ icon: Icon, title, children, action }) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-1.5 px-2">
        {Icon && <Icon size={12} className="text-content-faint shrink-0" />}
        <SectionLabel className="flex-1">{title}</SectionLabel>
        {action}
      </div>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

/* ---------------------------------------------------------------- Screen */

export function HomeScreen({
  communities, joinedIds, onOpen, onCreateClick, interests,
  feedPosts, feedSparkIds, onSparkPost, onAdClick,
}) {
  // Brief skeleton pass on first mount so the feed reads as fetching rather
  // than popping in fully formed.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  const joined = useMemo(
    () => communities.filter((c) => joinedIds.includes(c.id)).sort((a, b) => a.lastActive - b.lastActive),
    [communities, joinedIds]
  );

  const trending = useMemo(
    () => [...communities].sort((a, b) => communityTrendScore(b) - communityTrendScore(a)).slice(0, 5),
    [communities]
  );

  const matched = useMemo(() => {
    if (!interests || interests.length === 0) return [];
    return communities
      .filter((c) => !joinedIds.includes(c.id) && interestMatchCount(c, interests) > 0)
      .sort((a, b) => interestMatchCount(b, interests) - interestMatchCount(a, interests))
      .slice(0, 4);
  }, [communities, interests, joinedIds]);

  const rail = (
    <div className="space-y-6">
      <RailSection icon={TrendingUp} title="Trending">
        {trending.map((c, i) => (
          <RailRow key={c.id} community={c} onOpen={onOpen} rank={i + 1} meta={`${c.members} members`} />
        ))}
      </RailSection>

      {matched.length > 0 && (
        <RailSection icon={Sparkles} title="For you">
          {matched.map((c) => (
            <RailRow key={c.id} community={c} onOpen={onOpen} meta={c.category} />
          ))}
        </RailSection>
      )}

      <RailSection
        icon={Users}
        title="Your communities"
        action={
          <button onClick={onCreateClick} className="text-content-faint hover:text-content transition-colors" aria-label="Create community">
            <Plus size={13} />
          </button>
        }
      >
        {joined.length === 0 ? (
          <p className="px-2 text-2xs text-content-faint leading-relaxed">
            Nothing joined yet. Find one in Explore.
          </p>
        ) : (
          joined.slice(0, 8).map((c) => (
            <RailRow
              key={c.id}
              community={c}
              onOpen={onOpen}
              meta={c.lastActive <= 10 ? "Active now" : `${c.members} members`}
            />
          ))
        )}
      </RailSection>
    </div>
  );

  return (
    <Screen>
      <PageHeader
        title="Home"
        subtitle="Latest from every community"
        actions={<Button variant="secondary" size="sm" icon={Plus} onClick={onCreateClick}>New</Button>}
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto px-5 lg:px-8 py-5 flex gap-8 items-start">
          <div className="flex-1 min-w-0 max-w-2xl mx-auto xl:mx-0">
            {loading ? (
              <SkeletonFeed count={4} />
            ) : (
              <LatestPostsFeed
                feedPosts={feedPosts || []}
                communities={communities}
                sparkIds={feedSparkIds || []}
                onSparkPost={onSparkPost}
                onOpen={onOpen}
                onAdClick={onAdClick}
              />
            )}
          </div>

          <aside className="hidden xl:block w-60 shrink-0 sticky top-0">
            {loading
              ? <div className="space-y-2.5">{Array.from({ length: 3 }).map((_, i) => <SkeletonTile key={i} />)}</div>
              : rail}
          </aside>
        </div>

        {/* Below xl the rail has nowhere to sit, so it follows the feed
            rather than being dropped entirely. */}
        {!loading && (
          <div className="xl:hidden max-w-2xl mx-auto px-5 lg:px-8 pb-6">{rail}</div>
        )}
      </div>
    </Screen>
  );
}
