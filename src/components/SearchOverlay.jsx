import { useState, useMemo } from "react";
import { Search, X, CornerDownLeft, BadgeCheck } from "lucide-react";
import { CATEGORIES } from "../data/constants.js";
import { EmptyState } from "./EmptyState.jsx";
import { Input, Badge, SectionLabel, cx } from "./ui/Primitives.jsx";
import { Screen, PageHeader } from "./ui/Layout.jsx";

// Search, opened from the sidebar, the top bar, or the "/" key.
//
// Adds keyboard navigation, which a command-palette-shaped surface needs to
// justify its shortcut: arrows move the selection, Enter opens it, Escape
// closes. Without those the "/" hint would just be a faster way to reach a
// box you still had to use the mouse on.

export function SearchOverlay({ communities, onOpen, onClose }) {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return communities
      .filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.category.toLowerCase().includes(query) ||
          (c.desc || "").toLowerCase().includes(query)
      )
      .slice(0, 30);
  }, [q, communities]);

  const choose = (c) => { onOpen(c); onClose(); };

  const onKeyDown = (e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((i) => (i + 1) % results.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((i) => (i - 1 + results.length) % results.length); }
    else if (e.key === "Enter") { e.preventDefault(); choose(results[Math.min(cursor, results.length - 1)]); }
  };

  return (
    <Screen>
      <PageHeader title="Search" onBack={onClose} />

      <div className="px-5 lg:px-8 pt-4 pb-3 max-w-2xl w-full mx-auto shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-faint pointer-events-none" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setCursor(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search communities, clubs or categories"
            className="pl-8 pr-8 h-9"
          />
          {q && (
            <button
              onClick={() => { setQ(""); setCursor(0); }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-faint hover:text-content transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-2xl w-full mx-auto px-5 lg:px-8 pb-6">
          {!q && (
            <>
              <SectionLabel className="mb-2">Browse by category</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button key={cat.name} onClick={() => { setQ(cat.name); setCursor(0); }}>
                    <Badge tone="neutral"><cat.icon size={10} />{cat.name}</Badge>
                  </button>
                ))}
              </div>
            </>
          )}

          {q && results.length === 0 && (
            <EmptyState
              icon={Search}
              title={`No matches for "${q}"`}
              subtitle="Try a different name or category."
              compact
            />
          )}

          {results.length > 0 && (
            <>
              <p className="text-2xs text-content-muted tabular-nums mb-2">
                {results.length} {results.length === 1 ? "result" : "results"}
              </p>
              <div className="space-y-0.5">
                {results.map((c, idx) => {
                  const cat = CATEGORIES.find((x) => x.name === c.category);
                  const Icon = cat?.icon;
                  const active = idx === cursor;
                  return (
                    <button
                      key={c.id}
                      onClick={() => choose(c)}
                      onMouseEnter={() => setCursor(idx)}
                      className={cx(
                        "w-full flex items-center gap-2.5 px-2 py-2 rounded text-left transition-colors",
                        active ? "bg-surface-inset" : "hover:bg-surface-inset"
                      )}
                    >
                      <span className="h-7 w-7 rounded shrink-0 grid place-items-center bg-surface-inset border border-line overflow-hidden">
                        {c.avatarUrl
                          ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                          : Icon && <Icon size={13} className="text-content-secondary" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1">
                          <span className="text-sm font-medium text-content truncate">{c.name}</span>
                          {c.official && <BadgeCheck size={12} className="text-accent shrink-0" />}
                        </span>
                        <span className="block text-2xs text-content-muted truncate">
                          {c.category} · {c.members} members
                        </span>
                      </span>
                      {active && <CornerDownLeft size={12} className="text-content-faint shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </Screen>
  );
}
