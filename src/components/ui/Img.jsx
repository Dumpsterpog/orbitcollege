import { useState, useEffect } from "react";
import { cachedImage, isStoredRef, resolveImage } from "../../lib/storedImage.js";

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

export function Img({ src, alt = "", fallback = null, ...rest }) {
  const resolved = useImageSrc(src);
  if (!resolved) return fallback;
  return <img src={resolved} alt={alt} {...rest} />;
}
8