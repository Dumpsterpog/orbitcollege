import React, { useState, useMemo, useEffect } from "react";
import { Plus, Users, Flame, TrendingUp, Image as ImageIcon, Megaphone } from "lucide-react";
import { CATEGORIES, COLOR_MAP } from "../data/constants.js";
import { interestMatchCount, baseSparks, communityTrendScore } from "../utils/helpers.js";
import { SkeletonFeed, SkeletonStory } from "./Skeleton.jsx";
import { EmptyState } from "./EmptyState.jsx";

// Stories only ever show communities/clubs the student has already joined —
// this is a "what's active where I belong" strip, like Instagram stories
// only showing people you follow, not a discovery surface.
export function CommunityStories({ communities, joinedIds, onOpen, onCreateClick }) {
  const ordered = useMemo(() => (
    communities
      .filter((c) => joinedIds.includes(c.id))
      .sort((a, b) => a.lastActive - b.lastActive)
      .slice(0, 12)
  ), [communities, joinedIds]);
  return (
    <div className="pt-3.5 pb-1">
      <div className="flex gap-3.5 overflow-x-auto px-4 pb-2 no-scrollbar">
        <button onClick={onCreateClick} className="flex flex-col items-center gap-1.5 w-16 shrink-0">
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center">
            <Plus size={18} className="text-zinc-500" />
          </div>
          <p className="text-[10px] text-zinc-600 dark:text-zinc-400 text-center leading-tight">Create</p>
        </button>
        {ordered.map((c) => {
          const cat = CATEGORIES.find((x) => x.name === c.category);
          const isLive = c.lastActive <= 10;
          return (
            <button key={c.id} onClick={() => onOpen(c)} className="flex flex-col items-center gap-1.5 w-16 shrink-0">
              <div className={`rounded-full p-[2.5px] shrink-0 ${c.avatarUrl ? "bg-gradient-to-br from-zinc-300 dark:from-zinc-700 to-zinc-400 dark:to-zinc-600" : isLive ? "bg-gradient-to-br from-zinc-400 dark:from-zinc-600 to-zinc-400 dark:to-zinc-600" : "bg-gradient-to-br from-zinc-600 to-zinc-700"}`}>
                <div className="bg-white dark:bg-zinc-950 rounded-full p-[2px]">
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt="" className="rounded-full w-12 h-12 object-cover" />
                  ) : (
                    <div className={`${COLOR_MAP[cat.color].tint} ${COLOR_MAP[cat.color].text} rounded-full w-12 h-12 flex items-center justify-center`}>
                      <cat.icon size={19} />
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-400 text-center leading-tight line-clamp-2">{c.name.split(" — ")[0]}</p>
            </button>
          );
        })}
        {ordered.length === 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-600 self-center py-2">Join a community to see it here.</p>
        )}
      </div>
    </div>
  );
}

export function CommunityCard({ c, joined, onOpen, sparked, onSpark, trendRank, index = 0 }) {
  const cat = CATEGORIES.find((x) => x.name === c.category);
  const cm = COLOR_MAP[cat.color];
  const Icon = cat.icon;
  const isLive = c.lastActive <= 10;
  const sparks = baseSparks(c) + (sparked ? 1 : 0);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(c)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(c); } }}
      className={`animate-fade-in-up stagger-${Math.min((index % 8) + 1, 8)} w-full text-left bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 p-3.5 flex gap-3 cursor-pointer`}
    >
      <div className={`${cm.tint} ${cm.text} w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 relative ring-1 ring-white/5 overflow-hidden`}>
        {c.avatarUrl ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" /> : <Icon size={20} />}
        {isLive && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-zinc-900 dark:bg-zinc-50 ring-2 ring-white dark:ring-zinc-900 animate-pulse" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm truncate flex items-center gap-1">
            {c.name}
            {c.official && <BadgeCheckDot />}
          </p>
          {joined ? (
            <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-medium shrink-0">Joined</span>
          ) : trendRank ? (
            <span className="flex items-center gap-0.5 text-[10px] text-zinc-700 dark:text-zinc-300 font-medium shrink-0"><TrendingUp size={10} />#{trendRank} Trending</span>
          ) : null}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{c.desc}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2.5 text-[11px] text-zinc-500">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">{c.category}</span>
            <span className="flex items-center gap-1 mono"><Users size={11} />{c.members}</span>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSpark(c.id); }}
            className={`flex items-center gap-1 text-[11px] font-medium px-1.5 py-1 rounded-full active:scale-90 transition-transform ${sparked ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-500"}`}
          >
            <Flame size={13} fill={sparked ? "currentColor" : "none"} /><span className="mono">{sparks}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function BadgeCheckDot() {
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-50 shrink-0" title="Official" />;
}

