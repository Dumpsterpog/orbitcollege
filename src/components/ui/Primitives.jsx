import { ICONS } from "./icons.js";
import { forwardRef } from "react";

// Primitive vocabulary.
//
// Two deliberate absences from the previous version:
//
//   No <Card>. A bordered, shadowed, tinted box was being reached for as the
//   default container, which is how a screen ends up as boxes inside boxes.
//   Grouping is done with whitespace and a hairline at the call site now, so
//   using a container is a decision rather than a reflex.
//
//   No rectangular buttons. Every action is a pill or a bare icon hit-area —
//   an 8px-radius rectangle is the shape that made the old "New Post" read
//   as unfinished.

export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

/* ---------------------------------------------------------------- Button */

const BASE =
  "inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap select-none " +
  "rounded-full transition-[background-color,color,opacity,transform] duration-150 " +
  "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
  "disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100";

const VARIANTS = {
  // Accent fill — the one primary action on a screen.
  primary: "bg-accent text-accent-ink hover:bg-accent-press",
  // Inverse fill — used where accent would compete with content (profile).
  solid: "bg-solid text-solid-ink hover:bg-solid-press",
  // Quiet fill on a tinted well. The default for secondary actions.
  soft: "bg-bg-sunken text-ink hover:bg-black/[0.06] dark:hover:bg-white/[0.10]",
  // Hairline. For "already done" states (Following, Joined, Going).
  outline: "border border-line text-ink hover:bg-bg-sunken",
  // Text-only accent, the social-product idiom for inline actions.
  link: "text-accent hover:text-accent-press hover:opacity-80 px-0",
  ghost: "text-ink-2 hover:text-ink hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
  danger: "text-danger hover:bg-danger-wash",
};

// Per-action fills. A screen where every button is the same blue makes the
// buttons furniture — nothing tells you which action you came for. `tone`
// gives an action its own hue, assigned by what it does (create is violet,
// join is green, register is orange) and kept consistent across screens.
//
// `text-bg` rather than white: the palette inverts between themes, so the
// label follows the page background to stay legible on both.
const TONES = {
  blue: "bg-c-blue text-bg hover:opacity-90",
  violet: "bg-c-violet text-bg hover:opacity-90",
  pink: "bg-c-pink text-bg hover:opacity-90",
  orange: "bg-c-orange text-bg hover:opacity-90",
  amber: "bg-c-amber text-bg hover:opacity-90",
  green: "bg-c-green text-bg hover:opacity-90",
  teal: "bg-c-teal text-bg hover:opacity-90",
  red: "bg-c-red text-bg hover:opacity-90",
};

const SIZES = {
  xs: "h-7 px-3 text-xs",
  sm: "h-8 px-3.5 text-xs",
  md: "h-9 px-4 text-base",
  lg: "h-11 px-6 text-base",
};

export const Button = forwardRef(function Button(
  { variant = "soft", tone, size = "md", loading = false, icon, iconTint, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(BASE, tone ? TONES[tone] : VARIANTS[variant], variant !== "link" && SIZES[size], className)}
      {...rest}
    >
      {loading ? <Spinner size={15} /> : icon && <Icon name={icon} size={size === "lg" ? 20 : 18} className={iconTint} />}
      {children}
    </button>
  );
});

// Bare icon action. Circular hit-area, no chrome until hover — the toolbar
// idiom that keeps a header from looking like a row of buttons.
export const IconButton = forwardRef(function IconButton(
  { icon, label, size = 22, active = false, className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cx(
        "inline-grid place-items-center shrink-0 rounded-full transition-[background-color,transform] duration-150",
        "hover:bg-black/[0.05] dark:hover:bg-white/[0.08] active:scale-90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        active ? "text-ink" : "text-ink",
        className
      )}
      style={{ width: size + 16, height: size + 16 }}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
});

/* ------------------------------------------------------------------ Icon */

