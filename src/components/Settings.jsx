import { useState } from "react";
import { Icon, Avatar, Button, Switch, cx } from "./ui/Primitives.jsx";
import { Screen, Column } from "./ui/Layout.jsx";

// Settings — a settings list, which is a different component from a page of
// forms. Rows share one hairline, each has a coloured glyph so the eye can
// find a section without reading, and nothing is wrapped in a panel.
//
// Theme is a three-up swatch picker rather than a dropdown: the thing being
// chosen is visual, so the control should be too.

function Row({ icon, tint, title, body, children, onClick, danger }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cx(
        "w-full flex items-center gap-4 py-3.5 text-left border-b border-line last:border-0",
        onClick && "hover:opacity-70 transition-opacity"
      )}
    >
      {icon && (
        <span className="grid place-items-center w-9 h-9 rounded-full bg-bg-sunken shrink-0">
          <Icon name={icon} size={20} className={tint} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cx("block text-base font-semibold", danger ? "text-danger" : "text-ink")}>{title}</span>
        {body && <span className="block text-xs text-ink-2 mt-0.5 leading-normal">{body}</span>}
      </span>
      {children}
    </Tag>
  );
}

function Group({ title, children }) {
  return (
    <section className="mb-9">
      <h2 className="text-2xs font-semibold text-ink-2 uppercase tracking-wider mb-1">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function Unbuilt() {
  return (
    <span className="text-2xs font-semibold text-ink-3 uppercase tracking-wide shrink-0">Not built</span>
  );
}

function ThemeSwatch({ value, current, onChange, label, icon, split }) {
  const active = current === value;
  return (
    <button
      onClick={() => onChange(value)}
      className="flex flex-col items-center gap-2 group"
      aria-pressed={active}
    >
      <span
        className={cx(
          "relative grid place-items-center w-full h-20 rounded overflow-hidden transition-all",
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
          size={26}
          className={cx("relative z-10", split ? "text-c-violet" : value === "dark" ? "text-c-amber" : "text-c-orange")}
        />
      </span>
      <span className={cx("text-xs", active ? "font-semibold text-ink" : "text-ink-2")}>{label}</span>
    </button>
  );
}

export function SettingsScreen({
  user, theme, mode, onToggleTheme, onSetTheme, onLogout, onBack, onComingSoon,
  notifPrefs = {}, onNotifChange, onEditProfile, appVersion = "0.1.0",
}) {
  const themeMode = mode || theme;

  return (
    <Screen>
      <Column className="max-w-2xl pt-8 pb-16">
        <h1 className="text-3xl font-bold text-ink mb-8">Settings</h1>

        <Group title="Account">
          <div className="flex items-center gap-4 py-3.5 border-b border-line">
            <Avatar name={user.name} size={52} ring />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-base font-semibold text-ink truncate">{user.name}</p>
              <p className="text-xs text-ink-2 truncate">{user.email || "Browsing as a guest"}</p>
            </div>
            <Button variant="soft" size="sm" onClick={onEditProfile}>Edit</Button>
          </div>

          <Row
            icon="lock"
            tint="text-c-green"
            title="Sign-in method"
            body="Orbit uses Google sign-in, so there's no separate password to manage."
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2 shrink-0">
              <Icon name="verified_user" size={16} className="text-c-blue" />Google
            </span>
          </Row>
        </Group>

        <Group title="Appearance">
          <div className="py-4 border-b border-line">
            <p className="text-base font-semibold text-ink mb-3">Theme</p>
            <div className="grid grid-cols-3 gap-3">
              <ThemeSwatch value="light" current={themeMode} onChange={onSetTheme} label="Light" icon="light_mode" />
              <ThemeSwatch value="dark" current={themeMode} onChange={onSetTheme} label="Dark" icon="dark_mode" />
              <ThemeSwatch value="system" current={themeMode} onChange={onSetTheme} label="System" icon="brightness_auto" split />
            </div>
            {themeMode === "system" && (
              <p className="text-xs text-ink-2 mt-3">
                Following your device — currently <span className="font-semibold text-ink">{theme}</span>.
              </p>
            )}
          </div>
        </Group>

        <Group title="Notifications">
          <Row icon="event" tint="text-c-orange" title="Event reminders" body="Before events you've registered for.">
            <Switch label="Event reminders" checked={notifPrefs.events} onChange={(v) => onNotifChange("events", v)} />
          </Row>
          <Row icon="forum" tint="text-c-blue" title="Community posts" body="New posts in communities you've joined.">
            <Switch label="Community posts" checked={notifPrefs.posts} onChange={(v) => onNotifChange("posts", v)} />
          </Row>
          <Row icon="reply" tint="text-c-violet" title="Replies" body="When someone replies to you.">
            <Switch label="Replies" checked={notifPrefs.replies} onChange={(v) => onNotifChange("replies", v)} />
          </Row>
          <p className="text-xs text-ink-3 pt-3 leading-relaxed">
            Delivery isn't built yet — these switches work, but nothing is sent, and the choices last only for this session.
          </p>
        </Group>

        <Group title="Privacy &amp; safety">
          <Row icon="visibility" tint="text-c-teal" title="Account visibility" body="Let other students find your profile."><Unbuilt /></Row>
          <Row icon="block" tint="text-c-red" title="Blocked accounts" body="Manage people you've blocked."><Unbuilt /></Row>
          <Row icon="download" tint="text-c-amber" title="Download your data" body="Request an archive of your account."><Unbuilt /></Row>
          <Row
            icon="flag"
            tint="text-c-pink"
            title="Report a problem"
            body="Tell us about content or behaviour on Orbit."
            onClick={() => { window.location.href = "mailto:atharvat2006@gmail.com?subject=Orbit%20report"; }}
          >
            <Icon name="chevron_right" size={20} className="text-ink-3 shrink-0" />
          </Row>
        </Group>

        <Group title="About">
          <Row icon="info" tint="text-c-blue" title="Version">
            <span className="text-xs font-mono text-ink-2 shrink-0">v{appVersion}</span>
          </Row>
          <Row icon="description" tint="text-c-violet" title="Terms of Service" onClick={() => { window.location.href = "/terms"; }}>
            <Icon name="open_in_new" size={18} className="text-ink-3 shrink-0" />
          </Row>
          <Row icon="shield" tint="text-c-green" title="Privacy Policy" onClick={() => { window.location.href = "/privacy"; }}>
            <Icon name="open_in_new" size={18} className="text-ink-3 shrink-0" />
          </Row>
          <Row icon="help" tint="text-c-teal" title="Help &amp; support" onClick={() => { window.location.href = "mailto:atharvat2006@gmail.com?subject=Orbit%20support"; }}>
            <Icon name="open_in_new" size={18} className="text-ink-3 shrink-0" />
          </Row>
        </Group>

        <button
          onClick={onLogout}
          className="w-full py-3.5 text-base font-semibold text-danger hover:opacity-70 transition-opacity border-t border-line"
        >
          Sign out
        </button>
      </Column>
    </Screen>
  );
}
