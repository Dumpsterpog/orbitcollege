import { CATEGORIES } from "../../data/constants.js";
import { Icon, cx } from "../ui/Primitives.jsx";

// The right rail: three cards, all of them fed by documents.
//
// The mock shows growth percentages on trending topics and confirmed-attendee
// counts on events. Orbit stores neither, so neither is drawn. What it does
// store -- member counts, post counts per category, event dates and venues --
// is here in full, which is enough for every one of these cards to be worth
// looking at without inventing a number.

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);
const nameHead = (name = "") => name.split(" — ")[0];

function Card({ icon, iconTint, title, count, action, onAction, meta, children }) {
  return (
    <section className="w-full bg-bg-raised rounded-2xl border border-line p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {icon && <Icon name={icon} size={18} className={iconTint} />}
          <h3 className="text-sm font-bold text-ink tracking-tight truncate">{title}</h3>
          {count > 0 && (
            <span className="px-1.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-bg-sunken text-ink-2 shrink-0">
              {count}
            </span>
          )}
        </div>
        {action && (
          <button onClick={onAction} className="text-xs font-semibold text-c-blue hover:underline shrink-0">
            {action}
          </button>
        )}
        {meta && (
          <span className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider shrink-0">{meta}</span>
        )}
      </div>
      {children}
    </section>
  );
}

/* --------------------------------------------------- recommended */

export function Recommended({ communities, joinedIds, onOpen, onJoin, onAll, onCreate }) {
  if (!communities.length) return null;

  return (
    <Card title="Recommended for You" count={communities.length} action="View all" onAction={onAll}>
      <div className="flex flex-col divide-y divide-line">
        {communities.map((c) => {
          const cat = CATEGORIES.find((x) => x.name === c.category);
          const joined = joinedIds.includes(c.id);
          return (
            <div key={c.id} className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-2 group">
              <button onClick={() => onOpen(c)} className="flex items-center gap-2.5 min-w-0 text-left">
                <span className="grid place-items-center w-8 h-8 rounded-xl overflow-hidden bg-bg-sunken shrink-0">
                  {c.avatarUrl
                    ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : <Icon name={cat?.msr || "groups"} size={16} className={cat?.tint} />}
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-ink truncate group-hover:text-c-blue transition-colors">
                    {nameHead(c.name)}
                  </span>
                  <span className="text-[11px] text-ink-3 truncate">
                    {compact(c.members || 0)} members · {c.official ? "Official" : c.category}
                  </span>
                </span>
              </button>

              <button
                onClick={() => !joined && onJoin(c.id)}
                disabled={joined}
                className={cx(
                  "px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0",
                  joined
                    ? "bg-c-blue/10 text-c-blue border border-c-blue/25 cursor-default"
                    : "border border-line hover:border-line-strong text-ink-2 hover:text-ink"
                )}
              >
                {joined ? "Joined" : "Join"}
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={onCreate}
        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-ink-2 hover:text-c-blue transition-colors pt-1"
      >
        Start your own community
        <Icon name="arrow_forward" size={14} />
      </button>
    </Card>
  );
}

/* -------------------------------------------------------- events */

// "TOM" for tomorrow reads faster than a date you have to compare against
// today's. Anything further out gets its weekday.
function dayChip(date) {
  if (!date) return { top: "TBA", day: "--", tint: "text-ink-3" };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const days = Math.round((d - today) / 86400e3);
  if (days === 0) return { top: "TODAY", day: d.getDate(), tint: "text-c-green" };
  if (days === 1) return { top: "TOM", day: d.getDate(), tint: "text-c-blue" };
  return {
    top: d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase(),
    day: d.getDate(),
    tint: "text-c-violet",
  };
}

export function UpcomingEvents({ events, registeredIds, onRegister, onAll }) {
  return (
    <Card icon="calendar_month" iconTint="text-c-blue" title="Upcoming Mixers" meta="This week">
      {events.length === 0 ? (
        <p className="text-base text-ink-2 leading-relaxed">Nothing scheduled yet.</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {events.slice(0, 3).map((e) => {
              const chip = dayChip(e.startsAt);
              const going = registeredIds.includes(e.id);
              return (
                <div
                  key={e.id}
                  className="flex items-start gap-3 p-2.5 rounded-xl bg-bg-sunken hover:bg-bg-hover
                    border border-line transition-colors group"
                >
                  <span className="w-10 h-10 rounded-xl bg-bg-raised border border-line flex flex-col items-center justify-center shrink-0">
                    <span className={cx("text-[9px] font-extrabold uppercase leading-none", chip.tint)}>{chip.top}</span>
                    <span className="text-sm font-extrabold text-ink leading-tight">{chip.day}</span>
                  </span>

                  <span className="flex flex-col min-w-0 flex-1">
                    <span className="text-[12.5px] font-bold text-ink truncate group-hover:text-c-blue transition-colors">
                      {e.title}
                    </span>
                    <span className="text-[11px] text-ink-2 truncate">
                      {[e.when, e.where].filter(Boolean).join(" · ")}
                    </span>
                    {going && (
                      <span className="text-[11px] text-c-green font-medium mt-0.5">You are going</span>
                    )}
                  </span>

                  <button
                    onClick={() => !going && onRegister?.(e)}
                    aria-label={going ? "Registered" : "RSVP"}
                    className={cx("p-1 rounded-md shrink-0 transition-colors",
                      going ? "text-c-green" : "text-ink-3 hover:text-c-blue")}
                  >
                    <Icon name={going ? "check_circle" : "bookmark_add"} size={17} />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={onAll}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-bg-sunken
              hover:bg-bg-hover text-xs font-semibold text-ink-2 hover:text-ink transition-colors"
          >
            View full campus calendar
            <Icon name="arrow_forward" size={14} />
          </button>
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------ trending */

export function Trending({ topics, onOpen }) {
  if (!topics.length) return null;

  return (
    <Card icon="trending_up" iconTint="text-c-violet" title="Trending on Campus">
      <div className="flex flex-col divide-y divide-line">
        {topics.map((t) => {
          const cat = CATEGORIES.find((x) => x.name === t.name);
          return (
            <button
              key={t.name}
              onClick={() => onOpen(t.name)}
              className="py-2 first:pt-1 last:pb-1 flex items-center justify-between gap-2 group text-left"
            >
              <span className="flex flex-col min-w-0">
                <span className="text-[12.5px] font-semibold text-ink truncate group-hover:text-c-blue transition-colors">
                  #{t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}
                </span>
                <span className="text-[11px] text-ink-3 truncate">
                  {t.posts} {t.posts === 1 ? "post" : "posts"} · {t.communities}{" "}
                  {t.communities === 1 ? "community" : "communities"}
                </span>
              </span>
              <Icon name={cat?.msr || "tag"} size={16} className={cx("shrink-0", cat?.tint || "text-ink-3")} />
            </button>
          );
        })}
      </div>
    </Card>
  );
}
