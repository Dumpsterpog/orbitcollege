import { cx } from "./ui/Primitives.jsx";

// Loading placeholders. Shapes mirror the real components so content does
// not jump when it lands — a skeleton of the wrong size is worse than none.

export function SkeletonLine({ className = "" }) {
  return <div className={cx("bg-bg-sunken rounded animate-pulse", className)} />;
}

export function SkeletonCircle({ size = 34, className = "" }) {
  return (
    <div className={cx("bg-bg-sunken rounded-full shrink-0 animate-pulse", className)} style={{ width: size, height: size }} />
  );
}

// Matches a feed post: byline, media, action row.
export function SkeletonCard() {
  return (
    <div className="py-4 border-b border-line">
      <div className="flex items-center gap-3 pb-3">
        <SkeletonCircle size={34} />
        <div className="flex-1 space-y-1.5">
          <SkeletonLine className="h-3 w-32" />
          <SkeletonLine className="h-2.5 w-20" />
        </div>
      </div>
      <SkeletonLine className="h-[380px] w-full rounded" />
      <div className="flex gap-3 pt-3">
        <SkeletonCircle size={24} /><SkeletonCircle size={24} /><SkeletonCircle size={24} />
      </div>
    </div>
  );
}

export function SkeletonTile() {
  return <SkeletonLine className="aspect-square w-full rounded-none" />;
}

export function SkeletonStory() {
  return (
    <div className="flex flex-col items-center gap-1.5 w-[76px] shrink-0">
      <SkeletonCircle size={62} />
      <SkeletonLine className="h-2.5 w-12" />
    </div>
  );
}

export function SkeletonFeed({ count = 3 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}
