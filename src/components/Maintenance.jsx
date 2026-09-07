// Maintenance screen.
//
// Rendered from main.jsx *instead of* App, not inside it. That distinction is
// the whole point: App is what starts the Firebase auth listener and the
// Firestore subscriptions, so swapping it out means no session is restored, no
// sign-in popup can be opened, and no read is attempted. Nobody logs in
// because the code that logs people in never runs.
//
// What this is not: a security control. It is a client-side switch, so anyone
// who reads the bundle can see it and work around it. The things that actually
// protect data are the Firestore rules, and they stay on regardless. Use this
// to stop ordinary visitors seeing a half-finished app, not to lock anything
// down.
//
// Turn it on and off with VITE_MAINTENANCE in .env, then rebuild -- Vite
// inlines the value at build time, so a deployed site needs a redeploy.

export function Maintenance() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#0a0a0b",
        color: "#f4f4f5",
        // Inline styles on purpose: this must render correctly even if the
        // stylesheet fails, which is exactly the sort of thing you are likely
        // to be mid-way through fixing when this screen is up.
        fontFamily: "Geist, -apple-system, 'Segoe UI', system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div style={{ maxWidth: "420px", textAlign: "center" }}>
        <span
          aria-hidden="true"
          style={{
            display: "grid",
            placeItems: "center",
            width: "56px",
            height: "56px",
            margin: "0 auto 24px",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#f4f4f5"
               strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <circle cx="19" cy="5" r="2" />
            <circle cx="5" cy="19" r="2" />
            <path d="M10.4 21.9a10 10 0 0 0 9.941-15.416" />
            <path d="M13.5 2.1a10 10 0 0 0-9.841 15.416" />
          </svg>
        </span>

        <h1 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
          Orbit is down for maintenance
        </h1>

        <p style={{ fontSize: "15px", lineHeight: 1.65, color: "#a1a1a6", margin: "12px 0 0" }}>
          We are making some changes and will be back shortly. Sign-in is
          switched off in the meantime, so nothing you have posted is affected.
        </p>

        <p style={{ fontSize: "13px", lineHeight: 1.6, color: "#6b6b73", margin: "28px 0 0" }}>
          Need something urgently?{" "}
          <a
            href="mailto:team.orbit@gmail.com"
            style={{ color: "#f4f4f5", textDecoration: "underline", textUnderlineOffset: "3px" }}
          >
            team.orbit@gmail.com
          </a>
        </p>
      </div>
    </main>
  );
}
