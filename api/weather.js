// Weather, fetched server-side.
//
// The API key stays here and never reaches the browser. A VITE_ variable would
// have been three lines shorter and would also have published the key in the
// bundle in plain text, where anyone could lift it and burn the quota against
// someone else's account. This is the one piece of the app that genuinely
// needs a server, so it has one.
//
// Set the key in the deployment environment as OPENWEATHER_API_KEY. Note the
// missing VITE_ prefix -- that is what keeps Vite from inlining it.

// Bagru, Jaipur, Rajasthan. Hardcoded because Orbit is one campus: asking the
// browser for geolocation would prompt every visitor for permission in order
// to tell them the weather at a place they are already standing.
const LAT = 26.8167;
const LON = 75.55;
const PLACE = "Bagru";

// OpenWeather's free tier allows 60 calls a minute, and campus weather does not
// change faster than this. The cache is per warm instance, so a cold start
// refetches -- fine, and much simpler than an external store for one number.
let cache = { at: 0, data: null };
const TTL_MS = 10 * 60 * 1000;

export default async function handler(req, res) {
  const key = process.env.OPENWEATHER_API_KEY;

  if (!key) {
    // 200 with a null payload, not an error. The widget is decoration: it
    // should disappear when there is nothing to say, not turn a page red.
    return res.status(200).json({ ok: false, reason: "not_configured", weather: null });
  }

  if (cache.data && Date.now() - cache.at < TTL_MS) {
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
    return res.status(200).json({ ok: true, cached: true, weather: cache.data });
  }

  try {
    const url =
      `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=${LAT}&lon=${LON}&units=metric&appid=${key}`;

    const r = await fetch(url);
    if (!r.ok) {
      const body = await r.text();
      console.error("[orbit/weather] upstream", r.status, body.slice(0, 200));
      // A brand-new OpenWeather key 401s for up to a couple of hours before it
      // activates, which is the most likely reason to land here.
      return res.status(200).json({
        ok: false,
        reason: r.status === 401 ? "key_not_active" : "upstream_error",
        weather: null,
      });
    }

    const raw = await r.json();

    // Only what the widget draws. Passing the whole payload through would ship
    // a few kilobytes of forecast internals to render two lines of text.
    const weather = {
      tempC: Math.round(raw.main?.temp ?? 0),
      feelsLikeC: Math.round(raw.main?.feels_like ?? 0),
      description: raw.weather?.[0]?.description || "",
      main: raw.weather?.[0]?.main || "",
      icon: raw.weather?.[0]?.icon || "",
      place: PLACE,
    };

    cache = { at: Date.now(), data: weather };
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
    return res.status(200).json({ ok: true, cached: false, weather });
  } catch (err) {
    console.error("[orbit/weather]", err);
    return res.status(200).json({ ok: false, reason: "fetch_failed", weather: null });
  }
}
