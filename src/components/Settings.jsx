import { useState, useEffect, useRef } from "react";
import { Icon, Avatar, cx } from "./ui/Primitives.jsx";

// Settings, rebuilt to the Stitch settings.html mock: a [1fr_2fr] grid with
// a sticky section nav on the left (border-l-4 active marker) and stacked
// sections on the right, each under a hairline-underlined heading.
//
// Several rows in the mock describe features this app doesn't have. Rather
// than render a working-looking toggle that silently does nothing, those
// rows keep the mock's exact layout but state plainly that they aren't
// built — see the notes on each section below.

const SECTIONS = [
  { key: "account", label: "Account", icon: "person", tint: "text-icon-blue" },
  { key: "appearance", label: "Appearance", icon: "palette", tint: "text-icon-violet" },
  { key: "notifications", label: "Notifications", icon: "notifications", tint: "text-icon-amber" },
  { key: "privacy", label: "Privacy & Safety", icon: "shield", tint: "text-icon-green" },
  { key: "about", label: "About Orbit", icon: "info", tint: "text-icon-teal" },
];

function SectionCard({ children, className }) {
  return (
    <div className={cx("bg-surface-container-lowest rounded-lg p-md shadow-sm flex flex-col gap-md", className)}>
      {children}
    </div>
  );
}

