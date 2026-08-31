import { useClickOutside } from "../utils/hooks.js";
import { Icon, IconButton, cx } from "./ui/Primitives.jsx";

// Mobile header only. On desktop the rail carries the wordmark, search and
// every destination, so a second bar repeating them is pure duplication —
// the reference drops it at that width too, and so does this.
export function TopBar({ notifOpen, setNotifOpen, onTeaClick, onSearchClick, onMessagesClick, onLogoClick }) {
  const ref = useClickOutside(notifOpen, () => setNotifOpen(false));

  return (
    <header
      className="lg:hidden relative shrink-0 h-14 flex items-center gap-1 px-4 bg-bg/85 backdrop-blur-md border-b border-line"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <button onClick={onLogoClick} className="flex items-center gap-2 mr-auto" aria-label="Orbit home">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
             strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-ink">
          <circle cx="12" cy="12" r="3" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" />
          <path d="M10.4 21.9a10 10 0 0 0 9.941-15.416" /><path d="M13.5 2.1a10 10 0 0 0-9.841 15.416" />
        </svg>
        <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-c-violet via-c-pink to-c-orange">
          Orbit
        </span>
      </button>

      <div ref={ref} className="flex items-center gap-0.5">
        <IconButton icon="local_cafe" label="Locali-Tea" size={22} className="text-c-pink" onClick={onTeaClick} />
        <IconButton icon="search" label="Search" size={22} className="text-c-teal" onClick={onSearchClick} />
        <IconButton icon="send" label="Messages" size={22} className="text-c-violet" onClick={onMessagesClick} />
        <IconButton icon="favorite" label="Notifications" size={22} className="text-c-red" onClick={() => setNotifOpen(!notifOpen)} />

        {notifOpen && (
          <div className="absolute right-3 top-14 w-72 bg-bg-raised rounded-lg shadow-pop overflow-hidden animate-pop z-40">
            <p className="px-4 h-11 flex items-center text-base font-semibold text-ink border-b border-line">
              Notifications
            </p>
            <div className="px-4 py-8 flex flex-col items-center text-center gap-2">
              <Icon name="notifications" size={26} className="text-c-red" />
              <p className="text-base text-ink">Nothing yet</p>
              <p className="text-xs text-ink-2 leading-relaxed">
                Notifications aren&apos;t built yet — this won&apos;t fill up until they are.
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
