import { cx } from "./ui/Primitives.jsx";

// Loading placeholders. Shapes deliberately mirror the real components they
// stand in for (same heights, same radii) so content doesn't jump when it
// arrives — a skeleton that's the wrong size is worse than none.

export function SkeletonLine({ className = "" }) {
  return <div className={cx("skeleton-shimmer animate-shimmer rounded-sm", className)} />;
}

export function SkeletonCircle({ size = 28, className = "" }) {
  return (
    <div
      className={cx("skeleton-shimmer animate-shimmer rounded-full shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}

// Matches the post card in Home's feed.
export function SkeletonCard() {
  return (
    <div className="bg-surface-elevated border border-line rounded-lg p-3.5">
      <div className="flex items-center gap-2.5 mb-3">
        <SkeletonCircle size={26} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <SkeletonLine className="h-2.5 w-28" />
          <SkeletonLine className="h-2 w-16" />
        </div>
      </div>
      <div className="space-y-1.5">
        <SkeletonLine className="h-2.5 w-full" />
        <SkeletonLine className="h-2.5 w-4/5" />
      </div>
    </div>
  );
}

// Matches the community tile in Explore / Profile grids.
export function SkeletonTile() {
  return (
    <div className="bg-surface-elevated border border-line rounded-lg p-3.5 flex items-start gap-2.5">
      <SkeletonLine className="h-8 w-8 rounded" />
      <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
        <SkeletonLine className="h-2.5 w-3/4" />
        <SkeletonLine className="h-2 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonStory() {
  return (
    <div className="flex flex-col items-center gap-1.5 w-14 shrink-0">
      <SkeletonCircle size={40} />
      <SkeletonLine className="h-2 w-9" />
    </div>
  );
}

export function SkeletonFeed({ count = 4 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`animate-fade-in stagger-${Math.min(i + 1, 8)}`}>
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}
