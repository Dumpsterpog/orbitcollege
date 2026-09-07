import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { PrivacyPage, TermsPage } from "./components/LegalPage.jsx";
import { Maintenance } from "./components/Maintenance.jsx";
import "./index.css";

// No router library — the app itself is a single route (all navigation is
// internal tab state in App.jsx, untouched here). /privacy and /terms are
// the only two URLs that need to work as real, linkable pages (Play Store
// review, footer links, etc.), so they're handled with a plain pathname
// check instead of pulling in react-router for two static pages.
const path = window.location.pathname.replace(/\/+$/, "") || "/";

// Maintenance mode.
//
// Checked here, before anything renders, because App is what starts the auth
// listener and the Firestore subscriptions. Returning Maintenance *instead of*
// App means none of that code runs at all -- no session restore, no sign-in
// popup, no reads. That is stronger than hiding the UI inside a mounted app,
// where the listeners would already be running behind the overlay.
//
// Legal pages stay reachable: they are static, they touch no data, and a
// privacy policy that 404s during maintenance is the one page you do not want
// to take down.
//
// The bypass is a convenience for checking the real site on a deployed URL,
// not a security boundary -- it is client-side, so anyone reading the bundle
// can find it. Set it once from the browser console:
//
//     localStorage.setItem("orbit_skip_maintenance", "1")
//
const MAINTENANCE = import.meta.env.VITE_MAINTENANCE === "true";

function bypassed() {
  try {
    return localStorage.getItem("orbit_skip_maintenance") === "1";
  } catch {
    return false;
  }
}

const isLegal = path === "/privacy" || path === "/terms";
const Root =
  MAINTENANCE && !isLegal && !bypassed()
    ? Maintenance
    : path === "/privacy"
      ? PrivacyPage
      : path === "/terms"
        ? TermsPage
        : App;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
