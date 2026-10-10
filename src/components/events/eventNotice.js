// What an event needs to say right now, in one place.
//
// Plans change on the day: slots get merged, registration shuts early. Every
// screen that mentions the event has to say the same thing about it, so the
// wording lives here rather than in each of the five places that show it.
//
// Keyed by event id, so it disappears on its own for every other event.

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

export const noticeFor = (event) => EVENT_NOTICES[event?.id] || null;

export const isRegistrationClosed = (event) => Boolean(noticeFor(event)?.registrationClosed);
