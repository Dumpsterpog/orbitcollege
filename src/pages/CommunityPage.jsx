import { useParams, useNavigate } from "react-router-dom";
import { useOrbit } from "../context/OrbitContext.jsx";
import { CommunityDetail } from "../components/Community.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Button } from "../components/ui/Primitives.jsx";

export default function CommunityPage() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const o = useOrbit();

  const c = o.allGroups.find((x) => x.id === communityId);

  // Communities arrive from a live subscription, so a direct hit on this URL
  // renders before the list exists. That is loading, not missing.
  if (!c) {
    return o.allGroups.length === 0 ? (
      <div className="flex-1 grid place-items-center">
        <span className="w-6 h-6 rounded-full border-2 border-ink border-t-transparent animate-spin" />
      </div>
    ) : (
      <EmptyState
        icon="search_off"
        title="Community not found"
        body="It may have been deleted, or the link is wrong."
        action={<Button tone="blue" onClick={() => navigate("/explore")}>Browse communities</Button>}
      />
    );
  }

  const eventForCommunity = o.events.find((e) => e.linkedCommunityId === c.id) || null;

  return (
    <CommunityDetail
      key={c.id}
      c={c}
      event={eventForCommunity}
      registered={!!eventForCommunity && o.registeredEventIds.includes(eventForCommunity.id)}
      pass={eventForCommunity ? o.myPasses.find((p) => p.eventId === eventForCommunity.id) || null : null}
      onRegisterEvent={(e) => navigate("/events/" + e.id + "/register")}
      joined={o.joinedIds.includes(c.id)}
      onJoinToggle={o.handleJoinToggle}
      onClose={() => navigate(-1)}
      onReport={() => o.setReportTarget(c.name)}
      verified={o.user.verified}
      onBlocked={o.handleBlocked}
      sparked={o.sparkedIds.includes(c.id)}
      onSpark={o.handleSpark}
      onUpdate={o.handleUpdateCommunity}
      onDelete={o.handleDeleteCommunity}
      trendRank={o.topTrendingIds.includes(c.id) ? o.topTrendingIds.indexOf(c.id) + 1 : null}
      interests={o.user.interests}
      authUserId={o.authUser?.id}
      myName={o.user.name}
    />
  );
}