function Row({ title, subtitle, children }) {
  return (
    <div className="flex items-center justify-between gap-md">
      <div className="flex flex-col min-w-0">
        <span className="text-label-md font-medium text-on-surface">{title}</span>
        {subtitle && <span className="text-body-sm text-on-surface-variant">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

const Divider = () => <hr className="border-outline-variant/20" />;

// The mock's pill switch, wired to a real checkbox for keyboard and
// screen-reader support.
function Toggle({ checked, onChange, label }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        className="sr-only peer"
      />
      <div
        className="w-11 h-6 bg-outline-variant rounded-full peer
          peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40
          peer-checked:bg-primary
          after:content-[''] after:absolute after:top-[2px] after:left-[2px]
          after:bg-white after:border after:border-gray-300 after:rounded-full
          after:h-5 after:w-5 after:transition-all
          peer-checked:after:translate-x-full peer-checked:after:border-white"
      />
    </label>
  );
}

// A row for something genuinely not built. Same shape as the mock's rows,
// but it says so instead of offering a control that does nothing.
function UnbuiltRow({ title, subtitle }) {
  return (
    <Row title={title} subtitle={subtitle}>
      <span className="text-label-sm text-on-surface-variant bg-surface-container px-sm py-1 rounded-full shrink-0">
        Not built yet
      </span>
    </Row>
  );
}

function ThemeOption({ value, current, onChange, label, icon, children }) {
  const active = current === value;
  return (
    <label className="flex flex-col items-center gap-sm cursor-pointer group">
      <input
        type="radio"
        name="theme"
        value={value}
        checked={active}
        onChange={() => onChange(value)}
        className="peer sr-only"
      />
      <div
        className={cx(
          "w-full h-24 rounded-lg border-2 grid place-items-center transition-all relative overflow-hidden",
          active ? "border-primary" : "border-outline-variant group-hover:border-primary/50",
          children ? "bg-surface" : value === "dark" ? "bg-inverse-surface" : "bg-surface-container-lowest",
          active && value === "light" && "bg-surface-container-low"
        )}
      >
        {children}
        <Icon
          name={icon}
          size={32}
          className={cx("relative z-10", value === "dark" ? "text-on-primary" : value === "system" ? "text-outline" : "text-on-surface")}
        />
      </div>
      <span className="text-body-sm text-on-surface">{label}</span>
    </label>
  );
}

export function SettingsScreen({
  user, theme, mode, onToggleTheme, onSetTheme, onLogout, onBack, onComingSoon,
  notifPrefs = {}, onNotifChange, onEditProfile, appVersion = "0.1.0",
}) {
  const [active, setActive] = useState("account");
  const containerRef = useRef(null);

  // Active nav marker follows whichever section is nearest the top of the
  // scroll container.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.replace("set-", ""));
      },
      { root, rootMargin: "-10% 0px -70% 0px", threshold: 0 }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(`set-${s.key}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const jumpTo = (key) => {
    setActive(key);
    document.getElementById(`set-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const themeMode = mode || theme;

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto bg-surface">
      <div className="px-md lg:px-margin-desktop py-xl">
        <div className="max-w-max-width w-full mx-auto">

          <div className="flex items-center gap-md mb-xl">
            <Icon name="settings" size={32} className="text-primary" />
            <h1 className="text-headline-xl font-bold text-on-surface">Settings</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-xl">

            {/* Section nav */}
            <nav className="hidden lg:flex flex-col gap-sm sticky top-0 self-start">
              {SECTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => jumpTo(s.key)}
                  aria-current={active === s.key ? "true" : undefined}
                  className={cx(
                    "flex items-center gap-md px-md py-sm rounded-lg text-label-md font-medium transition-colors text-left w-full border-l-4",
                    active === s.key
                      ? "bg-surface-container text-on-surface border-primary"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface border-transparent"
                  )}
                >
                  <Icon name={s.icon} size={22} className={active === s.key ? s.tint : s.tint} />
                  {s.label}
                </button>
              ))}
            </nav>

            <div className="flex flex-col gap-xl">

              {/* Account */}
              <section id="set-account" className="flex flex-col gap-lg scroll-mt-4">
                <h2 className="text-headline-md font-semibold text-on-surface border-b border-outline-variant/30 pb-sm">
                  Account
                </h2>

                <div className="bg-surface-container-lowest rounded-lg p-md shadow-sm flex items-center justify-between gap-md">
                  <div className="flex items-center gap-md min-w-0">
                    <Avatar name={user.name} size={48} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-headline-sm font-semibold text-on-surface truncate">{user.name}</span>
                      <span className="text-body-sm text-on-surface-variant truncate">
                        {user.email || "Signed in as a guest"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={onEditProfile}
                    className="px-md py-sm rounded-lg border border-outline-variant text-on-surface text-label-md font-medium hover:bg-surface-container-low transition-colors shrink-0"
                  >
                    Edit Profile
                  </button>
                </div>

                <SectionCard>
                  {/* The mock has a Password row. This app has no password —
                      Google is the only sign-in method — so the row states
                      the actual sign-in method instead. */}
                  <Row title="Sign-in method" subtitle="Orbit uses Google sign-in — there's no separate password.">
                    <span className="text-label-sm text-on-surface-variant bg-surface-container px-sm py-1 rounded-full shrink-0">
                      Google
                    </span>
                  </Row>
                  <Divider />
                  <Row title="Sign out" subtitle="Ends this session on this device.">
                    <button
                      onClick={onLogout}
                      className="px-md py-sm rounded-lg border border-outline-variant text-error text-label-md font-medium hover:bg-error-container/40 transition-colors shrink-0"
                    >
                      Sign out
                    </button>
                  </Row>
                </SectionCard>
              </section>

              {/* Appearance */}
              <section id="set-appearance" className="flex flex-col gap-lg scroll-mt-4">
                <h2 className="text-headline-md font-semibold text-on-surface border-b border-outline-variant/30 pb-sm">
                  Appearance
                </h2>
                <div className="bg-surface-container-lowest rounded-lg p-md shadow-sm flex flex-col gap-lg">
                  <div className="flex flex-col gap-sm">
                    <span className="text-label-md font-medium text-on-surface">Theme</span>
                    <div className="grid grid-cols-3 gap-md">
                      <ThemeOption value="light" current={themeMode} onChange={onSetTheme} label="Light" icon="light_mode" />
                      <ThemeOption value="dark" current={themeMode} onChange={onSetTheme} label="Dark" icon="dark_mode" />
                      <ThemeOption value="system" current={themeMode} onChange={onSetTheme} label="System" icon="brightness_auto">
                        <span className="absolute left-0 top-0 bottom-0 w-1/2 bg-surface-container-lowest" />
                        <span className="absolute right-0 top-0 bottom-0 w-1/2 bg-inverse-surface" />
                      </ThemeOption>
                    </div>
                    {themeMode === "system" && (
                      <p className="text-body-sm text-on-surface-variant">
                        Following your device — currently {theme}.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Notifications */}
              <section id="set-notifications" className="flex flex-col gap-lg scroll-mt-4">
                <h2 className="text-headline-md font-semibold text-on-surface border-b border-outline-variant/30 pb-sm">
                  Notifications
                </h2>
                <SectionCard>
                  <Row title="Event reminders" subtitle="Before events you've registered for.">
                    <Toggle label="Event reminders" checked={notifPrefs.events} onChange={(v) => onNotifChange("events", v)} />
                  </Row>
                  <Divider />
                  <Row title="Community posts" subtitle="New posts in communities you've joined.">
                    <Toggle label="Community posts" checked={notifPrefs.posts} onChange={(v) => onNotifChange("posts", v)} />
                  </Row>
                  <Divider />
                  <Row title="Replies" subtitle="When someone replies to you.">
                    <Toggle label="Replies" checked={notifPrefs.replies} onChange={(v) => onNotifChange("replies", v)} />
                  </Row>
                  <Divider />
                  {/* Stated rather than hidden: these switches move but there
                      is no delivery system behind them yet, and nothing
                      persists them past this session. */}
                  <p className="text-body-sm text-on-surface-variant">
                    Notification delivery isn't built yet — these preferences apply to this session only and aren't saved to your account.
                  </p>
                </SectionCard>
              </section>

              {/* Privacy & Safety */}
              <section id="set-privacy" className="flex flex-col gap-lg scroll-mt-4">
                <h2 className="text-headline-md font-semibold text-on-surface border-b border-outline-variant/30 pb-sm">
                  Privacy &amp; Safety
                </h2>
                <SectionCard>
                  {/* All three are real features in the mock and absent here:
                      no visibility column on profiles, no blocks table, no
                      export job. Shown as unbuilt rather than faked. */}
                  <UnbuiltRow title="Account visibility" subtitle="Allow other students to find your profile." />
                  <Divider />
                  <UnbuiltRow title="Blocked users" subtitle="Manage accounts you have blocked." />
                  <Divider />
                  <UnbuiltRow title="Download data" subtitle="Request an archive of your account information." />
                  <Divider />
                  <Row title="Report a problem" subtitle="Tell us about content or behaviour on Orbit.">
                    <a
                      href="mailto:atharvat2006@gmail.com?subject=Orbit%20report"
                      className="px-md py-sm rounded-lg border border-outline-variant text-on-surface text-label-md font-medium hover:bg-surface-container-low transition-colors shrink-0"
                    >
                      Email us
                    </a>
                  </Row>
                </SectionCard>
              </section>

              {/* About */}
              <section id="set-about" className="flex flex-col gap-lg mb-xl scroll-mt-4">
                <h2 className="text-headline-md font-semibold text-on-surface border-b border-outline-variant/30 pb-sm">
                  About Orbit
                </h2>
                <SectionCard>
                  <Row title="Version">
                    <span className="text-body-sm text-on-surface-variant font-mono">v{appVersion}</span>
                  </Row>
                  <Divider />
                  <a
                    href="mailto:atharvat2006@gmail.com?subject=Orbit%20support"
                    className="flex items-center justify-between w-full text-left group"
                  >
                    <span className="text-label-md font-medium text-on-surface">Help &amp; Support</span>
                    <Icon name="open_in_new" size={20} className="text-outline-variant group-hover:text-primary transition-colors" />
                  </a>
                  <Divider />
                  <a href="/terms" className="flex items-center justify-between w-full text-left group">
                    <span className="text-label-md font-medium text-on-surface">Terms of Service</span>
                    <Icon name="open_in_new" size={20} className="text-outline-variant group-hover:text-primary transition-colors" />
                  </a>
                  <Divider />
                  <a href="/privacy" className="flex items-center justify-between w-full text-left group">
                    <span className="text-label-md font-medium text-on-surface">Privacy Policy</span>
                    <Icon name="open_in_new" size={20} className="text-outline-variant group-hover:text-primary transition-colors" />
                  </a>
                </SectionCard>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
