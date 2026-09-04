import { useState, useRef, useEffect } from "react";
import { CATEGORIES } from "../data/constants.js";
import { Icon, Avatar, cx } from "./ui/Primitives.jsx";

// Navigation rail.
//
// Four labelled groups rather than one flat list, because the destinations are
// not peers: Home and Explore are where you live, Events and Locali-Tea are
// side trips, your communities are the things you actually revisit, and
// Notifications and Preferences are furniture you touch rarely.
//
// Communities sit in the middle of that order deliberately. They are the most
// revisited thing in the app and the least worth scrolling for.
//
// The rail collapses to icons below xl and gives way to the bottom bar below
// lg. Labels become tooltips in the collapsed state rather than disappearing.

const GROUPS = [
  {
    items: [
      { key: "home", label: "Home Feed", icon: "home" },
      { key: "explore", label: "Explore", icon: "explore" },
      { key: "search", label: "Search", icon: "search", action: "search" },
      { key: "saved", label: "Saved Posts", icon: "bookmark", action: "saved" },
    ],
  },
  {
    label: "Campus Pulse",
    items: [
      { key: "events", label: "Events & Mixers", icon: "calendar_today" },
      { key: "tea", label: "Locali-Tea", icon: "local_cafe", action: "tea" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { key: "notifications", label: "Notifications", icon: "notifications", action: "notifications" },
      { key: "settings", label: "Preferences", icon: "tune" },
    ],
  },
];

function GroupLabel({ children, onAction, actionLabel }) {
  return (
    <div className="hidden xl:flex items-center justify-between pt-4 pb-1.5 px-3">
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-3">{children}</span>
      {onAction && (
        <button onClick={onAction} aria-label={actionLabel} className="text-ink-3 hover:text-ink transition-colors">
          <Icon name="add" size={16} />
        </button>
      )}
    </div>
  );
}

function NavRow({ icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={label}
      className={cx(
        "w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors",
        active
          ? "bg-c-blue/10 text-c-blue font-semibold border border-c-blue/20"
          : "text-ink-2 hover:text-ink hover:bg-bg-sunken border border-transparent font-medium"
      )}
    >
      <span className="flex items-center gap-3 min-w-0">
        <Icon name={icon} size={20} className={cx("shrink-0", active ? "text-c-blue" : "text-ink-3")} />
        <span className="hidden xl:block text-[13px] truncate">{label}</span>
      </span>
      {badge > 0 && (
        <span className="hidden xl:block text-[11px] font-semibold text-ink-3 bg-bg-sunken px-1.5 py-0.5 rounded-md shrink-0">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

export function Sidebar({
  active, setActive, onTeaClick, onSearchClick, onCreateClick, onPostClick,
  verified, user, onUnbuilt, joinedCommunities = [], onOpenCommunity, onSupport, onSignOut,
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
    // A row that quietly does nothing is worse than one that says why.
    if (item.action === "saved") return onUnbuilt?.("Saved posts aren't built yet");
    if (item.action === "notifications") return onUnbuilt?.("Notifications aren't built yet");
    setActive(item.key);
  };

  return (
    <aside className="rail-edge hidden lg:flex flex-col shrink-0 h-full bg-bg lg:w-rail-sm xl:w-rail transition-[width] duration-200">
      {/* Brand */}
      <div className="px-3 xl:px-4 pt-4 pb-2 shrink-0">
        <button onClick={() => setActive("home")} className="flex items-center gap-2.5 group w-full" aria-label="Orbit home">
          <span className="grid place-items-center w-8 h-8 rounded-xl shrink-0
            bg-gradient-to-tr from-c-blue to-c-violet shadow-sm group-hover:scale-105 transition-transform duration-200">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white"
                 strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" />
              <path d="M10.4 21.9a10 10 0 0 0 9.941-15.416" /><path d="M13.5 2.1a10 10 0 0 0-9.841 15.416" />
            </svg>
          </span>
          <span className="hidden xl:block font-bold text-[17px] tracking-[-0.03em] text-ink">Orbit</span>
        </button>
      </div>

      {/* Compose: the one filled action in the rail. */}
      <div className="px-3 xl:px-4 pb-1 shrink-0">
        <button
          onClick={onPostClick}
          title="Compose a post"
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4
            bg-c-blue text-white text-[13px] font-semibold shadow-lift
            hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Icon name="edit_square" size={17} />
          <span className="hidden xl:inline">Compose Post</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 xl:px-2.5 pt-2 overflow-y-auto no-scrollbar">
        {GROUPS.map((group, gi) => (
          <div key={group.label || gi}>
            {group.label ? <GroupLabel>{group.label}</GroupLabel> : <div className="h-1" />}
            {gi > 0 && <div className="xl:hidden h-px bg-line my-2 mx-3" />}
            <div className="flex flex-col gap-1">
              {group.items.map((item) => (
                <NavRow key={item.key} {...item} active={active === item.key} onClick={() => go(item)} />
              ))}
            </div>

            {group.label === "Campus Pulse" && (
              <>
                <GroupLabel onAction={onCreateClick} actionLabel="Create a community">
                  My Communities
                </GroupLabel>
                <div className="flex flex-col gap-1">
                  {joinedCommunities.length === 0 && (
                    <button
                      onClick={onCreateClick}
                      className="hidden xl:block w-full text-left px-3 py-2 rounded-xl text-[12.5px]
                        text-ink-3 hover:text-ink hover:bg-bg-sunken transition-colors"
                    >
                      None yet. Start one.
                    </button>
                  )}
                  {joinedCommunities.slice(0, 6).map((c) => {
                    const cat = CATEGORIES.find((x) => x.name === c.category);
                    const head = (c.name || "").split(" — ")[0];
                    return (
                      <button
                        key={c.id}
                        onClick={() => onOpenCommunity?.(c)}
                        title={head}
                        className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2
                          text-ink-2 hover:text-ink hover:bg-bg-sunken transition-colors"
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <span className="grid place-items-center w-6 h-6 rounded-lg overflow-hidden bg-bg-sunken shrink-0">
                            {c.avatarUrl
                              ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                              : <Icon name={cat?.msr || "groups"} size={14} />}
                          </span>
                          <span className="hidden xl:block text-[13px] font-medium truncate">{head}</span>
                        </span>
                        {/* Active in the last hour. A dot that means something. */}
                        {c.lastActive != null && c.lastActive <= 60 && (
                          <span className="hidden xl:block w-1.5 h-1.5 rounded-full bg-c-blue shrink-0" />
                        )}
                      </button>
                    );
                  })}
                  {joinedCommunities.length > 6 && (
                    <button
                      onClick={() => setActive("explore")}
                      className="hidden xl:block w-full text-left px-3 py-1.5 text-[11px] font-semibold text-c-blue hover:underline"
                    >
                      +{joinedCommunities.length - 6} more
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </nav>

      {/* Account */}
      <div className="shrink-0 px-2 xl:px-2.5 pt-2 pb-3 border-t border-line relative" ref={menuRef}>
        {menuOpen && (
          <div
            role="menu"
            className="absolute bottom-full left-2 right-2 mb-1.5 bg-bg-raised border border-line
              rounded-2xl shadow-pop overflow-hidden animate-pop z-50"
          >
            {(verified
              ? [
                  { icon: "account_circle", label: "Profile", go: () => setActive("profile") },
                  { icon: "tune", label: "Preferences", go: () => setActive("settings") },
                  { icon: "help", label: "Support", go: () => onSupport?.() },
                  { icon: "logout", label: "Sign out", go: () => onSignOut?.(), danger: true },
                ]
              : [
                  { icon: "login", label: "Sign in", go: () => onSignOut?.() },
                  { icon: "help", label: "Support", go: () => onSupport?.() },
                ]
            ).map((it) => (
              <button
                key={it.label}
                role="menuitem"
                onClick={() => { setMenuOpen(false); it.go(); }}
                className={cx(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bg-sunken",
                  it.danger ? "text-c-red" : "text-ink"
                )}
              >
                <Icon name={it.icon} size={20} className={it.danger ? "text-c-red" : "text-ink-2"} />
                <span className="text-base font-medium">{it.label}</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title={user?.name || "Account"}
          className={cx(
            "w-full flex items-center gap-2.5 rounded-xl p-1.5 transition-colors",
            menuOpen ? "bg-bg-sunken" : "hover:bg-bg-sunken"
          )}
        >
          <Avatar name={user?.name || "Guest"} size={32} ring={verified} />
          <span className="hidden xl:block min-w-0 leading-tight flex-1 text-left">
            <span className="block text-[13px] font-bold text-ink truncate">{user?.name || "Guest"}</span>
            <span className={cx("block text-[11px] truncate", verified ? "text-c-green font-medium" : "text-ink-3")}>
              {verified ? "Signed in" : "Browsing as guest"}
            </span>
          </span>
          <Icon name="unfold_more" size={18} className="hidden xl:block text-ink-3 shrink-0 mr-1" />
        </button>
      </div>
    </aside>
  );
}
