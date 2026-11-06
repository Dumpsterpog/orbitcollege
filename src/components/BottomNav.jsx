import { Icon, Avatar, cx } from "./ui/Primitives.jsx";

const TABS = [
  { key: "home", icon: "home", label: "Home", tint: "text-c-blue" },
  { key: "explore", icon: "explore", label: "Explore", tint: "text-c-violet" },
  { key: "events", icon: "confirmation_number", label: "Events", tint: "text-c-orange" },
  { key: "profile", icon: "account_circle", label: "Profile", tint: "text-c-green" },
];

export function BottomNav({ active, setActive, onCreateClick, user }) {
  return (
    <nav
      className="lg:hidden shrink-0 flex items-stretch h-14 bg-bg/90 backdrop-blur-md border-t border-line"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((t) => {
        const on = active === t.key;
        return (
          <button
            key={t.key}
            aria-label={t.label}
            aria-current={on ? "page" : undefined}
            onClick={() => (t.action ? onCreateClick() : setActive(t.key))}
            className="flex-1 grid place-items-center active:scale-90 transition-transform duration-150"
          >
            {t.key === "profile" ? (
              <Avatar name={user?.name || "Guest"} src={user?.avatarUrl} size={26} ring={on} />
            ) : (
              <Icon name={t.icon} size={27} className={cx(on || t.action ? t.tint : "text-ink")} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
