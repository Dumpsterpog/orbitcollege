import { Link } from "react-router-dom";

// A real 404, rather than silently redirecting home. A wrong URL that quietly
// lands you somewhere else is indistinguishable from a broken link.
export default function NotFoundPage() {
  return (
    <main className="min-h-dvh grid place-items-center px-6 py-12 bg-bg text-ink">
      <div className="text-center max-w-[380px]">
        <p className="font-mono text-sm text-ink-3">404</p>
        <h1 className="text-2xl font-bold tracking-tight mt-2">Nothing here</h1>
        <p className="text-md text-ink-2 leading-relaxed mt-3">
          That page does not exist, or it moved.
        </p>
        <Link
          to="/"
          className="inline-grid place-items-center h-10 px-5 mt-6 rounded-full
            bg-solid text-solid-ink text-base font-semibold hover:opacity-90 transition-opacity"
        >
          Back to Orbit
        </Link>
      </div>
    </main>
  );
}
