import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOrbit } from "../context/OrbitContext.jsx";
import { EventRegisterScreen } from "../components/EventRegister.jsx";

// The CCAvenue page the university hosts. Not an env var on purpose: it is a
// public URL printed on the posters, and a missing env var at build time would
// silently ship a dead Pay button on the night registrations open.
const PAY_URL =
  "https://formbuilder.ccavenue.com/live/ccavenue/manipal-university-jaipur-2/techideat-2026-202622";

export default function EventRegisterPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const o = useOrbit();

  // The parameter is an id from an in-app link, or a slug from a poster. A
  // title that changes changes the slug with it, so the id always works as a
  // fallback and printed links keep pointing at the right event.
  const slugify = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const wanted = slugify(eventId);
  const event = o.events.find((e) => e.id === eventId)
    || o.events.find((e) => slugify(e.title) === wanted)
    || null;

  // Events arrive from a live subscription, so a direct hit on this URL renders
  // before the list exists. That is loading, not a missing event -- but only
  // for as long as it takes to arrive. Without this timeout an empty list span
  // the page forever, which is what a student would see if the events query
  // were slow or refused.
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 6000);
    return () => clearTimeout(t);
  }, []);

  if (!event && o.events.length === 0 && !waited) {
    return (
      <div className="flex-1 grid place-items-center">
        <span className="w-6 h-6 rounded-full border-2 border-ink border-t-transparent animate-spin" />
      </div>
    );
  }

  const openCommunity = (e) => {
    const c = e?.linkedCommunityId && o.dbCommunities.find((x) => x.id === e.linkedCommunityId);
    if (c) o.setSelectedCommunity(c);
    else o.showToast("The chat opens a moment after you join");
  };

  return (
    <EventRegisterScreen
      event={event}
      payUrl={PAY_URL}
      user={o.user}
      email={o.authUser?.email}
      authUserId={o.authUser?.id}
      onSignIn={o.goToInitialPage}
      onBack={() => navigate("/")}
      onToast={o.showToast}
      onJoinCommunity={o.handleRegisterEvent}
      onOpenCommunity={openCommunity}
    />
  );
}
