import { useState, useMemo } from "react";
import { CATEGORIES } from "../data/constants.js";
import { communityTrendScore } from "../utils/helpers.js";
import { Icon, Avatar, Button, Input, Tag, cx } from "./ui/Primitives.jsx";
import { Screen, Column, Empty } from "./ui/Layout.jsx";

// Explore — a discovery grid, not a directory of bordered cards.
//
// The reference's explore is a dense tile mosaic: no borders, no gaps of
// dead space, tiles butted up against each other so the images form the
// layout. That only works when every tile has an image. Communities here
// often don't, so a tile falls back to its category glyph on a tinted wash
// — still full-bleed, still no border, and the colour keeps the mosaic from
// going grey when covers are missing.

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

function Tile({ c, joined, onOpen, onJoin, tall = false }) {
  const cat = CATEGORIES.find((x) => x.name === c.category);
  const wash = WASH[cat?.tint] || WASH["text-c-blue"];

  return (
    <button
      onClick={() => onOpen(c)}
      className={cx(
        "group relative overflow-hidden bg-bg-sunken text-left",
        tall ? "row-span-2 aspect-[1/2.02]" : "aspect-square"
      )}
    >
      {c.avatarUrl ? (
        <img src={c.avatarUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <span className={cx("w-full h-full grid place-items-center bg-gradient-to-br", wash)}>
          <Icon name={cat?.msr || "groups"} size={tall ? 72 : 44} className={cx(cat?.tint, "opacity-80")} />
        </span>
      )}

      {/* Always-on label strip. The reference hides everything until hover,
          which works when the image is the content; here the name IS the
          content, so it stays legible at rest and the overlay only adds
          the secondary detail. */}
      <span className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/75 via-black/35 to-transparent">
        <span className="block text-base font-semibold text-white truncate drop-shadow-sm">
          {c.name.split(" — ")[0]}
        </span>
        <span className="block text-xs text-white/80 truncate">{compact(c.members)} members</span>
      </span>

      {c.official && (
        <span className="absolute top-2.5 right-2.5">
          <Icon name="verified" size={20} className="text-white drop-shadow" />
        </span>
      )}

      <span
        className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200
          grid place-items-center gap-2 p-4"
      >
        <span className="text-center">
          <span className="block text-base font-semibold text-white line-clamp-2">{c.name}</span>
          <span className="block text-xs text-white/75 mt-1 line-clamp-2">{c.desc}</span>
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onJoin(c.id); }}
            className={cx(
              "inline-flex items-center justify-center h-8 px-4 mt-3 rounded-full text-xs font-semibold transition-colors",
              joined ? "bg-white/15 text-white ring-1 ring-white/40" : "bg-white text-black hover:bg-white/90"
            )}
          >
            {joined ? "Joined" : "Join"}
          </span>
        </span>
      </span>
    </button>
  );
}

export function ExploreScreen({ subTab, setSubTab, clubs, communities, onOpen, joinedIds = [], onJoinToggle }) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [cat, setCat] = useState(null);

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
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-c-violet via-c-pink to-c-orange">
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
          {results.length} {results.length === 1 ? "result" : "results"}
          {cat && <> in <span className="font-semibold text-ink">{cat}</span></>}
        </p>

        {results.length === 0 ? (
          <Empty
            icon="search_off"
            title="Nothing found"
            body="Try a different search, or clear the topic filter."
            action={<Button variant="soft" onClick={() => { setQuery(""); setCat(null); }}>Clear filters</Button>}
          />
        ) : (
          // Mosaic: every third tile is double-height, which breaks the grid
          // out of a flat checkerboard without needing per-item art direction.
          <div className="grid grid-cols-2 md:grid-cols-3 auto-rows-[minmax(0,1fr)] gap-1 sm:gap-2">
            {results.map((c, i) => (
              <Tile
                key={c.id}
                c={c}
                joined={joinedIds.includes(c.id)}
                onOpen={onOpen}
                onJoin={onJoinToggle}
                tall={i % 7 === 0}
              />
            ))}
          </div>
        )}
      </Column>
    </Screen>
  );
}
