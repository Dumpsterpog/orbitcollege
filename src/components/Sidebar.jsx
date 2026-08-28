import { Home, Compass, CalendarDays, User, Coffee, Search, Plus } from "lucide-react";
import { Orbit as OrbitIcon } from "lucide-react";

// Desktop-only left nav (lg breakpoint and up). Mobile/tablet keeps
// BottomNav; this never renders below lg. Mirrors the same tab keys/handlers
// App.jsx already wires into BottomNav + TopBar, so no new state was needed —
// just a second, wider-screen way to reach the same places.
//
// Collapsed to an icon-only rail by default; hovering it expands to show
// labels (width transition + opacity fade on the label spans, clipped by the
// rail's own overflow-hidden while collapsed) — an overlay would avoid the
// content reflow entirely, but this app has no absolute-positioned shell to
// hang one off, so a plain width transition on a flex sibling it is.
export function Sidebar({ active, setActive, onTeaClick, onSearchClick, onCreateClick, verified }) {
  const items = [
    { key: "home", label: "Home", icon: Home },
    { key: "explore", label: "Explore", icon: Compass },
    { key: "events", label: "Events", icon: CalendarDays },
    { key: "profile", label: "Profile", icon: User },
  ];
  const label = "opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap";
  return (
    <div className="hidden lg:flex flex-col shrink-0 h-full bg-white dark:bg-zinc-950 overflow-hidden group w-[76px] hover:w-64 transition-[width] duration-200 ease-out px-3 py-6">
      <button onClick={() => setActive("home")} className="flex items-center gap-3 px-2.5 mb-8 shrink-0 active:opacity-70 transition-opacity">
        <OrbitIcon size={24} className="text-zinc-900 dark:text-zinc-50 shrink-0" strokeWidth={2.4} />
        <span className={`text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 ${label}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Orbit
        </span>
      </button>
      <nav className="flex flex-col gap-1 shrink-0">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => setActive(it.key)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0 ${
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              <Icon size={19} strokeWidth={isActive ? 2.3 : 1.9} className="shrink-0" />
              <span className={label}>{it.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-6 flex flex-col gap-1 shrink-0">
        <button onClick={onSearchClick} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900">
          <Search size={19} strokeWidth={1.9} className="shrink-0" />
          <span className={label}>Search</span>
        </button>
        <button onClick={onTeaClick} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900">
          <Coffee size={19} strokeWidth={1.9} className="shrink-0 text-yellow-500" />
          <span className={label}>Locali-Tea</span>
        </button>
      </div>
      {verified && (
        <button
          onClick={onCreateClick}
          className="mt-auto flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={19} className="shrink-0" />
          <span className={label}>Create community</span>
        </button>
      )}
    </div>
  );
}
