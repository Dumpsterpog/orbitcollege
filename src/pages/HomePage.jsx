import { useOrbit } from "../context/OrbitContext.jsx";
import { HomeScreen } from "../components/Home.jsx";

// Route components are deliberately thin: they pull what they need out of
// context and hand it to the screen component, which still takes plain props.
// Keeping the screens prop-driven means they stay testable and reusable
// without a router around them.
export default function HomePage() {
  const o = useOrbit();
  return (
    <HomeScreen
      authUserId={o.authUser?.id}
      communities={o.allGroups}
      joinedIds={o.joinedIds}
      onOpen={o.setSelectedCommunity}
      feedPosts={o.feedPosts}
      feedSparkIds={o.feedSparkIds}
      onSparkPost={o.handleSparkPost}
      onCreatePost={o.handleCreatePost}
      onCreateClick={o.openCreate}
      userName={o.user.verified ? o.user.name : ""}
      onJoinToggle={(id) => {
        if (!id || !o.user.verified) { o.handleBlocked(); return; }
        o.handleJoinToggle(id);
      }}
      user={o.user}
      onGoToExplore={() => o.goToTab("explore")}
      onSearchClick={o.openSearch}
      events={o.events}
      registeredEventIds={o.registeredEventIds}
      onRegisterEvent={o.handleRegisterEvent}
      onGoToEvents={() => o.goToTab("events")}
      onGoToTea={o.openTea}
    />
  );
}
