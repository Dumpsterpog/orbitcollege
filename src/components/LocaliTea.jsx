import { useState, useMemo, useEffect } from "react";
import { teaTimeLeft, isTeaExpired } from "../utils/helpers.js";
import { Icon, IconButton, Button, Textarea, Input, cx } from "./ui/Primitives.jsx";
import { Screen, Empty } from "./ui/Layout.jsx";

// Locali-Tea. Two tabs split by t.category:
//   "tea"        — gossip, keeps the true/cap vote (worth fact-checking)
//   "confession" — personal, gets emoji reactions instead; voting on whether
//                  someone's confession is "true" would be the wrong verb.
// Everything is anonymous and expires 48h after posting.
//
// Laid out like Home: a feed column of cards and, on desktop, a sticky rail.
// It used to be a bare 576px column in the middle of the screen, which left
// most of a laptop display empty and made the page look unfinished next to
// every other screen in the app.

const REACTIONS = ["😂", "❤️", "😮", "😢", "🔥"];
const SIX_HOURS = 6 * 60 * 60 * 1000;
const LIFESPAN = 48 * 60 * 60 * 1000;

const card = "w-full bg-bg-raised rounded-2xl border border-line";

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
              size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-base",
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
  const total = trueCount + capCount;
  const pct = total ? Math.round((trueCount / total) * 100) : 50;
  return (
    <div>
      <div
        className="h-1.5 rounded-full overflow-hidden flex bg-bg-sunken"
        role="img"
        aria-label={`${trueCount} say true, ${capCount} say cap`}
      >
        {total > 0 && (
          <>
            <div className="h-full bg-c-teal" style={{ width: `${pct}%` }} />
            <div className="h-full bg-c-orange" style={{ width: `${100 - pct}%` }} />
          </>
        )}
      </div>
      <div className="flex justify-between mt-1.5 text-2xs font-semibold tabular-nums">
        <span className="text-c-teal">{total ? `${pct}% true` : "No votes yet"}</span>
        {total > 0 && <span className="text-c-orange">{100 - pct}% cap</span>}
      </div>
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
        size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-base",
        on ? "bg-bg-sunken text-ink ring-1 ring-line-strong" : "text-ink-2 hover:bg-bg-sunken hover:text-ink"
      )}
    >
      <Icon name={icon} size={size === "sm" ? 16 : 19} className={tint} />
      <span className="tabular-nums">{count}</span>
      {label && <span className="font-normal text-ink-2">{label}</span>}
    </button>
  );
}

function AnonHeader({ confession, createdAt, big = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cx("grid place-items-center rounded-full shrink-0", big ? "w-10 h-10" : "w-9 h-9",
        confession ? "bg-c-pink/10" : "bg-c-amber/10")}>
        <Icon name={confession ? "favorite" : "local_cafe"} size={big ? 19 : 17} className={confession ? "text-c-pink" : "text-c-amber"} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[14px] font-semibold text-ink">Anonymous</span>
        <span className="flex items-center gap-1 text-xs text-ink-3 tabular-nums">
          <Icon name="schedule" size={12} />
          {teaTimeLeft(createdAt)}
        </span>
      </span>
    </div>
  );
}

