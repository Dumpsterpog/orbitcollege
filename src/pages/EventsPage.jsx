import { useNavigate } from "react-router-dom";
import { useOrbit } from "../context/OrbitContext.jsx";
import { EventsScreen } from "../components/Events.jsx";

export default function EventsPage() {
  const navigate = useNavigate();
  const o = useOrbit();
  return (
    <EventsScreen
      events={o.events}
      registeredEventIds={o.registeredEventIds}
      passes={o.myPasses}
      onOpenPass={(p) => navigate(`/events/${p.eventId}/register`)}
      onRegister={(e) => navigate(`/events/${e.id}/register`)}
      onOpenEvent={(e) => {
        // An event's linked community only exists once someone has registered,
        // so opening one before that has nowhere to go.
        const c = e.linkedCommunityId && o.dbCommunities.find((x) => x.id === e.linkedCommunityId);
        if (c) o.setSelectedCommunity(c);
        else o.showToast("This event's space opens once you register");
      }}
    />
  );
}
