import { useState, useMemo } from "react";
import { CATEGORIES } from "../data/constants.js";
import { Screen } from "./ui/Layout.jsx";
import { Icon, cx } from "./ui/Primitives.jsx";
import { CampusCalendar } from "./events/Calendar.jsx";

// Campus events.
//
// The list is horizontal cards rather than a grid: an event is mostly words --
// when, where, how many people -- and a grid of squares would crop the picture
// to fit text that matters more than it does.
//
// Filters are chips over a dropdown because there are six of them and they are
// the main thing anyone does on this page. A dropdown hides the options behind
// a click and gives no sense of what is available.

const FILTERS = [
  { key: "all",        label: "All Events",   icon: "calendar_today" },
  { key: "Study",      label: "Workshops",    icon: "lightbulb" },
  { key: "Coding & Projects", label: "Competitions", icon: "workspace_premium" },
  { key: "Networking & Social", label: "Meetups", icon: "groups" },
  { key: "Music",      label: "Cultural",     icon: "star" },
  { key: "Sports",     label: "Sports",       icon: "local_fire_department" },
];

const RANGES = [
  { key: "all",   label: "Any time" },
  { key: "week",  label: "This week" },
  { key: "month", label: "This month" },
];

// Colour per badge, as whole class strings so Tailwind's scanner keeps them.
const BADGE = {
  Featured: "bg-accent text-accent-ink",
  Workshop: "bg-c-green text-white",
  Sports:   "bg-c-orange text-white",
  Cultural: "bg-c-pink text-white",
  Event:    "bg-ink text-bg-raised",
};

