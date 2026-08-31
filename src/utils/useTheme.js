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
const MODES = ["light", "dark", "system"];

function getInitialMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (MODES.includes(saved)) return saved;
  } catch { /* localStorage unavailable — fall through to the default */ }
  return "dark";
}

const prefersDark = () => {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return true;
  }
};

export function useTheme() {
  // `mode` is what the user chose; `theme` is what is actually painted.
  // They differ only while mode === "system".
  const [mode, setMode] = useState(getInitialMode);
  const [systemDark, setSystemDark] = useState(prefersDark);

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
  const toggleTheme = useCallback(() => {
    setMode(theme === "dark" ? "light" : "dark");
  }, [theme]);

  const setThemeMode = useCallback((next) => {
    if (MODES.includes(next)) setMode(next);
  }, []);

  return { theme, mode, toggleTheme, setThemeMode };
}