function TeaRow({ t, onOpen, onValidate, myVote, onReact, myReaction }) {
  const confession = t.category === "confession";
  const comments = t.commentCount ?? t.comments?.length ?? 0;
  return (
    <article
      onClick={() => onOpen(t)}
      className={cx(card, "p-4 sm:p-5 cursor-pointer group hover:border-line-strong transition-colors")}
    >
      <AnonHeader confession={confession} createdAt={t.createdAt} />

      <p className="mt-3 text-[15px] text-ink leading-relaxed whitespace-pre-wrap break-words line-clamp-6">
        {t.text}
      </p>

      {!confession && <div className="mt-4"><Verdict trueCount={t.trueCount} capCount={t.capCount} /></div>}

      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-line">
        {confession ? (
          <Reactions reactions={t.reactions} mine={myReaction} onReact={onReact} />
        ) : (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Vote on={myVote === "true"} icon="local_fire_department" count={t.trueCount} label="true" tint="text-c-teal" onClick={() => onValidate(t.id, "true")} />
            <Vote on={myVote === "cap"} icon="ac_unit" count={t.capCount} label="cap" tint="text-c-orange" onClick={() => onValidate(t.id, "cap")} />
          </div>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2 shrink-0">
          <Icon name="mode_comment" size={16} className="text-c-blue" />
          <span className="tabular-nums">{comments}</span>
          <span className="hidden sm:inline font-normal">{comments === 1 ? "reply" : "replies"}</span>
        </span>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------ rail */

function RailCard({ icon, tint, title, children }) {
  return (
    <section className={cx(card, "p-4")}>
      <div className="flex items-center gap-2 mb-2">
        <Icon name={icon} size={18} className={tint} />
        <h3 className="text-[14px] font-bold text-ink tracking-tight">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function RailRow({ icon, tint, title, body }) {
  return (
    <div className="flex gap-3 py-2">
      <span className="grid place-items-center w-8 h-8 rounded-lg bg-bg-sunken shrink-0">
        <Icon name={icon} size={16} className={tint} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-ink">{title}</span>
        <span className="block text-xs text-ink-2 leading-relaxed mt-0.5">{body}</span>
      </span>
    </div>
  );
}

function TeaRail({ counts }) {
  return (
    <>
      <section className="w-full rounded-2xl border border-accent/15 bg-accent-wash px-4 py-3.5 flex items-center gap-3">
        <span className="grid place-items-center w-11 h-11 rounded-xl bg-bg-raised shrink-0">
          <Icon name="local_cafe" size={21} className="text-c-amber" />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-bold text-ink leading-tight">Right now</span>
          <span className="block text-[12px] text-ink-2 mt-0.5">What campus is whispering</span>
        </span>
      </section>

      <section className={cx(card, "p-4 grid grid-cols-3 gap-2 text-center")}>
        {[
          { n: counts.tea, label: "Tea", tint: "text-c-amber" },
          { n: counts.confession, label: "Confessions", tint: "text-c-pink" },
          { n: counts.expiring, label: "Ending soon", tint: "text-c-orange" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-bg-sunken py-3">
            <p className={cx("text-xl font-bold tabular-nums leading-none", s.tint)}>{s.n}</p>
            <p className="text-2xs font-semibold text-ink-2 mt-1.5">{s.label}</p>
          </div>
        ))}
      </section>

      <RailCard icon="info" tint="text-c-blue" title="How it works">
        <RailRow icon="visibility_off" tint="text-c-violet" title="Fully anonymous"
          body="Nobody can see who posted, not other students and not the Orbit team." />
        <RailRow icon="schedule" tint="text-c-orange" title="Gone in 48 hours"
          body="Every post and its replies delete themselves two days after posting." />
        <RailRow icon="local_fire_department" tint="text-c-teal" title="True or cap"
          body="Tea gets voted on. Confessions get reactions instead." />
      </RailCard>

      <RailCard icon="shield" tint="text-c-green" title="Keep it kind">
        <ul className="text-xs text-ink-2 leading-relaxed space-y-1.5 mt-1">
          <li className="flex gap-2"><Icon name="check" size={14} className="text-c-green shrink-0 mt-0.5" />No names, photos or details that identify someone.</li>
          <li className="flex gap-2"><Icon name="check" size={14} className="text-c-green shrink-0 mt-0.5" />No explicit content, threats or invite links.</li>
          <li className="flex gap-2"><Icon name="check" size={14} className="text-c-green shrink-0 mt-0.5" />Report anything that crosses the line. Moderators remove it.</li>
        </ul>
      </RailCard>
    </>
  );
}

/* ---------------------------------------------------------- detail */

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
      <div className="w-full max-w-[760px] mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-3 sm:gap-4">
        <div className={cx(card, "px-3 sm:px-4 h-14 flex items-center gap-2")}>
          <IconButton icon="arrow_back" label="Back" size={20} onClick={onBack} />
          <h1 className="flex-1 text-lg font-bold text-ink">{confession ? "Confession" : "Tea"}</h1>
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

        <article className={cx(card, "p-4 sm:p-6")}>
          <AnonHeader confession={confession} createdAt={t.createdAt} big />
          <p className="mt-4 text-[16px] text-ink leading-relaxed whitespace-pre-wrap break-words">{t.text}</p>

          {confession ? (
            <div className="mt-5 pt-4 border-t border-line">
              <Reactions reactions={t.reactions} mine={myReaction} onReact={onReact} size="lg" />
            </div>
          ) : (
            <div className="mt-5 pt-4 border-t border-line">
              <Verdict trueCount={t.trueCount} capCount={t.capCount} />
              <div className="flex items-center gap-2 mt-3">
                <Vote size="lg" on={myVote === "true"} icon="local_fire_department" count={t.trueCount} label="true" tint="text-c-teal" onClick={() => onValidate(t.id, "true")} />
                <Vote size="lg" on={myVote === "cap"} icon="ac_unit" count={t.capCount} label="cap" tint="text-c-orange" onClick={() => onValidate(t.id, "cap")} />
              </div>
            </div>
          )}
        </article>

        <section className={cx(card, "p-4 sm:p-5")}>
          <h2 className="text-[14px] font-bold text-ink mb-3">
            Replies <span className="text-ink-3 font-semibold tabular-nums">{(t.comments || []).length}</span>
          </h2>
          {t.comments === null && <p className="text-xs text-ink-3 text-center py-6">Loading…</p>}
          {t.comments && t.comments.length === 0 && (
            <Empty icon="mode_comment" title="No replies yet" body="Start it anonymously, like everything here." className="py-8" />
          )}
          <div className="divide-y divide-line">
            {(t.comments || []).map((c, i) => (
              <div key={c.id ?? i} className="flex items-start justify-between gap-3 py-3 first:pt-0 group">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="grid place-items-center w-7 h-7 rounded-full bg-bg-sunken shrink-0 mt-0.5">
                    <Icon name="person" size={14} className="text-ink-3" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="text-xs font-semibold text-ink">{c.who}</p>
                      <p className="text-2xs text-ink-3 tabular-nums">{c.time}</p>
                    </div>
                    <p className="text-base text-ink-2 mt-0.5 leading-normal break-words">{c.text}</p>
                  </div>
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
        </section>

        <div className="sticky bottom-0 -mx-3 sm:mx-0 px-3 sm:px-0 pt-2 pb-3 bg-bg">
          <div className={cx(card, "flex items-center gap-2 p-2")}>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Reply anonymously"
              maxLength={1000}
              className="flex-1 h-10 rounded-full px-4 border-transparent"
            />
            <Button variant="primary" size="md" onClick={send} disabled={!draft.trim()} className="w-10 px-0 shrink-0 rounded-full">
              <Icon name="send" size={18} />
            </Button>
          </div>
        </div>
      </div>
    </Screen>
  );
}

/* ------------------------------------------------------------ list */

export function LocaliTeaScreen({
  teaPosts, onClose, verified, onBlocked, onPost, onValidate, onComment, onReport,
  myVotes, onOpenPost, onReact, myReactions, myPostIds, myCommentIds, canModerate,
  onDeletePost, onDeleteComment,
}) {
  const [tab, setTab] = useState("tea");
  const [openId, setOpenId] = useState(null);
  const [draft, setDraft] = useState("");

  const live = useMemo(() => teaPosts.filter((t) => !isTeaExpired(t.createdAt)), [teaPosts]);
  const visible = useMemo(
    () => live.filter((t) => (t.category || "tea") === tab).sort((a, b) => b.createdAt - a.createdAt),
    [live, tab]
  );
  const counts = useMemo(() => ({
    tea: live.filter((t) => (t.category || "tea") === "tea").length,
    confession: live.filter((t) => t.category === "confession").length,
    expiring: live.filter((t) => LIFESPAN - (Date.now() - t.createdAt) < SIX_HOURS).length,
  }), [live]);
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
    { key: "tea", label: "Tea", icon: "local_cafe", n: counts.tea },
    { key: "confession", label: "Confessions", icon: "favorite", n: counts.confession },
  ];
  const confessionTab = tab === "confession";

  return (
    <Screen>
      <div className="w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 grid justify-center gap-6
        grid-cols-1 max-w-[1420px] lg:grid-cols-[minmax(0,760px)_340px]">

        {/* ---------------------------------------------------- feed */}
        <div className="min-w-0 flex flex-col gap-3 sm:gap-4">
          <header className={cx(card, "p-4 sm:p-5")}>
            <div className="flex items-center gap-2">
              <IconButton icon="arrow_back" label="Back" size={20} onClick={onClose} className="-ml-1.5" />
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-ink leading-tight">
                  Locali-<span className="bg-clip-text text-transparent bg-gradient-to-r from-c-amber to-c-pink">Tea</span>
                </h1>
                <p className="text-sm text-ink-2 mt-0.5">Anonymous. Gone in 48 hours.</p>
              </div>
            </div>

            <div className="mt-4 inline-flex items-center gap-1 bg-bg-sunken p-1 rounded-full max-w-full overflow-x-auto no-scrollbar">
              {TABS.map((t) => {
                const on = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    aria-pressed={on}
                    className={cx(
                      "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] whitespace-nowrap transition-all",
                      on ? "bg-accent text-accent-ink font-semibold" : "text-ink-2 hover:text-ink font-medium"
                    )}
                  >
                    <Icon name={t.icon} size={15} />
                    {t.label}
                    <span className={cx("tabular-nums text-xs", on ? "opacity-80" : "text-ink-3")}>{t.n}</span>
                  </button>
                );
              })}
            </div>
          </header>

          {verified ? (
            <section className={cx(card, "p-4 sm:p-5")}>
              <div className="flex items-start gap-3">
                <span className={cx("grid place-items-center w-9 h-9 rounded-full shrink-0",
                  confessionTab ? "bg-c-pink/10" : "bg-c-amber/10")}>
                  <Icon name={confessionTab ? "favorite" : "local_cafe"} size={17}
                    className={confessionTab ? "text-c-pink" : "text-c-amber"} />
                </span>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder={confessionTab ? "Get it off your chest…" : "Spill it…"}
                  className="flex-1 bg-transparent border-transparent px-0 py-1.5 text-[15px] resize-none focus:border-transparent"
                />
              </div>
              <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-line">
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-3 min-w-0">
                  <Icon name="visibility_off" size={14} className="shrink-0" />
                  <span className="truncate">Posted anonymously · {draft.length}/2000</span>
                </span>
                <Button
                  tone="blue"
                  size="sm"
                  disabled={!draft.trim()}
                  onClick={() => { onPost(draft.trim(), tab); setDraft(""); }}
                  className="shrink-0"
                >
                  {confessionTab ? "Confess" : "Spill"}
                </Button>
              </div>
            </section>
          ) : (
            <section className={cx(card, "p-4 sm:p-5 flex items-center gap-3")}>
              <span className="grid place-items-center w-10 h-10 rounded-full bg-bg-sunken shrink-0">
                <Icon name="lock" size={18} className="text-c-violet" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-ink">Sign in to post anonymously</p>
                <p className="text-xs text-ink-2 mt-0.5">Your name is never attached, not even for the Orbit team.</p>
              </div>
              <Button tone="blue" size="sm" onClick={onBlocked} className="shrink-0">Sign in</Button>
            </section>
          )}

          {visible.length === 0 ? (
            <div className={cx(card, "py-4")}>
              <Empty
                icon={confessionTab ? "favorite" : "local_cafe"}
                title={confessionTab ? "No confessions right now" : "No tea right now"}
                body="Be the first. It disappears in 48 hours either way."
              />
            </div>
          ) : (
            visible.map((t) => (
              <TeaRow
                key={t.id}
                t={t}
                myVote={myVotes[t.id]}
                myReaction={myReactions[t.id]}
                onReact={(e) => { if (!verified) return onBlocked(); onReact(t.id, e); }}
                onOpen={(x) => { if (!verified) return onBlocked(); setOpenId(x.id); onOpenPost?.(x.id); }}
                onValidate={(id, v) => { if (!verified) return onBlocked(); onValidate(id, v); }}
              />
            ))
          )}
        </div>

        {/* ---------------------------------------------------- rail */}
        <aside className="hidden lg:block h-full">
          <div className="sticky top-6 flex flex-col gap-4">
            <TeaRail counts={counts} />
          </div>
        </aside>
      </div>
    </Screen>
  );
}
