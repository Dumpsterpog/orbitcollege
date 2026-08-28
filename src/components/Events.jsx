import React from "react";
import { CalendarDays, Clock, MapPin, Users, Lock } from "lucide-react";
import { CATEGORIES, COLOR_MAP } from "../data/constants.js";
import { EmptyState } from "./EmptyState.jsx";

// Events is listing-only for this launch — registration (and the discussion
// space it used to unlock) is Coming soon, not wired to anything. Listing
// itself is still real Supabase data (see App.jsx).
// Poster-first card — closer to a ticketing app's event listing than a
// plain text row: image up top, everything else layered underneath.
// Gracefully drops the image block entirely for an event with none (older
// rows, or events created before image_url existed).
function EventCard({ e, interests, onComingSoon, index = 0 }) {
  const cat = CATEGORIES.find((x) => x.name === e.category);
  const cm = COLOR_MAP[cat.color];
  const isMatch = interests && interests.includes(e.category);
  return (
    <div className={`animate-fade-in-up stagger-${Math.min((index % 8) + 1, 8)} bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden`}>
      {e.imageUrl && (
        <div className="relative w-full aspect-[16/9] bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <img src={e.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          <span className={`absolute top-2.5 left-2.5 ${cm.tint} ${cm.text} text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur`}>
            <cat.icon size={12} />{e.category}
          </span>
          {isMatch && (
            <span className="absolute top-2.5 right-2.5 bg-white/90 dark:bg-zinc-950/90 text-zinc-800 dark:text-zinc-200 text-[10px] font-medium px-2 py-1 rounded-full">✨ For you</span>
          )}
        </div>
      )}
      {!e.imageUrl && (
        <div className={`${cm.tint} px-3.5 py-2 flex items-center justify-between`}>
          <span className={`${cm.text} text-[11px] font-semibold flex items-center gap-1`}>
            <cat.icon size={12} />{e.category}
          </span>
          {isMatch && <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-medium">✨ Matches your interests</span>}
        </div>
      )}
      <div className="p-3.5">
        <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{e.title}</p>
        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{e.desc}</p>
        <div className="flex items-center gap-3 mt-2.5 text-xs text-zinc-500 flex-wrap">
          <span className="flex items-center gap-1"><Clock size={12} />{e.when}</span>
          <span className="flex items-center gap-1"><MapPin size={12} />{e.where}</span>
          <span className="flex items-center gap-1 mono"><Users size={12} />{e.capacity} spots</span>
        </div>
        <button onClick={onComingSoon} className="w-full mt-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-default">
          <Lock size={12} />Registration — coming soon
        </button>
      </div>
    </div>
  );
}

export function EventsScreen({ events, interests, onComingSoon }) {
  const sorted = [...events].sort((a, b) => {
    const am = interests && interests.includes(a.category) ? 1 : 0;
    const bm = interests && interests.includes(b.category) ? 1 : 0;
    return bm - am;
  });
  return (
    <div className="relative flex-1 overflow-y-auto no-scrollbar pb-6">
      <div className="relative z-10">
        <div className="px-4 pt-4">
          <p className="font-bold text-zinc-900 dark:text-zinc-50 text-lg flex items-center gap-1.5"><CalendarDays size={17} className="text-zinc-900 dark:text-zinc-50" />Events</p>
          <p className="text-xs text-zinc-500 mt-0.5">Browsing is live. Registration and the event discussion space are coming soon.</p>
        </div>
        <div className="px-4 pt-4 space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3">
          {sorted.length === 0 && (
            <EmptyState icon={CalendarDays} title="No events right now" subtitle="Check back soon — new events are added regularly." />
          )}
          {sorted.map((e, i) => (
            <React.Fragment key={e.id}>
              <EventCard
                e={e}
                index={i}
                interests={interests}
                onComingSoon={onComingSoon}
              />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
