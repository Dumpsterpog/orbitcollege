import { useState } from "react";
import { Icon, Avatar, cx } from "./ui/Primitives.jsx";

// Navigation rail.
//
// Structure taken from the reference: a fixed 244px column, one hairline
// against the content, and rows that are hit-areas rather than components —
// no chip, no border, no fill on the active item. Active state is carried by
// the label going semibold and the glyph taking its colour. That is enough,
// and it means the rail has no visual weight of its own competing with the
// feed.
//
// Below xl it collapses to a 72px icon rail (same behaviour as the
// reference), and below lg it disappears in favour of the bottom bar.

const NAV = [
  { key: "home", label: "Home", icon: "home", tint: "text-c-blue" },
  { key: "search", label: "Search", icon: "search", tint: "text-c-teal", action: "search" },
  { key: "explore", label: "Explore", icon: "explore", tint: "text-c-violet" },
  { key: "events", label: "Events", icon: "confirmation_number", tint: "text-c-orange" },
  { key: "tea", label: "Locali-Tea", icon: "local_cafe", tint: "text-c-pink", action: "tea" },
  { key: "profile", label: "Profile", icon: "account_circle", tint: "text-c-green" },
];

function NavRow({ icon, tint, label, active, onClick, avatar, collapsed }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cx(
        "group w-full flex items-center gap-4 rounded-full text-left transition-colors duration-150",
        "hover:bg-black/[0.05] dark:hover:bg-white/[0.08] active:scale-[0.98]",
        collapsed ? "justify-center p-3" : "px-3 py-2.5"
      )}
    >
      {avatar || (
        <Icon
          name={icon}
          size={26}
          className={cx("transition-transform duration-150 group-hover:scale-[1.06]", tint)}
        />
      )}
      {!collapsed && (
        <span className={cx("text-lg truncate", active ? "font-bold text-ink" : "font-normal text-ink")}>
          {label}
        </span>
      )}
    </button>
  );
}

export function Sidebar({
  active, setActive, onTeaClick, onSearchClick, onCreateClick,
  verified, user, theme, onToggleTheme, onOpenSettings,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (item) => {
    if (item.action === "tea") return onTeaClick();
    if (item.action === "search") return onSearchClick();
    setActive(item.key);
  };

  return (
    <aside
      className="hidden lg:flex flex-col shrink-0 h-full bg-bg border-r border-line
        w-[--tw-rail] lg:w-rail-sm xl:w-rail transition-[width] duration-200"
    >
      {/* Wordmark */}
      <div className="px-3 pt-6 pb-5 xl:px-5">
        <button
          onClick={() => setActive("home")}
          className="flex items-center gap-2.5 group"
          aria-label="Orbit home"
        >
          <span className="grid place-items-center w-8 h-8 shrink-0">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
                 strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-ink">
              <circle cx="12" cy="12" r="3" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" />
              <path d="M10.4 21.9a10 10 0 0 0 9.941-15.416" /><path d="M13.5 2.1a10 10 0 0 0-9.841 15.416" />
            </svg>
          </span>
          <span
            className="hidden xl:block text-2xl font-bold tracking-tight bg-clip-text text-transparent
              bg-gradient-to-r from-c-violet via-c-pink to-c-orange"
          >
            Orbit
          </span>
        </button>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-2 xl:px-3 space-y-1 overflow-y-auto no-scrollbar">
        {NAV.map((item) => (
          <NavRow
            key={item.key}
            {...item}
            active={active === item.key}
            onClick={() => go(item)}
            collapsed={false}
            avatar={
              item.key === "profile" ? (
                <span className="xl:ml-0">
                  <Avatar name={user?.name || "Guest"} size={26} ring={active === "profile"} />
                </span>
              ) : null
            }
          />
        ))}

        {/* Create is the one filled action in the rail — it is the thing the
            product wants you to do, so it is the only row with a fill. */}
        <button
          onClick={onCreateClick}
          className="w-full mt-2 flex items-center justify-center xl:justify-start gap-3 rounded-full
            px-3 py-2.5 bg-accent text-accent-ink font-semibold text-base
            hover:bg-accent-press active:scale-[0.98] transition-[background-color,transform] duration-150"
        >
          <Icon name="add_circle" size={24} />
          <span className="hidden xl:inline">Create</span>
        </button>
      </nav>

      {/* Foot */}
      <div className="px-2 xl:px-3 pb-4 space-y-1 relative">
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
            <div className="absolute bottom-full left-2 right-2 mb-2 z-40 bg-bg-raised rounded-lg shadow-pop overflow-hidden animate-pop">
              <button
                onClick={() => { onOpenSettings(); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-base text-ink hover:bg-bg-sunken transition-colors"
              >
                <Icon name="settings" size={20} className="text-c-violet" />Settings
              </button>
              <button
                onClick={() => { onToggleTheme(); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-base text-ink hover:bg-bg-sunken transition-colors"
              >
                <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} size={20} className="text-c-amber" />
                Switch appearance
              </button>
              <a
                href="mailto:atharvat2006@gmail.com?subject=Orbit%20feedback"
                className="w-full flex items-center gap-3 px-4 py-3 text-base text-ink hover:bg-bg-sunken transition-colors border-t border-line"
              >
                <Icon name="help" size={20} className="text-c-teal" />Feedback
              </a>
            </div>
          </>
        )}
        <NavRow
          icon="menu"
          tint="text-ink"
          label="More"
          active={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          collapsed={false}
        />
      </div>
    </aside>
  );
}
