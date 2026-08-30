import { useState, useMemo, useEffect } from "react";
import { Coffee, Flame, Snowflake, MessageCircle, Send, Flag, Clock, HeartHandshake, Trash2 } from "lucide-react";
import { teaTimeLeft, isTeaExpired } from "../utils/helpers.js";
import { EmptyState } from "./EmptyState.jsx";
import { Button, IconButton, Card, Textarea, Input, Badge, cx } from "./ui/Primitives.jsx";
import { Screen, PageHeader } from "./ui/Layout.jsx";

// Locali-Tea: two tabs split by t.category.
// - "tea" (gossip) keeps true/cap validation voting — worth fact-checking.
// - "confession" (personal) uses emoji reactions instead; one per user,
//   changeable. Voting on whether someone's confession is "true" would be
//   the wrong interaction entirely.
// Every post and its comments are visible for 48h from posting.
//
// The true/cap bar is the one place the rebuild keeps hue: it encodes two
// opposed quantities, and a monochrome split bar would be unreadable. It uses
// a blue/amber pair rather than the old red/blue, since red reads as an error
// state everywhere else in the UI.

const REACTION_EMOJIS = ["😂", "❤️", "😮", "😢", "🔥"];

function ReactionRow({ reactions, myReaction, onReact, size = "sm" }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {REACTION_EMOJIS.map((emoji) => {
        const count = reactions?.[emoji] || 0;
        const mine = myReaction === emoji;
        return (
          <button
            key={emoji}
            onClick={(e) => { e.stopPropagation(); onReact(emoji); }}
            aria-pressed={mine}
            className={cx(
              "inline-flex items-center gap-1 rounded-sm border font-medium transition-colors",
              size === "sm" ? "h-6 px-1.5 text-2xs" : "h-7 px-2 text-xs",
              mine
                ? "bg-accent-subtle border-accent/30 text-accent"
                : "bg-surface-subtle border-line text-content-muted hover:border-line-strong hover:text-content"
            )}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function VerdictBar({ trueCount, capCount }) {
  const total = trueCount + capCount || 1;
  const truePct = Math.round((trueCount / total) * 100);
  return (
    <div
      className="h-1 rounded-full bg-surface-inset overflow-hidden flex"
      role="img"
      aria-label={`${trueCount} say true, ${capCount} say cap`}
    >
      <div className="h-full bg-sky-500" style={{ width: `${truePct}%` }} />
      <div className="h-full bg-amber-500" style={{ width: `${100 - truePct}%` }} />
    </div>
  );
}

function VoteButton({ active, onClick, icon: Icon, count, label, size = "sm" }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-sm font-medium transition-colors border",
        size === "sm" ? "h-6 px-1.5 text-2xs" : "h-7 px-2.5 text-xs",
        active
          ? "bg-accent-subtle border-accent/30 text-accent"
          : "bg-surface-subtle border-line text-content-muted hover:border-line-strong hover:text-content"
      )}
    >
      <Icon size={12} fill={active ? "currentColor" : "none"} />
      <span className="tabular-nums">{count}</span>
      {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}

function TeaCard({ t, onOpen, onValidate, myVote, onReact, myReaction }) {
  const isConfession = t.category === "confession";
  const comments = t.commentCount ?? t.comments?.length ?? 0;
  return (
    <Card interactive as="div" className="p-3.5 cursor-pointer" onClick={() => onOpen(t)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xs font-medium text-content-muted">Anonymous</span>
        <span className="flex items-center gap-1 text-2xs text-content-faint tabular-nums">
          <Clock size={10} />{teaTimeLeft(t.createdAt)}
        </span>
      </div>

      <p className="text-sm text-content-secondary leading-relaxed line-clamp-4">{t.text}</p>

      {!isConfession && <div className="mt-3"><VerdictBar trueCount={t.trueCount} capCount={t.capCount} /></div>}

      <div className="flex items-center justify-between mt-2.5 gap-2">
        {isConfession ? (
          <ReactionRow reactions={t.reactions} myReaction={myReaction} onReact={onReact} />
        ) : (
          <div className="flex items-center gap-1.5">
            <VoteButton
              active={myVote === "true"} icon={Flame} count={t.trueCount}
              onClick={(e) => { e.stopPropagation(); onValidate(t.id, "true"); }}
            />
            <VoteButton
              active={myVote === "cap"} icon={Snowflake} count={t.capCount}
              onClick={(e) => { e.stopPropagation(); onValidate(t.id, "cap"); }}
            />
          </div>
        )}
        <span className="flex items-center gap-1 text-2xs text-content-muted shrink-0 tabular-nums">
          <MessageCircle size={11} />{comments}
        </span>
      </div>
    </Card>
  );
}

function TeaDetail({
  t, onBack, onValidate, myVote, onReact, myReaction, onComment, onReport,
  canDelete, onDelete, canDeleteComment, onDeleteComment,
}) {
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isConfession = t.category === "confession";

  const send = () => {
    if (!draft.trim()) return;
    onComment(t.id, draft.trim());
    setDraft("");
  };

  return (
    <Screen>
      <PageHeader
        title={isConfession ? "Confession" : "Tea"}
        subtitle={teaTimeLeft(t.createdAt)}
        onBack={onBack}
        actions={
          <>
            {canDelete && (
              confirmDelete ? (
                <span className="flex items-center gap-1.5">
                  <Button variant="danger" size="sm" onClick={() => { setConfirmDelete(false); onBack(); onDelete(t.id); }}>
                    Confirm
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                </span>
              ) : (
                <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setConfirmDelete(true)}>Delete</Button>
              )
            )}
            <Button variant="ghost" size="sm" icon={Flag} onClick={onReport}>Report</Button>
          </>
        }
      />

      <div className="flex-1 min-h-0 flex flex-col max-w-2xl w-full mx-auto">
        <div className="px-5 lg:px-8 py-4 border-b border-line shrink-0">
          <div className="flex items-center justify-between mb-2">
            <Badge tone="neutral">Anonymous</Badge>
            <span className="flex items-center gap-1 text-2xs text-content-muted tabular-nums">
              <Clock size={11} />{teaTimeLeft(t.createdAt)}
            </span>
          </div>

          <p className="text-sm text-content leading-relaxed whitespace-pre-wrap">{t.text}</p>

          {isConfession ? (
            <div className="mt-3.5">
              <ReactionRow reactions={t.reactions} myReaction={myReaction} onReact={onReact} size="lg" />
            </div>
          ) : (
            <>
              <div className="mt-3.5"><VerdictBar trueCount={t.trueCount} capCount={t.capCount} /></div>
              <div className="flex items-center gap-2 mt-3">
                <VoteButton
                  size="lg" active={myVote === "true"} icon={Flame} count={t.trueCount} label="true"
                  onClick={() => onValidate(t.id, "true")}
                />
                <VoteButton
                  size="lg" active={myVote === "cap"} icon={Snowflake} count={t.capCount} label="cap"
                  onClick={() => onValidate(t.id, "cap")}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 lg:px-8 py-4 space-y-3.5">
          {t.comments === null && (
            <p className="text-xs text-content-faint text-center py-6">Loading discussion…</p>
          )}
          {t.comments && t.comments.length === 0 && (
            <EmptyState icon={MessageCircle} title="No discussion yet" subtitle="Start it — anonymously, like everything here." compact />
          )}
          {(t.comments || []).map((c, i) => (
            <div key={c.id ?? i} className="flex items-start justify-between gap-3 group">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-xs font-medium text-content-secondary">{c.who}</p>
                  <p className="text-2xs text-content-faint tabular-nums">{c.time}</p>
                </div>
                <p className="text-sm text-content-secondary mt-0.5 leading-relaxed break-words">{c.text}</p>
              </div>
              {canDeleteComment?.(c.id) && (
                <IconButton
                  icon={Trash2} label="Delete comment" size="sm"
                  onClick={() => onDeleteComment(t.id, c.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 px-5 lg:px-8 py-3 border-t border-line shrink-0">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Add to the discussion, anonymously"
            maxLength={1000}
            className="flex-1 h-9"
          />
          <Button variant="primary" size="md" onClick={send} disabled={!draft.trim()} className="h-9 w-9 px-0 shrink-0">
            <Send size={14} />
          </Button>
        </div>
      </div>
    </Screen>
  );
}

export function LocaliTeaScreen({
  teaPosts, onClose, verified, onBlocked, onPost, onValidate, onComment, onReport,
  myVotes, onOpenPost, onReact, myReactions, myPostIds, myCommentIds, canModerate,
  onDeletePost, onDeleteComment,
}) {
  const [tab, setTab] = useState("tea");
  const [openTeaId, setOpenTeaId] = useState(null);
  const [draft, setDraft] = useState("");

  const visible = useMemo(
    () =>
      teaPosts
        .filter((t) => !isTeaExpired(t.createdAt) && (t.category || "tea") === tab)
        .sort((a, b) => b.createdAt - a.createdAt),
    [teaPosts, tab]
  );
  const openTea = teaPosts.find((t) => t.id === openTeaId);

  // Deliberately not Supabase Realtime: postgres_changes broadcasts the full
  // row — including the hidden author_id — to every subscriber regardless of
  // column grants, which would break anonymity. Polling a plain SELECT is as
  // safe as any other fetch here and keeps an open thread feeling live
  // without anyone's identity going over the wire.
  useEffect(() => {
    if (!openTeaId) return;
    const interval = setInterval(() => onOpenPost(openTeaId), 4000);
    return () => clearInterval(interval);
  }, [openTeaId, onOpenPost]);

  if (openTea) {
    return (
      <TeaDetail
        t={openTea}
        onBack={() => setOpenTeaId(null)}
        onValidate={onValidate}
        myVote={myVotes[openTea.id]}
        onReact={(emoji) => onReact(openTea.id, emoji)}
        myReaction={myReactions[openTea.id]}
        onComment={onComment}
        onReport={() => onReport("a Locali-Tea post")}
        canDelete={!!canModerate || !!myPostIds?.has(openTea.id)}
        onDelete={onDeletePost}
        canDeleteComment={(id) => !!canModerate || !!myCommentIds?.has(id)}
        onDeleteComment={onDeleteComment}
      />
    );
  }

  const TABS = [
    { key: "tea", label: "Tea", icon: Coffee },
    { key: "confession", label: "Confessions", icon: HeartHandshake },
  ];

  return (
    <Screen>
      <PageHeader title="Locali-Tea" subtitle="Anonymous · gone in 48 hours" onBack={onClose} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-2xl w-full mx-auto px-5 lg:px-8 py-4">
          <div className="flex p-0.5 gap-0.5 bg-surface-inset border border-line rounded mb-3.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cx(
                  "flex-1 inline-flex items-center justify-center gap-1.5 h-7 rounded-sm text-xs font-medium transition-colors",
                  tab === t.key ? "bg-surface-elevated text-content shadow-sm" : "text-content-muted hover:text-content"
                )}
              >
                <t.icon size={13} />{t.label}
              </button>
            ))}
          </div>

          {verified && (
            <Card className="p-3 mb-3.5">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder={
                  tab === "tea"
                    ? "Spill the tea — posted anonymously, auto-deletes in 48h"
                    : "Get it off your chest — posted anonymously, auto-deletes in 48h"
                }
                className="bg-transparent border-0 px-0 focus:ring-0"
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-2xs text-content-faint tabular-nums">{draft.length}/2000</span>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!draft.trim()}
                  onClick={() => { onPost(draft.trim(), tab); setDraft(""); }}
                >
                  Post anonymously
                </Button>
              </div>
            </Card>
          )}

          <div className="space-y-2.5">
            {visible.length === 0 ? (
              <EmptyState
                icon={tab === "tea" ? Coffee : HeartHandshake}
                title={tab === "tea" ? "No tea right now" : "No confessions right now"}
                subtitle="Be the first to post — it disappears in 48 hours either way."
              />
            ) : (
              visible.map((t) => (
                <TeaCard
                  key={t.id}
                  t={t}
                  myVote={myVotes[t.id]}
                  myReaction={myReactions[t.id]}
                  onReact={(emoji) => { if (!verified) { onBlocked(); return; } onReact(t.id, emoji); }}
                  onOpen={(tea) => { if (!verified) { onBlocked(); return; } setOpenTeaId(tea.id); onOpenPost?.(tea.id); }}
                  onValidate={(id, vote) => { if (!verified) { onBlocked(); return; } onValidate(id, vote); }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}
