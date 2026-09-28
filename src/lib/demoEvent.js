// A fake event for local testing, never written to the database.
//
// It exists so the whole registration path can be walked without creating a
// real event first: home page card, the details form, the payment handoff and
// the confirmation screen. It is added to the events list in memory only.
//
// On by default in `npm run dev`, off in any production build unless
// VITE_DEMO_EVENT is explicitly set to "true". A demo event on the live site
// during real registrations would be worse than no demo at all.
export const demoEventEnabled =
  import.meta.env.VITE_DEMO_EVENT === "true"
  || (import.meta.env.DEV && import.meta.env.VITE_DEMO_EVENT !== "false");

// Same shape mapEvent produces, so every screen treats it like a real one.
export const DEMO_EVENT = {
  id: "demo-event",
  title: "TechIdeat 2026 (demo)",
  category: "Coding & Projects",
  tags: ["Coding & Projects"],
  desc: "A local test event. It is not in the database, so nothing here reaches the admin panel. Use it to walk through registration, payment and the confirmation screen.",
  when: "Fri, 9 Oct, 10:00 am",
  where: "AB1 Auditorium",
  capacity: 200,
  going: 0,
  startsAt: new Date("2026-10-09T10:00:00"),
  imageUrl: null,
  featured: true,
  linkedCommunityId: null,
};

// Demo first: on a page whose whole job is the event, the one you are testing
// should not be below a real one.
export const withDemoEvent = (events) =>
  demoEventEnabled ? [DEMO_EVENT, ...events] : events;
