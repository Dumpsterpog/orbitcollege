import { Icon } from "./ui/Primitives.jsx";


export function Maintenance() {
  return (
    <main className="min-h-dvh grid place-items-center px-6 py-12 bg-bg text-ink">
      <div className="w-full max-w-[440px] text-center">
        <span
          aria-hidden="true"
          className="grid place-items-center w-16 h-16 mx-auto mb-7 rounded-2xl
            bg-bg-sunken border border-line"
        >
          <img src="/orbitcollege.png" alt="" width={30} height={30} className="object-contain" style={{ width: 30, height: 30 }} />
        </span>

        <h1 className="text-3xl font-bold tracking-tight leading-tight">
          Orbit is down for maintenance
        </h1>

        <p className="text-md text-ink-2 leading-relaxed mt-3.5">
          We are making some changes and will be back shortly. Sign-in is
          switched off in the meantime, and nothing you have posted is affected.
        </p>

        <span
          className="inline-flex items-center gap-2 mt-7 px-3.5 py-1.5 rounded-full
            border border-line text-xs font-semibold text-ink-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-c-amber motion-safe:animate-pulse" />
          Work in progress
        </span>

        <p className="text-base text-ink-3 mt-8">
          Need something urgently?{" "}
          <a
            href="mailto:team.orbit@gmail.com"
            className="text-ink underline underline-offset-[3px] decoration-ink-3 hover:decoration-ink transition-colors"
          >
            team.orbit@gmail.com
          </a>
        </p>

        <p className="flex items-center justify-center gap-1.5 text-2xs text-ink-3 mt-10">
          <Icon name="lock" size={13} />
          Your account and data are untouched
        </p>
      </div>
    </main>
  );
}
