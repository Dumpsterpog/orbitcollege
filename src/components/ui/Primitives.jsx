import { forwardRef } from "react";
import { Orbit as OrbitIcon, Loader2 } from "lucide-react";

// Shared primitive vocabulary for the rebuilt UI.
//
// The old components each hand-rolled their own padding, radius, border and
// hover treatment inline, so no two buttons were quite the same size and a
// change to "what a card looks like" meant editing a dozen files. Everything
// visual now composes from these, and they only ever use semantic tokens
// (surface/line/content/accent) — never a raw zinc shade — so light and dark
// stay in lockstep automatically.

export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

/* ---------------------------------------------------------------- Button */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 font-medium rounded whitespace-nowrap " +
  "transition-colors duration-100 select-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-content/25 focus-visible:ring-offset-1 focus-visible:ring-offset-surface " +
  "disabled:opacity-45 disabled:pointer-events-none";

const BUTTON_VARIANTS = {
  // Monochrome inverted — the workhorse CTA. Accent is deliberately NOT the
  // primary button colour; it stays a brand highlight so it keeps meaning.
  primary: "bg-solid text-solid-fg hover:bg-solid-hover",
  secondary: "bg-surface-elevated text-content border border-line hover:border-line-strong hover:bg-surface-inset",
  ghost: "text-content-secondary hover:text-content hover:bg-surface-inset",
  accent: "bg-accent text-accent-fg hover:bg-accent-hover",
  danger: "bg-transparent text-danger border border-line hover:bg-danger-subtle hover:border-danger/40",
};

const BUTTON_SIZES = {
  xs: "h-6 px-2 text-2xs",
  sm: "h-7 px-2.5 text-xs",
  md: "h-8 px-3 text-sm",
  lg: "h-10 px-4 text-base",
};

export const Button = forwardRef(function Button(
  { variant = "secondary", size = "md", loading = false, icon: Icon, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
      {...rest}
    >
      {loading
        ? <Loader2 size={14} className="animate-spin shrink-0" />
        : Icon && <Icon size={size === "lg" ? 16 : 14} className="shrink-0" />}
      {children}
    </button>
  );
});

/* -------------------------------------------------------------- IconButton */

export const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, size = "md", variant = "ghost", className, ...rest },
  ref
) {
  const box = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], box, "px-0", className)}
      {...rest}
    >
      <Icon size={size === "lg" ? 18 : 16} className="shrink-0" />
    </button>
  );
});

/* ------------------------------------------------------------------ Card */

export function Card({ as: Tag = "div", interactive = false, className, children, ...rest }) {
  return (
    <Tag
      className={cx(
        "bg-surface-elevated border border-line rounded-lg",
        interactive && "text-left w-full transition-colors hover:border-line-strong hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-content/25",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ----------------------------------------------------------------- Input */

const FIELD_BASE =
  "w-full bg-surface-subtle text-content placeholder:text-content-faint " +
  "border border-line rounded px-2.5 transition-colors " +
  "focus:outline-none focus:border-line-strong focus:ring-2 focus:ring-content/10 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export const Input = forwardRef(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(FIELD_BASE, "h-8 text-sm", className)} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ className, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cx(FIELD_BASE, "py-2 text-sm resize-none", className)} {...rest} />;
});

// Label + optional hint + error, so forms don't re-derive this stack each time.
export function Field({ label, hint, error, htmlFor, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-medium text-content-secondary">
          {label}
        </label>
      )}
      {children}
      {error
        ? <p className="text-2xs text-danger">{error}</p>
        : hint && <p className="text-2xs text-content-muted">{hint}</p>}
    </div>
  );
}

/* ----------------------------------------------------------------- Badge */

const BADGE_TONES = {
  neutral: "bg-surface-inset text-content-secondary border-line",
  accent: "bg-accent-subtle text-accent border-accent/25",
  solid: "bg-solid text-solid-fg border-transparent",
  danger: "bg-danger-subtle text-danger border-danger/25",
};

export function Badge({ tone = "neutral", className, children }) {
  return (
    <span className={cx("inline-flex items-center gap-1 h-5 px-1.5 rounded-sm border text-2xs font-medium", BADGE_TONES[tone], className)}>
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- Avatar */

// Deterministic initials + a stable surface. Colour-coding avatars by hash
// was considered and dropped: in a monochrome UI it's the one thing that
// would introduce arbitrary colour with no meaning attached to it.
// `label` is the pre-rebuild prop name (a single already-extracted letter).
// Accepted so screens still on the old design keep rendering correctly while
// the rebuild works through them; drop it once none remain.
export function Avatar({ name = "", label, src, size = 28, className }) {
  const initials = (label || name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";
  return (
    <span
      className={cx("inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden bg-surface-inset border border-line text-content-secondary font-medium", className)}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.36)) }}
    >
      {src
        ? <img src={src} alt="" className="w-full h-full object-cover" />
        : initials}
    </span>
  );
}

/* ------------------------------------------------------------------ Logo */

export function Logo({ showWordmark = true, size = 20 }) {
  return (
    <span className="inline-flex items-center gap-2">
      <OrbitIcon size={size} strokeWidth={2.4} className="text-content shrink-0" />
      {showWordmark && (
        <span
          className="font-semibold tracking-tight text-content"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: size * 0.85 }}
        >
          Orbit
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------- Separator */

export function Separator({ className }) {
  return <div className={cx("h-px bg-line", className)} />;
}

// Small uppercase group heading used down the sidebar and inside panels.
export function SectionLabel({ className, children }) {
  return (
    <p className={cx("text-2xs font-semibold uppercase tracking-wider text-content-faint", className)}>
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ Spinner */

export function Spinner({ size = 16, className }) {
  return <Loader2 size={size} className={cx("animate-spin text-content-muted", className)} />;
}
