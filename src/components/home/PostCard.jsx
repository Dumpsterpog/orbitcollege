import { CATEGORIES } from "../../data/constants.js";
import { Icon, Avatar, cx } from "../ui/Primitives.jsx";
import { PostComments } from "../Common.jsx";
import { CodeBlock, parseSegments } from "./CodeBlock.jsx";

const nameHead = (name = "") => name.split(" — ")[0];

// Orbit has no usernames. The mock shows an @handle, so this derives one from
// the display name rather than inventing a field or printing the same
// placeholder under everybody's post. If real handles ever land, this is the
// one line that changes.
const handleFor = (name = "") =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "") || "member";

// Hashtags are written into ordinary post text, so they are found by reading it
// rather than stored as a field. That means an old post starts showing tags
// with no migration, and deleting the feature later removes no data.
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
  post, community, liked, onLike, onOpen, onShare, onTag,
  authUserId, myName, canWrite, onBlocked,
}) {
  const cat = CATEGORIES.find((x) => x.name === community?.category);
  const segments = parseSegments(post.text || "");

  return (
    <article className="w-full bg-bg-raised rounded-2xl border border-line p-5">
      {/* The person leads and the room follows: a feed is written by people,
          and which room they were standing in is context for that. */}
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
                    ? <img src={community.avatarUrl} alt="" className="w-full h-full object-cover" />
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

        <button
          onClick={() => onShare?.(post, community)}
          aria-label="More"
          className="grid place-items-center w-8 h-8 rounded-lg text-ink-3 hover:text-ink
            hover:bg-bg-sunken transition-colors shrink-0"
        >
          <Icon name="more_horiz" size={18} />
        </button>
      </div>

      <div className="mt-3 space-y-3">
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
          <img
            src={post.imageUrl}
            alt=""
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
        />

        <button
          onClick={() => onShare?.(post, community)}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-full text-[12.5px] font-semibold
            text-ink-2 hover:text-accent hover:bg-accent-wash transition-colors"
        >
          <Icon name="share" size={17} />
        </button>
      </div>
    </article>
  );
}
