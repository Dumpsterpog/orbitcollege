import { Orbit as OrbitIcon } from "lucide-react";
import { COLOR_MAP } from "../data/constants.js";

export function Logo({ size = "text-xl" }) {
  const iconSize = size === "text-xl" ? 20 : 26;
  return (
    <span className={`${size} font-bold tracking-tight flex items-center gap-1.5`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <OrbitIcon size={iconSize} className="text-zinc-900 dark:text-zinc-50" strokeWidth={2.4} />
      <span className="text-zinc-900 dark:text-zinc-50">Orbit</span>
    </span>
  );
}

export function Avatar({ label, size = 40, color = "indigo", ring = false }) {
  const c = COLOR_MAP[color] || COLOR_MAP.indigo;
  const inner = (
    <div className={`${c.tint} ${c.text} rounded-full flex items-center justify-center font-semibold shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {label}
    </div>
  );
  if (!ring) return inner;
  return (
    <div className="rounded-full bg-zinc-900 dark:bg-zinc-50 p-[2px] shrink-0" style={{ width: size + 4, height: size + 4 }}>
      <div className="bg-white dark:bg-zinc-950 rounded-full w-full h-full flex items-center justify-center">{inner}</div>
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="animate-pop-in absolute left-1/2 -translate-x-1/2 bottom-24 glass border border-zinc-300/60 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 text-sm px-4 py-2 rounded-full shadow-xl shadow-zinc-400/30 dark:shadow-black/50 z-50 whitespace-nowrap">
      {message}
    </div>
  );
}

export function GuestBanner({ onVerify }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-zinc-900/10 dark:bg-zinc-50/10 border-b border-zinc-900/20 dark:border-zinc-50/20">
      <p className="text-[11px] text-zinc-800 dark:text-zinc-300 dark:text-zinc-600 dark:text-zinc-400 leading-snug">Browsing as guest — verify to join, create or chat</p>
      <button onClick={onVerify} className="text-[11px] text-zinc-900 dark:text-zinc-50 font-semibold underline shrink-0">Verify now</button>
    </div>
  );
}

// Aurora glow — three soft, slow-drifting color blobs behind hero-style
// screens (onboarding, empty states). Gives the surface some life without
// competing with foreground content. Never intercepts clicks. Monochrome
// (zinc) + emerald only — no violet, per the black-and-white rebrand.
export function AuroraBackground({ className = "" }) {
  return (
    <div className={`pointer-events-none select-none absolute inset-0 z-0 overflow-hidden ${className}`}>
      <div className="absolute -top-20 -left-16 w-72 h-72 rounded-full bg-zinc-400/20 dark:bg-zinc-600/20 blur-3xl animate-float-slow" />
      <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-zinc-900/15 dark:bg-zinc-50/15 blur-3xl animate-float-slow-2" />
      <div className="absolute -bottom-16 left-1/4 w-64 h-64 rounded-full bg-zinc-400/10 dark:bg-zinc-600/10 blur-3xl animate-float-slow" />
    </div>
  );
}
