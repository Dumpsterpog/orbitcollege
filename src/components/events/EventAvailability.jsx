import { Icon, cx } from "../ui/Primitives.jsx";
import { useEventSchedule } from "./eventTiming.js";
import { noticeFor } from "./eventNotice.js";

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
