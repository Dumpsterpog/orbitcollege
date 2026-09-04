import { useState, useRef, useEffect } from "react";
import { Icon, Avatar, cx } from "./ui/Primitives.jsx";

// Navigation rail.
//
// The previous version was a flat list of six equal rows — nothing told you
// that Home and Explore are where you live while Locali-Tea is a side trip,
// and the active row was marked only by a bold label, which is easy to miss
// at a glance. Three changes:
//
//   Grouping.   Two labelled sections. Six undifferentiated rows is a list;
//               two groups of three is a structure you can learn once.
//   Active.     A tinted pill plus a colour bar on the left edge. The bar is
//               what makes the state readable in peripheral vision, which is
//               the only time anyone actually looks at a nav rail.
//   Identity.   A real account row at the foot, so who you are and how to
//               get to settings live together instead of behind a "More"
//               hamburger that told you nothing.
//
// Below xl it collapses to an icon rail; below lg it gives way to the bottom
// bar. Labels become tooltips in the collapsed state rather than vanishing.

const GROUPS = [
  {
    label: "Feed",
    items: [
      { key: "home", label: "Home", icon: "home", tint: "text-c-blue" },
      { key: "explore", label: "Explore", icon: "explore", tint: "text-c-violet" },
      { key: "search", label: "Search", icon: "search", tint: "text-c-teal", action: "search" },
      { key: "saved", label: "Saved", icon: "bookmark", tint: "text-c-amber", action: "saved" },
    ],
  },
  {
    label: "Campus",
    items: [
      { key: "events", label: "Events", icon: "confirmation_number", tint: "text-c-orange" },
      { key: "tea", label: "Locali-Tea", icon: "local_cafe", tint: "text-c-pink", action: "tea" },
      { key: "communities", label: "My communities", icon: "groups", tint: "text-c-green", action: "communities" },
    ],
  },
  {
    label: "You",
    items: [
      { key: "profile", label: "Profile", icon: "account_circle", tint: "text-c-blue" },
      { key: "notifications", label: "Notifications", icon: "notifications", tint: "text-c-red", action: "notifications" },
      { key: "settings", label: "Settings", icon: "settings", tint: "text-c-violet" },
    ],
  },
];

// Left-edge indicator colour per nav item, as whole class strings so
// Tailwind's scanner can see them.
const BAR = {
  "text-c-blue": "bg-c-blue",
  "text-c-violet": "bg-c-violet",
  "text-c-teal": "bg-c-teal",
  "text-c-orange": "bg-c-orange",
  "text-c-pink": "bg-c-pink",
  "text-c-green": "bg-c-green",
};

