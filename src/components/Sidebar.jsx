import { Home, Compass, CalendarDays, User, Coffee, Search, Plus, Sun, Moon } from "lucide-react";
import { Orbit as OrbitIcon } from "lucide-react";

// Desktop-only left nav (lg breakpoint and up). Mobile/tablet keeps
// BottomNav; this never renders below lg. Mirrors the same tab keys/handlers
// App.jsx already wires into BottomNav + TopBar, so no new state was needed.
//
// Fixed width on purpose. The previous version rested as a 76px icon rail and
// widened to 16rem on :hover, which animated the width of a flex sibling and
// so visibly reflowed the entire content pane every time the pointer crossed
// it — labels you can only read by disturbing the page aren't much of an
// affordance. A stable rail costs ~190px on screens that are already 1024px+
// and buys a nav that never moves under the cursor.

const NAV_ITEMS = [
  { key: "home", label: "Home", icon: Home },
  { key: "explore", label: "Explore", icon: Compass },
  { key: "events", label: "Events", icon: CalendarDays },
  { key: "profile", label: "Profile", icon: User },
];

// One row shape for every button in the rail, so the nav tabs, the secondary
// shortcuts and the theme toggle all share hit-area and alignment instead of
// each re-deriving their own padding.
const ROW = "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left";
const ROW_IDLE = "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100";

export function Sidebar({
  active, setActive, onTeaClick, onSearchClick, onCreateClick,
  verified, theme, onToggleTheme,
}) {
  return (
    <aside className="hidden lg:flex flex-col shrink-0 h-full w-60 px-3 py-5 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-900">
      <button
        onClick={() => setActive("home")}
        className="flex items-center gap-2.5 px-3 mb-7 shrink-0 active:opacity-70 transition-opacity"
      >
        <OrbitIcon size={24} className="text-zinc-900 dark:text-zinc-50 shrink-0" strokeWidth={2.4} />
        <span
          className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Orbit
        </span>
      </button>

      <nav className="flex flex-col gap-1 shrink-0">
        {NAV_ITEMS.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => setActive(it.key)}
              aria-current={isActive ? "page" : undefined}
              className={`${ROW} ${
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : ROW_IDLE
              }`}
            >
              <Icon size={19} strokeWidth={isActive ? 2.3 : 1.9} className="shrink-0" />
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Secondary surfaces — these open overlays rather than switching tabs,
          so they sit in their own group under a label instead of reading as
          two more peers of Home/Explore/Events/Profile. */}
      <p className="px-3 pt-7 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-600 shrink-0">
        Discover
      </p>
      <div className="flex flex-col gap-1 shrink-0">
        <button onClick={onSearchClick} className={`${ROW} ${ROW_IDLE}`}>
          <Search size={19} strokeWidth={1.9} className="shrink-0" />
          <span>Search</span>
        </button>
        <button onClick={onTeaClick} className={`${ROW} ${ROW_IDLE}`}>
          <Coffee size={19} strokeWidth={1.9} className="shrink-0 text-yellow-500" />
          <span>Locali-Tea</span>
        </button>
      </div>

      <div className="mt-auto flex flex-col gap-1 shrink-0 pt-6">
        {verified && (
          <button
            onClick={onCreateClick}
            className={`${ROW} justify-center font-semibold bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 hover:opacity-90`}
          >
            <Plus size={19} className="shrink-0" />
            <span>Create community</span>
          </button>
        )}
        {/* Theme toggle lived only inside Profile before, three taps deep on a
            screen most people never opened. It's a chrome-level preference, so
            it belongs in the chrome. Profile keeps its own copy — both call the
            same useTheme() toggle, so they can't disagree. */}
        <button
          onClick={onToggleTheme}
          className={`${ROW} ${ROW_IDLE}`}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark"
            ? <Sun size={19} strokeWidth={1.9} className="shrink-0" />
            : <Moon size={19} strokeWidth={1.9} className="shrink-0" />}
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
      </div>
    </aside>
  );
}