const dayLabel = (d) => {
  if (!d) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const days = Math.round((x - today) / 86400e3);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1 && days < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const timeLabel = (d) =>
  d ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null;

// Hashtags come out of the description, the same way they do on posts, rather
// than being a field nobody fills in.
const tagsOf = (e) =>
  (String(e.desc || "").match(/#[a-zA-Z][\w-]{1,20}/g) || []).slice(0, 3);

/* ------------------------------------------------------------- card */

function EventCard({ e, registered, onRegister, onOpen }) {
  const cat = CATEGORIES.find((x) => x.name === e.category);
  const badge = e.featured ? "Featured" : e.category === "Sports" ? "Sports" : "Event";
  const tags = tagsOf(e);

  return (
    <article className="w-full bg-bg-raised rounded-2xl border border-line p-4 flex flex-col sm:flex-row gap-4">
      <div className="relative w-full sm:w-[200px] h-[140px] shrink-0 rounded-xl overflow-hidden bg-bg-sunken">
        {e.imageUrl ? (
          <img src={e.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <span className="w-full h-full grid place-items-center">
            <Icon name={cat?.msr || "calendar_today"} size={30} className={cat?.tint || "text-ink-3"} />
          </span>
        )}
        <span className={cx(
          "absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[11px] font-bold",
          BADGE[badge] || BADGE.Event
        )}>
          {badge === "Event" ? e.category : badge}
        </span>
      </div>

      <div className="min-w-0 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <button onClick={() => onOpen?.(e)} className="min-w-0 text-left">
            <h3 className="text-[16px] font-bold text-ink leading-snug">{e.title}</h3>
          </button>

          <button
            onClick={() => !registered && onRegister?.(e)}
            disabled={registered}
            className={cx(
              "shrink-0 h-9 px-4 rounded-full text-[12.5px] font-semibold transition-all",
              registered
                ? "bg-accent-wash text-accent cursor-default"
                : "bg-accent text-accent-ink hover:bg-accent-press active:scale-[0.98]"
            )}
          >
            {registered ? "Registered" : "Register"}
          </button>
        </div>

        {e.desc && (
          <p className="text-[13px] text-ink-2 leading-relaxed mt-1 line-clamp-2">
            {e.desc.replace(/#[a-zA-Z][\w-]{1,20}/g, "").trim()}
          </p>
        )}

        <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-[12px] text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="calendar_today" size={14} className="text-ink-3" />
            {[dayLabel(e.startsAt), e.when].filter(Boolean).join(" · ") || "Date TBA"}
          </span>
          {e.where && (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="location_on" size={14} className="text-ink-3" />
              {e.where}
            </span>
          )}
          {e.going > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="groups" size={14} className="text-ink-3" />
              {e.going} going
            </span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
            {tags.map((t) => (
              <span key={t} className="px-2.5 py-1 rounded-lg bg-bg-sunken text-[11.5px] font-medium text-ink-2">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------ screen */

export function EventsScreen({
  events, onRegister, registeredEventIds = [], onOpenEvent,
}) {
  const [filter, setFilter] = useState("all");
  const [range, setRange] = useState("all");
  const [day, setDay] = useState(null);

  const sorted = useMemo(
    () => [...events].sort((a, b) => (a.startsAt?.getTime() || 0) - (b.startsAt?.getTime() || 0)),
    [events]
  );

  const shown = useMemo(() => {
    let list = sorted;
    if (filter !== "all") list = list.filter((e) => e.category === filter);

    if (range !== "all") {
      const now = Date.now();
      const span = range === "week" ? 7 : 31;
      list = list.filter((e) => {
        if (!e.startsAt) return false;
        const days = (e.startsAt.getTime() - now) / 86400e3;
        return days >= -1 && days <= span;
      });
    }

    if (day) {
      list = list.filter((e) =>
        e.startsAt &&
        e.startsAt.getFullYear() === day.getFullYear() &&
        e.startsAt.getMonth() === day.getMonth() &&
        e.startsAt.getDate() === day.getDate()
      );
    }
    return list;
  }, [sorted, filter, range, day]);

  const upcoming = useMemo(() => sorted.slice(0, 4), [sorted]);

  // Only categories that have something in them. A filter that always returns
  // nothing is worse than one fewer filter.
  const live = useMemo(() => {
    const present = new Set(events.map((e) => e.category));
    return FILTERS.filter((f) => f.key === "all" || present.has(f.key));
  }, [events]);

  return (
    <Screen>
      <div className="w-full mx-auto px-4 sm:px-6 py-6 grid justify-center gap-6
        grid-cols-1 max-w-[1420px] lg:grid-cols-[minmax(0,760px)_360px]">

        {/* -------------------------------------------------------- main */}
        <div className="min-w-0 flex flex-col gap-4">
          {/* The artwork carries it. The copy that was here said what the page
              title and the filters below already say. */}
          <section className="w-full rounded-2xl overflow-hidden">
            <img
              src="/banner.png"
              alt="Campus events"
              className="w-full aspect-[3/1] object-cover"
            />
          </section>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              {live.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cx(
                    "inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[12.5px] font-semibold transition-colors",
                    filter === f.key
                      ? "bg-accent text-accent-ink"
                      : "bg-bg-raised border border-line text-ink-2 hover:text-ink hover:border-line-strong"
                  )}
                >
                  <Icon name={f.icon} size={15} />
                  {f.label}
                </button>
              ))}
            </div>

            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="h-10 px-3 rounded-full bg-bg-raised border border-line text-[12.5px]
                font-semibold text-ink-2 outline-none cursor-pointer shrink-0"
            >
              {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>

          {shown.length === 0 ? (
            <div className="bg-bg-raised rounded-2xl border border-line py-16 text-center">
              <p className="text-lg font-bold text-ink">Nothing scheduled</p>
              <p className="text-base text-ink-2 mt-2 max-w-[36ch] mx-auto leading-relaxed">
                {events.length === 0
                  ? "No events have been posted yet."
                  : "Nothing matches those filters."}
              </p>
              {events.length > 0 && (
                <button
                  onClick={() => { setFilter("all"); setRange("all"); setDay(null); }}
                  className="mt-5 h-10 px-5 rounded-full bg-accent text-accent-ink text-[13px] font-semibold"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            shown.map((e) => (
              <EventCard
                key={e.id}
                e={e}
                registered={registeredEventIds.includes(e.id)}
                onRegister={onRegister}
                onOpen={onOpenEvent}
              />
            ))
          )}
        </div>

        {/* -------------------------------------------------------- rail */}
        {/* No items-start on the grid above, deliberately: the aside has to
            stretch to the row height or the sticky child below has a box its
            own height to travel in, which is no travel at all -- the rail
            scrolled away and left a hole. */}
        <aside className="hidden lg:block h-full">
          <div className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto no-scrollbar pr-1 flex flex-col gap-4">
            <CampusCalendar
              events={sorted}
              selected={day}
              onSelect={setDay}
              onViewAll={() => { setDay(null); setFilter("all"); setRange("all"); }}
            />

            <section className="w-full bg-bg-raised rounded-2xl border border-line p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon name="schedule" size={18} className="text-accent" />
                  <h3 className="text-[14px] font-bold text-ink tracking-tight truncate">Upcoming Events</h3>
                </div>
              </div>

              {upcoming.length === 0 ? (
                <p className="text-[13px] text-ink-2 py-2">Nothing scheduled yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {upcoming.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => onOpenEvent?.(e)}
                      className="group flex items-center gap-3 p-2 rounded-xl hover:bg-bg-sunken transition-colors text-left"
                    >
                      <span className="w-[62px] shrink-0 py-2 rounded-xl bg-accent-wash text-center">
                        <span className="block text-[11px] font-bold text-accent leading-none">
                          {dayLabel(e.startsAt) || "TBA"}
                        </span>
                        <span className="block text-[11px] text-ink-2 mt-1">
                          {timeLabel(e.startsAt) || e.when || ""}
                        </span>
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold text-ink truncate group-hover:text-accent transition-colors">
                          {e.title}
                        </span>
                        {e.where && (
                          <span className="flex items-center gap-1 text-[11.5px] text-ink-2 truncate mt-0.5">
                            <Icon name="location_on" size={12} className="text-ink-3 shrink-0" />
                            {e.where}
                          </span>
                        )}
                        {e.going > 0 && (
                          <span className="flex items-center gap-1 text-[11.5px] text-ink-3 mt-0.5">
                            <Icon name="groups" size={12} className="shrink-0" />
                            {e.going} going
                          </span>
                        )}
                      </span>

                      <Icon name="chevron_right" size={18} className="text-ink-3 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {live.length > 1 && (
              <section className="w-full bg-bg-raised rounded-2xl border border-line p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="groups" size={18} className="text-c-violet" />
                  <h3 className="text-[14px] font-bold text-ink tracking-tight">Event Categories</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {live.filter((f) => f.key !== "all").map((f) => {
                    const cat = CATEGORIES.find((x) => x.name === f.key);
                    const count = events.filter((e) => e.category === f.key).length;
                    return (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={cx(
                          "flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors",
                          filter === f.key ? "bg-accent-wash" : "bg-bg-sunken hover:bg-bg-hover"
                        )}
                      >
                        <Icon name={f.icon} size={19} className={cat?.tint || "text-ink-2"} />
                        <span className="text-[11px] font-semibold text-ink text-center leading-tight px-1">
                          {f.label}
                        </span>
                        <span className="text-[10.5px] text-ink-3 tabular-nums">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </aside>
      </div>
    </Screen>
  );
}
