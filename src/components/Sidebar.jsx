import { useState, useRef, useEffect } from "react";
import { CATEGORIES } from "../data/constants.js";
import { Icon, Avatar, cx } from "./ui/Primitives.jsx";

// Navigation rail.
//
// Three labelled groups plus an unlabelled one at the top, because the
// destinations are not peers: Home/Explore/Saved are where you live, Campus is
// the shared stuff, Communities are the rooms you belong to, and Personal is
// account furniture. Communities sit above Personal deliberately -- they are
// the most revisited thing here and the least worth scrolling for.
//
// Below xl it collapses to icons; below lg the bottom bar takes over. Labels
// become tooltips rather than vanishing.

const GROUPS = [
  {
    items: [
      { key: "home", label: "Home", icon: "home" },
      { key: "explore", label: "Explore", icon: "explore" },
      { key: "saved", label: "Saved", icon: "bookmark", action: "saved" },
    ],
  },
  {
    label: "Campus",
    items: [
      { key: "events", label: "Events", icon: "calendar_today", badgeKey: "events" },
      { key: "trending", label: "Trending", icon: "local_fire_department", action: "trending" },
      { key: "tea", label: "Local Tea", icon: "local_cafe", action: "tea" },
    ],
  },
];

const PERSONAL = [
  { key: "notifications", label: "Notifications", icon: "notifications", action: "notifications", badgeKey: "notifications" },
  { key: "settings", label: "Preferences", icon: "settings" },
];

function GroupLabel({ children }) {
  return (
    <p className="hidden xl:block px-3 pt-5 pb-2 text-[10.5px] font-bold uppercase tracking-[0.09em] text-ink-3">
      {children}
    </p>
  );
}

function Row({ icon, label, active, onClick, badge, avatar, title }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={title || label}
      className={cx(
        "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
        active ? "bg-accent-wash" : "hover:bg-bg-sunken"
      )}
    >
      {avatar || (
        <Icon
          name={icon}
          size={21}
          className={cx("shrink-0", active ? "text-accent" : "text-ink-3")}
        />
      )}
      <span
        className={cx(
          "hidden xl:block text-[14px] truncate flex-1",
          active ? "font-semibold text-accent" : "font-medium text-ink-2"
        )}
      >
        {label}
      </span>
      {badge > 0 && (
        <span className="hidden xl:grid place-items-center min-w-[20px] h-5 px-1.5 rounded-full
          bg-c-red text-white text-[10.5px] font-bold tabular-nums shrink-0">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

export function Sidebar({
  active, setActive, onTeaClick, onSearchClick, onCreateClick,
  verified, user, onUnbuilt, joinedCommunities = [], onOpenCommunity, onSupport, onSignOut,
  badges = {},
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
    // A row that quietly does nothing is worse than one that says why.
    if (item.action === "saved") return onUnbuilt?.("Saved posts aren't built yet");
    if (item.action === "trending") return setActive("explore");
    if (item.action === "notifications") return onUnbuilt?.("Notifications aren't built yet");
    setActive(item.key);
  };

  return (
    <aside className="hidden lg:flex flex-col shrink-0 h-full bg-bg-raised border-r border-line
      lg:w-rail-sm xl:w-[276px] transition-[width] duration-200">

      {/* Brand */}
      <div className="px-4 pt-5 pb-4 shrink-0">
        <button onClick={() => setActive("home")} className="flex items-center gap-2.5 w-full text-left" aria-label="Orbit home">
          <img
            src="/orbitcollege.png"
            alt=""
            width={36}
            height={36}
            className="w-9 h-9 rounded-xl object-contain shrink-0"
          />
          <span className="hidden xl:block min-w-0">
            <span className="block text-[19px] font-bold tracking-[-0.02em] text-ink leading-none">Orbit</span>
            <span className="block text-[10.5px] text-ink-3 mt-1 truncate">
              Your campus. Your people. Your space.
            </span>
          </span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 overflow-y-auto no-scrollbar pb-4">
        {GROUPS.map((group, gi) => (
          <div key={group.label || gi}>
            {group.label && <GroupLabel>{group.label}</GroupLabel>}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <Row
                  key={item.key}
                  {...item}
                  badge={badges[item.badgeKey]}
                  active={active === item.key}
                  onClick={() => go(item)}
                />
              ))}
            </div>
          </div>
        ))}

        <GroupLabel>Communities</GroupLabel>
        <div className="flex flex-col gap-0.5">
          {joinedCommunities.slice(0, 6).map((c) => {
            const cat = CATEGORIES.find((x) => x.name === c.category);
            const head = (c.name || "").split(" — ")[0];
            return (
              <Row
                key={c.id}
                label={head}
                title={head}
                onClick={() => onOpenCommunity?.(c)}
                avatar={
                  <span className="grid place-items-center w-[26px] h-[26px] rounded-lg overflow-hidden bg-bg-sunken shrink-0">
                    {c.avatarUrl
                      ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : <Icon name={cat?.msr || "groups"} size={14} className={cat?.tint || "text-ink-3"} />}
                  </span>
                }
              />
            );
          })}

          <Row icon="add" label="Create community" onClick={onCreateClick} />
        </div>

        <GroupLabel>Personal</GroupLabel>
        <div className="flex flex-col gap-0.5">
          {PERSONAL.map((item) => (
            <Row
              key={item.key}
              {...item}
              badge={badges[item.badgeKey]}
              active={active === item.key}
              onClick={() => go(item)}
            />
          ))}
        </div>
      </nav>

      {/* Campus mark. Decorative, so it is hidden from assistive tech and drops
          out entirely on the collapsed rail where there is no room for it. */}
      <div className="hidden xl:block relative shrink-0 h-[104px] overflow-hidden" aria-hidden="true">
        <img
          src="/muj.png"
          alt=""
          className="absolute bottom-0 left-0 w-full object-cover object-bottom opacity-[0.18] dark:opacity-[0.12]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-raised via-bg-raised/40 to-transparent" />
        <p className="absolute right-4 top-5 w-[104px] text-right text-[11px] font-semibold
          leading-[1.35] text-ink-2">
          Better Together
          <br />
          on Campus
          <Icon name="favorite" size={12} className="inline-block ml-1 text-c-red fill-current align-middle" />
        </p>
      </div>

      {/* Account */}
      <div className="shrink-0 px-2.5 pt-2.5 pb-3 border-t border-line relative" ref={menuRef}>
        {menuOpen && (
          <div
            role="menu"
            className="absolute bottom-full left-2.5 right-2.5 mb-1.5 bg-bg-raised border border-line
              rounded-2xl shadow-pop overflow-hidden animate-pop z-50"
          >
            {(verified
              ? [
                  { icon: "account_circle", label: "Profile", go: () => setActive("profile") },
                  { icon: "settings", label: "Preferences", go: () => setActive("settings") },
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
          <span className="relative shrink-0">
            <Avatar name={user?.name || "Guest"} size={34} />
            {verified && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-c-green ring-2 ring-bg-raised" />
            )}
          </span>
          <span className="hidden xl:block min-w-0 leading-tight flex-1 text-left">
            <span className="block text-[13.5px] font-bold text-ink truncate">{user?.name || "Guest"}</span>
            <span className="block text-[11px] text-ink-3 truncate">
              {/* The mock shows course and year. Orbit stores neither, so this
                  falls back to what it does know rather than inventing them. */}
              {verified ? (user?.bio || "Member") : "Browsing as guest"}
            </span>
          </span>
          <Icon name="unfold_more" size={18} className="hidden xl:block text-ink-3 shrink-0" />
        </button>
      </div>
    </aside>
  );
}
