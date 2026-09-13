import { useState, useEffect } from "react";
import * as db from "../lib/db.js";
import { checkText } from "../lib/moderation.js";
import { Icon, Avatar, Button, cx } from "./ui/Primitives.jsx";

export { Avatar };

// Wordmark. One definition, used by the loading screen, onboarding, settings
// and the maintenance page -- four places that had four hand-drawn copies of
// an older mark, which is how the loading screen ended up still showing it
// after the logo changed.
export function Logo({ size = 24, showWordmark = true }) {
  return (
    <span className="inline-flex items-center gap-2">
      <img
        src="/orbitcollege.png"
        alt=""
        width={size}
        height={size}
        className="rounded-lg object-contain shrink-0"
        style={{ width: size, height: size }}
      />
      {showWordmark && (
        <span className="font-bold tracking-tight text-ink" style={{ fontSize: size * 0.92 }}>
          Orbit
        </span>
      )}
      {showWordmark && <BetaTag />}
    </span>
  );
}

// Beta marker, next to every wordmark. One component so the loading screen,
// sidebar and phone header cannot end up with three slightly different pills.
export function BetaTag({ className }) {
  return (
    <span
      className={cx(
        "inline-flex items-center h-[18px] px-1.5 rounded-md bg-accent-wash text-accent ring-1 ring-accent/25",
        "text-[10px] font-bold uppercase tracking-[0.08em] leading-none shrink-0",
        className
      )}
    >
      Beta
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

// Comment thread.
//
// Collapsed by default and only subscribed once opened: a feed of twenty posts
// should not hold twenty live listeners for threads nobody has looked at.
// Shared by the campus feed and a community's own posts, which is why it takes
// communityId rather than assuming one.
export function PostComments({
  communityId, postId, count = 0, authUserId, myName, canWrite, onBlocked,
  open: openProp, onToggle,
}) {
  // Controlled when the parent passes `open`, uncontrolled otherwise. The feed
  // card opens the thread by clicking the post body, so it needs the handle;
  // anywhere else the button can still own it.
  const [openSelf, setOpenSelf] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openSelf;
  const setOpen = (next) => {
    const value = typeof next === "function" ? next(open) : next;
    if (controlled) onToggle?.(value);
    else setOpenSelf(value);
  };
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) return;
    return db.watchPostComments(communityId, postId, setItems);
  }, [open, communityId, postId]);

  // The stored count can lag a failed increment, so once the thread is open
  // the list itself is the count.
  const shown = open ? items.length : count;

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    if (!canWrite) { onBlocked?.(); return; }

    const clean = checkText(text);
    if (!clean.ok) { setNotice(clean.reason); return; }
    setNotice("");

    setBusy(true);
    setDraft("");
    try {
      await db.addPostComment({ communityId, postId, authorId: authUserId, authorName: myName, text });
    } catch (err) {
      console.error("[orbit] comment failed", err);
      setDraft(text);
    }
    setBusy(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cx(
          "inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-xs font-semibold transition-colors",
          open ? "bg-bg-sunken text-ink" : "text-ink-2 hover:text-ink hover:bg-bg-sunken"
        )}
      >
        <Icon name="mode_comment" size={16} className="text-c-blue" />
        <span className="tabular-nums">{shown}</span>
        <span className="hidden sm:inline">{shown === 1 ? "comment" : "comments"}</span>
      </button>

      {open && (
        <div className="w-full mt-3 pt-3 border-t border-line space-y-3">
          {items.map((cm) => (
            <div key={cm.id} className="flex gap-2.5 group">
              <Avatar name={cm.who} size={28} />
              <div className="min-w-0 flex-1">
                <p className="text-base">
                  <span className="font-semibold text-ink">{cm.who}</span>
                  <span className="text-ink-3 text-2xs ml-1.5">{cm.time}</span>
                </p>
                <p className="text-base text-ink-2 leading-relaxed whitespace-pre-wrap break-words">{cm.text}</p>
              </div>
              {cm.authorId === authUserId && (
                <button
                  onClick={() => db.deletePostComment(communityId, postId, cm.id)}
                  aria-label="Delete comment"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0 self-start"
                >
                  <Icon name="delete" size={15} className="text-c-red" />
                </button>
              )}
            </div>
          ))}

          {items.length === 0 && (
            <p className="text-base text-ink-3">No comments yet.</p>
          )}

          {notice && (
            <p className="text-base text-c-red leading-relaxed">{notice}</p>
          )}

          <div className="flex items-center gap-2.5 pt-1">
            <Avatar name={myName || "You"} size={28} />
            <input
              value={draft}
              maxLength={1000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={canWrite ? "Write a comment…" : "Sign in to comment"}
              disabled={!canWrite || busy}
              className="flex-1 min-w-0 h-9 px-3.5 rounded-full bg-bg-sunken text-ink placeholder:text-ink-3 text-base
                border border-transparent focus:outline-none focus:border-line-strong transition-colors
                disabled:opacity-60"
            />
            <Button
              tone="blue"
              size="sm"
              onClick={send}
              disabled={!draft.trim() || busy}
              loading={busy}
              className="shrink-0"
            >
              Reply
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
