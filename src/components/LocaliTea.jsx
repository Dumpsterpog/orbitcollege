import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Coffee, Flame, Snowflake, MessageCircle, Send, Flag, Clock, HeartHandshake, Trash2 } from "lucide-react";
import { teaTimeLeft, isTeaExpired } from "../utils/helpers.js";
import { EmptyState } from "./EmptyState.jsx";

// Locali-Tea has two tabs, split by t.category:
// - "tea" (gossip/rumors) keeps the original true/cap validation voting —
//   makes sense for something you'd want to fact-check.
// - "confession" (personal, not something to fact-check) uses a small set
//   of emoji reactions instead, one per user per post, changeable.
// Every post (and its comments) is only visible for 48h from posting either way.
const REACTION_EMOJIS = ["😂", "❤️", "😮", "😢", "🔥"];

function ReactionRow({ reactions, myReaction, onReact, size = "sm" }) {
  const pad = size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs";
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {REACTION_EMOJIS.map((emoji) => {
        const count = reactions?.[emoji] || 0;
        const mine = myReaction === emoji;
        return (
          <button
            key={emoji}
            onClick={(e) => { e.stopPropagation(); onReact(emoji); }}
            className={`flex items-center gap-1 font-medium rounded-full border active:scale-90 transition-transform ${pad} ${mine ? "bg-zinc-900/15 dark:bg-zinc-50/15 border-zinc-900/40 dark:border-zinc-50/40 text-zinc-700 dark:text-zinc-300" : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"}`}
          >
            <span>{emoji}</span>{count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function TeaCard({ t, onOpen, onValidate, myVote, onReact, myReaction }) {
  const total = t.trueCount + t.capCount || 1;
  const truePct = Math.round((t.trueCount / total) * 100);
  const isConfession = t.category === "confession";
  return (
    <button onClick={() => onOpen(t)} className="w-full text-left bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 animate-fade-in-up">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-zinc-500">Anonymous</span>
        <span className="flex items-center gap-1 text-[10px] text-zinc-700 dark:text-zinc-300 font-medium"><Clock size={11} />{teaTimeLeft(t.createdAt)}</span>
      </div>
      <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-snug line-clamp-4">{t.text}</p>
      {isConfession ? (
        <div className="flex items-center justify-between mt-3">
          <ReactionRow reactions={t.reactions} myReaction={myReaction} onReact={onReact} />
          <span className="flex items-center gap-1 text-[11px] text-zinc-500 shrink-0 ml-2"><MessageCircle size={12} />{t.commentCount ?? t.comments?.length ?? 0}</span>
        </div>
      ) : (
        <>
          <div className="mt-3 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
            <div className="h-full bg-blue-500" style={{ width: `${truePct}%` }} />
            <div className="h-full bg-red-500" style={{ width: `${100 - truePct}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-3">
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); onValidate(t.id, "true"); }}
                className={`flex items-center gap-1 text-[11px] font-medium ${myVote === "true" ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-500"}`}
              >
                <Flame size={13} fill={myVote === "true" ? "currentColor" : "none"} />{t.trueCount}
              </span>
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); onValidate(t.id, "cap"); }}
                className={`flex items-center gap-1 text-[11px] font-medium ${myVote === "cap" ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-500"}`}
              >
                <Snowflake size={13} fill={myVote === "cap" ? "currentColor" : "none"} />{t.capCount}
              </span>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-zinc-500"><MessageCircle size={12} />{t.commentCount ?? t.comments?.length ?? 0}</span>
          </div>
        </>
      )}
    </button>
  );
}

function TeaDetail({ t, onBack, onValidate, myVote, onReact, myReaction, onComment, onReport, canDelete, onDelete, canDeleteComment, onDeleteComment }) {
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const total = t.trueCount + t.capCount || 1;
  const truePct = Math.round((t.trueCount / total) * 100);
  const isConfession = t.category === "confession";
  return (
    <div className="relative flex-1 bg-white dark:bg-zinc-950 flex flex-col min-h-0">
      <div className="relative z-10 flex flex-col min-h-0 flex-1">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900"><ArrowLeft size={18} className="text-zinc-700 dark:text-zinc-300" /></button>
          <div className="flex items-center gap-1.5">
            {canDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { setConfirmDelete(false); onBack(); onDelete(t.id); }} className="text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-900/10 dark:bg-zinc-50/10 px-2.5 py-1.5 rounded-full font-medium">Confirm delete</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs text-zinc-500 px-2 py-1.5">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 px-2.5 py-1.5 rounded-full flex items-center gap-1"><Trash2 size={12} />Delete</button>
              )
            )}
            <button onClick={onReport} className="text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 px-2.5 py-1.5 rounded-full flex items-center gap-1"><Flag size={12} />Report</button>
          </div>
        </div>
        <div className="px-5 pb-3 border-b border-zinc-100 dark:border-zinc-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-500">Anonymous</span>
            <span className="flex items-center gap-1 text-xs text-zinc-700 dark:text-zinc-300 font-medium"><Clock size={12} />{teaTimeLeft(t.createdAt)}</span>
          </div>
          <p className="text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed">{t.text}</p>
          {isConfession ? (
            <div className="mt-3">
              <ReactionRow reactions={t.reactions} myReaction={myReaction} onReact={onReact} size="lg" />
            </div>
          ) : (
            <>
              <div className="mt-3 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
                <div className="h-full bg-blue-500" style={{ width: `${truePct}%` }} />
                <div className="h-full bg-red-500" style={{ width: `${100 - truePct}%` }} />
              </div>
              <div className="flex items-center gap-4 mt-3">
                <button onClick={() => onValidate(t.id, "true")} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${myVote === "true" ? "bg-zinc-900/10 dark:bg-zinc-50/10 text-zinc-700 dark:text-zinc-300" : "bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>
                  <Flame size={13} fill={myVote === "true" ? "currentColor" : "none"} />{t.trueCount} true
                </button>
                <button onClick={() => onValidate(t.id, "cap")} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${myVote === "cap" ? "bg-zinc-900/10 dark:bg-zinc-50/10 text-zinc-700 dark:text-zinc-300" : "bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>
                  <Snowflake size={13} fill={myVote === "cap" ? "currentColor" : "none"} />{t.capCount} cap
                </button>
              </div>
            </>
          )}
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-3 space-y-3">
          {t.comments === null && <p className="text-xs text-zinc-400 dark:text-zinc-600 text-center py-6">Loading discussion…</p>}
          {t.comments && t.comments.length === 0 && <p className="text-xs text-zinc-400 dark:text-zinc-600 text-center py-6">No discussion yet — start it.</p>}
          {(t.comments || []).map((c, i) => (
            <div key={i} className="flex items-start justify-between gap-2 group">
              <div className="min-w-0">
                <p className="text-xs text-zinc-500 font-medium">{c.who}</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-0.5">{c.text}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mono mt-0.5">{c.time}</p>
              </div>
              {canDeleteComment?.(c.id) && (
                <button onClick={() => onDeleteComment(t.id, c.id)} className="shrink-0 text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:text-zinc-300 p-1"><Trash2 size={12} /></button>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 px-4 py-3 border-t border-zinc-100 dark:border-zinc-900">
          <input
            value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { onComment(t.id, draft.trim()); setDraft(""); } }}
            placeholder="Add to the discussion, anonymously"
            maxLength={1000}
            className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 rounded-full px-4 py-2 text-sm outline-none focus:border-zinc-900 dark:focus:border-zinc-50"
          />
          <button
            onClick={() => { if (draft.trim()) { onComment(t.id, draft.trim()); setDraft(""); } }}
            className="w-9 h-9 rounded-full bg-zinc-900 dark:bg-zinc-50 text-white flex items-center justify-center shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function LocaliTeaScreen({ teaPosts, onClose, verified, onBlocked, onPost, onValidate, onComment, onReport, myVotes, onOpenPost, onReact, myReactions, myPostIds, myCommentIds, canModerate, onDeletePost, onDeleteComment }) {
  const [tab, setTab] = useState("tea"); // "tea" | "confession"
  const [openTeaId, setOpenTeaId] = useState(null);
  const [draft, setDraft] = useState("");
  const visible = useMemo(
    () => teaPosts.filter((t) => !isTeaExpired(t.createdAt) && (t.category || "tea") === tab).sort((a, b) => b.createdAt - a.createdAt),
    [teaPosts, tab]
  );
  const openTea = teaPosts.find((t) => t.id === openTeaId);

  // Tea/Confessions deliberately doesn't use Supabase Realtime (postgres_changes
  // broadcasts the full row — including the hidden author_id — to every
  // subscriber regardless of column grants, which would break anonymity).
  // Polling a plain SELECT instead is just as safe as any other fetch here
  // (author_id was never selectable either way) and makes an open discussion
  // thread feel live without anyone's identity ever going over the wire.
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
        onReport={() => onReport(`a Locali-Tea post`)}
        canDelete={!!canModerate || !!myPostIds?.has(openTea.id)}
        onDelete={onDeletePost}
        canDeleteComment={(id) => !!canModerate || !!myCommentIds?.has(id)}
        onDeleteComment={onDeleteComment}
      />
    );
  }

  return (
    <div className="relative flex-1 bg-white dark:bg-zinc-950 flex flex-col min-h-0">
      <div className="relative z-10 flex flex-col min-h-0 flex-1">
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
          <button onClick={onClose} className="shrink-0"><ArrowLeft size={19} className="text-zinc-700 dark:text-zinc-300" /></button>
          <div className="flex-1">
            <p className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5"><Coffee size={16} className="text-yellow-500" />Locali-Tea</p>
            <p className="text-[11px] text-zinc-500">Anonymous. Gone in 48 hours.</p>
          </div>
        </div>
        <div className="flex gap-1.5 px-4 pb-3">
          <button onClick={() => setTab("tea")} className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl border ${tab === "tea" ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50" : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"}`}>
            <Coffee size={13} />Tea
          </button>
          <button onClick={() => setTab("confession")} className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl border ${tab === "confession" ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-50" : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"}`}>
            <HeartHandshake size={13} />Confessions
          </button>
        </div>
        {verified && (
          <div className="px-4 pb-3">
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3">
              <textarea
                value={draft} onChange={(e) => setDraft(e.target.value)}
                placeholder={tab === "tea" ? "Spill the tea… posted anonymously, auto-deletes in 48h" : "Get it off your chest… posted anonymously, auto-deletes in 48h"}
                rows={2}
                maxLength={2000}
                className="w-full bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 text-sm outline-none resize-none"
              />
              <div className="flex justify-end mt-1.5">
                <button
                  disabled={!draft.trim()}
                  onClick={() => { onPost(draft.trim(), tab); setDraft(""); }}
                  className="px-4 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 text-white dark:text-zinc-900 disabled:text-zinc-500 text-xs font-semibold"
                >
                  Post anonymously
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 space-y-2.5 pb-6">
          {visible.length === 0 && (
            <EmptyState
              icon={tab === "tea" ? Coffee : HeartHandshake}
              title={tab === "tea" ? "No tea right now" : "No confessions right now"}
              subtitle="Be the first to post — it'll disappear in 48 hours either way."
            />
          )}
          {visible.map((t) => (
            <TeaCard
              key={t.id}
              t={t}
              myVote={myVotes[t.id]}
              myReaction={myReactions[t.id]}
              onReact={(emoji) => { if (!verified) { onBlocked(); return; } onReact(t.id, emoji); }}
              onOpen={(tea) => { if (!verified) { onBlocked(); return; } setOpenTeaId(tea.id); onOpenPost?.(tea.id); }}
              onValidate={(id, vote) => { if (!verified) { onBlocked(); return; } onValidate(id, vote); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
