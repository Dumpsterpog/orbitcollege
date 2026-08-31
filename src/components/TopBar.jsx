import { Bell, Search, MessageCircle, Clock, Menu } from "lucide-react";
import { useClickOutside } from "../utils/hooks.js";
import { Avatar, cx } from "./ui/Primitives.jsx";

// Header, matching the mock: 64px tall on surface-container-lowest, a
// centred pill search that focuses to a primary ring, then notifications
// and the signed-in identity split off by a hairline.
//
// The search input is a button in disguise — it opens the real search
// overlay rather than filtering in place, which is where the app's search
// actually lives. Typing into a field that then throws your keystrokes away
// on navigation would be worse than not looking like an input at all, so it
// hands off on the first keypress.
export function TopBar({ notifOpen, setNotifOpen, onTeaClick, onSearchClick, onMessagesClick, onLogoClick, user }) {
  const notifRef = useClickOutside(notifOpen, () => setNotifOpen(false));

  return (
    <header className="relative shrink-0 h-16 flex items-center gap-md px-md lg:px-margin-desktop bg-surface-container-lowest border-b border-outline-variant/30">
      <button onClick={onLogoClick} className="lg:hidden flex items-center gap-sm shrink-0">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-primary text-on-primary">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" />
            <path d="M10.4 21.9a10 10 0 0 0 9.941-15.416" /><path d="M13.5 2.1a10 10 0 0 0-9.841 15.416" />
          </svg>
        </span>
      </button>

      {/* Centred search */}
      <div className="flex-1 max-w-xl mx-auto lg:px-lg min-w-0">
        <div className="relative flex items-center w-full group">
          <Search
            size={18}
            className="absolute left-3 text-on-surface-variant group-focus-within:text-primary transition-colors pointer-events-none"
          />
          <input
            readOnly
            onFocus={onSearchClick}
            onClick={onSearchClick}
            onKeyDown={(e) => { if (e.key !== "Tab") onSearchClick(); }}
            placeholder="Search campus events, groups, or notes..."
            className="w-full bg-surface-container-low border border-outline-variant rounded-full py-sm pl-10 pr-md text-body-sm text-on-surface placeholder:text-on-surface-variant cursor-pointer focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
          />
        </div>
      </div>

      {/* Right cluster */}
      <div ref={notifRef} className="flex items-center gap-lg shrink-0">
        <button
          onClick={onMessagesClick}
          aria-label="Messages"
          className="p-xs rounded-full hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <MessageCircle size={22} />
        </button>

        <button
          onClick={() => setNotifOpen(!notifOpen)}
          aria-label="Notifications"
          className={cx(
            "p-xs rounded-full hover:bg-surface-container transition-colors relative",
            notifOpen ? "bg-surface-container text-on-surface" : "text-on-surface-variant hover:text-on-surface"
          )}
        >
          <Bell size={22} />
        </button>

        <div className="hidden sm:flex items-center gap-sm pl-md border-l border-outline-variant/40">
          <Avatar name={user?.name || "Guest"} size={32} />
          <span className="hidden lg:block text-label-md font-medium text-on-surface truncate max-w-[9rem]">
            {user?.name || "Guest"}
          </span>
        </div>

        {notifOpen && (
          <div className="absolute right-md lg:right-margin-desktop top-14 w-72 bg-surface-container-lowest border border-outline-variant/40 rounded-lg shadow-lg z-40 overflow-hidden animate-pop-in">
            <div className="px-md h-11 flex items-center border-b border-outline-variant/20">
              <p className="text-label-md font-semibold text-on-surface">Notifications</p>
            </div>
            <div className="px-md py-xl flex flex-col items-center text-center gap-sm">
              <Clock size={18} className="text-on-surface-variant" />
              <p className="text-body-sm text-on-surface-variant">Nothing here yet</p>
              <p className="text-label-sm text-on-surface-variant/70 leading-relaxed">
                Notifications aren't built yet — this won't fill up until they are.
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
