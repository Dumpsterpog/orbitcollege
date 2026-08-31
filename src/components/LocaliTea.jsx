import { useState, useMemo, useEffect } from "react";
import { teaTimeLeft, isTeaExpired } from "../utils/helpers.js";
import { Icon, IconButton, Button, Textarea, Input, cx } from "./ui/Primitives.jsx";
import { Screen, Column, Empty } from "./ui/Layout.jsx";

// Locali-Tea. Two tabs split by t.category:
//   "tea"        — gossip, keeps the true/cap vote (worth fact-checking)
//   "confession" — personal, gets emoji reactions instead; voting on whether
//                  someone's confession is "true" would be the wrong verb.
// Everything is anonymous and expires 48h after posting.
//
// Posts sit on the page separated by a hairline, like the feed — no card.
// The true/cap bar keeps hue because it encodes two opposed quantities and
// a monochrome split bar is unreadable.

const REACTIONS = ["😂", "❤️", "😮", "😢", "🔥"];

function Reactions({ reactions, mine, onReact, size = "sm" }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {REACTIONS.map((e) => {
        const count = reactions?.[e] || 0;
        const on = mine === e;
        return (
          <button
            key={e}
            onClick={(ev) => { ev.stopPropagation(); onReact(e); }}
            aria-pressed={on}
            className={cx(
              "inline-flex items-center gap-1 rounded-full font-semibold transition-all active:scale-90",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-base",
              on ? "bg-accent-wash text-accent ring-1 ring-accent/40" : "bg-bg-sunken text-ink-2 hover:text-ink"
            )}
          >
            <span>{e}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Verdict({ trueCount, capCount }) {
  const total = trueCount + capCount || 1;
  const pct = Math.round((trueCount / total) * 100);
  return (
    <div
      className="h-1 rounded-full overflow-hidden flex bg-bg-sunken"
      role="img"
      aria-label={`${trueCount} say true, ${capCount} say cap`}
    >
      <div className="h-full bg-c-teal" style={{ width: `${pct}%` }} />
      <div className="h-full bg-c-orange" style={{ width: `${100 - pct}%` }} />
    </div>
  );
}

function Vote({ on, onClick, icon, count, label, tint, size = "sm" }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full font-semibold transition-all active:scale-90",
        size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-4 text-base",
        on ? "bg-bg-sunken text-ink ring-1 ring-line-strong" : "text-ink-2 hover:bg-bg-sunken hover:text-ink"
      )}
    >
      <Icon name={icon} size={size === "sm" ? 16 : 19} className={tint} />
      <span className="tabular-nums">{count}</span>
      {label && <span className="hidden sm:inline font-normal text-ink-2">{label}</span>}
    </button>
  );
}

function TeaRow({ t, onOpen, onValidate, myVote, onReact, myReaction }) {
  const confession = t.category === "confession";
  const comments = t.commentCount ?? t.comments?.length ?? 0;
  return (
    <article
      onClick={() => onOpen(t)}
      className="py-5 border-b border-line last:border-0 cursor-pointer group"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="grid place-items-center w-7 h-7 rounded-full bg-bg-sunken shrink-0">
          <Icon name={confession ? "favorite" : "local_cafe"} size={15} className={confession ? "text-c-pink" : "text-c-amber"} />
        </span>
        <span className="text-xs font-semibold text-ink-2">Anonymous</span>
        <span className="text-ink-3">·</span>
        <span className="text-xs text-ink-3 tabular-nums">{teaTimeLeft(t.createdAt)}</span>
      </div>

      <p className="text-md text-ink leading-normal line-clamp-5 group-hover:opacity-80 transition-opacity">
        {t.text}
      </p>

      {!confession && <div className="mt-3.5"><Verdict trueCount={t.trueCount} capCount={t.capCount} /></div>}

      <div className="flex items-center justify-between gap-3 mt-3">
        {confession ? (
          <Reactions reactions={t.reactions} mine={myReaction} onReact={onReact} />
        ) : (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Vote on={myVote === "true"} icon="local_fire_department" count={t.trueCount} tint="text-c-teal" onClick={() => onValidate(t.id, "true")} />
            <Vote on={myVote === "cap"} icon="ac_unit" count={t.capCount} tint="text-c-orange" onClick={() => onValidate(t.id, "cap")} />
          </div>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-2 shrink-0">
          <Icon name="mode_comment" size={16} className="text-c-blue" />
          <span className="tabular-nums">{comments}</span>
        </span>
      </div>
    </article>
  );
}

function TeaDetail({
  t, onBack, onValidate, myVote, onReact, myReaction, onComment, onReport,
  canDelete, onDelete, canDeleteComment, onDeleteComment,
}) {
  const [draft, setDraft] = useState("");
  const [confirm, setConfirm] = useState(false);
  const confession = t.category === "confession";

  const send = () => {
    if (!draft.trim()) return;
    onComment(t.id, draft.trim());
    setDraft("");
  };

  return (
    <Screen>
      <Column className="max-w-xl pt-6 pb-16">
        <div className="flex items-center gap-2 mb-6">
          <IconButton icon="arrow_back" label="Back" size={20} onClick={onBack} className="-ml-2" />
          <h1 className="flex-1 text-xl font-bold text-ink">{confession ? "Confession" : "Tea"}</h1>
          {canDelete && (
            confirm ? (
              <div className="flex items-center gap-1.5">
                <Button variant="danger" size="sm" onClick={() => { setConfirm(false); onBack(); onDelete(t.id); }}>Delete</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>Cancel</Button>
              </div>
            ) : (
              <IconButton icon="delete" label="Delete" size={20} className="text-c-red" onClick={() => setConfirm(true)} />
            )
          )}
          <IconButton icon="flag" label="Report" size={20} className="text-c-orange" onClick={onReport} />
        </div>

        <div className="pb-5 border-b border-line">
          <div className="flex items-center gap-2 mb-3">
            <span className="grid place-items-center w-8 h-8 rounded-full bg-bg-sunken">
              <Icon name={confession ? "favorite" : "local_cafe"} size={17} className={confession ? "text-c-pink" : "text-c-amber"} />
            </span>
            <span className="text-base font-semibold text-ink">Anonymous</span>
            <span className="text-ink-3">·</span>
            <span className="text-xs text-ink-3 tabular-nums">{teaTimeLeft(t.createdAt)}</span>
          </div>

          <p className="text-md text-ink leading-relaxed whitespace-pre-wrap">{t.text}</p>

          {confession ? (
            <div className="mt-4"><Reactions reactions={t.reactions} mine={myReaction} onReact={onReact} size="lg" /></div>
          ) : (
            <>
              <div className="mt-4"><Verdict trueCount={t.trueCount} capCount={t.capCount} /></div>
              <div className="flex items-center gap-2 mt-3">
                <Vote size="lg" on={myVote === "true"} icon="local_fire_department" count={t.trueCount} label="true" tint="text-c-teal" onClick={() => onValidate(t.id, "true")} />
                <Vote size="lg" on={myVote === "cap"} icon="ac_unit" count={t.capCount} label="cap" tint="text-c-orange" onClick={() => onValidate(t.id, "cap")} />
              </div>
            </>
          )}
        </div>

        <div className="py-5 space-y-4">
          {t.comments === null && <p className="text-xs text-ink-3 text-center py-6">Loading…</p>}
          {t.comments && t.comments.length === 0 && (
            <Empty icon="mode_comment" title="No replies yet" body="Start it anonymously, like everything here." className="py-10" />
          )}
          {(t.comments || []).map((c, i) => (
            <div key={c.id ?? i} className="flex items-start justify-between gap-3 group">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-xs font-semibold text-ink">{c.who}</p>
                  <p className="text-2xs text-ink-3 tabular-nums">{c.time}</p>
                </div>
                <p className="text-base text-ink-2 mt-0.5 leading-normal break-words">{c.text}</p>
              </div>
              {canDeleteComment?.(c.id) && (
                <IconButton
                  icon="delete"
                  label="Delete reply"
                  size={16}
                  onClick={() => onDeleteComment(t.id, c.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-c-red"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-4 border-t border-line sticky bottom-0 bg-bg pb-4">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Reply anonymously"
            maxLength={1000}
            className="flex-1 h-10 rounded-full px-4"
          />
          <Button variant="primary" size="md" onClick={send} disabled={!draft.trim()} className="w-10 px-0 shrink-0">
            <Icon name="send" size={18} />
          </Button>
        </div>
      </Column>
    </Screen>
  );
}

export function LocaliTeaScreen({
  teaPosts, onClose, verified, onBlocked, onPost, onValidate, onComment, onReport,
  myVotes, onOpenPost, onReact, myReactions, myPostIds, myCommentIds, canModerate,
  onDeletePost, onDeleteComment,
}) {
  const [tab, setTab] = useState("tea");
  const [openId, setOpenId] = useState(null);
  const [draft, setDraft] = useState("");

  const visible = useMemo(
    () =>
      teaPosts
        .filter((t) => !isTeaExpired(t.createdAt) && (t.category || "tea") === tab)
        .sort((a, b) => b.createdAt - a.createdAt),
    [teaPosts, tab]
  );
  const open = teaPosts.find((t) => t.id === openId);

  // Deliberately not Realtime: postgres_changes broadcasts the full row —
  // including the hidden author_id — to every subscriber regardless of column
  // grants, which would break the anonymity the feature is built on. Polling
  // a plain SELECT is as safe as any other read here.
  useEffect(() => {
    if (!openId) return;
    const id = setInterval(() => onOpenPost(openId), 4000);
    return () => clearInterval(id);
  }, [openId, onOpenPost]);

  if (open) {
    return (
      <TeaDetail
        t={open}
        onBack={() => setOpenId(null)}
        onValidate={onValidate}
        myVote={myVotes[open.id]}
        onReact={(e) => onReact(open.id, e)}
        myReaction={myReactions[open.id]}
        onComment={onComment}
        onReport={() => onReport("a Locali-Tea post")}
        canDelete={!!canModerate || !!myPostIds?.has(open.id)}
        onDelete={onDeletePost}
        canDeleteComment={(id) => !!canModerate || !!myCommentIds?.has(id)}
        onDeleteComment={onDeleteComment}
      />
    );
  }

  const TABS = [
    { key: "tea", label: "Tea", icon: "local_cafe", tint: "text-c-amber" },
    { key: "confession", label: "Confessions", icon: "favorite", tint: "text-c-pink" },
  ];

  return (
    <Screen>
      <Column className="max-w-xl pt-6 pb-16">
        <div className="flex items-center gap-2 mb-1">
          <IconButton icon="arrow_back" label="Back" size={20} onClick={onClose} className="-ml-2" />
          <h1 className="text-3xl font-bold text-ink">
            Locali-<span className="bg-clip-text text-transparent bg-gradient-to-r from-c-amber to-c-pink">Tea</span>
          </h1>
        </div>
        <p className="text-base text-ink-2 mb-6 pl-10">Anonymous. Gone in 48 hours.</p>

        <div className="flex items-center gap-2 mb-5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cx(
                "inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold transition-colors",
                tab === t.key ? "bg-solid text-solid-ink" : "text-ink-2 hover:bg-bg-sunken hover:text-ink"
              )}
            >
              <Icon name={t.icon} size={16} className={tab === t.key ? "" : t.tint} />
              {t.label}
            </button>
          ))}
        </div>

        {verified && (
          <div className="pb-5 border-b border-line">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder={tab === "tea" ? "Spill it. Anonymous, gone in 48h" : "Get it off your chest. Anonymous, gone in 48h"}
              className="bg-transparent px-0 text-md"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-2xs text-ink-3 tabular-nums">{draft.length}/2000</span>
              <Button
                variant="primary"
                size="sm"
                disabled={!draft.trim()}
                onClick={() => { onPost(draft.trim(), tab); setDraft(""); }}
              >
                Post anonymously
              </Button>
            </div>
          </div>
        )}

        {visible.length === 0 ? (
          <Empty
            icon={tab === "tea" ? "local_cafe" : "favorite"}
            title={tab === "tea" ? "No tea right now" : "No confessions right now"}
            body="Be the first. It disappears in 48 hours either way."
          />
        ) : (
          <div>
            {visible.map((t) => (
              <TeaRow
                key={t.id}
                t={t}
                myVote={myVotes[t.id]}
                myReaction={myReactions[t.id]}
                onReact={(e) => { if (!verified) return onBlocked(); onReact(t.id, e); }}
                onOpen={(x) => { if (!verified) return onBlocked(); setOpenId(x.id); onOpenPost?.(x.id); }}
                onValidate={(id, v) => { if (!verified) return onBlocked(); onValidate(id, v); }}
              />
            ))}
          </div>
        )}
      </Column>
    </Screen>
  );
}
