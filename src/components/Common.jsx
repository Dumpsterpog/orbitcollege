import { Icon, Avatar, Button } from "./ui/Primitives.jsx";

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
          className="font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-c-violet via-c-pink to-c-orange"
          style={{ fontSize: size * 0.92 }}
        >
          Orbit
        </span>
      )}
    </span>
  );
}

// Toast. Pinned to the bottom centre, above the mobile tab bar.
export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed inset-x-0 bottom-20 lg:bottom-8 z-[90] flex justify-center px-4 pointer-events-none animate-rise">
      <div className="bg-solid text-solid-ink text-base font-medium px-4 py-2.5 rounded-full shadow-pop max-w-sm text-center">
        {message}
      </div>
    </div>
  );
}

// Guest strip. A single line with an inline action — not a bordered banner.
export function GuestBanner({ onVerify }) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-bg-sunken border-b border-line text-center">
      <Icon name="info" size={16} className="text-c-blue shrink-0" />
      <p className="text-xs text-ink-2">
        You&apos;re browsing as a guest.
        <button onClick={onVerify} className="ml-1.5 font-semibold text-accent hover:opacity-70">
          Sign in
        </button>
      </p>
    </div>
  );
}
