import { useState, useEffect } from "react";
import { useClickOutside } from "../utils/hooks.js";
import { Icon, Avatar, cx } from "./ui/Primitives.jsx";
import { Weather } from "./Weather.jsx";
import { BetaTag } from "./Common.jsx";

// Header at every width.
//
// Search leads, because on a page whose whole job is finding people, rooms and
// events, that is the control the header exists for. Everything else on the
// bar is one icon wide.
//
// Still a button rather than a live field: typing here and having the
// keystrokes thrown away on navigation is worse than not looking like a field,
// so it hands off to the real search surface on the first key.

const THEMES = [
  { key: "light", label: "Light", icon: "light_mode" },
  { key: "dark", label: "Dark", icon: "dark_mode" },
  { key: "system", label: "System", icon: "computer" },
];

function MenuItem({ icon, label, onClick, hint }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 h-10 rounded-xl text-left text-[13.5px] font-medium text-ink
        hover:bg-bg-sunken transition-colors"
    >
      <Icon name={icon} size={18} className="text-ink-2 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="text-xs text-ink-3">{hint}</span>}
      <Icon name="chevron_right" size={16} className="text-ink-3 shrink-0" />
    </button>
  );
}

export function TopBar({
  notifOpen, setNotifOpen, onSearchClick, onLogoClick,
  user, email, notifCount = 0,
  themeMode = "system", onThemeChange, onOpenProfile, onOpenSettings, onSignIn,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useClickOutside(notifOpen || menuOpen, () => { setNotifOpen(false); setMenuOpen(false); });

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Navigating closes the menu; switching theme does not, so the change can
  // be seen before choosing another.
  const go = (fn) => { setMenuOpen(false); fn?.(); };

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
      <button onClick={onLogoClick} className="flex lg:hidden items-center gap-2 shrink-0 h-11 pr-1 -ml-1 pl-1 rounded-xl" aria-label="Orbit home">
        <img src="/orbitcollege.png" alt="" width={30} height={30} className="w-[30px] h-[30px] rounded-lg object-contain" />
        <BetaTag />
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
          onClick={() => { setMenuOpen(false); setNotifOpen(!notifOpen); }}
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
          onClick={() => { setNotifOpen(false); setMenuOpen((v) => !v); }}
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={cx(
            "flex items-center gap-1 rounded-full p-0.5 pr-1.5 transition-colors",
            menuOpen ? "bg-bg-sunken" : "hover:bg-bg-sunken"
          )}
        >
          <Avatar name={user?.name || "Guest"} src={user?.avatarUrl} size={34} />
          <Icon
            name="expand_more"
            size={18}
            className={cx("text-ink-3 transition-transform duration-200", menuOpen && "rotate-180")}
          />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-3 sm:right-4 top-16 w-[min(18.5rem,calc(100vw-1.5rem))] bg-bg-raised rounded-2xl
              border border-line shadow-pop overflow-hidden animate-pop z-40"
          >
            <button
              onClick={() => go(user?.verified ? onOpenProfile : onSignIn)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-bg-sunken transition-colors border-b border-line"
            >
              <Avatar name={user?.name || "Guest"} src={user?.avatarUrl} size={42} />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-ink truncate">{user?.name || "Guest"}</span>
                <span className="block text-xs text-ink-3 truncate">
                  {user?.verified ? (email || "View your profile") : "Browsing as guest"}
                </span>
              </span>
            </button>

            <div className="p-1.5">
              <MenuItem icon="person" label="Profile" onClick={() => go(onOpenProfile)} />
            </div>

            <div className="px-4 pt-1 pb-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-ink-3 mb-2">Theme</p>
              <div className="grid grid-cols-3 gap-1 bg-bg-sunken p-1 rounded-xl" role="radiogroup" aria-label="Theme">
                {THEMES.map((t) => {
                  const on = themeMode === t.key;
                  return (
                    <button
                      key={t.key}
                      role="radio"
                      aria-checked={on}
                      onClick={() => onThemeChange?.(t.key)}
                      className={cx(
                        "flex flex-col items-center gap-1 py-2 rounded-lg text-[11.5px] font-semibold transition-colors",
                        on ? "bg-bg-raised text-ink ring-1 ring-line shadow-sm" : "text-ink-2 hover:text-ink"
                      )}
                    >
                      <Icon name={t.icon} size={17} className={on ? "text-accent" : undefined} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-1.5 border-t border-line">
              <MenuItem icon="settings" label="Settings" onClick={() => go(onOpenSettings)} />
            </div>

            {!user?.verified && onSignIn && (
              <div className="px-3 pb-3">
                <button
                  onClick={() => go(onSignIn)}
                  className="w-full h-10 rounded-full bg-accent text-accent-ink text-[13px] font-semibold
                    hover:bg-accent-press transition-colors"
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
