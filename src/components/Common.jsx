import { useState } from "react";
import { Icon, Avatar, Button, cx } from "./ui/Primitives.jsx";

export { Avatar };

// Wordmark. The gradient is the one piece of brand expression in the shell,
// so it is defined here once and reused by both the rail and the mobile bar.
export function Logo({ size = 24, showWordmark = true }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
           strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-ink shrink-0">
        <circle cx="12" cy="12" r="3" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" />
        <path d="M10.4 21.9a10 10 0 0 0 9.941-15.416" /><path d="M13.5 2.1a10 10 0 0 0-9.841 15.416" />
      </svg>
      {showWordmark && (
        <span
          className="font-bold tracking-tight text-ink"
          style={{ fontSize: size * 0.92 }}
        >
          Orbit
        </span>
      )}
    </span>
  );
}

// Toast. Bottom centre, above the mobile tab bar — and high enough to clear
// the guest pill, since the most likely toast a guest sees is the one telling
// them to sign in, which would otherwise land on top of it.
export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed inset-x-0 bottom-36 lg:bottom-24 z-[90] flex justify-center px-4 pointer-events-none animate-rise">
      <div className="bg-solid text-solid-ink text-base font-medium px-4 py-2.5 rounded-full shadow-pop max-w-sm text-center">
        {message}
      </div>
    </div>
  );
}

// Theme notice.
//
// The app follows the OS on a first visit rather than picking a look for you.
// That is the right default but an invisible one, so this says it happened
// once, names which way it went, and points at where to override it. It never
// appears again after being dismissed or after any manual theme choice, so it
// cannot become the kind of banner people learn to swat away.
export function ThemeNotice({ theme, onDismiss, onOpenSettings, raised }) {
  return (
    <div className={cx(
      "fixed inset-x-0 z-[75] flex justify-center px-4 pointer-events-none",
      // Sits in the toast's lane normally, and one pill higher when the guest
      // prompt is already occupying the lane below it.
      raised ? "bottom-52 lg:bottom-40" : "bottom-36 lg:bottom-24"
    )}>
      <div
        className="pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2 rounded-full
          bg-solid text-solid-ink shadow-pop animate-rise max-w-[calc(100vw-2rem)]"
      >
        <span className="grid place-items-center w-7 h-7 rounded-full bg-white/15 shrink-0">
          <Icon name={theme === "dark" ? "dark_mode" : "light_mode"} size={17} />
        </span>

        <p className="text-base font-medium truncate">
          <span className="hidden sm:inline">Your system is set to {theme}, </span>
          <span className="sm:hidden">System is {theme}, </span>
          <span className="opacity-70">so Orbit is too.</span>
        </p>

        <Button
          variant="primary"
          size="sm"
          onClick={() => { onOpenSettings(); onDismiss(); }}
          className="shrink-0 bg-bg text-ink hover:bg-bg-sunken"
        >
          Change
        </Button>

        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="grid place-items-center w-8 h-8 rounded-full shrink-0 opacity-60
            hover:opacity-100 hover:bg-white/10 transition-all"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>
  );
}

// Guest prompt.
//
// This was a full-width grey strip pinned under the header — the shape of a
// browser permission bar, which is the one piece of UI everybody has learned
// to ignore. It also pushed the whole page down by its own height on every
// screen, permanently, for a message you only need to read once.
//
// It floats at the bottom now: a single dark pill, out of the content's way,
// dismissible, and sitting above the mobile tab bar so it never covers the
// nav. Dismissal is session-only — it comes back on reload rather than
// hiding the one route back to an account forever.
export function GuestBanner({ onVerify }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 lg:bottom-6 z-[70] flex justify-center px-4 pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2 rounded-full
          bg-solid text-solid-ink shadow-pop animate-rise max-w-[calc(100vw-2rem)]"
      >
        <span className="grid place-items-center w-7 h-7 rounded-full bg-white/15 shrink-0">
          <Icon name="person" size={17} />
        </span>

        <p className="text-base font-medium truncate">
          <span className="hidden sm:inline">You&apos;re browsing as a guest. </span>
          <span className="sm:hidden">Guest: </span>
          <span className="opacity-70">join, post and chat need an account.</span>
        </p>

        <Button
          variant="primary"
          size="sm"
          onClick={onVerify}
          className="shrink-0 bg-bg text-ink hover:bg-bg-sunken"
        >
          Sign in
        </Button>

        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="grid place-items-center w-8 h-8 rounded-full shrink-0 opacity-60
            hover:opacity-100 hover:bg-white/10 transition-all"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>
  );
}
