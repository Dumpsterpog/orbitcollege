import { useOrbit } from "../context/OrbitContext.jsx";
import { ProfileScreen } from "../components/Profile.jsx";

export default function ProfilePage() {
  const o = useOrbit();
  return (
    <ProfileScreen
      user={o.user}
      email={o.authUser?.email}
      pendingCount={o.pendingPosts.length}
      passes={o.myPasses}
      events={o.events}
      onOpenPass={(p) => o.goToTab(`events/${p.eventId}/register`)}
      joinedCommunities={o.joinedCommunities}
      onSaveProfile={o.handleUpdateProfile}
      onProfileImage={o.handleProfileImage}
      onVerifyGuest={o.goToInitialPage}
      onOpenSettings={() => o.goToTab("settings")}
      onOpenCommunity={o.setSelectedCommunity}
      onComingSoon={() => o.showToast("Coming soon")}
      authUserId={o.authUser?.id}
      allCommunities={o.allGroups}
      myPosts={o.authUser ? o.feedPosts.filter((p) => p.authorId === o.authUser.id) : []}
      registeredEvents={o.events.filter((e) => o.registeredEventIds.includes(e.id))}
      onOpenEvent={(e) => {
        const c = e.linkedCommunityId && o.dbCommunities.find((x) => x.id === e.linkedCommunityId);
        if (c) o.setSelectedCommunity(c);
        else o.goToTab("events");
      }}
    />
  );
}
