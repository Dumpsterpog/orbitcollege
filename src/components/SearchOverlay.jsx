import { useState, useMemo } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import { CATEGORIES, COLOR_MAP } from "../data/constants.js";
import { EmptyState } from "./EmptyState.jsx";

export function SearchOverlay({ communities, onOpen, onClose }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return communities.filter((c) =>
      c.name.toLowerCase().includes(query) || c.category.toLowerCase().includes(query)
    ).slice(0, 30);
  }, [q, communities]);
  return (
    <div className="relative flex-1 bg-white dark:bg-zinc-950 flex flex-col min-h-0">
      <div className="relative z-10 flex flex-col min-h-0 flex-1">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-900">
        <button onClick={onClose} className="shrink-0"><ArrowLeft size={19} className="text-zinc-700 dark:text-zinc-300" /></button>
        <div className="flex-1 flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2">
          <Search size={16} className="text-zinc-500 shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search communities or categories"
            className="flex-1 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 text-sm outline-none"
          />
          {q && <button onClick={() => setQ("")}><X size={14} className="text-zinc-500" /></button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-3">
        {!q && (
          <EmptyState icon={Search} title="Search Orbit" subtitle={'Try a community name or category, like "Coding" or "Football".'} />
        )}
        {q && results.length === 0 && (
          <EmptyState icon={Search} title={`No matches for "${q}"`} subtitle="Try a different name or category." />
        )}
        <div className="space-y-1">
          {results.map((c, idx) => {
            const cat = CATEGORIES.find((x) => x.name === c.category);
            const cm = COLOR_MAP[cat.color];
            return (
              <button key={c.id} onClick={() => { onOpen(c); onClose(); }} className={`animate-fade-in-up stagger-${Math.min((idx % 8) + 1, 8)} w-full flex items-center gap-3 py-2.5 text-left active:scale-[0.99] transition-transform`}>
                <div className={`${cm.tint} ${cm.text} w-11 h-11 rounded-full flex items-center justify-center shrink-0`}>
                  <cat.icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{c.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{c.category} · {c.members} members</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
