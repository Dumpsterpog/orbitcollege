import { useState } from "react";
import { CATEGORIES } from "../data/constants.js";
import { Icon, Avatar, Button, Switch, cx } from "./ui/Primitives.jsx";
import { Screen } from "./ui/Layout.jsx";

// Settings.
//
// The rail carries a description under each label and groups the eight
// sections into three bands. A bare list of five words was too small to be
// worth the column it sat in — with a line of explanation each, the rail
// answers "which one do I want" without a click, which is the only job a
// settings nav has.
//
// Sections switch rather than scroll: they're unrelated, and paging is
// honest about that where one long scroll pretends they're a document.

const GROUPS = [
  {
    label: "You",
    items: [
      { key: "account", label: "Account", icon: "person", tint: "text-c-blue", desc: "Identity and sign-in" },
      { key: "profile", label: "Profile", icon: "badge", tint: "text-c-violet", desc: "Name, bio and interests" },
      { key: "communities", label: "Communities", icon: "groups", tint: "text-c-green", desc: "What you've joined" },
    ],
  },
  {
    label: "App",
    items: [
      { key: "appearance", label: "Appearance", icon: "palette", tint: "text-c-orange", desc: "Theme and colour" },
      { key: "notifications", label: "Notifications", icon: "notifications", tint: "text-c-amber", desc: "What you're told about" },
      { key: "privacy", label: "Privacy & safety", icon: "shield", tint: "text-c-teal", desc: "Visibility and reporting" },
    ],
  },
  {
    label: "Support",
    items: [
      { key: "help", label: "Help", icon: "help", tint: "text-c-pink", desc: "Get in touch with us" },
      { key: "about", label: "About Orbit", icon: "info", tint: "text-c-blue", desc: "Version and legal" },
    ],
  },
];

const BAR = {
  "text-c-blue": "bg-c-blue", "text-c-violet": "bg-c-violet", "text-c-green": "bg-c-green",
  "text-c-orange": "bg-c-orange", "text-c-amber": "bg-c-amber", "text-c-teal": "bg-c-teal",
  "text-c-pink": "bg-c-pink", "text-c-red": "bg-c-red",
};

