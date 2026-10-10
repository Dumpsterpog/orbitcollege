import { Icon, cx } from "../ui/Primitives.jsx";
import { useEventSchedule } from "./eventTiming.js";
import { noticeFor } from "./eventNotice.js";

// The organiser's current word on this event, wherever it is mentioned: the
// event card, the home strip, the rail, the sign-in gate and the registration
// page all render this, so none of them can be left saying something the
// others have stopped saying.
//
// `compact` is for the narrow places, which have room for the headline and
// the time but not the explanation.
export function EventAvailability({ event, className, compact = false }) {
  const schedule = useEventSchedule(event);
  const notice = noticeFor(event);
  if (!notice) return null;

  if (schedule.isComplete) {
    return (
      <span className={cx("flex items-start gap-2.5 text-xs font-semibold text-ink-2", className)}>
        <Icon name="celebration" size={16} className="text-c-green shrink-0 mt-0.5" />
        <span>Thank you for attending. Certificates will be given to all participants who attended the event.</span>
      </span>
    );
  }

  return (
    <span className={cx("flex items-start gap-2.5", className)}>
      <Icon name="info" size={16} className="text-c-amber shrink-0 mt-0.5" />
      <span className="min-w-0">
        <span className="block text-xs font-bold text-ink">{notice.title}</span>
        {notice.time && (
          <span className="block text-xs font-semibold text-c-amber mt-0.5">{notice.time}</span>
        )}
        {!compact && notice.lines?.map((line) => (
          <span key={line} className="block text-xs text-ink-2 mt-1 leading-relaxed">{line}</span>
        ))}
      </span>
    </span>
  );
}
