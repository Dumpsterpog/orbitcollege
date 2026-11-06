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

const MAINTENANCE = import.meta.env.VITE_MAINTENANCE === "true";

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
      <ErrorBoundary>
        <ScrollToTop />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />

            {MAINTENANCE ? (
              <>
                <Route path="/maintenance" element={<Maintenance />} />
                <Route path="*" element={<Navigate to="/maintenance" replace />} />
              </>
            ) : (
              <>
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
