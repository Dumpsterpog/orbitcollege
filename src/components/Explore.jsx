import { useState, useMemo } from "react";
import { Search, BadgeCheck, Users, X } from "lucide-react";
import { CATEGORIES } from "../data/constants.js";
import { EmptyState } from "./EmptyState.jsx";
import { Card, Input, Badge, cx } from "./ui/Primitives.jsx";
import { Screen, PageHeader } from "./ui/Layout.jsx";

// Explore = the directory. Two sub-tabs: Clubs (official, institutional) and
// Communities (student-started).
//
// Rebuilt as a filter sidebar + result grid. The old version stacked the
// sub-tabs, a search field and a horizontally scrolling pill row above the
// results — three rows of chrome before any content, and the category pills
// were reachable only by horizontal scroll, so most were never seen. The
// categories are now a vertical list that shows all of them at once.

function DirectoryCard({ item, onOpen }) {
  const cat = CATEGORIES.find((x) => x.name === item.category);
  const Icon = cat?.icon;
  return (
    <Card as="button" interactive onClick={() => onOpen(item)} className="p-3.5 flex gap-3">
      <span className="h-9 w-9 rounded shrink-0 grid place-items-center bg-surface-inset border border-line overflow-hidden">
        {item.avatarUrl
          ? <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
          : Icon && <Icon size={16} className="text-content-secondary" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-content truncate flex items-center gap-1">
          {item.name}
          {item.official && <BadgeCheck size={13} className="text-accent shrink-0" />}
        </p>
        <p className="text-xs text-content-muted mt-0.5 line-clamp-2 leading-relaxed">{item.desc}</p>
        <div className="flex items-center gap-2.5 mt-2 text-2xs text-content-faint">
          <span>{item.category}</span>
          <span className="flex items-center gap-1 tabular-nums">
            <Users size={10} />{item.members}
          </span>
        </div>
      </div>
    </Card>
  );
}

export function ExploreScreen({ subTab, setSubTab, clubs, communities, onOpen }) {
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState(null);

  const list = subTab === "clubs" ? clubs : communities;
  const filtered = useMemo(() => {
    let items = list;
    if (filterCat) items = items.filter((c) => c.category === filterCat);
    const q = query.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || (c.desc || "").toLowerCase().includes(q)
      );
    }
    return items;
  }, [list, filterCat, query]);

  // Counts come from the active sub-tab, so a category showing "0" is a real
  // signal that nothing there exists yet rather than a filter artefact.
  const counts = useMemo(() => {
    const m = {};
    list.forEach((c) => { m[c.category] = (m[c.category] || 0) + 1; });
    return m;
  }, [list]);

  const TABS = [
    { key: "clubs", label: "Clubs", count: clubs.length },
    { key: "communities", label: "Communities", count: communities.length },
  ];

  const categoryList = (
    <div className="space-y-0.5">
      <button
        onClick={() => setFilterCat(null)}
        className={cx(
          "w-full flex items-center gap-2 h-7 px-2 rounded-sm text-xs font-medium transition-colors",
          !filterCat ? "bg-surface-inset text-content" : "text-content-secondary hover:text-content hover:bg-surface-inset"
        )}
      >
        <span className="flex-1 text-left">All</span>
        <span className="text-2xs tabular-nums text-content-faint">{list.length}</span>
      </button>
      {CATEGORIES.map((cat) => {
        const active = filterCat === cat.name;
        const Icon = cat.icon;
        return (
          <button
            key={cat.name}
            onClick={() => setFilterCat(active ? null : cat.name)}
            className={cx(
              "w-full flex items-center gap-2 h-7 px-2 rounded-sm text-xs font-medium transition-colors",
              active ? "bg-surface-inset text-content" : "text-content-secondary hover:text-content hover:bg-surface-inset"
            )}
          >
            <Icon size={13} className={cx("shrink-0", active ? "text-accent" : "text-content-faint")} />
            <span className="flex-1 text-left truncate">{cat.name}</span>
            <span className="text-2xs tabular-nums text-content-faint">{counts[cat.name] || 0}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <Screen>
      <PageHeader title="Explore" subtitle="Every official club and student community on campus" />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto px-5 lg:px-8 py-5 flex gap-7 items-start">
          {/* Filter rail */}
          <aside className="hidden lg:block w-44 shrink-0 sticky top-0 space-y-4">
            <div className="flex p-0.5 gap-0.5 bg-surface-inset border border-line rounded">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setSubTab(t.key); setFilterCat(null); }}
                  className={cx(
                    "flex-1 h-6 rounded-sm text-2xs font-medium transition-colors",
                    subTab === t.key ? "bg-surface-elevated text-content shadow-sm" : "text-content-muted hover:text-content"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {categoryList}
          </aside>

          <div className="flex-1 min-w-0">
            {/* Mobile controls — the rail has nowhere to sit below lg. */}
            <div className="lg:hidden flex p-0.5 gap-0.5 bg-surface-inset border border-line rounded mb-3">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setSubTab(t.key); setFilterCat(null); }}
                  className={cx(
                    "flex-1 h-7 rounded-sm text-xs font-medium transition-colors",
                    subTab === t.key ? "bg-surface-elevated text-content shadow-sm" : "text-content-muted"
                  )}
                >
                  {t.label} <span className="tabular-nums text-content-faint">{t.count}</span>
                </button>
              ))}
            </div>

            <div className="relative mb-3">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-faint pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={subTab === "clubs" ? "Search official clubs" : "Search communities"}
                className="pl-8 pr-8"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-content-faint hover:text-content transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="lg:hidden flex gap-1.5 overflow-x-auto no-scrollbar pb-3">
              {filterCat && (
                <button onClick={() => setFilterCat(null)} className="shrink-0">
                  <Badge tone="accent">{filterCat}<X size={10} /></Badge>
                </button>
              )}
              {!filterCat && CATEGORIES.slice(0, 6).map((cat) => (
                <button key={cat.name} onClick={() => setFilterCat(cat.name)} className="shrink-0">
                  <Badge tone="neutral">{cat.name}</Badge>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mb-2.5 h-5">
              <p className="text-2xs text-content-muted tabular-nums">
                {filtered.length} {filtered.length === 1 ? "result" : "results"}
                {filterCat && <span className="hidden lg:inline"> in {filterCat}</span>}
              </p>
              {filterCat && (
                <button
                  onClick={() => setFilterCat(null)}
                  className="hidden lg:inline text-2xs text-content-muted hover:text-content transition-colors"
                >
                  Clear filter
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={Search}
                title={`No ${subTab} found`}
                subtitle="Try a different search term, or clear the category filter."
                compact
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {filtered.map((item) => (
                  <DirectoryCard key={item.id} item={item} onOpen={onOpen} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}
