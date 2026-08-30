import { cx } from "./ui/Primitives.jsx";

// Consistent empty/error moment: icon chip + title + subtitle + optional
// action. Tightened for the dense rebuild — the old version reserved 56px of
// vertical padding and a 64px icon tile, which pushed the actual message
// below the fold inside short panels like the search results list.

export function EmptyState({ icon: Icon, title, subtitle, action, tone = "neutral", compact = false }) {
  return (
    <div className={cx("animate-fade-in flex flex-col items-center text-center px-6", compact ? "py-8" : "py-14")}>
      {Icon && (
        <div
          className={cx(
            "w-10 h-10 rounded-lg border grid place-items-center mb-3",
            tone === "error"
              ? "border-danger/25 bg-danger-subtle"
              : "border-line bg-surface-inset"
          )}
        >
          <Icon size={17} className={tone === "error" ? "text-danger" : "text-content-faint"} />
        </div>
      )}
      <p className="text-sm font-medium text-content">{title}</p>
      {subtitle && <p className="text-xs text-content-muted mt-1.5 max-w-xs leading-relaxed">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