export function MatchCard({ c, onOpen }) {
  const cat = CATEGORIES.find((x) => x.name === c.category);
  const cm = COLOR_MAP[cat.color];
  return (
    <button onClick={() => onOpen(c)} className="w-40 shrink-0 text-left bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-900/30 dark:border-zinc-50/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className={`${cm.tint} ${cm.text} w-9 h-9 rounded-xl flex items-center justify-center`}>
          <cat.icon size={16} />
        </div>
        <span className="text-[9px] text-zinc-900 dark:text-zinc-50 font-semibold flex items-center gap-0.5">✨ For you</span>
      </div>
      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight line-clamp-2 mb-1">{c.name}</p>
      <p className="text-[10px] text-zinc-500">{c.members} members</p>
    </button>
  );
}

// Top communities right now, by the same trend score already used for the
// "#N Trending" badge on feed cards — a compact "at a glance" strip, not
// the full directory (that's Explore's job now, see §16 note in README).
function TopCommunityCard({ c, rank, onOpen }) {
  const cat = CATEGORIES.find((x) => x.name === c.category);
  const cm = COLOR_MAP[cat.color];
  return (
    <button onClick={() => onOpen(c)} className="w-40 shrink-0 text-left bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className={`${cm.tint} ${cm.text} w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden`}>
          {c.avatarUrl ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" /> : <cat.icon size={16} />}
        </div>
        <span className="flex items-center gap-0.5 text-[9px] text-zinc-700 dark:text-zinc-300 font-semibold"><TrendingUp size={10} />#{rank}</span>
      </div>
      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight line-clamp-2 mb-1">{c.name}</p>
      <p className="text-[10px] text-zinc-500 flex items-center gap-1"><Users size={10} />{c.members} members</p>
    </button>
  );
}

function TopCommunitiesRow({ communities, onOpen }) {
  const top = useMemo(() => (
    [...communities].sort((a, b) => communityTrendScore(b) - communityTrendScore(a)).slice(0, 5)
  ), [communities]);
  if (top.length === 0) return null;
  return (
    <div className="pb-1 mb-1">
      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 px-4 mb-2 flex items-center gap-1.5"><TrendingUp size={13} />Top communities right now</p>
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 no-scrollbar">
        {top.map((c, i) => <TopCommunityCard key={c.id} c={c} rank={i + 1} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Latest posts feed — the dashboard's main content now (Instagram-style):
// every community's posts, newest first, one column, image-first cards.
// Browsing/searching communities themselves moved to Explore only; Home is
// now purely "what's new", not a second copy of the directory.
// ------------------------------------------------------------------
function PostFeedCard({ post, community, sparked, onSpark, onOpen, index = 0 }) {
  const cat = community ? CATEGORIES.find((x) => x.name === community.category) : null;
  const cm = cat ? COLOR_MAP[cat.color] : null;
  return (
    <div className={`animate-fade-in-up stagger-${Math.min((index % 8) + 1, 8)} bg-white dark:bg-zinc-950 pb-3`}>
      <button onClick={() => community && onOpen(community)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left">
        <div className={`${cm ? cm.tint : "bg-zinc-100 dark:bg-zinc-800"} ${cm ? cm.text : "text-zinc-500"} w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden`}>
          {community?.avatarUrl ? <img src={community.avatarUrl} alt="" className="w-full h-full object-cover" /> : cat ? <cat.icon size={16} /> : null}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{community?.name || "Orbit"}</p>
          <p className="text-[10px] text-zinc-500">{post.who} · {post.time}</p>
        </div>
      </button>
      {post.imageUrl && (
        <button onClick={() => community && onOpen(community)} className="block w-full aspect-square bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
          <img src={post.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        </button>
      )}
      <div className="px-4 pt-2.5 flex items-center gap-4">
        <button
          type="button"
          onClick={() => onSpark(post.id)}
          className={`flex items-center gap-1.5 text-xs font-medium active:scale-90 transition-transform ${sparked ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500"}`}
        >
          <Flame size={18} fill={sparked ? "currentColor" : "none"} /><span className="mono">{post.sparks}</span>
        </button>
      </div>
      {post.text && (
        <p className="px-4 pt-1.5 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{community?.name}</span>{" "}{post.text}
        </p>
      )}
    </div>
  );
}

// Demo sponsored content — clearly labeled "Sponsored", not disguised as a
// real post. There's no ad backend/SDK wired up yet (see README §15's note
// on the old, honestly-empty ad slot); these three are static placeholders
// so the feed's ad-every-3rd-post layout can actually be seen and demoed,
// swap for a real ad network's response later without touching the layout.
const DEMO_ADS = [
  {
    id: "demo-ad-cafe",
    kind: "Local business",
    title: "Campus Grind Café",
    subtitle: "20% off for MUJ students this week — just show your Orbit profile at the counter.",
    cta: "View offer",
    image: "https://loremflickr.com/900/900/coffee,cafe?lock=2001",
  },
  {
    id: "demo-ad-fest",
    kind: "Campus event",
    title: "Zeal 2026 — MUJ Cultural Fest",
    subtitle: "Registrations are open now. Headline night passes are going fast.",
    cta: "Learn more",
    image: "https://loremflickr.com/900/900/concert,festival?lock=2002",
  },
  {
    id: "demo-ad-print",
    kind: "Local business",
    title: "PrintHub Jaipur",
    subtitle: "Same-day assignment printing & spiral binding, 5 minutes from campus gate.",
    cta: "Get directions",
    image: "https://loremflickr.com/900/900/printer,stationery?lock=2003",
  },
];

function AdCard({ ad, onClick, index = 0 }) {
  return (
    <div className={`animate-fade-in-up stagger-${Math.min((index % 8) + 1, 8)} bg-white dark:bg-zinc-950 pb-3`}>
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
          <Megaphone size={15} className="text-zinc-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{ad.title}</p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-wide">Sponsored · {ad.kind}</p>
        </div>
      </div>
      <button onClick={onClick} className="block w-full aspect-square bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
        <img src={ad.image} alt="" className="w-full h-full object-cover" loading="lazy" />
      </button>
      <div className="px-4 pt-2.5">
        <p className="text-xs text-zinc-700 dark:text-zinc-300">{ad.subtitle}</p>
        <button onClick={onClick} className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 active:scale-95 transition-transform">
          {ad.cta}
        </button>
      </div>
    </div>
  );
}

function LatestPostsFeed({ feedPosts, communities, sparkIds, onSparkPost, onOpen, onAdClick }) {
  const items = useMemo(() => {
    const withAds = [];
    feedPosts.forEach((post, i) => {
      withAds.push({ type: "post", key: post.id, post });
      if ((i + 1) % 3 === 0) {
        withAds.push({ type: "ad", key: `ad-${i}`, ad: DEMO_ADS[Math.floor(i / 3) % DEMO_ADS.length] });
      }
    });
    return withAds;
  }, [feedPosts]);

  if (feedPosts.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No posts yet"
        subtitle="Posts from every community will show up here, newest first, as they're made."
      />
    );
  }
  return (
    <div className="lg:max-w-lg lg:mx-auto space-y-3">
      {items.map((item, idx) =>
        item.type === "post" ? (
          <PostFeedCard
            key={item.key}
            post={item.post}
            community={communities.find((c) => c.id === item.post.communityId)}
            sparked={sparkIds.includes(item.post.id)}
            onSpark={onSparkPost}
            onOpen={onOpen}
            index={idx}
          />
        ) : (
          <AdCard key={item.key} ad={item.ad} onClick={onAdClick} index={idx} />
        )
      )}
    </div>
  );
}

export function HomeScreen({
  communities, joinedIds, onOpen, onCreateClick, interests,
  feedPosts, feedSparkIds, onSparkPost, onAdClick,
}) {
  // Brief skeleton pass on first mount only — makes the feed feel like it's
  // fetching real data instead of popping in instantly.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);
  const matched = useMemo(() => {
    if (!interests || interests.length === 0) return [];
    return communities
      .filter((c) => !joinedIds.includes(c.id) && interestMatchCount(c, interests) > 0)
      .sort((a, b) => interestMatchCount(b, interests) - interestMatchCount(a, interests))
      .slice(0, 6);
  }, [communities, interests, joinedIds]);

  return (
    <div className="relative flex-1 overflow-y-auto no-scrollbar pb-4">
      <div className="relative z-10">
        {loading ? (
          <div className="flex gap-3.5 overflow-x-auto px-4 py-3.5 no-scrollbar">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonStory key={i} />)}
          </div>
        ) : (
          <CommunityStories communities={communities} joinedIds={joinedIds} onOpen={onOpen} onCreateClick={onCreateClick} />
        )}
        {!loading && (
          <>
            <TopCommunitiesRow communities={communities} onOpen={onOpen} />
            {matched.length > 0 && (
              <div className="pb-1 mb-1">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 px-4 mb-2 flex items-center gap-1.5">✨ Matched to your interests</p>
                <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 no-scrollbar">
                  {matched.map((c) => <MatchCard key={c.id} c={c} onOpen={onOpen} />)}
                </div>
              </div>
            )}
          </>
        )}
        <div className="px-4 pt-2 pb-2 mt-1">
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">Latest posts</p>
        </div>
        {loading ? (
          <div className="px-4"><SkeletonFeed count={4} /></div>
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
    </div>
  );
}