// Lucide, wrapped so the app can keep calling icons by their old Material
// Symbol names. See ui/icons.js for why, and for the mapping.
export function Icon({ name, size = 20, thin = false, className, style, strokeWidth, ...rest }) {
  const Glyph = ICONS[name];

  if (!Glyph) {
    // Loud in development, invisible in production. A missing glyph should be
    // fixed, not silently rendered as a blank gap that nobody notices.
    if (import.meta.env.DEV) console.warn(`[orbit] no icon mapped for "${name}"`);
    return <span aria-hidden="true" className={cx("shrink-0 inline-block", className)} style={{ width: size, height: size, ...style }} />;
  }

  return (
    <Glyph
      aria-hidden="true"
      size={size}
      // Lucide's own default is 2. The design sits a little lighter than that,
      // and `thin` drops it further for the few large decorative glyphs.
      strokeWidth={strokeWidth ?? (thin ? 1.5 : 1.85)}
      className={cx("shrink-0", className)}
      style={style}
      {...rest}
    />
  );
}

/* ---------------------------------------------------------------- Avatar */

// `ring` draws the gradient story ring; `size` is the avatar diameter, the
// ring sits outside it so a ringed and unringed avatar align on the same
// baseline.
export function Avatar({ name = "", src, size = 32, ring = false, className }) {
  const initials =
    name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

  const face = (
    <span
      className={cx(
        "grid place-items-center shrink-0 rounded-full overflow-hidden bg-bg-sunken text-ink-2 font-semibold",
        !ring && "ring-1 ring-line",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.38)) }}
    >
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : initials}
    </span>
  );

  if (!ring) return face;

  return (
    <span
      className="story-ring grid place-items-center shrink-0 rounded-full"
      style={{ width: size + 6, height: size + 6 }}
    >
      <span className="grid place-items-center rounded-full bg-bg" style={{ width: size + 2, height: size + 2 }}>
        {face}
      </span>
    </span>
  );
}

/* ----------------------------------------------------------------- Input */

const FIELD =
  "w-full bg-bg-sunken text-ink placeholder:text-ink-3 border border-transparent rounded " +
  "transition-colors focus:outline-none focus:border-line-strong disabled:opacity-50";

export const Input = forwardRef(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(FIELD, "h-9 px-3 text-base", className)} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ className, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cx(FIELD, "px-3 py-2 text-base resize-none", className)} {...rest} />;
});

export function Field({ label, hint, error, htmlFor, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-semibold text-ink-2 uppercase tracking-wide">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint && <p className="text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

// Pill switch. A real checkbox underneath so it is keyboard operable.
export function Switch({ checked, onChange, label }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        className="sr-only peer"
      />
      <span
        className="w-[44px] h-[26px] rounded-full bg-line transition-colors duration-200
          peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50
          after:content-[''] after:absolute after:top-[3px] after:left-[3px]
          after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm
          after:transition-transform after:duration-200 peer-checked:after:translate-x-[18px]"
      />
    </label>
  );
}

/* ------------------------------------------------------------- Structure */

// Section heading. Weight and a hairline, not a container.
export function SectionHead({ title, action, className }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-4", className)}>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}

// Quiet uppercase label for rail groups.
export function RailLabel({ children, className }) {
  return (
    <p className={cx("text-xs font-semibold text-ink-2", className)}>{children}</p>
  );
}

export function Divider({ className }) {
  return <hr className={cx("border-0 border-t border-line", className)} />;
}

export function Spinner({ size = 18, className }) {
  return (
    <span
      className={cx("inline-block rounded-full border-2 border-current border-t-transparent animate-spin", className)}
      style={{ width: size, height: size }}
    />
  );
}

// Small count/status pill used on covers and inline with titles.
export function Tag({ children, tone = "default", className }) {
  const tones = {
    default: "bg-black/[0.06] dark:bg-white/[0.10] text-ink",
    solid: "bg-solid text-solid-ink",
    accent: "bg-accent text-accent-ink",
    glass: "bg-black/55 text-white backdrop-blur-sm",
  };
  return (
    <span className={cx("inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-2xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}
