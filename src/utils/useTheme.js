import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "orbit_theme";
const NOTICE_KEY = "orbit_theme_notice";
const MODES = ["light", "dark", "system"];

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
