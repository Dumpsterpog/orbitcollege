import { useEffect, useState } from "react";

// Event times are always interpreted in India Standard Time. Browser-local
// timezones must not change when registration closes for an on-campus event.
// The two slots were combined into one session on the day. `closesHour` is
// when a slot stops being joinable: for a slot among several that is the
// moment it starts, because you cannot join one already running while another
// is still ahead of you. For a single combined session there is nothing else
// to move to, so it stays open until the session itself ends.
export const EVENT_SLOTS = [
  { key: "combined", label: "2:00 pm onwards", short: "One session", startHour: 14, endHour: 18, closesHour: 18 },
];

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function eventDateInIst(event) {
  if (!event?.startsAt) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(event.startsAt);
  const part = (type) => Number(parts.find((item) => item.type === type)?.value);
  const year = part("year"), month = part("month"), day = part("day");
  return year && month && day ? { year, month, day } : null;
}

function istInstant(date, hour) {
  return Date.UTC(date.year, date.month - 1, date.day, hour) - IST_OFFSET_MS;
}

export function getEventSchedule(event, now = Date.now()) {
  const date = eventDateInIst(event);
  if (!date) return { slots: EVENT_SLOTS.map((slot) => ({ ...slot, unavailable: false })), isComplete: false };

  const slots = EVENT_SLOTS.map((slot) => {
    const startsAt = istInstant(date, slot.startHour);
    const endsAt = istInstant(date, slot.endHour);
    const closesAt = istInstant(date, slot.closesHour ?? slot.startHour);
    return { ...slot, startsAt, endsAt, closesAt, unavailable: now >= closesAt };
  });

  return { slots, isComplete: now >= slots[slots.length - 1].endsAt };
}

// Keep an open page accurate at each IST boundary without asking the visitor
// to refresh it themselves.
export function useEventSchedule(event) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);
  return getEventSchedule(event, now);
}
