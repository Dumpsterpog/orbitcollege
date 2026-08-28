import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { PrivacyPage, TermsPage } from "./components/LegalPage.jsx";
import "./index.css";

// No router library — the app itself is a single route (all navigation is
// internal tab state in App.jsx, untouched here). /privacy and /terms are
// the only two URLs that need to work as real, linkable pages (Play Store
// review, footer links, etc.), so they're handled with a plain pathname
// check instead of pulling in react-router for two static pages.
const path = window.location.pathname.replace(/\/+$/, "") || "/";
const Root = path === "/privacy" ? PrivacyPage : path === "/terms" ? TermsPage : App;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
