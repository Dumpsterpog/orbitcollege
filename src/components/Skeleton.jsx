// Lightweight loading placeholders. Use these anywhere content will arrive
// from a network call (once the backend is wired up) instead of showing a
// blank screen or a spinner — they hint at the shape of what's coming.

export function SkeletonLine({ className = "" }) {
  return <div className={`skeleton-shimmer animate-shimmer rounded-full ${className}`} />;
}

export function SkeletonCircle({ size = 40, className = "" }) {
  return (
    <div
      className={`skeleton-shimmer animate-shimmer rounded-full shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 flex gap-3">
      <div className="skeleton-shimmer animate-shimmer w-12 h-12 rounded-2xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-2 py-0.5">
        <SkeletonLine className="h-3.5 w-3/4" />
        <SkeletonLine className="h-2.5 w-full" />
        <SkeletonLine className="h-2.5 w-2/3" />
        <div className="flex items-center gap-3 pt-1">
          <SkeletonLine className="h-2.5 w-12" />
          <SkeletonLine className="h-2.5 w-10" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonStory() {
  return (
    <div className="flex flex-col items-center gap-1.5 w-16 shrink-0">
      <SkeletonCircle size={48} />
      <SkeletonLine className="h-2 w-10" />
    </div>
  );
}

export function SkeletonFeed({ count = 4 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}>
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}
