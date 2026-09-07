import { useClickOutside } from "../utils/hooks.js";
import { Icon, Avatar, cx } from "./ui/Primitives.jsx";
import { Weather } from "./Weather.jsx";

// Header at every width.
//
// Search leads, because on a page whose whole job is finding people, rooms and
// events, that is the control the header exists for. Everything else on the
// bar is one icon wide.
//
// Still a button rather than a live field: typing here and having the
// keystrokes thrown away on navigation is worse than not looking like a field,
// so it hands off to the real search surface on the first key.
export function TopBar({
  notifOpen, setNotifOpen, onSearchClick, onLogoClick, onAccountClick,
  user, notifCount = 0,
}) {
  const ref = useClickOutside(notifOpen, () => setNotifOpen(false));

  // No bottom rule on the header. It, the rail and every card were each
  // drawing their own hairline, which stacked into a grid of lines competing
  // with the content. The header sits on the same surface as the page, so it
  // needs no edge: the search field's own shape is enough to locate it. The
  // rail keeps its edge, because that one separates two different things
  // rather than repeating a boundary you can already see.
  return (
    <header
      className="relative shrink-0 h-16 flex items-center gap-3 px-4 lg:px-6 bg-bg-raised"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* The rail carries the wordmark on desktop. */}
      <button onClick={onLogoClick} className="flex lg:hidden items-center gap-2 shrink-0" aria-label="Orbit home">
        <img src="/orbitcollege.png" alt="" width={30} height={30} className="w-[30px] h-[30px] rounded-lg object-contain" />
      </button>

      <div className="flex-1 min-w-0 max-w-[640px] lg:mx-2">
        <div className="relative">
          <Icon
            name="search"
            size={19}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
          />
          <input
            readOnly
            onFocus={onSearchClick}
            onClick={onSearchClick}
            onKeyDown={(e) => { if (e.key !== "Tab") onSearchClick(); }}
            placeholder="Search people, communities, events…"
            className="w-full h-11 pl-11 pr-4 rounded-full bg-bg-sunken text-ink placeholder:text-ink-3 text-[13.5px]
              border border-transparent cursor-pointer transition-colors
              hover:bg-bg-hover focus:outline-none focus:border-accent/40 focus:bg-bg-raised"
          />
        </div>
      </div>

      <div ref={ref} className="flex items-center gap-3 shrink-0 ml-auto">
        <Weather />

        <button
          onClick={() => setNotifOpen(!notifOpen)}
          aria-label="Notifications"
          className="relative grid place-items-center w-10 h-10 rounded-full text-ink-2
            hover:bg-bg-sunken hover:text-ink transition-colors"
        >
          <Icon name="notifications" size={22} />
          {notifCount > 0 && (
            <span className="absolute top-1 right-1 grid place-items-center min-w-[17px] h-[17px] px-1
              rounded-full bg-c-red text-white text-[10px] font-bold tabular-nums ring-2 ring-bg-raised">
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-4 top-16 w-72 bg-bg-raised rounded-2xl border border-line
            shadow-pop overflow-hidden animate-pop z-40">
            <p className="px-4 h-11 flex items-center text-base font-semibold text-ink border-b border-line">
              Notifications
            </p>
            <div className="px-4 py-8 flex flex-col items-center text-center gap-2">
              <Icon name="notifications" size={26} className="text-ink-3" />
              <p className="text-base text-ink">Nothing yet</p>
              <p className="text-xs text-ink-2 leading-relaxed">
                Notifications aren&apos;t built yet. This won&apos;t fill up until they are.
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onAccountClick}
          aria-label="Account"
          className="flex items-center gap-1 rounded-full p-0.5 hover:bg-bg-sunken transition-colors"
        >
          <Avatar name={user?.name || "Guest"} size={34} />
          <Icon name="expand_more" size={18} className="hidden sm:block text-ink-3" />
        </button>
      </div>
    </header>
  );
}
