import { Home, Compass, CalendarDays, User, Coffee, Search, Plus, Settings, Sun, Moon } from "lucide-react";
import { Logo, Avatar, Badge, SectionLabel, cx } from "./ui/Primitives.jsx";

// Desktop-only left rail (lg+). Mobile keeps BottomNav; this never renders
// below lg.
//
// Fixed width on purpose. An earlier version rested as a 76px icon rail and
// widened on :hover, which animated the width of a flex sibling and reflowed
// the whole content pane whenever the pointer crossed it. A stable rail costs
// ~190px on screens already 1024px+ and buys a nav that never moves.
//
// Rebuilt on semantic tokens: rows are 28px with a 6px radius rather than
// 44px pills, and the active row is a quiet inset surface instead of a
// full-contrast inverted block — at this density an inverted row per screen
// reads as an alert, not a location.

const NAV_ITEMS = [
  { key: "home", label: "Home", icon: Home },
  { key: "explore", label: "Explore", icon: Compass },
  { key: "events", label: "Events", icon: CalendarDays },
];

const ROW =
  "w-full flex items-center gap-2.5 h-7 px-2 rounded-sm text-xs font-medium text-left transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-content/20";
const ROW_IDLE = "text-content-secondary hover:text-content hover:bg-surface-inset";
const ROW_ACTIVE = "bg-surface-inset text-content";

function NavRow({ icon: Icon, label, active, onClick, iconClass, trailing }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cx(ROW, active ? ROW_ACTIVE : ROW_IDLE)}
    >
      <Icon size={14} className={cx("shrink-0", iconClass, active ? "text-content" : "text-content-muted")} />
      <span className="truncate flex-1">{label}</span>
      {trailing}
    </button>
  );
}

export function Sidebar({
  active, setActive, onTeaClick, onSearchClick, onCreateClick,
  verified, user, theme, onToggleTheme,
}) {
  return (
    <aside className="hidden lg:flex flex-col shrink-0 h-full w-56 bg-surface-subtle border-r border-line">
      <div className="h-12 flex items-center px-3 shrink-0 border-b border-line">
        <button onClick={() => setActive("home")} className="flex items-center hover:opacity-80 transition-opacity">
          <Logo size={19} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-5">
        <nav className="space-y-0.5">
          <button
            onClick={onSearchClick}
            className={cx(ROW, ROW_IDLE, "justify-between")}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Search size={14} className="shrink-0 text-content-muted" />
              <span className="truncate">Search</span>
            </span>
            <kbd className="text-[10px] font-sans text-content-faint border border-line rounded-sm px-1 leading-4 shrink-0">/</kbd>
          </button>
          {NAV_ITEMS.map((it) => (
            <NavRow
              key={it.key}
              icon={it.icon}
              label={it.label}
              active={active === it.key}
              onClick={() => setActive(it.key)}
            />
          ))}
        </nav>

        <div className="space-y-1">
          <SectionLabel className="px-2">Discover</SectionLabel>
          <div className="space-y-0.5">
            <NavRow icon={Coffee} label="Locali-Tea" onClick={onTeaClick} iconClass="text-accent" />
          </div>
        </div>

        <div className="space-y-1">
          <SectionLabel className="px-2">You</SectionLabel>
          <div className="space-y-0.5">
            <NavRow icon={User} label="Profile" active={active === "profile"} onClick={() => setActive("profile")} />
            <NavRow icon={Settings} label="Settings" active={active === "settings"} onClick={() => setActive("settings")} />
          </div>
        </div>
      </div>

      <div className="shrink-0 p-2 border-t border-line space-y-0.5">
        {verified && (
          <button
            onClick={onCreateClick}
            className={cx(ROW, "bg-solid text-solid-fg hover:bg-solid-hover justify-center font-semibold")}
          >
            <Plus size={14} className="shrink-0" />
            New community
          </button>
        )}
        <NavRow
          icon={theme === "dark" ? Sun : Moon}
          label={theme === "dark" ? "Light mode" : "Dark mode"}
          onClick={onToggleTheme}
        />
        <button
          onClick={() => setActive("profile")}
          className="w-full flex items-center gap-2 h-9 px-2 rounded-sm text-left transition-colors hover:bg-surface-inset"
        >
          <Avatar name={user?.name || "Guest"} size={22} />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-content truncate leading-tight">
              {user?.name || "Guest"}
            </span>
          </span>
          {!verified && <Badge tone="neutral">Guest</Badge>}
        </button>
      </div>
    </aside>
  );
}
