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
