import React, { lazy, Suspense, useEffect } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import App from "./App.jsx";
import "./index.css";

/* ── Eager: the shell itself, needed on every route ── */
// App is the layout -- it owns the data, provides it through context, and
// renders <Outlet /> for whichever page the router picks.

/* ── Lazy: one chunk per page, fetched when first visited ── */
const HomePage            = lazy(() => import("./pages/HomePage.jsx"));
const ExplorePage         = lazy(() => import("./pages/ExplorePage.jsx"));
const EventsPage          = lazy(() => import("./pages/EventsPage.jsx"));
const EventRegisterPage   = lazy(() => import("./pages/EventRegisterPage.jsx"));
const ProfilePage         = lazy(() => import("./pages/ProfilePage.jsx"));
const SettingsPage        = lazy(() => import("./pages/SettingsPage.jsx"));
const CommunityPage       = lazy(() => import("./pages/CommunityPage.jsx"));
const CreateCommunityPage = lazy(() => import("./pages/CreateCommunityPage.jsx"));
const SearchPage          = lazy(() => import("./pages/SearchPage.jsx"));
const TeaPage             = lazy(() => import("./pages/TeaPage.jsx"));
const NotFoundPage        = lazy(() => import("./pages/NotFoundPage.jsx"));
const Maintenance         = lazy(() => import("./components/Maintenance.jsx").then((m) => ({ default: m.Maintenance })));
const PrivacyPage         = lazy(() => import("./components/LegalPage.jsx").then((m) => ({ default: m.PrivacyPage })));
const TermsPage           = lazy(() => import("./components/LegalPage.jsx").then((m) => ({ default: m.TermsPage })));

// Maintenance mode.
//
// Off by default now that the site is live. It was the other way round while
// the rebuild was in progress, so that a deploy which forgot to configure
// anything stayed down rather than accidentally opening. That is the right
// default for a site that is not ready and the wrong one for a site that is:
// a config slip should not take a running product offline.
//
// To put it back up, set VITE_MAINTENANCE=true in the deployment environment
// and redeploy. Vite inlines the value at build time, so it needs a rebuild
// either way -- there is no runtime switch here to flip in a hurry.
const MAINTENANCE = import.meta.env.VITE_MAINTENANCE === "true";

// A deploy gives lazy chunks new content-hashed filenames. A tab left open
// across a deploy still references the old ones, so the next navigation 404s
// and the SPA fallback serves index.html in place of JS -- which surfaces as a
// MIME type error. Reload once to pick up the current index.html. Guarded so a
// genuinely broken chunk cannot reload-loop.
window.addEventListener("vite:preloadError", () => {
  if (sessionStorage.getItem("orbit_reloaded_for_chunk_error")) return;
  sessionStorage.setItem("orbit_reloaded_for_chunk_error", "1");
  window.location.reload();
});

// Matches the page background so a route change does not flash white while its
// chunk loads. Reads the theme the same way useTheme does.
function RouteFallback() {
  let dark = false;
  try {
    const saved = localStorage.getItem("orbit_theme");
    dark = saved === "dark"
      || (saved !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  } catch { /* no storage: light is the safer guess */ }
  return <div style={{ position: "fixed", inset: 0, background: dark ? "#0a0a0b" : "#ffffff" }} />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Nothing was catching render errors, so any exception blanked the app
          to a white screen with no way back. */}
      <ErrorBoundary>
        <ScrollToTop />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Legal pages sit outside the app shell: they are static, they
                touch no data, and they must stay reachable during
                maintenance -- a privacy policy that disappears is the one
                page you cannot take down. */}
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />

            {MAINTENANCE ? (
              <>
                <Route path="/maintenance" element={<Maintenance />} />
                <Route path="*" element={<Navigate to="/maintenance" replace />} />
              </>
            ) : (
              <>
                {/* The app shell. App provides the data through context and
                    renders <Outlet /> where these pages go. */}
                <Route path="/" element={<App />}>
                  <Route index element={<HomePage />} />
                  <Route path="explore" element={<ExplorePage />} />
                  <Route path="events" element={<EventsPage />} />
                  <Route path="events/:eventId/register" element={<EventRegisterPage />} />
                  {/* The short one, for posters and stories: /e/techideate.
                      Same page, and the same sign-in gate in front of it. */}
                  <Route path="e/:eventId" element={<EventRegisterPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="settings" element={<SettingsPage />} />

                  {/* Sub-pages. These used to be booleans in App, which meant
                      a community could not be linked to, survive a refresh,
                      or be reached with the back button. */}
                  <Route path="c/:communityId" element={<CommunityPage />} />
                  <Route path="create" element={<CreateCommunityPage />} />
                  <Route path="search" element={<SearchPage />} />
                  <Route path="tea" element={<TeaPage />} />

                  {/* Inside the shell, so a mistyped path keeps the nav. */}
                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                <Route path="/maintenance" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
