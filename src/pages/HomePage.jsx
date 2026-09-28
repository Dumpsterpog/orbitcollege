import { useNavigate } from "react-router-dom";
import { useOrbit } from "../context/OrbitContext.jsx";
import { EventsScreen } from "../components/Events.jsx";

// Home is the events board for now.
//
// Registrations for the 9 October event open tonight, and the one thing every
// visitor needs is the event and its Register button. The campus feed still
// exists at its own routes; it is simply not what the landing page is for this
// week. Putting events here also means the landing page no longer subscribes
// to every post in the project, which is the read the feed was costing.
export default function HomePage() {
  const navigate = useNavigate();
  const o = useOrbit();

  return (
    <EventsScreen
      events={o.events}
      registeredEventIds={o.registeredEventIds}
      onRegister={(e) => navigate(`/events/${e.id}/register`)}
      onOpenEvent={(e) => {
        const c = e.linkedCommunityId && o.dbCommunities.find((x) => x.id === e.linkedCommunityId);
        if (c) o.setSelectedCommunity(c);
        else navigate(`/events/${e.id}/register`);
      }}
    />
  );
}
