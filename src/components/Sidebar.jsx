import { Icon, cx } from "./ui/Primitives.jsx";

// Sidebar, matching the Stitch mock: a fixed 288px rail on
// surface-container-low, an M3 filled pill for the active item, and a
// bottom group split off by a hairline for Appearance / Feedback.
//
// The mock's nav is Home / Explore / Events / Communities / Settings. This
// app's real surfaces are Home / Explore / Events / Locali-Tea / Profile /
// Settings, so "Communities" maps to Locali-Tea's slot being kept separate
// — inventing a Communities route that doesn't exist would look right in a
// screenshot and 404 on click.

// Each item keeps its own filled colour so the rail reads as a set of
// distinct destinations rather than six identical grey glyphs. The colour
// stays on when the row is active too — the active pill already carries the
// selected state, so the icon doesn't need to drop to a flat tint.
const NAV = [
  { key: "home", label: "Home", icon: "home", tint: "text-icon-blue" },
  { key: "explore", label: "Explore", icon: "explore", tint: "text-icon-teal" },
  { key: "events", label: "Events", icon: "calendar_month", tint: "text-icon-amber" },
  { key: "tea", label: "Locali-Tea", icon: "local_cafe", tint: "text-icon-pink" },
  { key: "profile", label: "Profile", icon: "account_circle", tint: "text-icon-green" },
  { key: "settings", label: "Settings", icon: "settings", tint: "text-icon-violet" },
];

function NavRow({ icon, tint, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cx(
        "w-full flex items-center gap-md px-md py-sm rounded-lg transition-all text-left",
        active
          ? "bg-primary-container text-on-primary-container font-semibold"
          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
      )}
    >
      <Icon name={icon} size={22} className={active ? "text-on-primary-container" : tint} />
      <span className="text-label-md font-medium">{label}</span>
    </button>
  );
}

export function Sidebar({ active, setActive, onTeaClick, onSearchClick, onCreateClick, verified, user, theme, onToggleTheme }) {
  const go = (key) => {
    if (key === "tea") { onTeaClick(); return; }
    if (key === "settings") { setActive("settings"); return; }
    setActive(key);
  };

  return (
    <aside className="hidden lg:flex flex-col shrink-0 w-72 h-full bg-surface-container-low border-r border-outline-variant/30">
      {/* Brand */}
      <div className="p-lg">
        <button onClick={() => setActive("home")} className="flex items-center gap-sm hover:opacity-80 transition-opacity">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-primary text-on-primary shrink-0">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" />
              <path d="M10.4 21.9a10 10 0 0 0 9.941-15.416" /><path d="M13.5 2.1a10 10 0 0 0-9.841 15.416" />
            </svg>
          </span>
          <span className="text-headline-md font-semibold text-primary tracking-tight">Orbit</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-md space-y-xs overflow-y-auto">
        {NAV.map((item) => (
          <NavRow
            key={item.key}
            icon={item.icon}
            tint={item.tint}
            label={item.label}
            active={active === item.key}
            onClick={() => go(item.key)}
          />
        ))}
      </nav>

      {/* Bottom group */}
      <div className="px-md py-lg mt-auto space-y-xs border-t border-outline-variant/20">
        <button
          onClick={onToggleTheme}
          className="w-full flex items-center gap-md px-md py-sm rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all text-left"
        >
          <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} size={22} className="text-icon-amber" />
          <span className="text-label-md font-medium">Appearance</span>
        </button>
        <a
          href="mailto:atharvat2006@gmail.com?subject=Orbit%20feedback"
          className="w-full flex items-center gap-md px-md py-sm rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
        >
          <Icon name="help" size={22} className="text-icon-teal" />
          <span className="text-label-md font-medium">Feedback &amp; Help</span>
        </a>
      </div>
    </aside>
  );
}
