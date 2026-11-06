import { useEffect } from "react";
import { Icon, IconButton, cx } from "./Primitives.jsx";

export function Screen({ children, className }) {
  return <div className={cx("flex-1 min-h-0 overflow-y-auto bg-bg", className)}>{children}</div>;
}

// Centred column. `feed` is the 470px reading measure; `wide` is the full
// shell for directory and grid pages.
export function Column({ width = "wide", className, children }) {
  const w = width === "feed" ? "max-w-feed" : width === "prose" ? "max-w-prose" : "max-w-shell";
  return <div className={cx("w-full mx-auto px-4 sm:px-6", w, className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, onBack, actions, sticky = true, className }) {
  return (
    <header
      className={cx(
        "bg-bg/85 backdrop-blur-md border-b border-line",
        sticky && "sticky top-0 z-20",
        className
      )}
    >
      <div className="max-w-shell mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        {onBack && <IconButton icon="arrow_back" label="Back" size={20} onClick={onBack} className="-ml-2" />}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-ink truncate leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-ink-2 truncate">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

// Centred dialog. Escape closes, body scroll locks, backdrop click dismisses.
export function Modal({ title, onClose, children, footer, width = "max-w-sm" }) {
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
      className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cx("w-full bg-bg-raised rounded-lg overflow-hidden animate-pop shadow-pop", width)}
      >
        {title && (
          <div className="h-12 px-2 flex items-center border-b border-line">
            <h2 className="flex-1 text-center text-base font-semibold text-ink px-8 truncate">{title}</h2>
            <IconButton icon="close" label="Close" size={20} onClick={onClose} />
          </div>
        )}
        <div className="p-4">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-line">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon, tint = "text-c-violet", title, body, action, className }) {
  return (
    <div className={cx("flex flex-col items-center text-center py-16 px-6", className)}>
      {icon && (
        <span className="grid place-items-center w-16 h-16 rounded-full bg-bg-sunken mb-4">
          <Icon name={icon} size={32} className={tint} />
        </span>
      )}
      <p className="text-xl font-semibold text-ink">{title}</p>
      {body && <p className="text-base text-ink-2 mt-2 max-w-xs leading-relaxed">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
