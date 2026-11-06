import { useEffect, useState } from "react";
import { Icon } from "./ui/Primitives.jsx";

const CACHE_KEY = "orbit_weather";
const TTL_MS = 10 * 60 * 1000;

// OpenWeather's icon codes, mapped to Lucide. The trailing d/n is day or
// night, which matters for exactly one of these.
const GLYPH = {
  "01d": "light_mode", "01n": "dark_mode",
  "02d": "light_mode", "02n": "dark_mode",
  "03d": "cloud", "03n": "cloud",
  "04d": "cloud", "04n": "cloud",
  "09d": "rainy", "09n": "rainy",
  "10d": "rainy", "10n": "rainy",
  "11d": "bolt", "11n": "bolt",
  "13d": "ac_unit", "13n": "ac_unit",
  "50d": "cloud", "50n": "cloud",
};

function readCache() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    if (!raw?.at || Date.now() - raw.at > TTL_MS) return null;
    return raw.weather;
  } catch {
    return null;
  }
}

export function Weather() {
  const [weather, setWeather] = useState(readCache);

  useEffect(() => {
    // Already have something fresh; the server caches for the same window, so
    // asking again would only spend a request to be told the same thing.
    if (weather) return;

    let alive = true;
    fetch("/api/weather")
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d?.weather) return;
        setWeather(d.weather);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), weather: d.weather }));
        } catch { /* private mode */ }
      })
      .catch(() => { /* absence is the failure mode */ });

    return () => { alive = false; };
  }, [weather]);

  if (!weather) return null;

  const label = weather.description
    ? weather.description.charAt(0).toUpperCase() + weather.description.slice(1)
    : weather.main;

  return (
    <div
      className="hidden md:flex items-center gap-2.5 shrink-0 pr-1"
      title={`${label}, feels like ${weather.feelsLikeC}°C`}
    >
      <Icon name={GLYPH[weather.icon] || "light_mode"} size={22} className="text-c-amber" />
      <span className="leading-tight">
        <span className="block text-[13.5px] font-bold text-ink tabular-nums">{weather.tempC}°C</span>
        <span className="block text-[11px] text-ink-3 truncate max-w-[130px]">
          {weather.place} · {label}
        </span>
      </span>
    </div>
  );
}
