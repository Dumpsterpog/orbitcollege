// What an event needs to say right now, in one place.
//
// Plans change on the day: slots get merged, registration shuts early. Every
// screen that mentions the event has to say the same thing about it, so the
// wording lives here rather than in each of the five places that show it.
//
// Keyed by event id, so it disappears on its own for every other event.

// ---------------------------------------------------------------- the switch
//
// An event reopened on purpose, shown as though it were still ahead of us.
// This is for demonstrating the registration flow to someone after the day has
// passed, and it is the only thing standing between a finished event and a
// live payment link, so it is one line and it is at the top of the file.
//
// While an id is in here: the closed notice is withheld, the date is ignored
// so the session never counts as finished, and the whole flow (slot, pass,
// payment, pass code) works exactly as it did on the day.
//
// Set the value to false, or delete the line, to put it back to closed.
export const DEMO_OPEN = {
  U8uiUHLfTMAGkzBdWsFo: true, // TECHIDEATE, reopened to demo the flow
};

export const isDemoOpen = (event) => Boolean(DEMO_OPEN[event?.id]);

export const EVENT_NOTICES = {
  // TECHIDEATE, 10 October. The two slots were combined into one session.
  U8uiUHLfTMAGkzBdWsFo: {
    registrationClosed: true,
    title: "Registrations are closed",
    time: "One session for everyone, from 2:00 pm",
    lines: [
      "The earlier slots have been combined, so come at 2:00 pm whichever slot you picked when you registered.",
      "Everyone who signed up and paid has an entry pass ready. Open your registration page to show its QR at the door.",
    ],
  },
};

// A reopened event has nothing to announce: the closed notice is the one thing
// that would contradict the open form sitting underneath it.
export const noticeFor = (event) => (isDemoOpen(event) ? null : EVENT_NOTICES[event?.id] || null);

export const isRegistrationClosed = (event) =>
  !isDemoOpen(event) && Boolean(EVENT_NOTICES[event?.id]?.registrationClosed);
