import { CATEGORIES } from "../../data/constants.js";
import { Icon, cx } from "../ui/Primitives.jsx";
import { Img } from "../ui/Img.jsx";
import { EventAvailability } from "../events/EventAvailability.jsx";


const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);
const nameHead = (name = "") => name.split(" — ")[0];
const slug = (s = "") => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");


export function PulseHeader() {
  return (
    <section className="w-full rounded-2xl border border-accent/15 bg-accent-wash px-4 py-3.5 flex items-center gap-3">
      <span className="grid place-items-center w-11 h-11 rounded-xl bg-bg-raised shrink-0">
        <Icon name="trending_up" size={21} className="text-accent" />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-bold text-ink leading-tight">Campus Pulse</span>
        <span className="block text-[12px] text-ink-2 mt-0.5 truncate">What&apos;s happening around you</span>
      </span>
    </section>
  );
}


function Card({ icon, iconTint, title, action, onAction, children }) {
  return (
    <section className="w-full bg-bg-raised rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <Icon name={icon} size={18} className={iconTint} />}
          <h3 className="text-[14px] font-bold text-ink tracking-tight truncate">{title}</h3>
        </div>
        {action && (
          <button onClick={onAction} className="text-[12px] font-semibold text-accent hover:underline shrink-0">
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}


export function Trending({ topics, onOpen }) {
  if (!topics.length) return null;

  return (
    <Card icon="local_fire_department" iconTint="text-c-orange" title="Trending" action="View all" onAction={() => onOpen()}>
      <div className="flex flex-col">
        {topics.map((t) => (
          <button
            key={t.name}
            onClick={() => onOpen(t.name)}
            className="group flex items-center gap-3 py-2.5 text-left"
          >
            <Icon name="tag" size={16} className="text-ink-3 shrink-0" />
            <span className="text-[13.5px] font-semibold text-ink truncate flex-1 group-hover:text-accent transition-colors">
              #{slug(t.name)}
            </span>
            <span className="text-[12px] text-ink-3 tabular-nums shrink-0">
              {t.posts} {t.posts === 1 ? "post" : "posts"}
            </span>
            <Icon name="arrow_forward" size={14} className="text-ink-3 shrink-0 -rotate-45" />
          </button>
        ))}
      </div>
    </Card>
  );
}


function whenLabel(date) {
  if (!date) return "Date TBA";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const days = Math.round((d - today) / 86400e3);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return new Date(date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function UpcomingEvents({ events, registeredIds, onOpen, onAll }) {
  return (
    <Card icon="calendar_today" iconTint="text-accent" title="Upcoming Events" action="View all" onAction={onAll}>
      {events.length === 0 ? (
        <p className="text-[13px] text-ink-2 leading-relaxed py-2">Nothing scheduled yet.</p>
      ) : (
        <div className="flex flex-col gap-2 mt-2">
          {events.slice(0, 3).map((e) => {
            const cat = CATEGORIES.find((x) => x.name === e.category);
            const going = registeredIds.includes(e.id);
            return (
              <button
                key={e.id}
                onClick={() => onOpen?.(e)}
                className="group flex items-center gap-3 p-2.5 rounded-xl border border-line
                  hover:border-line-strong hover:bg-bg-sunken transition-colors text-left"
              >
                <span className="grid place-items-center w-11 h-11 rounded-xl bg-accent-wash shrink-0 overflow-hidden">
                  {e.imageUrl
                    ? <Img src={e.imageUrl} className="w-full h-full object-cover" />
                    : <Icon name={cat?.msr || "calendar_today"} size={19} className="text-accent" />}
                </span>

                <span className="flex flex-col min-w-0 flex-1">
                  <span className="text-[13px] font-bold text-ink truncate group-hover:text-accent transition-colors">
                    {e.title}
                  </span>
                  <span className="text-[11.5px] text-ink-2 truncate">
                    {[whenLabel(e.startsAt), e.when].filter(Boolean).join(" · ")}
                  </span>
                  <span className="text-[11.5px] text-ink-3 truncate">{e.where}</span>
                  <EventAvailability event={e} className="mt-2" compact />
                </span>

                {going
                  ? <Icon name="check_circle" size={17} className="text-c-green shrink-0" />
                  : <Icon name="chevron_right" size={18} className="text-ink-3 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}


export function CommunitiesForYou({ communities, joinedIds, onOpen, onJoin, onAll }) {
  if (!communities.length) return null;

  return (
    <Card icon="groups" iconTint="text-c-violet" title="Communities for You" action="View all" onAction={onAll}>
      <div className="flex flex-col gap-1 mt-1">
        {communities.map((c) => {
          const cat = CATEGORIES.find((x) => x.name === c.category);
          const joined = joinedIds.includes(c.id);
          return (
            <div key={c.id} className="flex items-center gap-3 py-2 group">
              <button onClick={() => onOpen(c)} className="grid place-items-center w-10 h-10 rounded-xl
                overflow-hidden bg-bg-sunken shrink-0">
                {c.avatarUrl
                  ? <Img src={c.avatarUrl} className="w-full h-full object-cover" />
                  : <Icon name={cat?.msr || "groups"} size={18} className={cat?.tint || "text-ink-3"} />}
              </button>

              <button onClick={() => onOpen(c)} className="min-w-0 flex-1 text-left">
                <span className="block text-[13.5px] font-semibold text-ink truncate group-hover:text-accent transition-colors">
                  {nameHead(c.name)}
                </span>
                <span className="block text-[11.5px] text-ink-3 truncate">
                  {compact(c.members || 0)} members · {c.official ? "Official" : c.category}
                </span>
              </button>

              <button
                onClick={() => !joined && onJoin(c.id)}
                disabled={joined}
                className={cx(
                  "px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors shrink-0",
                  joined
                    ? "bg-accent-wash text-accent cursor-default"
                    : "bg-bg-sunken text-ink-2 hover:bg-accent hover:text-accent-ink"
                )}
              >
                {joined ? "Joined" : "Join"}
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}


export function StartCommunityCard({ onCreate }) {
  return (
    <button
      onClick={onCreate}
      className="w-full rounded-2xl border border-accent/15 bg-accent-wash px-4 py-3.5
        flex items-center gap-3 text-left hover:border-accent/30 transition-colors group"
    >
      <span className="grid place-items-center w-11 h-11 rounded-xl bg-bg-raised shrink-0">
        <Icon name="school" size={21} className="text-accent" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold text-ink leading-tight">
          Got an idea? Start a community!
        </span>
        <span className="block text-[11.5px] text-ink-2 mt-0.5">
          Bring your interests, clubs or ideas to life.
        </span>
      </span>
      <Icon name="arrow_forward" size={18} className="text-accent shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}
