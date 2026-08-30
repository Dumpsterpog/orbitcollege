import { Bell, Coffee, Search, MessageCircle, Clock } from "lucide-react";
import { useClickOutside } from "../utils/hooks.js";
import { Logo, IconButton, cx } from "./ui/Primitives.jsx";

// App bar. On desktop the sidebar already carries the logo, search and
// Locali-Tea, so this collapses to just the two things it doesn't duplicate
// (messages + notifications) and stops repeating the nav back at the user.
// Below lg it carries the logo and the full icon row, since there's no rail.
//
// Messages and Notifications are both genuinely unbuilt. The bell opens a
// panel that says so rather than rendering invented notification rows.
export function TopBar({ notifOpen, setNotifOpen, onTeaClick, onSearchClick, onMessagesClick, onLogoClick }) {
  const notifRef = useClickOutside(notifOpen, () => setNotifOpen(false));

  return (
    <header
      className="relative shrink-0 h-12 flex items-center justify-between lg:justify-end gap-1 px-4 lg:px-6 border-b border-line bg-surface"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <button onClick={onLogoClick} className="lg:hidden hover:opacity-80 transition-opacity">
        <Logo size={19} />
      </button>

      <div ref={notifRef} className="flex items-center gap-0.5">
        <span className="lg:hidden flex items-center gap-0.5">
          <IconButton icon={Coffee} label="Locali-Tea" size="sm" onClick={onTeaClick} className="text-accent" />
          <IconButton icon={Search} label="Search" size="sm" onClick={onSearchClick} />
        </span>
        <IconButton icon={MessageCircle} label="Messages" size="sm" onClick={onMessagesClick} />
        <IconButton
          icon={Bell}
          label="Notifications"
          size="sm"
          onClick={() => setNotifOpen(!notifOpen)}
          className={cx(notifOpen && "bg-surface-inset text-content")}
        />

        {notifOpen && (
          <div className="absolute right-4 lg:right-6 top-11 w-64 bg-surface-elevated border border-line rounded-lg shadow-xl z-40 overflow-hidden animate-pop-in">
            <div className="px-3.5 h-9 flex items-center border-b border-line">
              <p className="text-xs font-semibold text-content">Notifications</p>
            </div>
            <div className="px-4 py-7 flex flex-col items-center text-center gap-2">
              <Clock size={16} className="text-content-faint" />
              <p className="text-xs text-content-muted">Nothing here yet</p>
              <p className="text-2xs text-content-faint leading-relaxed">
                Notifications aren't built yet — this won't fill up until they are.
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
