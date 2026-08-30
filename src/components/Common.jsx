import { AlertCircle } from "lucide-react";
import { Button, Logo, Avatar } from "./ui/Primitives.jsx";

// App-level chrome that isn't a generic primitive but is shared across
// screens. Logo and Avatar now live in ui/Primitives.jsx — re-exported here
// so existing imports keep resolving while the rebuild works through the
// remaining screens one at a time.
//
// AuroraBackground was dropped in the rebuild: Onboarding was its only
// consumer, and the new sign-in screen gets its structure from the two-pane
// layout rather than from a decorative gradient behind a floating card.
export { Logo, Avatar };

// Fixed to the bottom of the viewport rather than the old absolutely
// positioned in-shell placement — with the phone frame gone there's no card
// for it to sit inside any more.
export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-in-up">
      <div className="bg-solid text-solid-fg text-xs font-medium px-3 py-2 rounded shadow-lg max-w-[min(90vw,26rem)] text-center">
        {message}
      </div>
    </div>
  );
}

export function GuestBanner({ onVerify }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-accent-subtle border-b border-line">
      <AlertCircle size={14} className="text-accent shrink-0" />
      <p className="text-xs text-content-secondary flex-1 min-w-0">
        Browsing as a guest — sign in to join, post or chat.
      </p>
      <Button variant="secondary" size="sm" onClick={onVerify} className="shrink-0">
        Sign in
      </Button>
    </div>
  );
}
