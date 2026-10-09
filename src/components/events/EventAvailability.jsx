import { Icon, cx } from "../ui/Primitives.jsx";
import { useEventSchedule } from "./eventTiming.js";

// The organiser's current availability notice belongs only to this event.
// Keep this snapshot separate from registration totals and future events.
const AVAILABILITY = {
  U8uiUHLfTMAGkzBdWsFo: { seatsRemaining: 40 },
};

export function EventAvailability({ event, className }) {
  const schedule = useEventSchedule(event);
  const availability = AVAILABILITY[event?.id];
  if (!availability) return null;

  if (schedule.isComplete) {
    return (
      <span className={cx("flex items-start gap-2.5 text-xs font-semibold text-ink-2", className)}>
        <Icon name="celebration" size={16} className="text-c-green shrink-0 mt-0.5" />
        <span>Thank you for attending. Certificates will be given to all participants who attended the event.</span>
      </span>
    );
  }

  return (
    <span className={cx("flex flex-wrap items-center gap-x-2.5 gap-y-1.5", className)}>
      <span className="inline-flex items-center gap-1 rounded-full bg-c-orange/15 px-2 py-1
        text-[10px] font-bold text-c-orange ring-1 ring-inset ring-c-orange/30 leading-none whitespace-nowrap">
        <Icon name="local_fire_department" size={12} className="shrink-0" />
        Filling fast
      </span>
      <span className="text-xs font-semibold text-ink-2">
        Only <span className="font-bold text-ink tabular-nums">{availability.seatsRemaining}</span> seats remaining
      </span>
    </span>
  );
}
