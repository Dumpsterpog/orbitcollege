import { useOrbit } from "../context/OrbitContext.jsx";
import { ExploreScreen } from "../components/Explore.jsx";

export default function ExplorePage() {
  const o = useOrbit();
  return (
    <ExploreScreen
      subTab={o.exploreTab}
      setSubTab={o.setExploreTab}
      clubs={o.clubs}
      communities={o.communities}
      onOpen={o.setSelectedCommunity}
      joinedIds={o.joinedIds}
      onJoinToggle={(id) => {
        if (!o.user.verified) { o.handleBlocked(); return; }
        o.handleJoinToggle(id);
      }}
      onCreate={o.openCreate}
    />
  );
}
