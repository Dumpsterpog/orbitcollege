import { useEffect } from "react";
import { ChevronLeft, X } from "lucide-react";
import { IconButton, cx } from "./Primitives.jsx";

// Centred dialog. `fixed`, not `absolute`: the old modals were positioned
// against the phone-frame card, and with that frame gone an absolute overlay
// would only cover its nearest positioned ancestor instead of the viewport.
// Escape closes, and body scroll is locked while open.
export function Modal({ title, onClose, children, footer, max = "max-w-sm" }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cx(
          "w-full bg-surface-elevated border border-line rounded-lg shadow-2xl overflow-hidden animate-pop-in",
          max
        )}
      >
        <div className="flex items-center gap-3 h-11 px-4 border-b border-line">
          <h2 className="text-sm font-semibold text-content flex-1 min-w-0 truncate">{title}</h2>
          <IconButton icon={X} label="Close" size="sm" onClick={onClose} className="-mr-1.5" />
        </div>
        <div className="p-4">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-line bg-surface-subtle">{footer}</div>}
      </div>
    </div>
  );
}

// Page frame shared by every rebuilt screen.
//
// Each old screen re-declared its own scroll container and header padding
// inline, so headers sat at slightly different heights and some scrolled away
// with the content while others didn't. Screen owns the flex/overflow
// contract and PageHeader is a non-shrinking sticky bar, so every page lines
// up and the header stays put while only the body scrolls.

export function Screen({ className, children }) {
  return (
    <div className={cx("flex-1 min-h-0 flex flex-col bg-surface", className)}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, onBack, className }) {
  return (
    <header
      className={cx(
        "shrink-0 h-12 flex items-center gap-3 px-5 lg:px-8 border-b border-line bg-surface/85 backdrop-blur-sm",
        className
      )}
    >
      {onBack && <IconButton icon={ChevronLeft} label="Back" size="sm" onClick={onBack} className="-ml-1.5" />}
      <div className="min-w-0 flex-1">
        <h1 className="text-sm font-semibold text-content truncate leading-tight">{title}</h1>
        {subtitle && <p className="text-2xs text-content-muted truncate leading-tight mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
    </header>
  );
}

// Constrained reading column — text-heavy screens (Settings, Profile) use
// this so lines don't stretch edge to edge on a wide monitor.
export function PageBody({ max = "3xl", className, children }) {
  const widths = { md: "max-w-md", xl: "max-w-xl", "2xl": "max-w-2xl", "3xl": "max-w-3xl", "5xl": "max-w-5xl" };
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className={cx("w-full mx-auto px-5 lg:px-8 py-6", widths[max], className)}>{children}</div>
    </div>
  );
}

// Titled block used down Settings. The divider belongs to the group, not to
// each row, so a group's last row never draws a trailing line.
export function SettingsGroup({ title, description, children }) {
  return (
    <section className="space-y-2.5">
      <div>
        <h2 className="text-xs font-semibold text-content">{title}</h2>
        {description && <p className="text-2xs text-content-muted mt-0.5">{description}</p>}
      </div>
      <div className="bg-surface-elevated border border-line rounded-lg divide-y divide-line overflow-hidden">
        {children}
      </div>
    </section>
  );
}

export function SettingsRow({ label, description, control, onClick, danger = false }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { onClick, type: "button" } : {})}
      className={cx(
        "w-full flex items-center gap-4 px-3.5 py-3 text-left",
        onClick && "transition-colors hover:bg-surface-inset focus-visible:outline-none focus-visible:bg-surface-inset"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cx("text-sm font-medium", danger ? "text-danger" : "text-content")}>{label}</p>
        {description && <p className="text-2xs text-content-muted mt-0.5 leading-relaxed">{description}</p>}
      </div>
      {control && <div className="shrink-0">{control}</div>}
    </Tag>
  );
}

// Accessible switch — a real button with aria-checked rather than a styled
// checkbox, so it announces correctly and is keyboard-operable.
export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-5 w-9 rounded-full transition-colors shrink-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-content/25 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        checked ? "bg-solid" : "bg-surface-inset border border-line"
      )}
    >
      <span
        className={cx(
          "absolute top-0.5 h-4 w-4 rounded-full transition-transform",
          checked ? "translate-x-[18px] bg-solid-fg" : "translate-x-0.5 bg-content-faint"
        )}
      />
    </button>
  );
}
