import { useState, useMemo, useEffect, useRef } from "react";
import { CATEGORIES } from "../data/constants.js";
import { Screen } from "./ui/Layout.jsx";
import { Icon, cx } from "./ui/Primitives.jsx";
import { CampusCalendar } from "./events/Calendar.jsx";
import { EventAvailability } from "./events/EventAvailability.jsx";
import { isDemoOpen, isRegistrationClosed } from "./events/eventNotice.js";
import { useImageSrc } from "./ui/Img.jsx";
import { cheapestPass, isEarlyBird, rupees } from "../data/passes.js";

// Campus events.
//
// The list is horizontal cards rather than a grid: an event is mostly words --
// when, where, how many people -- and a grid of squares would crop the picture
// to fit text that matters more than it does.
//
// Filters are chips over a dropdown because there are six of them and they are
// the main thing anyone does on this page. A dropdown hides the options behind
// a click and gives no sense of what is available.

// Each key is a real category name, so a chip filters for what it says. The
// old list mapped labels onto unrelated community categories -- "Workshops"
// filtered for "Study" -- so a workshop matched nothing. Chips with no events
// behind them are hidden further down, so this list can cover every kind
// without cluttering a page that has one.
const FILTERS = [
  { key: "all",               label: "All Events",    icon: "calendar_today" },
  { key: "Workshop",          label: "Workshops",     icon: "lightbulb" },
  { key: "Coding & Projects", label: "Competitions",  icon: "workspace_premium" },
  { key: "Networking & Social", label: "Meetups",     icon: "groups" },
  { key: "Music",             label: "Cultural",      icon: "star" },
  { key: "Sports",            label: "Sports",        icon: "local_fire_department" },
];

