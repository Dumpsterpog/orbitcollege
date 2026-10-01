import { useState, useMemo, useEffect, Fragment } from "react";
import { Screen } from "./ui/Layout.jsx";
import { Button, Icon, cx } from "./ui/Primitives.jsx";
import { Composer, FeedTabs } from "./home/Composer.jsx";
import { PostCard } from "./home/PostCard.jsx";
import { AdCard } from "./home/AdCard.jsx";
import {
  PulseHeader, Trending, UpcomingEvents, CommunitiesForYou,
} from "./home/Rail.jsx";

// Home is the campus feed, with everything that is not a post in the rail.
//
// The rail is always there, so the page is the same shape on an empty campus
// and a busy one. Earlier versions moved a community directory into the feed
// column whenever it ran dry, which read as filler because it was.

function PostSkeleton() {
  return (
    <div className="w-full bg-bg-raised rounded-2xl border border-line p-5 animate-pulse">
      <div className="flex items-center gap-3">
        <span className="w-[42px] h-[42px] rounded-full bg-bg-sunken shrink-0" />
        <span className="min-w-0 flex-1 space-y-2">
          <span className="block h-3 w-40 rounded-full bg-bg-sunken" />
          <span className="block h-2.5 w-24 rounded-full bg-bg-sunken" />
        </span>
      </div>
      <div className="space-y-2 mt-4">
        <span className="block h-3 w-full rounded-full bg-bg-sunken" />
        <span className="block h-3 w-[80%] rounded-full bg-bg-sunken" />
      </div>
    </div>
  );
}

const TABS = [
  { key: "foryou", label: "For You" },
  { key: "following", label: "Following" },
  { key: "mine", label: "My Communities" },
  { key: "trending", label: "Trending" },
];

