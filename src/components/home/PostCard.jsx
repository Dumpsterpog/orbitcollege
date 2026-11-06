import { useState, useRef, useEffect } from "react";
import { CATEGORIES } from "../../data/constants.js";
import { Icon, Avatar, cx } from "../ui/Primitives.jsx";
import { PostComments } from "../Common.jsx";
import { CodeBlock, parseSegments } from "./CodeBlock.jsx";
import { Img } from "../ui/Img.jsx";

const nameHead = (name = "") => name.split(" — ")[0];

const handleFor = (name = "") =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "") || "member";

const TAG = /(^|\s)(#[a-zA-Z][\w-]{1,30})/g;

function withTags(text, onTag) {
  const out = [];
  let last = 0;
  let m;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(text)) !== null) {
    const start = m.index + m[1].length;
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <button
        key={start}
        onClick={(e) => { e.stopPropagation(); onTag?.(m[2].slice(1)); }}
        className="text-accent font-medium hover:underline"
      >
        {m[2]}
      </button>
    );
    last = start + m[2].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function PostCard({
  post, community, liked, onLike, onOpen, onShare, onTag, onReport,
  authUserId, myName, canWrite, onBlocked,
}) {
  const cat = CATEGORIES.find((x) => x.name === community?.category);
  const segments = parseSegments(post.text || "");

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const openFromBody = (e) => {
    if (e.target.closest("button, a, input, textarea, img")) return;
    if (window.getSelection()?.toString()) return;
    setCommentsOpen(true);
  };

  return (
    <article className="w-full bg-bg-raised rounded-2xl border border-line p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar name={post.who} size={42} />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[14px] font-bold text-ink truncate">{post.who}</span>
              <span className="text-[12.5px] text-ink-3 truncate">@{handleFor(post.who)}</span>
              <span className="text-ink-3">·</span>
              <span className="text-[12.5px] text-ink-3">{post.time}</span>
            </div>

            {community ? (
              <button
                onClick={() => onOpen(community)}
                className="inline-flex items-center gap-1.5 mt-1.5 pl-1.5 pr-2.5 py-1 rounded-full
                  bg-bg-sunken hover:bg-accent-wash transition-colors max-w-full"
              >
                <span className="grid place-items-center w-4 h-4 rounded overflow-hidden shrink-0">
                  {community.avatarUrl
                    ? <Img src={community.avatarUrl} className="w-full h-full object-cover" />
                    : <Icon name={cat?.msr || "groups"} size={12} className={cat?.tint || "text-ink-3"} />}
                </span>
                <span className="text-[11.5px] font-medium text-ink-2 truncate">
                  {nameHead(community.name)}
                </span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 mt-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-bg-sunken">
                <Icon name="public" size={12} className="text-ink-3" />
                <span className="text-[11.5px] font-medium text-ink-2">Everyone on campus</span>
              </span>
            )}
          </div>
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Post options"
            className="grid place-items-center w-8 h-8 rounded-lg text-ink-3 hover:text-ink
              hover:bg-bg-sunken transition-colors"
          >
            <Icon name="more_horiz" size={18} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-9 w-48 bg-bg-raised border border-line rounded-2xl
                shadow-pop overflow-hidden animate-pop z-30 p-1"
            >
              <button
                role="menuitem"
                onClick={() => { setMenuOpen(false); onShare?.(post, community); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left
                  text-[13px] text-ink hover:bg-bg-sunken transition-colors"
              >
                <Icon name="share" size={16} className="text-ink-2" />
                Share
              </button>
              <button
                role="menuitem"
                onClick={() => { setMenuOpen(false); setCommentsOpen(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left
                  text-[13px] text-ink hover:bg-bg-sunken transition-colors"
              >
                <Icon name="mode_comment" size={16} className="text-ink-2" />
                {commentsOpen ? "Comments open" : "Show comments"}
              </button>
              {community && (
                <button
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onOpen(community); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left
                    text-[13px] text-ink hover:bg-bg-sunken transition-colors"
                >
                  <Icon name="groups" size={16} className="text-ink-2" />
                  Open community
                </button>
              )}
              <button
                role="menuitem"
                onClick={() => { setMenuOpen(false); onReport?.(post, community); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left
                  text-[13px] text-c-red hover:bg-c-red/10 transition-colors"
              >
                <Icon name="flag" size={16} />
                Report
              </button>
            </div>
          )}
        </div>
      </div>

      <div onClick={openFromBody} className="mt-3 space-y-3 cursor-pointer">
        {segments.map((seg, i) =>
          seg.type === "code" ? (
            <CodeBlock key={i} lang={seg.lang} value={seg.value} filename={post.codeName} />
          ) : (
            <p key={i} className="text-[14px] text-ink leading-relaxed whitespace-pre-wrap break-words">
              {withTags(seg.value.trim(), onTag)}
            </p>
          )
        )}

        {post.imageUrl && (
          <Img
            src={post.imageUrl}
            loading="lazy"
            className="w-full max-h-[460px] object-cover rounded-xl border border-line"
          />
        )}
      </div>

      <div className="flex items-center flex-wrap gap-1 mt-4">
        <button
          onClick={() => onLike(post.id)}
          aria-pressed={liked}
          className={cx(
            "inline-flex items-center gap-2 h-9 px-3 rounded-full text-[12.5px] font-semibold transition-colors",
            liked ? "text-c-red bg-c-red/10" : "text-ink-2 hover:text-c-red hover:bg-c-red/10"
          )}
        >
          <Icon name="favorite" size={17} className={liked ? "fill-current" : undefined} />
          <span className="tabular-nums">{post.sparks || 0}</span>
        </button>

        <PostComments
          communityId={post.communityId}
          postId={post.id}
          count={post.comments}
          authUserId={authUserId}
          myName={myName}
          canWrite={canWrite}
          onBlocked={onBlocked}
          open={commentsOpen}
          onToggle={setCommentsOpen}
        />
      </div>
    </article>
  );
}
