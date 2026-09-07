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

// MAINTENANCE MODE IS ON.
//
// Maintenance is the landing page: it is returned *instead of* App, not on
// top of it. App is what starts the Firebase auth listener and the Firestore
// subscriptions, so never mounting it means no session restore, no sign-in
// popup and no reads. Nobody signs in because that code does not run.
//
// Legal pages stay reachable. They are static, they touch no data, and a
// privacy policy that disappears during maintenance is the one page you
// cannot afford to take down.
//
// TO GO LIVE AGAIN: delete MAINTENANCE and the first branch of Root below,
// leaving the /privacy and /terms checks and App.
const MAINTENANCE = true;

const Root =
  MAINTENANCE && path !== "/privacy" && path !== "/terms"
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
