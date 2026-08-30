import { useMemo, useState } from "react";
import { CalendarDays, Clock, MapPin, Users, Lock, Sparkles } from "lucide-react";
import { CATEGORIES } from "../data/constants.js";
import { EmptyState } from "./EmptyState.jsx";
import { Card, Button, Badge, cx } from "./ui/Primitives.jsx";
import { Screen, PageHeader } from "./ui/Layout.jsx";

// Events is listing-only for this launch — registration isn't wired to
// anything. The card says so on a disabled control rather than offering a
// live-looking button that silently does nothing.

function EventCard({ e, isMatch, onComingSoon }) {
  const cat = CATEGORIES.find((x) => x.name === e.category);
  const Icon = cat?.icon;
  return (
    <Card className="overflow-hidden flex flex-col">
      {e.imageUrl && (
        <div className="relative w-full aspect-[16/9] bg-surface-inset overflow-hidden border-b border-line">
          <img src={e.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-3.5 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <Badge tone="neutral">{Icon && <Icon size={10} />}{e.category}</Badge>
          {isMatch && <Badge tone="accent"><Sparkles size={9} />For you</Badge>}
        </div>

        <p className="text-sm font-medium text-content leading-snug">{e.title}</p>
        {e.desc && <p className="text-xs text-content-muted mt-1 line-clamp-2 leading-relaxed">{e.desc}</p>}

        <dl className="mt-2.5 space-y-1 text-2xs text-content-muted">
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="shrink-0 text-content-faint" />
            <dd className="truncate">{e.when}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={11} className="shrink-0 text-content-faint" />
            <dd className="truncate">{e.where}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={11} className="shrink-0 text-content-faint" />
            <dd className="tabular-nums">{e.capacity} spots</dd>
          </div>
        </dl>

        <Button
          variant="secondary"
          size="sm"
          icon={Lock}
          onClick={onComingSoon}
          className="w-full mt-3.5 text-content-muted"
        >
          Registration coming soon
        </Button>
      </div>
    </Card>
  );
}

export function EventsScreen({ events, interests, onComingSoon }) {
  const [onlyMine, setOnlyMine] = useState(false);

  const matches = (e) => !!(interests && interests.includes(e.category));

  const sorted = useMemo(() => {
    const list = onlyMine ? events.filter(matches) : events;
    // Interest matches first, order otherwise preserved from the query.
    return [...list].sort((a, b) => (matches(b) ? 1 : 0) - (matches(a) ? 1 : 0));
  }, [events, interests, onlyMine]);

  const matchCount = useMemo(() => events.filter(matches).length, [events, interests]);

  return (
    <Screen>
      <PageHeader
        title="Events"
        subtitle="Browsing is live · registration is not built yet"
        actions={
          matchCount > 0 && (
            <div className="flex p-0.5 gap-0.5 bg-surface-inset border border-line rounded">
              {[
                { key: false, label: "All", n: events.length },
                { key: true, label: "For you", n: matchCount },
              ].map((t) => (
                <button
                  key={String(t.key)}
                  onClick={() => setOnlyMine(t.key)}
                  className={cx(
                    "h-6 px-2 rounded-sm text-2xs font-medium transition-colors",
                    onlyMine === t.key ? "bg-surface-elevated text-content shadow-sm" : "text-content-muted hover:text-content"
                  )}
                >
                  {t.label} <span className="tabular-nums text-content-faint">{t.n}</span>
                </button>
              ))}
            </div>
          )
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto px-5 lg:px-8 py-5">
          {sorted.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={onlyMine ? "Nothing matching your interests" : "No events right now"}
              subtitle={
                onlyMine
                  ? "Switch to All to see everything that's on."
                  : "Check back soon — new events are added regularly."
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {sorted.map((e) => (
                <EventCard key={e.id} e={e} isMatch={matches(e)} onComingSoon={onComingSoon} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Screen>
  );
}