function NavRow({ icon, tint, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={label}
      className={cx(
        "group relative w-full flex items-center gap-3.5 rounded-full text-left",
        "px-3 py-2.5 transition-colors duration-150 active:scale-[0.98]",
        active ? "bg-black/[0.05] dark:bg-white/[0.08]" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
      )}
    >
      {/* Edge indicator — the part that reads without being looked at. */}
      <span
        className={cx(
          "absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-200",
          active ? cx("h-5 opacity-100", BAR[tint] || "bg-accent") : "h-0 opacity-0"
        )}
      />
      <Icon
        name={icon}
        size={25}
        className={cx("shrink-0 transition-transform duration-150 group-hover:scale-110", tint)}
      />
      <span
        className={cx(
          "hidden xl:block text-base truncate flex-1",
          active ? "font-bold text-ink" : "font-medium text-ink"
        )}
      >
        {label}
      </span>
      {badge > 0 && (
        <span className="hidden xl:grid place-items-center min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-accent-ink text-2xs font-bold tabular-nums">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

function GroupLabel({ children }) {
  return (
    <p className="hidden xl:block px-4 pt-4 pb-1.5 text-2xs font-bold text-ink-3 uppercase tracking-[0.08em]">
      {children}
    </p>
  );
}

export function Sidebar({
  active, setActive, onTeaClick, onSearchClick, onCreateClick, onPostClick,
  verified, user, theme, onToggleTheme, onOpenSettings, joinedCount = 0, onUnbuilt,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const go = (item) => {
    if (item.action === "tea") return onTeaClick();
    if (item.action === "search") return onSearchClick();
    if (item.action === "communities") return setActive("explore");
    // Not built. A row that quietly does nothing is worse than one that
    // tells you why, so these report instead of no-oping.
    if (item.action === "saved") return onUnbuilt?.("Saved posts aren't built yet");
    if (item.action === "notifications") return onUnbuilt?.("Notifications aren't built yet");
    setActive(item.key);
  };

  return (
    <aside className="rail-edge hidden lg:flex flex-col shrink-0 h-full bg-bg lg:w-rail-sm xl:w-rail transition-[width] duration-200">
      {/* Wordmark */}
      <div className="px-3 xl:px-4 pt-5 pb-2 shrink-0">
        <button
          onClick={() => setActive("home")}
          className="flex items-center gap-2.5 group w-full"
          aria-label="Orbit home"
        >
          <span className="grid place-items-center w-9 h-9 rounded-full shrink-0 bg-gradient-to-br from-c-violet via-c-pink to-c-orange">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white"
                 strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" />
              <path d="M10.4 21.9a10 10 0 0 0 9.941-15.416" /><path d="M13.5 2.1a10 10 0 0 0-9.841 15.416" />
            </svg>
          </span>
          <span className="hidden xl:block text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-c-violet via-c-pink to-c-orange">
            Orbit
          </span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 xl:px-2.5 overflow-y-auto no-scrollbar">
        {GROUPS.map((group, gi) => (
          <div key={group.label}>
            {gi === 0 ? <div className="h-2" /> : <GroupLabel>{group.label}</GroupLabel>}
            {gi > 0 && <div className="xl:hidden h-px bg-line my-2 mx-3" />}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavRow
                  key={item.key}
                  {...item}
                  active={active === item.key}
                  onClick={() => go(item)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Post — the one filled action.
            Was "Create", which opened the make-a-community flow. That is a
            thing you do once, not the thing the rail should be pointing at
            every time you look at it. Creating a community moved to Explore
            and the empty feed, where someone is actually looking for one. */}
        <button
          onClick={onPostClick}
          title="Write a post"
          className="w-full mt-5 flex items-center justify-center xl:justify-start xl:pl-6 gap-3 rounded-full
            px-3 py-3 bg-accent text-accent-ink font-bold text-md shadow-lift
            hover:bg-accent-press active:scale-[0.98] transition-[background-color,transform] duration-150"
        >
          <Icon name="edit_square" size={22} className="xl:hidden" />
          <span className="hidden xl:inline">Post</span>
        </button>

        {joinedCount > 0 && (
          <p className="hidden xl:block px-4 pt-5 text-2xs text-ink-3 leading-relaxed">
            You're in <span className="font-bold text-ink tabular-nums">{joinedCount}</span>{" "}
            {joinedCount === 1 ? "community" : "communities"}.
          </p>
        )}
      </nav>

      {/* Foot: account + legal */}
      <div className="shrink-0 px-2 xl:px-2.5 pt-2 pb-3 border-t border-line relative" ref={menuRef}>
        {menuOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-2 z-40 bg-bg-raised rounded-lg shadow-pop overflow-hidden animate-pop">
            <button
              onClick={() => { onOpenSettings(); setMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-base font-medium text-ink hover:bg-bg-sunken transition-colors"
            >
              <Icon name="settings" size={20} className="text-c-violet" />Settings
            </button>
            <button
              onClick={() => { onToggleTheme(); setMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-base font-medium text-ink hover:bg-bg-sunken transition-colors"
            >
              <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} size={20} className="text-c-amber" />
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <a
              href="mailto:team.orbit@gmail.com?subject=Orbit%20feedback"
              className="w-full flex items-center gap-3 px-4 py-3 text-base font-medium text-ink hover:bg-bg-sunken transition-colors border-t border-line"
            >
              <Icon name="help" size={20} className="text-c-teal" />Feedback
            </a>
          </div>
        )}

        {/* Account row. Doubles as the Profile nav item and the menu trigger:
            the avatar goes to the profile, the chevron opens preferences. */}
        <div
          className={cx(
            "flex items-center gap-2.5 rounded-full p-1.5 transition-colors",
            active === "profile" ? "bg-black/[0.05] dark:bg-white/[0.08]" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          )}
        >
          <button
            onClick={() => setActive("profile")}
            title="Profile"
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
          >
            <Avatar name={user?.name || "Guest"} size={32} ring={active === "profile"} />
            <span className="hidden xl:block min-w-0 leading-tight">
              <span className="block text-base font-bold text-ink truncate">{user?.name || "Guest"}</span>
              <span className={cx("block text-2xs truncate", verified ? "text-c-green font-semibold" : "text-ink-2")}>
                {verified ? "Signed in" : "Browsing as guest"}
              </span>
            </span>
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Preferences"
            aria-expanded={menuOpen}
            title="Preferences"
            className={cx(
              "grid place-items-center w-8 h-8 rounded-full shrink-0 transition-colors",
              "hover:bg-black/[0.06] dark:hover:bg-white/[0.10]",
              menuOpen && "bg-black/[0.06] dark:bg-white/[0.10]"
            )}
          >
            <Icon name={menuOpen ? "expand_more" : "expand_less"} size={20} className="text-ink-2" />
          </button>
        </div>

        {/* Legal — moved here from the Home rail so it sits at the bottom of
            the app chrome instead of at the bottom of one page's sidebar. */}
        <div className="hidden xl:block px-3 pt-3">
          <p className="text-2xs text-ink-3 leading-relaxed">
            <a href="/terms" className="hover:text-ink-2 hover:underline transition-colors">Terms</a>
            <span className="mx-1">·</span>
            <a href="/privacy" className="hover:text-ink-2 hover:underline transition-colors">Privacy</a>
          </p>
          <p className="text-2xs text-ink-3 leading-relaxed mt-0.5">© 2026 Orbit</p>
        </div>
      </div>
    </aside>
  );
}
