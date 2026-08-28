import { useState, useMemo } from "react";
import { Search, BadgeCheck, Users } from "lucide-react";
import { CATEGORIES, COLOR_MAP } from "../data/constants.js";
import { EmptyState } from "./EmptyState.jsx";

// Explore = directory, not discovery-by-distance: two sub-tabs, Clubs
// (official, institutional) and Communities (student-started). This is
// where the old "Chat" nav slot now points — actual messaging lives inside
// each community/club's own Chat tab, or behind the top-bar message icon
// for DMs.
function DirectoryCard({ item, onOpen, index = 0 }) {
  const cat = CATEGORIES.find((x) => x.name === item.category);
  const cm = COLOR_MAP[cat.color];
  const Icon = cat.icon;
  return (
    <button
      onClick={() => onOpen(item)}
      className={`animate-fade-in-up stagger-${Math.min((index % 8) + 1, 8)} w-full text-left bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-[0.99] transition-all p-3.5 flex gap-3`}
    >
      <div className={`${cm.tint} ${cm.text} w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-white/5`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm truncate flex items-center gap-1">
          {item.name}
          {item.official && <BadgeCheck size={13} className="text-zinc-900 dark:text-zinc-50 shrink-0" />}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{item.desc}</p>
        <div className="flex items-center gap-2.5 text-[11px] text-zinc-500 mt-1.5">
          <span className="text-zinc-600 dark:text-zinc-400 font-medium">{item.category}</span>
          <span className="flex items-center gap-1 mono"><Users size={11} />{item.members}</span>
        </div>
      </div>
    </button>
  );
}

export function ExploreScreen({ subTab, setSubTab, clubs, communities, onOpen }) {
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState(null);
  const list = subTab === "clubs" ? clubs : communities;
  const filtered = useMemo(() => {
    let items = list;
    if (filterCat) items = items.filter((c) => c.category === filterCat);
    const q = query.trim().toLowerCase();
    if (q) items = items.filter((c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
    return items;
  }, [list, filterCat, query]);

  return (
    <div className="relative flex-1 overflow-y-auto no-scrollbar pb-6">
      <div className="relative z-10">
        <div className="px-4 pt-4">
          <p className="font-bold text-zinc-900 dark:text-zinc-50 text-lg">Explore</p>
          <p className="text-xs text-zinc-500 mt-0.5">Every official club and student community on campus, in one directory.</p>
        </div>
        <div className="flex gap-1.5 px-4 pt-4 pb-3">
          <button onClick={() => setSubTab("clubs")} className={`flex-1 text-xs font-medium py-2 rounded-xl border ${subTab === "clubs" ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50" : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"}`}>Clubs</button>
          <button onClick={() => setSubTab("communities")} className={`flex-1 text-xs font-medium py-2 rounded-xl border ${subTab === "communities" ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50" : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"}`}>Communities</button>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2">
            <Search size={14} className="text-zinc-500 shrink-0" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={subTab === "clubs" ? "Search official clubs" : "Search communities"}
              className="flex-1 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 text-sm outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
          <button onClick={() => setFilterCat(null)} className={`text-xs px-3 py-1.5 rounded-full shrink-0 font-medium ${!filterCat ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800"}`}>All</button>
          {CATEGORIES.map((cat) => (
            <button key={cat.name} onClick={() => setFilterCat(cat.name)} className={`text-xs px-3 py-1.5 rounded-full shrink-0 font-medium ${filterCat === cat.name ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800"}`}>{cat.name}</button>
          ))}
        </div>
        <div className="px-4 space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3">
          {filtered.length === 0 && (
            <EmptyState
              icon={Search}
              title={`No ${subTab} found`}
              subtitle="Try a different search term or category."
            />
          )}
          {filtered.map((item, idx) => (
            <DirectoryCard key={item.id} item={item} onOpen={onOpen} index={idx} />
          ))}
        </div>
      </div>
    </div>
  );
}
