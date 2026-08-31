import { useState, useMemo } from "react";
import { CATEGORIES } from "../data/constants.js";
import { EmptyState } from "./EmptyState.jsx";
import { Icon, cx } from "./ui/Primitives.jsx";
import { useClickOutside } from "../utils/hooks.js";

// Events, rebuilt to the Stitch events.html mock: headline with Filter +
// Submit Event, a snap-scrolling category pill row, "Featured This Week" as
// wide horizontal cards, then "Upcoming Schedule" as a three-up grid.
//
// The two card shapes in the mock differ in more than layout, and that's
// preserved: featured cards put the chip top-left, the date in primary with
// a calendar glyph, and a filled Register button; schedule cards put the
// chip top-right, the date in on-surface-variant with a clock glyph, and an
// outlined RSVP button.
//
// Registration is real here. `register_for_event` (schema.sql) already
// existed and creates/joins the event's linked community atomically — the
// previous Events screen showed "coming soon" and never called it.

function EventChip({ children, className }) {
  return (
    <span
      className={cx(
        "absolute bg-surface-container-lowest text-on-surface text-label-sm font-medium px-3 py-1.5 rounded-full shadow-sm",
        className
      )}
    >
      {children}
    </span>
  );
}

// Shared cover: real image when the event has one, otherwise the category
// glyph on a tinted field — the mock's own fallback for its third card.
function EventCover({ e, cat, className }) {
  return (
    <div className={cx("relative overflow-hidden bg-surface-container-high", className)}>
      {e.imageUrl ? (
        <img src={e.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <span className="w-full h-full grid place-items-center">
          {cat && <Icon name={cat.msr} size={60} className="text-outline-variant" />}
          <span className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent" />
        </span>
      )}
    </div>
  );
}

function MetaRow({ icon, text, tone }) {
  return (
    <div className={cx("flex items-center gap-xs", tone)}>
      <Icon name={icon} size={16} />
      <span className="text-label-sm font-medium uppercase tracking-wider">{text}</span>
    </div>
  );
}

function CardFooter({ where, children }) {
  return (
    <div className="flex items-center justify-between gap-sm mt-auto pt-md border-t border-outline-variant/30">
      <div className="flex items-center gap-xs text-on-surface-variant min-w-0">
        <Icon name="location_on" size={16} className="text-icon-pink" />
        <span className="text-body-sm truncate">{where}</span>
      </div>
      {children}
    </div>
  );
}

function FeaturedEventCard({ e, registered, onRegister, onOpen }) {
  const cat = CATEGORIES.find((x) => x.name === e.category);
  return (
    <article className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/30 hover:shadow-md transition-shadow group flex flex-col md:flex-row h-full">
      <button onClick={() => onOpen(e)} className="md:w-2/5 h-48 md:h-auto relative shrink-0 text-left">
        <EventCover e={e} cat={cat} className="w-full h-full min-h-[12rem]" />
        <EventChip className="top-sm left-sm">{e.category}</EventChip>
      </button>

      <div className="p-lg md:w-3/5 flex flex-col flex-grow min-w-0">
        <MetaRow icon="calendar_month" text={e.when} tone="text-primary mb-sm" />
        <h3 className="text-headline-sm font-semibold text-on-surface mb-xs line-clamp-2">{e.title}</h3>
        <p className="text-body-md text-on-surface-variant mb-lg line-clamp-2 flex-grow">{e.desc}</p>
        <CardFooter where={e.where}>
          <button
            onClick={() => onRegister(e)}
            disabled={registered}
            className={cx(
              "text-label-md font-medium px-lg py-2 rounded-lg transition-colors shadow-sm shrink-0",
              registered
                ? "bg-surface-container text-on-surface-variant cursor-default shadow-none"
                : "bg-primary text-on-primary hover:bg-on-primary-fixed-variant"
            )}
          >
            {registered ? "Registered" : "Register"}
          </button>
        </CardFooter>
      </div>
    </article>
  );
}

function ScheduleEventCard({ e, registered, onRegister, onOpen }) {
  const cat = CATEGORIES.find((x) => x.name === e.category);
  return (
    <article className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full border border-outline-variant/30">
      <button onClick={() => onOpen(e)} className="h-48 relative block w-full text-left">
        <EventCover e={e} cat={cat} className="w-full h-full" />
        <EventChip className="top-sm right-sm">{e.category}</EventChip>
      </button>

      <div className="p-lg flex flex-col flex-grow">
        <MetaRow icon="schedule" text={e.when} tone="text-on-surface-variant mb-sm" />
        <h3 className="text-headline-sm font-semibold text-on-surface mb-xs line-clamp-2">{e.title}</h3>
        <p className="text-body-md text-on-surface-variant mb-lg line-clamp-2 flex-grow">{e.desc}</p>
        <CardFooter where={e.where}>
          <button
            onClick={() => onRegister(e)}
            disabled={registered}
            className={cx(
              "text-label-md font-medium px-lg py-1.5 rounded-lg border transition-colors shadow-sm shrink-0",
              registered
                ? "bg-surface-container text-on-surface-variant border-transparent cursor-default shadow-none"
                : "bg-surface text-primary border-outline-variant hover:bg-surface-container"
            )}
          >
            {registered ? "Going" : "RSVP"}
          </button>
        </CardFooter>
      </div>
    </article>
  );
}

export function EventsScreen({
  events, interests, onRegister, registeredEventIds = [], onOpenEvent, onSubmitEvent,
}) {
  const [cat, setCat] = useState(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useClickOutside(filterOpen, () => setFilterOpen(false));

  const matches = (e) => !!(interests && interests.includes(e.category));

  // Only categories that actually have events become pills. The mock's
  // Academic / Athletics / Workshops aren't categories in this data model,
  // and a pill that filters to nothing is worse than no pill.
  const activeCats = useMemo(() => {
    const present = new Set(events.map((e) => e.category));
    return CATEGORIES.filter((c) => present.has(c.name));
  }, [events]);

  const filtered = useMemo(() => {
    let list = events;
    if (cat) list = list.filter((e) => e.category === cat);
    if (onlyMine) list = list.filter(matches);
    return list;
  }, [events, cat, onlyMine, interests]);

  // Featured = the first two after filtering, shown as wide cards; the rest
  // fall through to the schedule grid so nothing is listed twice.
  const featured = useMemo(() => (cat || onlyMine ? [] : filtered.slice(0, 2)), [filtered, cat, onlyMine]);
  const schedule = useMemo(
    () => filtered.filter((e) => !featured.some((f) => f.id === e.id)),
    [filtered, featured]
  );

  const matchCount = useMemo(() => events.filter(matches).length, [events, interests]);
  const isRegistered = (e) => registeredEventIds.includes(e.id);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-surface">
      <div className="px-md lg:px-margin-desktop py-xl">
        <div className="max-w-max-width w-full mx-auto flex flex-col">

          {/* Header */}
          <div className="mb-xl flex flex-col md:flex-row md:items-end justify-between gap-md">
            <div>
              <h1 className="text-headline-xl font-bold text-on-surface mb-xs">Campus Events</h1>
              <p className="text-body-lg text-on-surface-variant max-w-2xl">
                Discover upcoming academic seminars, student group meetings, and cultural activities happening across campus.
              </p>
            </div>

            <div className="flex gap-sm shrink-0" ref={filterRef}>
              <div className="relative">
                <button
                  onClick={() => setFilterOpen((v) => !v)}
                  className={cx(
                    "text-label-md font-medium px-md py-sm rounded-lg transition-colors flex items-center gap-xs shadow-sm",
                    onlyMine
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
                  )}
                >
                  <Icon name="filter_list" size={20} className={onlyMine ? "" : "text-icon-violet"} />
                  Filter
                </button>

                {filterOpen && (
                  <div className="absolute right-0 top-12 z-30 w-64 bg-surface-container-lowest border border-outline-variant/40 rounded-lg shadow-lg p-md animate-pop-in">
                    <label className="flex items-start gap-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onlyMine}
                        onChange={(e) => setOnlyMine(e.target.checked)}
                        className="mt-0.5 accent-primary w-4 h-4 shrink-0"
                      />
                      <span>
                        <span className="block text-body-sm font-medium text-on-surface">
                          Only my interests
                        </span>
                        <span className="block text-label-sm text-on-surface-variant mt-0.5">
                          {matchCount} of {events.length} events match what you picked at sign-up.
                        </span>
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <button
                onClick={onSubmitEvent}
                className="bg-primary text-on-primary text-label-md font-medium px-md py-sm rounded-lg hover:bg-on-primary-fixed-variant transition-colors flex items-center gap-xs shadow-sm"
              >
                <Icon name="add" size={20} />Submit Event
              </button>
            </div>
          </div>

          {/* Category pills */}
          {activeCats.length > 0 && (
            <div className="flex gap-sm mb-lg overflow-x-auto pb-sm snap-x no-scrollbar">
              <button
                onClick={() => setCat(null)}
                className={cx(
                  "snap-start shrink-0 text-label-md font-medium px-lg py-sm rounded-full shadow-sm transition-colors",
                  !cat ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface hover:bg-surface-container-highest"
                )}
              >
                All Events
              </button>
              {activeCats.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setCat(cat === c.name ? null : c.name)}
                  className={cx(
                    "snap-start shrink-0 text-label-md font-medium px-lg py-sm rounded-full shadow-sm transition-colors inline-flex items-center gap-xs",
                    cat === c.name
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface hover:bg-surface-container-highest"
                  )}
                >
                  <Icon name={c.msr} size={16} className={cat === c.name ? "" : c.tint} />
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              title={onlyMine || cat ? "No events match that" : "No events right now"}
              subtitle={
                onlyMine || cat
                  ? "Clear the filter to see everything that's on."
                  : "Check back soon — new events are added regularly."
              }
            />
          ) : (
            <>
              {featured.length > 0 && (
                <>
                  <h2 className="text-headline-md font-semibold text-on-surface mb-lg">Featured This Week</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-xl">
                    {featured.map((e) => (
                      <FeaturedEventCard
                        key={e.id}
                        e={e}
                        registered={isRegistered(e)}
                        onRegister={onRegister}
                        onOpen={onOpenEvent}
                      />
                    ))}
                  </div>
                </>
              )}

              {schedule.length > 0 && (
                <>
                  <h2 className="text-headline-md font-semibold text-on-surface mb-lg">
                    {featured.length > 0 ? "Upcoming Schedule" : "All Events"}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-lg">
                    {schedule.map((e) => (
                      <ScheduleEventCard
                        key={e.id}
                        e={e}
                        registered={isRegistered(e)}
                        onRegister={onRegister}
                        onOpen={onOpenEvent}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
