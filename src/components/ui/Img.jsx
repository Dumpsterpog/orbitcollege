import { useState, useEffect } from "react";
import { cachedImage, isStoredRef, resolveImage } from "../../lib/storedImage.js";

// Pictures are Firestore documents now, so a src may be a reference that has
// to be fetched before it can be drawn. Ordinary URLs -- the ones uploaded
// while Storage was still available, and everything in /public -- pass
// through untouched and render on the first paint.
export function useImageSrc(src) {
  const [resolved, setResolved] = useState(() => (isStoredRef(src) ? cachedImage(src) : src || null));

  useEffect(() => {
    if (!isStoredRef(src)) { setResolved(src || null); return; }
    const ready = cachedImage(src);
    if (ready) { setResolved(ready); return; }
    let alive = true;
    setResolved(null);
    resolveImage(src).then((d) => { if (alive) setResolved(d); });
    return () => { alive = false; };
  }, [src]);

  return resolved;
}

// A drop-in <img> that understands both. While a stored picture is loading it
// renders nothing rather than a broken-image icon, so a slow read looks like
// an empty frame instead of a fault.
export function Img({ src, alt = "", fallback = null, ...rest }) {
  const resolved = useImageSrc(src);
  if (!resolved) return fallback;
  return <img src={resolved} alt={alt} {...rest} />;
}
8