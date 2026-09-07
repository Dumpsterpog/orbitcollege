import { useOrbit } from "../context/OrbitContext.jsx";
import { SettingsScreen } from "../components/Settings.jsx";

export default function SettingsPage() {
  const o = useOrbit();
  return (
    <SettingsScreen
      user={{ ...o.user, email: o.authUser?.email }}
      theme={o.theme}
      mode={o.themeMode}
      onToggleTheme={o.toggleTheme}
      onSetTheme={o.setThemeMode}
      onLogout={o.goToInitialPage}
      onBack={() => o.goToTab("profile")}
      onEditProfile={() => o.goToTab("profile")}
      onComingSoon={() => o.showToast("Coming soon")}
      notifPrefs={o.notifPrefs}
      onNotifChange={(key, val) => o.setNotifPrefs((p) => ({ ...p, [key]: val }))}
      joinedCommunities={o.joinedCommunities}
      onOpenCommunity={o.setSelectedCommunity}
      onGoToExplore={() => o.goToTab("explore")}
    />
  );
}
