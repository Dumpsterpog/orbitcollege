import { useEffect, useState } from "react";

// Dark/light theme toggle. Dark stays the default (matches the app's
// original design and the brand), light is opt-in and persisted per device.
// Applies Tailwind's `dark` class strategy (see tailwind.config.js —
// darkMode: "class") to <html>, so every `dark:` variant across the app
// turns on/off together from one place.
const STORAGE_KEY = "orbit_theme";

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* localStorage unavailable — fall through to default */ }
  return "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggleTheme };
}
