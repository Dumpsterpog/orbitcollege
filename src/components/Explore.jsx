import { useState, useMemo } from "react";
import { CATEGORIES } from "../data/constants.js";
import { communityTrendScore } from "../utils/helpers.js";
import { EmptyState } from "./EmptyState.jsx";
import { Icon, cx } from "./ui/Primitives.jsx";

// Explore, rebuilt to the Stitch explore.html mock: headline + pill filter
// row, a "Featured This Week" section, and the mock's community card —
// h-48 cover with a gradient scrim, title + type chip, clamped description,
// then a member pill and a Join button on a hairline footer.
//
// The mock stops after three featured cards. A directory that only ever
// shows three entries isn't usable once there are sixty communities, so the
// full listing continues below in the same card language, with the search
// and category filter the old Explore had. Everything the mock specifies is
// matched; the rest is the mock's own system extended.
//
// Filter pills are All / Clubs / Communities. The mock's "Societies" and
// "Sports" aren't types in this data model — `official` splits clubs from
// student-run communities, and Sports is one of the sixteen categories — so
// those two live in the category row rather than being faked as types.

const FILTERS = [
  { key: "all", label: "All" },
  { key: "clubs", label: "Clubs" },
  { key: "communities", label: "Communities" },
];

function PillButton({ active, onClick, children, className }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "px-5 py-2 rounded-full text-label-md font-medium transition-all whitespace-nowrap",
        active
          ? "bg-primary text-on-primary shadow-sm"
          : "bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-high",
        className
      )}
    >
      {children}
    </button>
  );
}

