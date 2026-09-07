import { useState, useMemo } from "react";
import { Icon, cx } from "../ui/Primitives.jsx";

// A month grid that marks the days something is actually on.
//
// It is not a date picker and does not pretend to be one: clicking a day
// filters the list beside it, and a day with nothing on it is not clickable,
// because a calendar that lets you select an empty Tuesday and then shows you
// an empty list has wasted the click.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const sameDay = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function CampusCalendar({ events, selected, onSelect, onViewAll }) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  // Which days in this month have something on them.
  const busy = useMemo(() => {
    const set = new Set();
    for (const e of events) {
      const d = e.startsAt;
      if (d && d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth()) {
        set.add(d.getDate());
      }
    }
    return set;
  }, [events, cursor]);

  // A leading run of blanks so the 1st lands under the right weekday.
  const firstWeekday = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const shift = (months) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + months, 1));

  return (
    <section className="w-full bg-bg-raised rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="calendar_month" size={18} className="text-accent" />
          <h3 className="text-[14px] font-bold text-ink tracking-tight truncate">Campus Calendar</h3>
        </div>
        <button onClick={onViewAll} className="text-[12px] font-semibold text-accent hover:underline shrink-0">
          View all
        </button>
      </div>

      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => shift(-1)}
          aria-label="Previous month"
          className="grid place-items-center w-7 h-7 rounded-lg text-ink-2 hover:bg-bg-sunken transition-colors"
        >
          <Icon name="chevron_right" size={17} className="rotate-180" />
        </button>
        <span className="text-[13px] font-semibold text-ink">
          {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button
          onClick={() => shift(1)}
          aria-label="Next month"
          className="grid place-items-center w-7 h-7 rounded-lg text-ink-2 hover:bg-bg-sunken transition-colors"
        >
          <Icon name="chevron_right" size={17} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {WEEKDAYS.map((d) => (
          <span key={d} className="grid place-items-center h-7 text-[11px] font-medium text-ink-3">
            {d}
          </span>
        ))}

        {cells.map((day, i) => {
          if (!day) return <span key={`b${i}`} />;
          const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
          const isToday = sameDay(date, today);
          const isSelected = sameDay(date, selected);
          const hasEvents = busy.has(day);

          return (
            <button
              key={day}
              disabled={!hasEvents}
              onClick={() => onSelect(isSelected ? null : date)}
              aria-label={`${day}${hasEvents ? ", has events" : ""}`}
              className={cx(
                "grid place-items-center h-9 w-9 mx-auto rounded-full text-[12.5px] tabular-nums transition-colors",
                isSelected
                  ? "bg-accent text-accent-ink font-bold"
                  : isToday
                    ? "bg-accent-wash text-accent font-bold"
                    : hasEvents
                      ? "text-ink font-semibold hover:bg-bg-sunken"
                      : "text-ink-3 cursor-default"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      {selected && (
        <button
          onClick={() => onSelect(null)}
          className="w-full mt-3 py-2 rounded-xl bg-bg-sunken text-[12px] font-semibold
            text-ink-2 hover:text-ink transition-colors"
        >
          Clear {selected.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
        </button>
      )}
    </section>
  );
}
