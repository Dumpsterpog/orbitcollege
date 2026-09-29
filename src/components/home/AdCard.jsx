import { useEffect, useRef } from "react";
import { Icon, Avatar, Button, cx } from "../ui/Primitives.jsx";
import { trackAd } from "../../lib/db.js";
import { Img } from "../ui/Img.jsx";

// Promoted content, published only from the admin tool.
//
// Three formats, the same three a campus sponsor actually asks for:
//   text    a post-shaped card: advertiser, copy, button
//   image   the same card with a large image and a link preview under it
//   banner  a wide image that is the whole ad
//
// Every ad says "Promoted" where a post would say when it was written. An ad
// that can be mistaken for a student's post is the fastest way to make the
// feed untrustworthy, so the label is never optional.

// http and https only. Ads are admin-written, but a javascript: link in an
// href is one paste away from running script on every student's screen.
export function safeLink(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

const domainOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
};

// One impression per ad per browser session, counted once half the ad has
// actually been on screen -- not on render, or every ad below the fold would
// count as seen by everyone who opened the page.
function useImpression(adId) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !adId || typeof IntersectionObserver === "undefined") return;
    const key = `orbit.adSeen.${adId}`;
    try { if (sessionStorage.getItem(key)) return; } catch { /* count it anyway */ }

    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      try { sessionStorage.setItem(key, "1"); } catch { /* visit-only */ }
      trackAd(adId, "impressions");
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [adId]);
  return ref;
}

export function AdCard({ ad, compact = false }) {
  const ref = useImpression(ad.id);
  const href = safeLink(ad.linkUrl);
  const cta = ad.ctaLabel || "Learn more";

  const open = () => {
    if (!href) return;
    trackAd(ad.id, "clicks");
    window.open(href, "_blank", "noopener,noreferrer");
  };

  if (ad.format === "banner") {
    return (
      <article ref={ref} className="relative w-full overflow-hidden rounded-2xl border border-line bg-bg-raised">
        <button onClick={open} disabled={!href} className="block w-full text-left disabled:cursor-default"
                aria-label={ad.headline || ad.advertiser || "Promoted"}>
          {ad.imageUrl && (
            <Img src={ad.imageUrl} loading="lazy"
                 className={cx("block w-full object-cover", compact ? "aspect-[16/9]" : "aspect-[3/1]")} />
          )}
          <span className="absolute top-2.5 left-2.5 rounded-full bg-black/65 px-2 py-0.5 text-2xs font-semibold text-white">
            Promoted
          </span>
          {ad.headline && (
            <span className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-base font-semibold text-ink truncate">{ad.headline}</span>
              {href && <span className="text-xs font-semibold text-accent shrink-0">{cta}</span>}
            </span>
          )}
        </button>
      </article>
    );
  }

  return (
    <article ref={ref} className={cx("w-full rounded-2xl border border-line bg-bg-raised", compact ? "p-4" : "p-4 sm:p-5")}>
      <header className="flex items-center gap-3">
        {ad.advertiserAvatar
          ? <img src={ad.advertiserAvatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          : <Avatar name={ad.advertiser || "Ad"} size={40} />}
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-ink truncate">{ad.advertiser || "Sponsored"}</p>
          <p className="text-2xs font-semibold uppercase tracking-wide text-ink-3">Promoted</p>
        </div>
      </header>

      {ad.body && (
        <p className="mt-3 text-base text-ink leading-relaxed whitespace-pre-wrap break-words">{ad.body}</p>
      )}

      {ad.format === "image" && ad.imageUrl ? (
        <button onClick={open} disabled={!href}
                className="mt-3 block w-full overflow-hidden rounded-xl border border-line text-left disabled:cursor-default">
          <Img src={ad.imageUrl} loading="lazy" className="block w-full aspect-[16/9] object-cover" />
          {(ad.headline || href) && (
            <span className="block px-3.5 py-2.5 bg-bg-sunken">
              {href && <span className="block text-2xs text-ink-3 truncate">{domainOf(href)}</span>}
              {ad.headline && <span className="block text-base font-semibold text-ink truncate">{ad.headline}</span>}
            </span>
          )}
        </button>
      ) : ad.headline ? (
        <p className="mt-2 text-base font-semibold text-ink break-words">{ad.headline}</p>
      ) : null}

      {href && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-ink-3 truncate min-w-0">{domainOf(href)}</span>
          <Button tone="blue" size="sm" onClick={open} className="shrink-0">
            {cta}<Icon name="arrow_forward" size={14} className="ml-1" />
          </Button>
        </div>
      )}
    </article>
  );
}
