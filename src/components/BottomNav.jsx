import { Home, Compass, CalendarDays, User } from "lucide-react";
import { cx } from "./ui/Primitives.jsx";

// Mobile tab bar (below lg). Labels are always visible now — the old version
// showed a label only under the active tab, so the bar's height and the
// icons' baseline shifted every time you switched tabs.

const ITEMS = [
  { key: "home", label: "Home", icon: Home },
  { key: "explore", label: "Explore", icon: Compass },
  { key: "events", label: "Events", icon: CalendarDays },
  { key: "profile", label: "Profile", icon: User },
];

export function BottomNav({ active, setActive }) {
  return (
    <nav
      className="flex items-stretch bg-surface border-t border-line"
      style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
    >
      {ITEMS.map((it) => {
        const Icon = it.icon;
        const isActive = active === it.key || (it.key === "profile" && active === "settings");
        return (
          <button
            key={it.key}
            onClick={() => setActive(it.key)}
            aria-current={isActive ? "page" : undefined}
            className="flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 transition-colors"
          >
            <Icon
              size={19}
              strokeWidth={isActive ? 2.3 : 1.8}
              className={cx("shrink-0 transition-colors", isActive ? "text-content" : "text-content-muted")}
            />
            <span className={cx("text-[10px] font-medium leading-none", isActive ? "text-content" : "text-content-muted")}>
              {it.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