function Card({ title, subtitle, children, className }) {
  return (
    <section className={cx("card p-5", className)}>
      {title && (
        <div className="mb-4">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          {subtitle && <p className="text-base text-ink-2 mt-1 leading-relaxed">{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

function Row({ icon, tint, title, body, children, onClick, last }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cx(
        "w-full flex items-center gap-3.5 py-3.5 text-left",
        !last && "border-b border-line",
        onClick && "hover:opacity-70 transition-opacity"
      )}
    >
      {icon && (
        <span className="grid place-items-center w-9 h-9 rounded-full bg-bg-sunken shrink-0">
          <Icon name={icon} size={19} className={tint} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-ink">{title}</span>
        {body && <span className="block text-xs text-ink-2 mt-0.5 leading-normal">{body}</span>}
      </span>
      {children}
    </Tag>
  );
}

function Unbuilt() {
  return (
    <span className="inline-flex items-center h-6 px-2 rounded-full bg-bg-sunken text-2xs font-bold text-ink-3 uppercase tracking-wide shrink-0">
      Not built
    </span>
  );
}

function ThemeSwatch({ value, current, onChange, label, icon, split }) {
  const active = current === value;
  return (
    <button onClick={() => onChange(value)} aria-pressed={active} className="flex flex-col items-center gap-2.5 group">
      <span
        className={cx(
          "relative grid place-items-center w-full h-24 rounded-lg overflow-hidden transition-all",
          active ? "ring-2 ring-accent ring-offset-2 ring-offset-bg" : "ring-1 ring-line group-hover:ring-line-strong"
        )}
      >
        {split ? (
          <>
            <span className="absolute inset-y-0 left-0 w-1/2 bg-white" />
            <span className="absolute inset-y-0 right-0 w-1/2 bg-black" />
          </>
        ) : (
          <span className={cx("absolute inset-0", value === "dark" ? "bg-black" : "bg-white")} />
        )}
        <Icon
          name={icon}
          size={28}
          className={cx("relative z-10", split ? "text-c-violet" : value === "dark" ? "text-c-amber" : "text-c-orange")}
        />
      </span>
      <span className={cx("text-base", active ? "font-bold text-ink" : "text-ink-2")}>{label}</span>
    </button>
  );
}

export function SettingsScreen({
  user, theme, mode, onToggleTheme, onSetTheme, onLogout, onBack, onComingSoon,
  notifPrefs = {}, onNotifChange, onEditProfile, appVersion = "0.1.0",
  joinedCommunities = [], onOpenCommunity, onGoToExplore,
}) {
  const [section, setSection] = useState("account");
  const themeMode = mode || theme;
  const interests = user.interests || [];

  return (
    <Screen>
      <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16 py-8">
        <h1 className="text-3xl font-bold text-ink mb-7">Settings</h1>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
          {/* Rail */}
          <nav className="w-full lg:w-[300px] shrink-0 lg:sticky lg:top-8">
            <div className="card p-2 space-y-1">
              {GROUPS.map((g, gi) => (
                <div key={g.label}>
                  <p className={cx(
                    "px-3 pb-1.5 text-2xs font-bold text-ink-3 uppercase tracking-[0.08em]",
                    gi === 0 ? "pt-2" : "pt-4"
                  )}>
                    {g.label}
                  </p>
                  {g.items.map((s) => {
                    const on = section === s.key;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setSection(s.key)}
                        aria-current={on ? "page" : undefined}
                        className={cx(
                          "relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                          on ? "bg-black/[0.05] dark:bg-white/[0.08]" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                        )}
                      >
                        <span
                          className={cx(
                            "absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-200",
                            on ? cx("h-6 opacity-100", BAR[s.tint]) : "h-0 opacity-0"
                          )}
                        />
                        <span className="grid place-items-center w-9 h-9 rounded-full bg-bg-sunken shrink-0">
                          <Icon name={s.icon} size={19} className={s.tint} />
                        </span>
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className={cx("block text-base truncate", on ? "font-bold text-ink" : "font-semibold text-ink")}>
                            {s.label}
                          </span>
                          <span className="block text-xs text-ink-2 truncate mt-0.5">{s.desc}</span>
                        </span>
                        {on && <Icon name="chevron_right" size={18} className="text-ink-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}

              <div className="pt-3 pb-1 px-1">
                <Button variant="outline" size="md" icon="logout" iconTint="text-c-red" onClick={onLogout} className="w-full">
                  Sign out
                </Button>
              </div>
            </div>
          </nav>

          {/* Panel */}
          <div className="flex-1 min-w-0 w-full max-w-3xl space-y-4">

            {section === "account" && (
              <>
                <Card>
                  <div className="flex items-center gap-4">
                    <Avatar name={user.name} size={64} ring={user.verified} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="text-lg font-bold text-ink truncate">{user.name}</p>
                      <p className="text-base text-ink-2 truncate">{user.email || "Browsing as a guest"}</p>
                    </div>
                    <Button tone="violet" size="md" icon="edit" onClick={onEditProfile} className="shrink-0">
                      Edit
                    </Button>
                  </div>
                </Card>

                <Card title="Sign-in">
                  <Row icon="lock" tint="text-c-green" title="Method" body="Orbit uses Google sign-in, so there is no separate password." last>
                    <span className="inline-flex items-center gap-1.5 text-base font-semibold text-ink-2 shrink-0">
                      <Icon name="verified_user" size={17} className="text-c-blue" />Google
                    </span>
                  </Row>
                </Card>

                <Card title="Session" subtitle="Ends this session on this device. Your account and posts are untouched.">
                  <Button variant="outline" size="md" icon="logout" iconTint="text-c-red" onClick={onLogout}>
                    Sign out
                  </Button>
                </Card>
              </>
            )}

            {section === "profile" && (
              <>
                <Card title="Public details" subtitle="What other students see on your profile.">
                  <Row icon="badge" tint="text-c-violet" title="Display name" body={user.name}>
                    <Button tone="violet" size="sm" onClick={onEditProfile} className="shrink-0">Change</Button>
                  </Row>
                  <Row icon="notes" tint="text-c-blue" title="Bio" body={user.bio || "Nothing written yet."} last>
                    <Button tone="blue" size="sm" onClick={onEditProfile} className="shrink-0">Edit</Button>
                  </Row>
                </Card>

                <Card title="Interests" subtitle="These decide which communities are suggested to you first.">
                  {interests.length === 0 ? (
                    <p className="text-base text-ink-2">None picked. Everything shows up unranked.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {interests.map((name) => {
                        const cat = CATEGORIES.find((x) => x.name === name);
                        return (
                          <span key={name} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-bg-sunken text-xs font-semibold text-ink">
                            <Icon name={cat?.msr || "interests"} size={14} className={cat?.tint} />{name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </>
            )}

            {section === "communities" && (
              <Card
                title={`You're in ${joinedCommunities.length} ${joinedCommunities.length === 1 ? "community" : "communities"}`}
                subtitle="Leaving one is done from its own page."
              >
                {joinedCommunities.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-base text-ink-2 mb-4">Nothing joined yet.</p>
                    <Button tone="teal" size="md" icon="explore" onClick={onGoToExplore}>Find communities</Button>
                  </div>
                ) : (
                  <>
                    {joinedCommunities.slice(0, 8).map((c, i, arr) => {
                      const cat = CATEGORIES.find((x) => x.name === c.category);
                      return (
                        <Row
                          key={c.id}
                          icon={cat?.msr || "groups"}
                          tint={cat?.tint}
                          title={c.name.split(" — ")[0]}
                          body={`${c.members} members · ${c.category}`}
                          onClick={() => onOpenCommunity?.(c)}
                          last={i === arr.length - 1}
                        >
                          <Icon name="chevron_right" size={20} className="text-ink-3 shrink-0" />
                        </Row>
                      );
                    })}
                    <div className="pt-4">
                      <Button tone="teal" size="md" icon="explore" onClick={onGoToExplore}>Browse all</Button>
                    </div>
                  </>
                )}
              </Card>
            )}

            {section === "appearance" && (
              <Card title="Theme" subtitle="System follows your device and keeps following it. No reload needed.">
                <div className="grid grid-cols-3 gap-4">
                  <ThemeSwatch value="light" current={themeMode} onChange={onSetTheme} label="Light" icon="light_mode" />
                  <ThemeSwatch value="dark" current={themeMode} onChange={onSetTheme} label="Dark" icon="dark_mode" />
                  <ThemeSwatch value="system" current={themeMode} onChange={onSetTheme} label="System" icon="brightness_auto" split />
                </div>
                {themeMode === "system" && (
                  <p className="text-base text-ink-2 mt-4">
                    Currently showing <span className="font-bold text-ink">{theme}</span>.
                  </p>
                )}
              </Card>
            )}

            {section === "notifications" && (
              <Card
                title="What you would be told about"
                subtitle="Delivery is not built yet. These switches work, but nothing is sent, and the choices last only for this session."
              >
                <Row icon="event" tint="text-c-orange" title="Event reminders" body="Before events you have registered for.">
                  <Switch label="Event reminders" checked={notifPrefs.events} onChange={(v) => onNotifChange("events", v)} />
                </Row>
                <Row icon="forum" tint="text-c-blue" title="Community posts" body="New posts in communities you have joined.">
                  <Switch label="Community posts" checked={notifPrefs.posts} onChange={(v) => onNotifChange("posts", v)} />
                </Row>
                <Row icon="reply" tint="text-c-violet" title="Replies" body="When someone replies to you." last>
                  <Switch label="Replies" checked={notifPrefs.replies} onChange={(v) => onNotifChange("replies", v)} />
                </Row>
              </Card>
            )}

            {section === "privacy" && (
              <>
                <Card title="Not built yet" subtitle="Listed so you know where they will live, not to imply they work.">
                  <Row icon="visibility" tint="text-c-teal" title="Account visibility" body="Let other students find your profile."><Unbuilt /></Row>
                  <Row icon="block" tint="text-c-red" title="Blocked accounts" body="Manage people you have blocked."><Unbuilt /></Row>
                  <Row icon="download" tint="text-c-amber" title="Download your data" body="Request an archive of your account." last><Unbuilt /></Row>
                </Card>

                <Card title="Working now">
                  <Row
                    icon="flag"
                    tint="text-c-pink"
                    title="Report a problem"
                    body="Tell us about content or behaviour on Orbit."
                    onClick={() => { window.location.href = "mailto:team.orbit@gmail.com?subject=Orbit%20report"; }}
                    last
                  >
                    <Icon name="chevron_right" size={20} className="text-ink-3 shrink-0" />
                  </Row>
                </Card>
              </>
            )}

            {section === "help" && (
              <Card title="Get in touch" subtitle="Orbit is built by students at MUJ. Mail lands with the people who wrote it.">
                <Row
                  icon="mail"
                  tint="text-c-pink"
                  title="Email support"
                  body="team.orbit@gmail.com"
                  onClick={() => { window.location.href = "mailto:team.orbit@gmail.com?subject=Orbit%20support"; }}
                >
                  <Icon name="open_in_new" size={18} className="text-ink-3 shrink-0" />
                </Row>
                <Row
                  icon="bug_report"
                  tint="text-c-red"
                  title="Report a bug"
                  body="Tell us what broke and what you were doing."
                  onClick={() => { window.location.href = "mailto:team.orbit@gmail.com?subject=Orbit%20bug%20report"; }}
                >
                  <Icon name="open_in_new" size={18} className="text-ink-3 shrink-0" />
                </Row>
                <Row
                  icon="lightbulb"
                  tint="text-c-amber"
                  title="Suggest a feature"
                  body="Tell us what Orbit is missing."
                  onClick={() => { window.location.href = "mailto:team.orbit@gmail.com?subject=Orbit%20feature%20idea"; }}
                  last
                >
                  <Icon name="open_in_new" size={18} className="text-ink-3 shrink-0" />
                </Row>
              </Card>
            )}

            {section === "about" && (
              <>
                <Card>
                  <div className="flex items-center gap-4">
                    <span className="grid place-items-center w-14 h-14 rounded-lg shrink-0 bg-gradient-to-br from-c-violet via-c-pink to-c-orange">
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white"
                           strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" />
                        <path d="M10.4 21.9a10 10 0 0 0 9.941-15.416" /><path d="M13.5 2.1a10 10 0 0 0-9.841 15.416" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-ink">Orbit</p>
                      <p className="text-base text-ink-2">
                        Built for Manipal University Jaipur · <span className="font-mono">v{appVersion}</span>
                      </p>
                    </div>
                  </div>
                </Card>

                <Card title="Legal">
                  <Row icon="description" tint="text-c-violet" title="Terms of Service" onClick={() => { window.location.href = "/terms"; }}>
                    <Icon name="open_in_new" size={18} className="text-ink-3 shrink-0" />
                  </Row>
                  <Row icon="shield" tint="text-c-green" title="Privacy Policy" onClick={() => { window.location.href = "/privacy"; }} last>
                    <Icon name="open_in_new" size={18} className="text-ink-3 shrink-0" />
                  </Row>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}
