import { useState, useMemo } from "react";
import { CATEGORIES } from "../data/constants.js";
import { Icon, Button, Tag, cx } from "./ui/Primitives.jsx";
import { Screen, Empty } from "./ui/Layout.jsx";

// Events — a list, not a grid of cards.
//
// The previous version rendered every event as a bordered tile with a cover
// photo, which gave sixteen identical boxes and buried the one thing that
// actually matters when scanning events: when. Here each row leads with a
// date block, the rows share one hairline, and the cover art is a small
// thumbnail on the right instead of a 200px header. Scanning down the left
// edge gives you the schedule.

function DateBlock({ when, tint }) {
  // `when` is free text in this schema, so it can't be parsed into day and
  // month reliably. The first token is shown large (it's almost always the
  // day or weekday) with the remainder beneath, which degrades gracefully
  // for any format rather than guessing at one.
  const [head, ...rest] = String(when || "").split(/[\s,]+/).filter(Boolean);
  return (
    <div className="w-14 shrink-0 text-center leading-none">
      <p className={cx("text-xl font-bold tabular-nums", tint)}>{head || "TBA"}</p>
      {rest.length > 0 && (
        <p className="text-2xs font-semibold text-ink-2 uppercase tracking-wide mt-1 truncate">
          {rest.slice(0, 2).join(" ")}
        </p>
      )}
    </div>
  );
}

function EventCard({ e, registered, onRegister, onOpen, interested }) {
  const cat = CATEGORIES.find((x) => x.name === e.category);
  return (
    <article className="card group flex flex-col overflow-hidden">
      {e.imageUrl && (
        <button onClick={() => onOpen(e)} className="block w-full media">
          <img src={e.imageUrl} alt="" loading="lazy" className="w-full h-40 object-cover" />
        </button>
      )}

      <div className="flex gap-4 p-4 flex-1">
        <DateBlock when={e.when} tint={cat?.tint || "text-c-orange"} />

        <div className="min-w-0 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Icon name={cat?.msr || "confirmation_number"} size={15} className={cat?.tint} />
            <span className={cx("text-2xs font-semibold uppercase tracking-wide", cat?.tint)}>{e.category}</span>
            {interested && (
              <>
                <span className="text-ink-3">·</span>
                <span className="text-2xs font-semibold text-c-violet uppercase tracking-wide">For you</span>
              </>
            )}
          </div>

          <button onClick={() => onOpen(e)} className="text-left block w-full">
            <h3 className="text-lg font-semibold text-ink leading-snug group-hover:opacity-70 transition-opacity">
              {e.title}
            </h3>
          </button>

          {e.desc && <p className="text-base text-ink-2 mt-1 line-clamp-2 leading-normal flex-1">{e.desc}</p>}

          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="schedule" size={15} className="text-c-blue" />{e.when}
            </span>
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <Icon name="location_on" size={15} className="text-c-pink" />
              <span className="truncate">{e.where}</span>
            </span>
            {e.capacity && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="group" size={15} className="text-c-teal" />
                <span className="tabular-nums">{e.capacity}</span> spots
              </span>
            )}
          </div>

          <div className="mt-3.5">
            <Button
              variant={registered ? "outline" : undefined}
              tone={registered ? undefined : "orange"}
              size="sm"
              icon={registered ? "check" : "confirmation_number"}
              iconTint={registered ? undefined : ""}
              onClick={() => onRegister(e)}
              disabled={registered}
            >
              {registered ? "Going" : "Register"}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function EventsScreen({
  events, interests, onRegister, registeredEventIds = [], onOpenEvent, onSubmitEvent,
}) {
  const [cat, setCat] = useState(null);
  const [scope, setScope] = useState("all");

  const matches = (e) => !!(interests && interests.includes(e.category));

  const activeCats = useMemo(() => {
    const present = new Set(events.map((e) => e.category));
    return CATEGORIES.filter((c) => present.has(c.name));
  }, [events]);

  const list = useMemo(() => {
    let out = events;
    if (scope === "mine") out = out.filter((e) => registeredEventIds.includes(e.id));
    if (scope === "foryou") out = out.filter(matches);
    if (cat) out = out.filter((e) => e.category === cat);
    return out;
  }, [events, scope, cat, interests, registeredEventIds]);

  const SCOPES = [
    { key: "all", label: "All", n: events.length },
    { key: "foryou", label: "For you", n: events.filter(matches).length },
    { key: "mine", label: "Going", n: registeredEventIds.length },
  ];

  return (
    <Screen>
      <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16 pt-8 pb-16">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-ink">
              What&apos;s{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-c-orange to-c-pink">on</span>
            </h1>
            <p className="text-base text-ink-2 mt-1">Seminars, socials and everything in between.</p>
          </div>
          <Button variant="primary" size="md" icon="add" onClick={onSubmitEvent} className="shrink-0">
            Submit
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-line">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              onClick={() => setScope(s.key)}
              className={cx(
                "h-8 px-4 rounded-full text-xs font-semibold transition-colors",
                scope === s.key ? "bg-solid text-solid-ink" : "text-ink-2 hover:bg-bg-sunken hover:text-ink"
              )}
            >
              {s.label}
              <span className={cx("ml-1.5 tabular-nums", scope === s.key ? "opacity-60" : "text-ink-3")}>{s.n}</span>
            </button>
          ))}
          {activeCats.length > 0 && <span className="w-px h-5 bg-line mx-1" />}
          {activeCats.map((c) => (
            <button
              key={c.name}
              onClick={() => setCat(cat === c.name ? null : c.name)}
              className={cx(
                "inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-semibold transition-colors",
                cat === c.name ? "bg-bg-sunken text-ink ring-1 ring-line-strong" : "text-ink-2 hover:bg-bg-sunken hover:text-ink"
              )}
            >
              <Icon name={c.msr} size={15} className={c.tint} />
              {c.name}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <Empty
            icon="event_busy"
            title={scope === "mine" ? "Nothing booked" : "No events"}
            body={
              scope === "mine"
                ? "Events you register for will be listed here."
                : scope === "foryou"
                ? "Nothing matches your interests yet — try All."
                : "Check back soon, new events are added regularly."
            }
            action={
              scope !== "all" && <Button variant="soft" onClick={() => { setScope("all"); setCat(null); }}>Show all</Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {list.map((e) => (
              <EventCard
                key={e.id}
                e={e}
                interested={matches(e)}
                registered={registeredEventIds.includes(e.id)}
                onRegister={onRegister}
                onOpen={onOpenEvent}
              />
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}