// A native select inherits the operating system's menu: a grey Windows list
// in the middle of a rounded, tokenised page, ignoring the theme entirely.
// This is the same control drawn in the app's own language.
function RangePicker({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("touchstart", away);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("touchstart", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  const current = options.find((o) => o.key === value) || options[0];

  return (
    <div ref={boxRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cx(
          "inline-flex items-center gap-2 h-10 pl-4 pr-3 rounded-full border text-[12.5px] font-semibold transition-colors",
          open ? "bg-bg-sunken border-line-strong text-ink" : "bg-bg-raised border-line text-ink-2 hover:text-ink"
        )}
      >
        {current.label}
        <Icon name="expand_more" size={16}
              className={cx("text-ink-3 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div role="listbox"
             className="absolute right-0 top-12 z-30 w-44 p-1 rounded-2xl bg-bg-raised border border-line shadow-pop animate-pop">
          {options.map((o) => {
            const on = o.key === value;
            return (
              <button
                key={o.key}
                role="option"
                aria-selected={on}
                onClick={() => { onChange(o.key); setOpen(false); }}
                className={cx(
                  "w-full flex items-center gap-2 px-3 h-9 rounded-xl text-left text-[13px] transition-colors",
                  on ? "bg-accent-wash text-accent font-semibold" : "text-ink hover:bg-bg-sunken"
                )}
              >
                <span className="flex-1 truncate">{o.label}</span>
                {on && <Icon name="check" size={15} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const RANGES = [
  { key: "all",   label: "Any time" },
  { key: "week",  label: "This week" },
  { key: "month", label: "This month" },
];

// Colour per badge, as whole class strings so Tailwind's scanner keeps them.
// The poster doubles as the page banner and as the fallback card cover.
const EVENT_POSTER = "/techideate_51.jpg";

// The banner rotates rather than picking one image: the event poster is what
// matters this month, the campus artwork is what the page is for the rest of
// the year, and neither has to win. Sources are JPEG, not the original PNGs --
// 2.3MB of poster on a phone is a second of staring at nothing.
// Each slide says how it wants to sit in the frame, because they are not the
// same shape. The poster is 16:9 and fills it exactly. The campus artwork is
// 3:1 and would lose its own title to a crop -- "CAMPUS EVENTS" became
// "S EVENTS" -- so it is shown whole against a blurred copy of itself.
const BANNER_SLIDES = [
  { src: "/techideate_51.jpg", alt: "TechIdeate 2026, Beyond Human", fit: "cover" },
  { src: "/mujsideview.png", alt: "Campus events at Manipal University Jaipur", fit: "cover" },
];

function BannerSlides({ slides, interval = 5000 }) {
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    // Someone who has asked their system to stop animations gets the first
    // slide and the dots, not a carousel moving under them.
    let reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* assume motion is fine */ }
    if (reduce) return;
    const t = setInterval(() => setAt((n) => (n + 1) % slides.length), interval);
    return () => clearInterval(t);
  }, [paused, slides.length, interval]);

  return (
    <section
      className="relative w-full rounded-2xl border border-line overflow-hidden bg-bg-sunken aspect-[16/9]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {slides.map((slide, i) => (
        <div
          key={slide.src}
          className={cx(
            "absolute inset-0 transition-opacity duration-700",
            i === at ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          aria-hidden={i !== at}
        >
          {/* The blurred layer only shows for a slide that does not fill the
              frame; a 16:9 poster covers it completely. */}
          <img src={slide.src} alt="" aria-hidden="true"
               className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
          <img src={slide.src} alt={slide.alt} loading={i === 0 ? "eager" : "lazy"}
               className={cx("relative w-full h-full", slide.fit === "contain" ? "object-contain" : "object-cover")} />
        </div>
      ))}

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center">
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              onClick={() => setAt(i)}
              aria-label={`Show ${slide.alt}`}
              aria-current={i === at}
              className="grid place-items-center h-8 w-8 -my-3"
            >
              <span
                className={cx(
                  "block h-2 rounded-full transition-all",
                  i === at ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// A poster is portrait and a banner is wide, so cropping one into the other
// cuts the title off. This shows the whole poster over a blurred, enlarged
// copy of itself, which fills the band without inventing artwork or hiding
// any of it.
// The one thing a visitor needs to know the week registrations open.
//
// It takes the soonest event still ahead of us rather than naming one, so it
// stops being true by itself once the day passes instead of having to be
// taken down by hand. Someone already registered is told that instead, since
// "register now" to a person holding a pass reads as a fault.
function TicketsLive({ event, registered, onRegister, onOpenPass }) {
  if (!event) return null;
  const saving = cheapestPass.was - cheapestPass.amount;
  const closed = isRegistrationClosed(event);
  // Nothing to offer and nothing of theirs to open: the strip is an invitation,
  // and there is none left to make.
  if (closed && !registered) {
    return (
      <section className="w-full rounded-2xl p-4 sm:px-5 bg-bg-raised ring-1 ring-line">
        <EventAvailability event={event} />
      </section>
    );
  }

  return (
    <section className={cx(
      "w-full rounded-2xl p-4 sm:px-5",
      "bg-gradient-to-r from-c-green/15 via-c-green/8 to-transparent ring-1 ring-c-green/25",
      "flex flex-col sm:flex-row sm:items-center gap-3"
    )}>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {/* A dot that moves, because "live" is the claim being made. */}
          <span className="relative grid place-items-center w-2 h-2 shrink-0">
            <span className="absolute inset-0 rounded-full bg-c-green animate-ping opacity-75" />
            <span className="relative w-2 h-2 rounded-full bg-c-green" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-c-green">
            {registered ? "You are in" : "Registrations are open"}
          </span>
          {!registered && !closed && isEarlyBird && (
            <span className="inline-flex items-center h-[18px] px-1.5 rounded-md bg-c-green/15 text-c-green
              ring-1 ring-c-green/30 text-[10px] font-bold uppercase tracking-[0.06em] leading-none shrink-0">
              Early bird
            </span>
          )}
        </span>

        <span className="block text-lg font-bold text-ink mt-1.5 truncate">{event.title}</span>
        <span className="block text-xs text-ink-2 mt-0.5 truncate">
          {event.when}{event.where ? ` · ${event.where}` : ""}
        </span>

        <EventAvailability event={event} className="mt-2.5" compact={registered} />

        {!registered && !closed && (
          <span className="flex items-baseline gap-1.5 mt-2">
            <span className="text-xs text-ink-2">Passes from</span>
            {isEarlyBird && (
              <span className="text-xs font-semibold text-ink-3 line-through tabular-nums">
                {rupees(cheapestPass.was)}
              </span>
            )}
            <span className="text-base font-bold text-ink tabular-nums">{rupees(cheapestPass.amount)}</span>
            {saving > 0 && (
              <span className="text-xs font-semibold text-c-green">save {rupees(saving)}</span>
            )}
          </span>
        )}
      </span>

      <button
        onClick={() => (registered ? onOpenPass?.(event) : onRegister?.(event))}
        className="shrink-0 h-11 px-6 rounded-full bg-c-green text-white text-[13.5px] font-bold
          hover:opacity-90 active:scale-[0.98] transition-all"
      >
        {registered ? "View your pass" : "Register now"}
      </button>
    </section>
  );
}

function Poster({ src, className, alt = "", fit = "contain" }) {
  const resolved = useImageSrc(src);
  return (
    <div className={cx("relative overflow-hidden bg-bg-sunken", className)}>
      {resolved && (
        <>
          <img src={resolved} alt="" aria-hidden="true"
               className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
          <img src={resolved} alt={alt} loading="lazy"
               className={cx("relative w-full h-full", fit === "cover" ? "object-cover" : "object-contain")} />
        </>
      )}
    </div>
  );
}

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
  const closed = isRegistrationClosed(e);
  const cat = CATEGORIES.find((x) => x.name === e.category);
  const badge = e.featured ? "Featured"
    : e.category === "Workshop" ? "Workshop"
    : e.category === "Sports" ? "Sports"
    : "Event";
  const tags = tagsOf(e);

  return (
    <article className="w-full bg-bg-raised rounded-2xl border border-line p-4 flex flex-col sm:flex-row gap-4">
      <div className="relative w-full sm:w-[200px] h-[140px] shrink-0 rounded-xl overflow-hidden bg-bg-sunken">
        {/* The event's own artwork if it has been uploaded, then the campus
            poster, and only then a category glyph. A card with a picture on it
            is the difference between a listing and an invitation. */}
        {e.imageUrl || EVENT_POSTER ? (
          <Poster src={e.imageUrl || EVENT_POSTER} className="w-full h-full" fit="cover" />
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
          <button onClick={() => onOpen?.(e)} className="min-w-0 text-left py-1.5 -my-1.5">
            <h3 className="text-[16px] font-bold text-ink leading-snug">{e.title}</h3>
          </button>

          <button
            onClick={() => !registered && !closed && onRegister?.(e)}
            disabled={registered || closed}
            className={cx(
              "shrink-0 h-9 px-4 rounded-full text-[12.5px] font-semibold transition-all",
              registered
                ? "bg-accent-wash text-accent cursor-default"
                : closed
                  ? "bg-bg-sunken text-ink-3 cursor-default"
                  : "bg-accent text-accent-ink hover:bg-accent-press active:scale-[0.98]"
            )}
          >
            {registered ? "Registered" : closed ? "Closed" : "Register"}
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
        </div>

        <EventAvailability event={e} className="mt-3" />

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
  events, onRegister, registeredEventIds = [], onOpenEvent, passes = [], onOpenPass,
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

  // The next event that has not happened yet, which is what the strip above
  // the artwork is about.
  const next = useMemo(
    () => sorted.find((e) => isDemoOpen(e) || !e.startsAt || e.startsAt.getTime() > Date.now() - 6 * 3600e3) || null,
    [sorted]
  );

  return (
    <Screen>
      <div className="w-full mx-auto px-4 sm:px-6 py-6 grid justify-center gap-6
        grid-cols-1 max-w-[1420px] lg:grid-cols-[minmax(0,760px)_360px]">

        {/* -------------------------------------------------------- main */}
        <div className="min-w-0 flex flex-col gap-4">
          <TicketsLive
            event={next}
            registered={next ? registeredEventIds.includes(next.id) : false}
            onRegister={onRegister}
            onOpenPass={onRegister}
          />
          {/* The artwork carries it. The copy that was here said what the page
              title and the filters below already say. */}
          <BannerSlides slides={BANNER_SLIDES} />

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

            <RangePicker value={range} options={RANGES} onChange={setRange} />
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
            {passes.length > 0 && (
              <section className="w-full bg-bg-raised rounded-2xl border border-line p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="confirmation_number" size={18} className="text-c-green" />
                  <h3 className="text-[14px] font-bold text-ink tracking-tight">
                    {passes.length === 1 ? "Your pass" : "Your passes"}
                  </h3>
                </div>

                <div className="flex flex-col gap-3">
                  {passes.map((pass) => {
                    const ev = events.find((e) => e.id === pass.eventId);
                    const title = ev?.title || pass.eventTitle || "Event";
                    const ready = pass.status === "verified" && pass.passCode;
                    const waiting = pass.status === "payment_claimed";
                    return (
                      <div key={pass.eventId} className="rounded-xl bg-bg-sunken px-3.5 py-3">
                        <p className="text-[13.5px] font-semibold text-ink truncate">{title}</p>
                        <p className="flex items-start gap-1.5 text-xs text-ink-2 mt-1 leading-relaxed">
                          <Icon
                            name={ready ? "check_circle" : waiting ? "schedule" : "info"}
                            size={14}
                            className={cx("mt-0.5 shrink-0", ready ? "text-c-green" : waiting ? "text-c-amber" : "text-c-blue")}
                          />
                          <span>
                            {ready
                              ? "Confirmed. Your QR pass is on your profile."
                              : waiting
                                ? "We have your payment. The organisers are checking it, and your QR pass appears here once it is confirmed."
                                : "Registration started. Finish the payment step to get your pass."}
                          </span>
                        </p>
                        <button
                          onClick={() => onOpenPass?.(pass)}
                          className="mt-2 text-xs font-semibold text-accent hover:underline"
                        >
                          {ready ? "View your pass" : waiting ? "See your registration" : "Finish registering"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <CampusCalendar
              events={sorted}
              selected={day}
              onSelect={setDay}
              onOpenEvent={(e) => onRegister?.(e)}
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
                        <EventAvailability event={e} className="mt-2" compact />
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
