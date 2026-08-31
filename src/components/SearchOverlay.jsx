import { useState, useMemo } from "react";
import { CATEGORIES } from "../data/constants.js";
import { communityTrendScore } from "../utils/helpers.js";
import { Icon, Avatar, Input, IconButton, cx } from "./ui/Primitives.jsx";
import { Screen, Column, Empty } from "./ui/Layout.jsx";

// Search. Arrow keys move the selection, Enter opens it, Escape closes —
// a search surface that can only be driven by mouse isn't finished.

// Category tint for the coverless marks, as whole class strings.
const MARK = {
  "text-c-blue": "bg-c-blue/10", "text-c-violet": "bg-c-violet/10",
  "text-c-pink": "bg-c-pink/10", "text-c-orange": "bg-c-orange/10",
  "text-c-amber": "bg-c-amber/10", "text-c-green": "bg-c-green/10",
  "text-c-teal": "bg-c-teal/10", "text-c-red": "bg-c-red/10",
};

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

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

  const trending = useMemo(
    () => [...communities].sort((a, b) => communityTrendScore(b) - communityTrendScore(a)).slice(0, 9),
    [communities]
  );

  const choose = (c) => { onOpen(c); onClose(); };

  const onKeyDown = (e) => {
    if (e.key === "Escape") return onClose();
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((i) => (i + 1) % results.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((i) => (i - 1 + results.length) % results.length); }
    else if (e.key === "Enter") { e.preventDefault(); choose(results[Math.min(cursor, results.length - 1)]); }
  };

  return (
    <Screen>
      <Column className="max-w-2xl pt-8 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-ink">Search</h1>
            <p className="text-base text-ink-2 mt-1">
              {communities.length} communities and clubs across campus.
            </p>
          </div>
          {/* Close, not "Done". Nothing is being confirmed here, and a text
              Done is a modal affordance on a page that isn't a modal. */}
          <IconButton icon="close" label="Close search" size={22} onClick={onClose} className="shrink-0" />
        </div>

        <div className="relative">
          <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setCursor(0); }}
            onKeyDown={onKeyDown}
            placeholder="Communities, clubs or interests"
            className="h-12 pl-12 pr-11 rounded-full text-md"
          />
          {q && (
            <button
              onClick={() => { setQ(""); setCursor(0); }}
              aria-label="Clear"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 grid place-items-center w-6 h-6 rounded-full bg-ink-3/25 text-ink hover:bg-ink-3/40"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>

        {!q && (
          <div className="mt-8 space-y-8">
            <div>
              <p className="text-2xs font-semibold text-ink-2 uppercase tracking-wider mb-3">Browse by topic</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => { setQ(c.name); setCursor(0); }}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold text-ink-2 bg-bg-sunken hover:text-ink transition-colors"
                  >
                    <Icon name={c.msr} size={16} className={c.tint} />{c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* The default surface. An empty search page that only offers
                filters gives you nothing to look at; this is the equivalent
                of a discovery grid — real communities, tappable, ranked by
                activity. */}
            {trending.length > 0 && (
              <div>
                <p className="text-2xs font-semibold text-ink-2 uppercase tracking-wider mb-3">Trending now</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {trending.map((c) => {
                    const cat = CATEGORIES.find((x) => x.name === c.category);
                    return (
                      <button
                        key={c.id}
                        onClick={() => choose(c)}
                        className="card group p-3 flex flex-col items-start gap-2 text-left"
                      >
                        {c.avatarUrl ? (
                          <Avatar src={c.avatarUrl} name={c.name} size={40} />
                        ) : (
                          <span className={cx("grid place-items-center w-10 h-10 rounded-full shrink-0", MARK[cat?.tint] || MARK["text-c-blue"])}>
                            <Icon name={cat?.msr || "groups"} size={20} className={cat?.tint} />
                          </span>
                        )}
                        <span className="min-w-0 w-full">
                          <span className="flex items-center gap-1 min-w-0">
                            <span className="text-base font-bold text-ink truncate group-hover:opacity-70">
                              {c.name.split(" — ")[0]}
                            </span>
                            {c.official && <Icon name="verified" size={14} className="text-c-blue shrink-0" />}
                          </span>
                          <span className="flex items-center gap-1 text-xs mt-0.5">
                            <Icon name={cat?.msr || "groups"} size={13} className={cat?.tint} />
                            <span className={cx("font-semibold truncate", cat?.tint)}>{c.category}</span>
                            <span className="text-ink-3">·</span>
                            <span className="text-ink-2 tabular-nums shrink-0">{compact(c.members)}</span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {q && results.length === 0 && (
          <Empty icon="search_off" title={`No results for "${q}"`} body="Try a different name or topic." />
        )}

        {results.length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-ink-2 tabular-nums mb-2">{results.length} results</p>
            {results.map((c, i) => {
              const cat = CATEGORIES.find((x) => x.name === c.category);
              const on = i === cursor;
              return (
                <button
                  key={c.id}
                  onClick={() => choose(c)}
                  onMouseEnter={() => setCursor(i)}
                  className={cx(
                    "w-full flex items-center gap-3 px-2 py-2.5 rounded text-left transition-colors",
                    on ? "bg-bg-sunken" : "hover:bg-bg-sunken"
                  )}
                >
                  {c.avatarUrl ? (
                    <Avatar src={c.avatarUrl} name={c.name} size={44} />
                  ) : (
                    <span className="grid place-items-center w-11 h-11 rounded-full bg-bg-sunken ring-1 ring-line shrink-0">
                      <Icon name={cat?.msr || "groups"} size={22} className={cat?.tint} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="flex items-center gap-1">
                      <span className="text-base font-semibold text-ink truncate">{c.name}</span>
                      {c.official && <Icon name="verified" size={15} className="text-c-blue shrink-0" />}
                    </span>
                    <span className="block text-xs text-ink-2 truncate">
                      {c.category} · {compact(c.members)} members
                    </span>
                  </span>
                  {on && <Icon name="keyboard_return" size={16} className="text-ink-3 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </Column>
    </Screen>
  );
}
