import { useEffect, useState, useCallback } from "react";

// Theme control. Applies Tailwind's `dark` class strategy (tailwind.config.js
// — darkMode: "class") to <html>, so every dark: variant in the app switches
// from one place.
//
// Three modes, matching the Settings mock's Light / Dark / System picker.
// "system" is not a third stylesheet — it resolves to light or dark from the
// OS preference and keeps following it, so a machine that flips to dark at
// sunset flips the app with it without a reload.
const STORAGE_KEY = "orbit_theme";
const NOTICE_KEY = "orbit_theme_notice";
const MODES = ["light", "dark", "system"];

// First visit follows the OS rather than forcing a look. Someone whose machine
// is light gets a light app, which is the common case and was previously
// overridden for no reason.
function getInitialMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (MODES.includes(saved)) return saved;
  } catch { /* localStorage unavailable — fall through to the default */ }
  return "system";
}

// Only announce the automatic choice once, and only when it WAS automatic.
// Someone who already picked a theme is not told about a decision they made.
function shouldAnnounce() {
  try {
    if (localStorage.getItem(NOTICE_KEY)) return false;
    return !MODES.includes(localStorage.getItem(STORAGE_KEY));
  } catch { return false; }
}

const prefersDark = () => {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    // No matchMedia means no signal either way, so pick the lighter default
    // rather than assuming dark.
    return false;
  }
};

export function useTheme() {
  // `mode` is what the user chose; `theme` is what is actually painted.
  // They differ only while mode === "system".
  const [mode, setMode] = useState(getInitialMode);
  const [systemDark, setSystemDark] = useState(prefersDark);
  const [announcing, setAnnouncing] = useState(shouldAnnounce);

  // Track the OS preference for as long as "system" is selected.
  useEffect(() => {
    if (mode !== "system") return;
    let mq;
    try {
      mq = window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
      return;
    }
    const onChange = (e) => setSystemDark(e.matches);
    setSystemDark(mq.matches);
    // Safari < 14 only has the deprecated addListener form.
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [mode]);

  const theme = mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }
  }, [theme, mode]);

  // Kept for the sidebar's one-tap Appearance button. Toggling out of
  // "system" resolves to the opposite of whatever is currently painted,
  // which is what someone pressing it is asking for.
  const dismissThemeNotice = useCallback(() => {
    setAnnouncing(false);
    try { localStorage.setItem(NOTICE_KEY, "1"); } catch { /* ignore */ }
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(theme === "dark" ? "light" : "dark");
    dismissThemeNotice();
  }, [theme, dismissThemeNotice]);

  const setThemeMode = useCallback((next) => {
    if (MODES.includes(next)) setMode(next);
    dismissThemeNotice();
  }, [dismissThemeNotice]);

  return {
    theme,
    mode,
    toggleTheme,
    setThemeMode,
    // The resolved theme, but only while it is still worth explaining.
    themeNotice: announcing ? theme : null,
    dismissThemeNotice,
  };
}
