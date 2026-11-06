import { useEffect } from "react";

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
