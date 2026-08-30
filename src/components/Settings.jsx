import { Sun, Moon, Monitor, LogOut, LogIn, FileText, Shield, Bell, Trash2, ExternalLink } from "lucide-react";
import { Avatar, Button, Badge, cx } from "./ui/Primitives.jsx";
import { Screen, PageHeader, PageBody, SettingsGroup, SettingsRow, Switch } from "./ui/Layout.jsx";

// Settings — a real screen, replacing the four-item dropdown that used to
// hang off the gear icon on Profile.
//
// Everything here is honest about what's wired: theme and the legal links do
// real work, the notification toggles are visibly marked as not connected to
// a backend yet rather than pretending to save. Faking a persisted setting is
// worse than admitting it isn't built, because the user finds out later.

const THEMES = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
];

export function SettingsScreen({
  user, theme, onToggleTheme, onLogout, onBack, onComingSoon,
  notifPrefs = {}, onNotifChange,
}) {
  const isDark = theme === "dark";

  return (
    <Screen>
      <PageHeader title="Settings" onBack={onBack} />

      <PageBody max="2xl" className="space-y-7">
        {/* Account */}
        <SettingsGroup title="Account">
          <div className="flex items-center gap-3 px-3.5 py-3.5">
            <Avatar name={user.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-content truncate">{user.name}</p>
              <p className="text-2xs text-content-muted truncate mt-0.5">
                {user.email || (user.verified ? "Signed in with Google" : "Not signed in")}
              </p>
            </div>
            <Badge tone={user.verified ? "accent" : "neutral"}>
              {user.verified ? "Verified" : "Guest"}
            </Badge>
          </div>

          {user.verified ? (
            <SettingsRow
              label="Sign out"
              description="You'll be returned to the sign-in screen."
              danger
              onClick={onLogout}
              control={<LogOut size={15} className="text-danger" />}
            />
          ) : (
            <SettingsRow
              label="Sign in"
              description="Sign in with Google to join communities, post and chat."
              onClick={onLogout}
              control={<LogIn size={15} className="text-content-muted" />}
            />
          )}
        </SettingsGroup>

        {/* Appearance */}
        <SettingsGroup title="Appearance">
          <div className="px-3.5 py-3.5">
            <p className="text-sm font-medium text-content">Theme</p>
            <p className="text-2xs text-content-muted mt-0.5 mb-3">
              Applies immediately and is remembered on this device.
            </p>
            <div className="inline-flex p-0.5 gap-0.5 bg-surface-inset border border-line rounded">
              {THEMES.map((t) => {
                const active = (t.key === "dark") === isDark;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => { if (!active) onToggleTheme(); }}
                    aria-pressed={active}
                    className={cx(
                      "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm text-xs font-medium transition-colors",
                      active
                        ? "bg-surface-elevated text-content shadow-sm"
                        : "text-content-muted hover:text-content"
                    )}
                  >
                    <t.icon size={13} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </SettingsGroup>

        {/* Notifications */}
        <SettingsGroup
          title="Notifications"
          description="Not connected to a backend yet — these choices aren't saved between sessions."
        >
          <SettingsRow
            label="Event reminders"
            description="Before an event you registered for starts."
            control={
              <Switch
                label="Event reminders"
                checked={!!notifPrefs.events}
                onChange={(v) => onNotifChange?.("events", v)}
              />
            }
          />
          <SettingsRow
            label="Community activity"
            description="New posts in communities you've joined."
            control={
              <Switch
                label="Community activity"
                checked={!!notifPrefs.posts}
                onChange={(v) => onNotifChange?.("posts", v)}
              />
            }
          />
          <SettingsRow
            label="Replies to you"
            description="When someone replies to your post or comment."
            control={
              <Switch
                label="Replies to you"
                checked={!!notifPrefs.replies}
                onChange={(v) => onNotifChange?.("replies", v)}
              />
            }
          />
        </SettingsGroup>

        {/* Legal */}
        <SettingsGroup title="Privacy & legal">
          <SettingsRow
            label="Privacy Policy"
            description="What Orbit stores about you and why."
            onClick={() => window.open("/privacy", "_blank", "noopener")}
            control={<ExternalLink size={14} className="text-content-muted" />}
          />
          <SettingsRow
            label="Terms of Service"
            onClick={() => window.open("/terms", "_blank", "noopener")}
            control={<ExternalLink size={14} className="text-content-muted" />}
          />
          <SettingsRow
            label="Delete my account"
            description="Permanently removes your profile and posts. Not automated yet — this opens a request."
            danger
            onClick={onComingSoon}
            control={<Trash2 size={14} className="text-danger" />}
          />
        </SettingsGroup>

        <p className="text-2xs text-content-faint text-center pt-1">
          Orbit · early beta · built for Manipal University Jaipur
        </p>
      </PageBody>
    </Screen>
  );
}