export function HomeScreen({
  communities, joinedIds, onOpen, onCreateClick, authUserId,
  feedPosts, feedSparkIds, onSparkPost, onCreatePost, pendingPosts = [], announcements = [], ads = [],
  userName, user, onJoinToggle, onGoToExplore, onSharePost, onReportPost,
  events = [], registeredEventIds = [], onRegisterEvent, onGoToEvents,
}) {
  const [loading, setLoading] = useState(() => !(feedPosts || []).length);
  const [tab, setTab] = useState("foryou");

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, [loading]);

  const allPosts = feedPosts || [];
  const joined = useMemo(
    () => communities.filter((c) => joinedIds.includes(c.id)),
    [communities, joinedIds]
  );

  const posts = useMemo(() => {
    const mine = allPosts.filter((p) => joinedIds.includes(p.communityId));
    const byNew = (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);

    if (tab === "following" || tab === "mine") return [...mine].sort(byNew);
    if (tab === "trending") {
      return [...allPosts]
        .filter((p) => (p.sparks || 0) + (p.comments || 0) > 0)
        .sort((a, b) => ((b.sparks || 0) + (b.comments || 0)) - ((a.sparks || 0) + (a.comments || 0)) || byNew(a, b));
    }
    // For You decays engagement against age, so a busy post from this morning
    // outranks a busier one from last month. Without the decay it is just Top.
    const heat = (x) => {
      const hours = Math.max(1, (Date.now() - (x.createdAt?.getTime() || 0)) / 3600e3);
      return ((x.sparks || 0) + (x.comments || 0) * 2 + 1) / Math.pow(hours + 2, 0.6);
    };
    return [...allPosts].sort((a, b) => heat(b) - heat(a) || byNew(a, b));
  }, [allPosts, tab, joinedIds]);

  const suggested = useMemo(
    () => communities
      .filter((c) => !joinedIds.includes(c.id))
      .sort((a, b) => (b.members || 0) - (a.members || 0))
      .slice(0, 3),
    [communities, joinedIds]
  );

  const openEvents = useMemo(
    () => [...events].sort((a, b) => (a.startsAt?.getTime() || 0) - (b.startsAt?.getTime() || 0)),
    [events]
  );

  // Topics, counted from the feed itself. The mock shows hashtags with counts;
  // these are the real ones people have written, plus the categories of the
  // communities posting, so the list reflects the campus rather than a guess.
  const trending = useMemo(() => {
    const counts = new Map();
    const bump = (name) => {
      const prev = counts.get(name) || { posts: 0 };
      prev.posts += 1;
      counts.set(name, prev);
    };
    for (const post of allPosts) {
      const tags = String(post.text || "").match(/(?:^|\s)#([a-zA-Z][\w-]{1,30})/g) || [];
      if (tags.length) tags.forEach((t) => bump(t.trim().slice(1)));
      else {
        const c = communities.find((x) => x.id === post.communityId);
        if (c?.category) bump(c.category);
      }
    }
    return [...counts.entries()]
      .map(([name, v]) => ({ name, posts: v.posts }))
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 5);
  }, [allPosts, communities]);

  const canPost = !!user?.verified;

  // Dismissed announcements are remembered per browser. Storage can be
  // unavailable (private windows), in which case a dismissal lasts the visit.
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("orbit.dismissedAnnouncements") || "[]"); }
    catch { return []; }
  });
  const dismissAnnouncement = (id) => {
    const next = [...dismissed, id].slice(-50);
    setDismissed(next);
    try { localStorage.setItem("orbit.dismissedAnnouncements", JSON.stringify(next)); } catch { /* visit-only */ }
  };
  const shownAnnouncements = announcements.filter((a) => !dismissed.includes(a.id)).slice(0, 2);

  // Targeting. An ad with no interests is for everyone; one with interests
  // reaches only people who picked at least one of them. Guests have no
  // interests, so an interest-targeted ad never reaches them either way.
  const myInterests = user?.interests || [];
  const eligibleAds = ads.filter((a) =>
    (user?.verified || a.showToGuests)
    && (!a.interests.length || myInterests.some((i) => a.interests.includes(i))));
  const feedAds = eligibleAds.filter((a) => a.placements.includes("feed"));
  const railAds = eligibleAds.filter((a) => a.placements.includes("rail"));

  // First ad after the third post (or the last, on a short feed), then one
  // every six posts, rotating through what is live.
  const adAfter = (i) => {
    if (!feedAds.length) return null;
    const first = Math.min(2, posts.length - 1);
    if (i < first || (i - first) % 6 !== 0) return null;
    return feedAds[((i - first) / 6) % feedAds.length];
  };

  return (
    <Screen>
      <div className="w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 grid justify-center gap-6
        grid-cols-1 max-w-[1420px] lg:grid-cols-[minmax(0,760px)_360px]">

        {/* ------------------------------------------------------- feed */}
        <div className="min-w-0 flex flex-col gap-3 sm:gap-4">
          {shownAnnouncements.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-line bg-bg-raised px-4 py-3">
              <Icon name="campaign" size={18} className="text-accent mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                {a.title && <p className="text-base font-semibold text-ink break-words">{a.title}</p>}
                {a.body && <p className="text-xs text-ink-2 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">{a.body}</p>}
              </div>
              <button
                onClick={() => dismissAnnouncement(a.id)}
                aria-label="Dismiss announcement"
                className="grid place-items-center w-7 h-7 rounded-full text-ink-3 hover:text-ink hover:bg-bg-sunken transition-colors shrink-0"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}

          {user?.suspended ? (
            <div className="flex items-start gap-3 rounded-2xl border border-line bg-bg-raised px-4 py-3">
              <Icon name="block" size={18} className="text-c-red mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-base font-semibold text-ink">Your account is suspended</p>
                <p className="text-xs text-ink-2 mt-0.5 leading-relaxed">
                  You can still read Orbit, but posting, commenting and chat are turned off.
                  If you think this is a mistake, email team.orbit@gmail.com.
                </p>
              </div>
            </div>
          ) : (
            <Composer
              user={{ ...user, name: userName || user?.name }}
              communities={joined}
              canPost={canPost}
              onBlocked={() => onJoinToggle?.(null)}
              onSubmit={onCreatePost}
            />
          )}

          {/* Only the author ever sees this: the queue is unreadable to anyone
              else, so a held post cannot leak through here. */}
          {pendingPosts.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-line bg-bg-raised px-4 py-3">
              <Icon name="schedule" size={18} className="text-ink-3 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-base font-semibold text-ink">
                  {pendingPosts.length === 1 ? "1 post is" : `${pendingPosts.length} posts are`} waiting for review
                </p>
                <p className="text-xs text-ink-2 mt-0.5 leading-relaxed">
                  Posts about dating, sex or adult links are checked by a moderator before they appear. Only you can see this.
                </p>
              </div>
            </div>
          )}

          <FeedTabs value={tab} onChange={setTab} tabs={TABS} />

          {loading ? (
            <><PostSkeleton /><PostSkeleton /></>
          ) : posts.length === 0 ? (
            <div className="bg-bg-raised rounded-2xl border border-line py-16 text-center">
              <p className="text-lg font-bold text-ink">
                {tab === "foryou" ? "No posts yet" : "Nothing here yet"}
              </p>
              <p className="text-base text-ink-2 mt-2 max-w-[38ch] mx-auto leading-relaxed">
                {tab === "foryou"
                  ? canPost
                    ? "Nothing has been posted on campus yet. Yours would be the first."
                    : "Sign in to post, or join a community and everything it posts lands here."
                  : "Join a community and its posts show up here."}
              </p>
              <Button
                tone="blue"
                size="md"
                onClick={tab === "foryou" ? onGoToExplore : () => setTab("foryou")}
                className="mt-6"
              >
                {tab === "foryou" ? "Browse communities" : "Show all posts"}
              </Button>
            </div>
          ) : (
            posts.map((p, i) => {
              const ad = adAfter(i);
              return (
                <Fragment key={p.id}>
                  <PostCard
                    post={p}
                    community={communities.find((c) => c.id === p.communityId)}
                    liked={(feedSparkIds || []).includes(p.id)}
                    onLike={onSparkPost}
                    onOpen={onOpen}
                    onTag={() => onGoToExplore()}
                    onShare={onSharePost}
                    onReport={onReportPost}
                    authUserId={authUserId}
                    myName={userName}
                    canWrite={canPost}
                    onBlocked={() => onJoinToggle?.(null)}
                  />
                  {ad && <AdCard ad={ad} />}
                </Fragment>
              );
            })
          )}
        </div>

        {/* ------------------------------------------------------- rail */}
        {/* No items-start on the grid above, deliberately: the aside has to
            stretch to the row height or the sticky child below has a box its
            own height to travel in, which is no travel at all -- the rail
            scrolled away and left a hole. */}
        <aside className="hidden lg:block h-full">
          <div className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto no-scrollbar pr-1 flex flex-col gap-4">
            <PulseHeader />
            <Trending topics={trending} onOpen={() => onGoToExplore()} />
            {railAds[0] && <AdCard ad={railAds[0]} compact />}
            <UpcomingEvents
              events={openEvents}
              registeredIds={registeredEventIds}
              onOpen={onRegisterEvent}
              onAll={onGoToEvents}
            />
            <CommunitiesForYou
              communities={suggested}
              joinedIds={joinedIds}
              onOpen={onOpen}
              onJoin={onJoinToggle}
              onAll={onGoToExplore}
            />
          </div>
        </aside>
      </div>
    </Screen>
  );
}
