import { useState } from "react";
import { Icon, cx } from "../ui/Primitives.jsx";

// The flagship event, across the top of the feed.
//
// It is driven by a real event document, not a hardcoded promo: the title,
// dates, venue and registration all come from `events`, and the whole card
// hides when there is nothing upcoming. The artwork is the one part that is
// decorative -- an event carries no cover image, so it falls back to a shipped
// one behind a dark scrim that the text was designed against.
//
// Dismissal is per-browser and per-event, so closing it does not hide the next
// one, and it comes back if that same event is still running tomorrow.

const DISMISS_KEY = "orbit_spotlight_dismissed";

function wasDismissed(id) {
  try { return localStorage.getItem(DISMISS_KEY) === id; } catch { return false; }
}

export function Spotlight({ event, registered, onRegister, onOpen }) {
  const [hidden, setHidden] = useState(() => (event ? wasDismissed(event.id) : false));
  if (!event || hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try { localStorage.setItem(DISMISS_KEY, event.id); } catch { /* ignore */ }
  };

  return (
    <section className="relative w-full rounded-2xl overflow-hidden group">
      <img
        src={event.imageUrl || "/seed/hackathon.jpg"}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center opacity-65
          scale-100 group-hover:scale-[1.02] transition-transform duration-700 ease-out"
      />
      {/* Two scrims rather than one: the horizontal keeps the copy legible on
          the left, the vertical stops the chips floating on a bright edge. */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />

      <div className="relative z-10 p-5 sm:p-6 flex flex-col justify-between min-h-[210px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-blue-500/20 backdrop-blur-md border border-blue-400/30
              text-blue-300 text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Campus Spotlight
            </span>
            <span className="text-[11px] font-medium text-slate-400">{event.category}</span>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors shrink-0"
          >
            <Icon name="close" size={17} />
          </button>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="max-w-[430px] min-w-0">
            <button onClick={() => onOpen?.(event)} className="text-left">
              <h2 className="text-xl font-bold text-white tracking-[-0.02em] leading-tight hover:opacity-90 transition-opacity">
                {event.title}
              </h2>
            </button>
            {event.desc && (
              <p className="text-sm text-slate-300 mt-1.5 leading-relaxed line-clamp-2">{event.desc}</p>
            )}

            <div className="flex items-center gap-2.5 mt-3.5 flex-wrap">
              {event.when && (
                <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-md
                  border border-white/10 text-xs font-medium text-slate-200">
                  <Icon name="event" size={15} className="text-blue-400" />
                  {event.when}
                </span>
              )}
              {event.where && (
                <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-md
                  border border-white/10 text-xs font-medium text-slate-200">
                  <Icon name="location_on" size={15} className="text-indigo-400" />
                  {event.where}
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            <button
              onClick={() => onRegister?.(event)}
              disabled={registered}
              className={cx(
                "w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold text-sm px-5 py-2.5",
                "rounded-full transition-all active:scale-[0.98]",
                registered
                  ? "bg-white/15 text-white/80 border border-white/20 cursor-default"
                  : "bg-white text-slate-900 hover:bg-slate-100 shadow-lg"
              )}
            >
              {registered ? "You are going" : "RSVP"}
              {!registered && <Icon name="arrow_forward" size={17} />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
