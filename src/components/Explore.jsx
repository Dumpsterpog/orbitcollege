import { useState, useMemo, useEffect } from "react";
import { CATEGORIES } from "../data/constants.js";
import { communityTrendScore } from "../utils/helpers.js";
import { Icon, Avatar, Button, Input, Tag, cx } from "./ui/Primitives.jsx";
import { Screen, Column, Empty } from "./ui/Layout.jsx";

// Explore -- a directory.
//
// This was a dense tile mosaic copied from a reference whose tiles are all
// photographs. Communities here rarely have cover art, so it degraded into a
// screen of tinted squares each holding one category glyph: maximum space for
// minimum information. It is a list of rows now. See the note on Row.

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

// Category hue → a soft wash for the coverless tiles. Kept as full class
// strings so Tailwind's scanner can see them.
const WASH = {
  "text-c-blue": "from-c-blue/15 to-c-blue/5",
  "text-c-violet": "from-c-violet/15 to-c-violet/5",
  "text-c-pink": "from-c-pink/15 to-c-pink/5",
  "text-c-orange": "from-c-orange/15 to-c-orange/5",
  "text-c-amber": "from-c-amber/15 to-c-amber/5",
  "text-c-green": "from-c-green/15 to-c-green/5",
  "text-c-teal": "from-c-teal/15 to-c-teal/5",
  "text-c-red": "from-c-red/15 to-c-red/5",
};

