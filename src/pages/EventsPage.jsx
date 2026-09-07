import { useOrbit } from "../context/OrbitContext.jsx";
import { EventsScreen } from "../components/Events.jsx";

export default function EventsPage() {
  const o = useOrbit();
  return (
    <EventsScreen
      events={o.events}
      interests={o.user.interests}
      registeredEventIds={o.registeredEventIds}
      onRegister={o.handleRegisterEvent}
      onOpenEvent={(e) => {
        // An event's linked community only exists once someone has registered,
        // so opening one before that has nowhere to go.
        const c = e.linkedCommunityId && o.dbCommunities.find((x) => x.id === e.linkedCommunityId);
        if (c) o.setSelectedCommunity(c);
        else o.showToast("This event's space opens once you register");
      }}
      onSubmitEvent={() => o.showToast("Submitting events isn't built yet")}
    />
  );
}