function CommunityCard({ c, joined, featured, onOpen, onJoin }) {
  const cat = CATEGORIES.find((x) => x.name === c.category);
  const typeLabel = c.official ? "Club" : "Community";

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden relative group border border-outline-variant/20">
      {/* Cover */}
      <button onClick={() => onOpen(c)} className="h-48 w-full bg-surface-container-high relative block text-left">
        {c.avatarUrl ? (
          <img src={c.avatarUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          // No cover uploaded — the category glyph on a tinted field, rather
          // than a stock photo standing in for a real community's identity.
          <span className="w-full h-full grid place-items-center bg-gradient-to-br from-surface-container-high to-surface-variant">
            {cat && <Icon name={cat.msr} size={56} className={cx(cat.tint, "opacity-60")} />}
          </span>
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent pointer-events-none" />
        {featured && (
          <span className="absolute bottom-4 left-4 bg-primary text-on-primary px-3 py-1 rounded-full text-label-sm font-medium flex items-center gap-1 shadow-sm">
            <Icon name="stars" size={16} />Featured
          </span>
        )}
      </button>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-2 mb-2">
          <button onClick={() => onOpen(c)} className="text-left min-w-0">
            <h3 className="text-headline-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
              {c.name}
            </h3>
          </button>
          <span className="bg-surface-container-low text-on-surface-variant px-2 py-1 rounded text-label-sm font-medium shrink-0">
            {typeLabel}
          </span>
        </div>

        <p className="text-body-sm text-on-surface-variant line-clamp-2 mb-4 flex-1">{c.desc}</p>

        <div className="flex items-center justify-between gap-2 pt-4 border-t border-outline-variant/20">
          <span className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full">
            <Icon name="group" size={18} className="text-icon-blue" />
            <span className="text-label-md font-medium text-on-surface-variant tabular-nums">{c.members}</span>
          </span>
          <button
            onClick={() => onJoin(c.id)}
            className={cx(
              "px-5 py-2 rounded-full text-label-md font-medium transition-all shrink-0",
              joined
                ? "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                : "bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary"
            )}
          >
            {joined ? "Joined" : "Join"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ExploreScreen({ subTab, setSubTab, clubs, communities, onOpen, joinedIds = [], onJoinToggle }) {
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState(null);

  const all = useMemo(() => [...clubs, ...communities], [clubs, communities]);

  // subTab is owned by App.jsx ("clubs" | "communities"); the All pill is
  // local so the shared state keeps meaning for anything else reading it.
  const [scope, setScope] = useState("all");

  const scoped = useMemo(() => {
    if (scope === "clubs") return clubs;
    if (scope === "communities") return communities;
    return all;
  }, [scope, clubs, communities, all]);

  const featured = useMemo(
    () => [...all].sort((a, b) => communityTrendScore(b) - communityTrendScore(a)).slice(0, 3),
    [all]
  );

  const filtered = useMemo(() => {
    let items = scoped;
    if (filterCat) items = items.filter((c) => c.category === filterCat);
    const q = query.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          (c.desc || "").toLowerCase().includes(q)
      );
    }
    return items;
  }, [scoped, filterCat, query]);

  const join = (id) => onJoinToggle?.(id);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-surface">
      <div className="px-md lg:px-margin-desktop py-xl">
        <div className="max-w-max-width w-full mx-auto space-y-6 lg:space-y-10">

          {/* Header + filters */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4 lg:mb-8">
            <div>
              <h1 className="text-headline-xl font-bold text-on-surface mb-2">Explore Communities</h1>
              <p className="text-body-lg text-on-surface-variant max-w-2xl">
                Discover student organizations, clubs, and groups to join and enrich your campus experience.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map((f) => (
                <PillButton
                  key={f.key}
                  active={scope === f.key}
                  onClick={() => {
                    setScope(f.key);
                    if (f.key !== "all") setSubTab(f.key);
                  }}
                >
                  {f.label}
                </PillButton>
              ))}
            </div>
          </div>

          {/* Featured */}
          {featured.length > 0 && !query && !filterCat && scope === "all" && (
            <section aria-labelledby="featured-communities-heading">
              <h2 id="featured-communities-heading" className="text-headline-md font-semibold text-on-surface mb-6">
                Featured This Week
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featured.map((c, i) => (
                  <CommunityCard
                    key={c.id}
                    c={c}
                    featured={i === 0}
                    joined={joinedIds.includes(c.id)}
                    onOpen={onOpen}
                    onJoin={join}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Full directory */}
          <section aria-labelledby="all-communities-heading">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
              <h2 id="all-communities-heading" className="text-headline-md font-semibold text-on-surface">
                {scope === "clubs" ? "All Clubs" : scope === "communities" ? "All Communities" : "Browse Everything"}
              </h2>
              <div className="relative w-full lg:w-80">
                <Icon
                  name="search"
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search communities"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-full py-2 pl-11 pr-10 text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                  >
                    <Icon name="close" size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Category pills — same pill language as the header filters. */}
            <div className="flex gap-2 flex-wrap mb-6">
              <PillButton active={!filterCat} onClick={() => setFilterCat(null)} className="!px-4 !py-1.5">
                All categories
              </PillButton>
              {CATEGORIES.map((cat) => (
                <PillButton
                  key={cat.name}
                  active={filterCat === cat.name}
                  onClick={() => setFilterCat(filterCat === cat.name ? null : cat.name)}
                  className="!px-4 !py-1.5"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Icon
                      name={cat.msr}
                      size={16}
                      className={filterCat === cat.name ? "text-on-primary" : cat.tint}
                    />
                    {cat.name}
                  </span>
                </PillButton>
              ))}
            </div>

            <p className="text-body-sm text-on-surface-variant mb-6 tabular-nums">
              {filtered.length} {filtered.length === 1 ? "result" : "results"}
              {filterCat && ` in ${filterCat}`}
            </p>

            {filtered.length === 0 ? (
              <EmptyState
                title="Nothing matches that"
                subtitle="Try a different search term, or clear the category filter."
                compact
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((c) => (
                  <CommunityCard
                    key={c.id}
                    c={c}
                    joined={joinedIds.includes(c.id)}
                    onOpen={onOpen}
                    onJoin={join}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