// A row, not a tile.
//
// This was a photo grid with a masonry "tall" variant, which assumed every
// community has cover art worth looking at. Almost none do, so the grid was
// mostly tinted squares holding a category glyph -- a lot of screen spent
// saying very little -- and with only three results the row-span-2 variant had
// no sibling to constrain it and grew to the height of the viewport.
//
// A row shows strictly more per community (name, blurb, category, count, and
// a Join that does not need a hover to find) in a fraction of the height, and
// it looks the same whether there are two communities or two hundred.
function Row({ c, joined, onOpen, onJoin }) {
  const cat = CATEGORIES.find((x) => x.name === c.category);
  const wash = WASH[cat?.tint] || WASH["text-c-blue"];

  return (
    <div
      onClick={() => onOpen(c)}
      className="group flex items-center gap-3.5 px-3 sm:px-4 py-3 cursor-pointer
        border-b border-line last:border-0 hover:bg-bg-sunken/60 transition-colors"
    >
      <span className="shrink-0 w-11 h-11 rounded-xl overflow-hidden">
        {c.avatarUrl ? (
          <img src={c.avatarUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <span className={cx("w-full h-full grid place-items-center bg-gradient-to-br", wash)}>
            <Icon name={cat?.msr || "groups"} size={22} className={cx(cat?.tint, "opacity-90")} />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-md font-semibold text-ink truncate group-hover:opacity-70 transition-opacity">
            {c.name.split(" — ")[0]}
          </span>
          {c.official && <Icon name="verified" size={15} className="text-c-blue shrink-0" />}
        </span>
        {c.desc && <span className="block text-base text-ink-2 truncate mt-0.5">{c.desc}</span>}
        <span className="block text-2xs text-ink-3 truncate mt-0.5">
          {compact(c.members)} {c.members === 1 ? "member" : "members"} · {c.category}
        </span>
      </span>

      <button
        onClick={(e) => { e.stopPropagation(); onJoin(c.id); }}
        className={cx(
          "shrink-0 inline-flex items-center justify-center h-8 px-4 rounded-full text-xs font-semibold transition-colors",
          joined
            ? "text-ink-2 ring-1 ring-line hover:ring-line-strong"
            : "bg-solid text-solid-ink hover:opacity-90"
        )}
      >
        {joined ? "Joined" : "Join"}
      </button>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3.5 px-3 sm:px-4 py-3 border-b border-line last:border-0">
      <div className="w-11 h-11 rounded-xl bg-bg-sunken animate-pulse shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-3.5 w-2/5 rounded bg-bg-sunken animate-pulse" />
        <div className="h-3 w-3/5 rounded bg-bg-sunken animate-pulse" />
      </div>
      <div className="w-16 h-8 rounded-full bg-bg-sunken animate-pulse shrink-0" />
    </div>
  );
}

export function ExploreScreen({ subTab, setSubTab, clubs, communities, onOpen, joinedIds = [], onJoinToggle, onCreate }) {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [cat, setCat] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  const all = useMemo(() => [...clubs, ...communities], [clubs, communities]);

  const scoped = scope === "clubs" ? clubs : scope === "communities" ? communities : all;

  const results = useMemo(() => {
    let items = scoped;
    if (cat) items = items.filter((c) => c.category === cat);
    const q = query.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          (c.desc || "").toLowerCase().includes(q)
      );
    }
    return [...items].sort((a, b) => communityTrendScore(b) - communityTrendScore(a));
  }, [scoped, cat, query]);

  const counts = useMemo(() => {
    const m = {};
    scoped.forEach((c) => { m[c.category] = (m[c.category] || 0) + 1; });
    return m;
  }, [scoped]);

  const SCOPES = [
    { key: "all", label: "All", n: all.length },
    { key: "clubs", label: "Clubs", n: clubs.length },
    { key: "communities", label: "Communities", n: communities.length },
  ];

  return (
    <Screen>
      <Column className="pt-8 pb-16">
        {/* Search is the primary control on a discovery page, so it leads —
            large, centred, and the only element above the fold that has any
            fill to it. */}
        <div className="max-w-xl mx-auto">
          <h1 className="text-3xl font-bold text-ink text-center">
            Find your{" "}
            <span className="text-accent">
              people
            </span>
          </h1>
          <p className="text-base text-ink-2 text-center mt-2">
            Every club and student community on campus.
          </p>

          <div className="relative mt-6">
            <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search communities, clubs or interests"
              className="h-12 pl-12 pr-11 rounded-full text-md"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 grid place-items-center w-6 h-6 rounded-full bg-ink-3/25 text-ink hover:bg-ink-3/40"
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </div>

          {/* Creating a community belongs here rather than in the nav rail:
              this is the page you are on when you go looking for one and do
              not find it. */}
          <p className="text-base text-ink-2 text-center mt-4">
            Not here yet?{" "}
            <button onClick={onCreate} className="font-semibold text-accent hover:opacity-70">
              Start a community
            </button>
            .
          </p>
        </div>

        {/* Scope + category filters. Pills only — no segmented control with
            a box around it. */}
        <div className="flex flex-wrap items-center gap-2 mt-8">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              onClick={() => { setScope(s.key); setSubTab(s.key === "all" ? subTab : s.key); }}
              className={cx(
                "h-8 px-4 rounded-full text-xs font-semibold transition-colors",
                scope === s.key ? "bg-solid text-solid-ink" : "text-ink-2 hover:bg-bg-sunken hover:text-ink"
              )}
            >
              {s.label}
              <span className={cx("ml-1.5 tabular-nums", scope === s.key ? "opacity-60" : "text-ink-3")}>{s.n}</span>
            </button>
          ))}
          <span className="w-px h-5 bg-line mx-1" />
          <button
            onClick={() => setCat(null)}
            className={cx(
              "h-8 px-3.5 rounded-full text-xs font-semibold transition-colors",
              !cat ? "bg-bg-sunken text-ink" : "text-ink-2 hover:bg-bg-sunken hover:text-ink"
            )}
          >
            All topics
          </button>
          {CATEGORIES.filter((c) => counts[c.name]).map((c) => (
            <button
              key={c.name}
              onClick={() => setCat(cat === c.name ? null : c.name)}
              className={cx(
                "inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-semibold transition-colors",
                cat === c.name ? "bg-bg-sunken text-ink ring-1 ring-line-strong" : "text-ink-2 hover:bg-bg-sunken hover:text-ink"
              )}
            >
              <Icon name={c.msr} size={15} className={c.tint} />
              {c.name}
            </button>
          ))}
        </div>

        <p className="text-xs text-ink-2 mt-6 mb-3 tabular-nums">
          {loading
            ? "Loading communities…"
            : <>{results.length} {results.length === 1 ? "result" : "results"}{cat && <> in <span className="font-semibold text-ink">{cat}</span></>}</>}
        </p>

        {loading ? (
          <div className="rounded-2xl border border-line overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}
          </div>
        ) : results.length === 0 ? (
          <Empty
            icon="search_off"
            title="Nothing found"
            body="Try a different search, or clear the topic filter."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button tone="blue" onClick={() => { setQuery(""); setCat(null); }}>Clear filters</Button>
                <Button variant="outline" onClick={onCreate}>Start a community</Button>
              </div>
            }
          />
        ) : (
          <div className="rounded-2xl border border-line overflow-hidden">
            {results.map((c) => (
              <Row
                key={c.id}
                c={c}
                joined={joinedIds.includes(c.id)}
                onOpen={onOpen}
                onJoin={onJoinToggle}
              />
            ))}
          </div>
        )}
      </Column>
    </Screen>
  );
}
