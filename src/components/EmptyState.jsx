// Reusable empty/error state — replaces bare "no results" text with a
// friendly, consistent moment (icon chip + title + subtitle + optional
// action). Used across search, chat, and feed empty cases.

export function EmptyState({ icon: Icon, title, subtitle, action, tone = "neutral" }) {
  const toneRing = tone === "error" ? "border-zinc-900/20 dark:border-zinc-50/20 bg-zinc-900/5 dark:bg-zinc-50/5" : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900";
  const toneIcon = tone === "error" ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400 dark:text-zinc-600";
  return (
    <div className="animate-fade-in-up flex flex-col items-center text-center py-14 px-6">
      <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-4 ${toneRing}`}>
        {Icon && <Icon size={26} className={toneIcon} />}
      </div>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {subtitle && <p className="text-xs text-zinc-500 mt-1.5 max-w-[240px] leading-relaxed">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
