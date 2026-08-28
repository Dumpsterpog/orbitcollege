import { useEffect } from "react";

// Fixes the "bottom buttons float / jump when the keyboard opens" bug.
//
// Why it happens: `100dvh` is supposed to track the *visible* viewport, but
// on Android Chrome and inside the Capacitor WebView, opening the on-screen
// keyboard often doesn't shrink the layout viewport the way `dvh` expects —
// the shell (App.jsx's `shellClass`, height h-dvh) stays sized for the
// pre-keyboard screen, so anything pinned to its bottom (BottomNav, a form's
// footer button) ends up positioned behind/above the keyboard instead of
// just above it, and visibly jumps as the keyboard animates in.
//
// Fix: track the real visible height ourselves via the visualViewport API —
// the one API that reliably reports the space actually left on screen once
// the keyboard is up — and publish it as a CSS custom property. App.jsx's
// shellClass reads that property (`h-[var(--app-height,100dvh)]`) instead of
// the raw `dvh` unit, with `100dvh` kept as the fallback for browsers
// without visualViewport support (so nothing regresses there).
export function useViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return; // no-op fallback — CSS default (100dvh) still applies

    const setHeight = () => {
      document.documentElement.style.setProperty("--app-height", `${vv.height}px`);
    };
    setHeight();
    vv.addEventListener("resize", setHeight);
    return () => vv.removeEventListener("resize", setHeight);
  }, []);
}
