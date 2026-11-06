import { useState, useRef, useEffect } from "react";
import { Icon, Avatar, cx } from "../ui/Primitives.jsx";


const TYPES = [
  { key: "discussion",   label: "Discussion",   icon: "forum",          tint: "text-c-blue",   seed: "" },
  { key: "announcement", label: "Announcement", icon: "campaign",       tint: "text-c-green",  seed: "📣 " },
  { key: "event",        label: "Event",        icon: "calendar_today", tint: "text-accent",   seed: "📅 " },
  { key: "opportunity",  label: "Opportunity",  icon: "work",           tint: "text-c-amber",  seed: "💼 " },
  { key: "question",     label: "Question",     icon: "help",           tint: "text-c-violet", seed: "" },
];

export function Composer({ user, communities = [], onSubmit, onBlocked, canPost }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [type, setType] = useState(null);
  const [communityId, setCommunityId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  // An object URL is a live handle into memory. Dropping the reference without
  // revoking it leaks the whole image for the tab's life.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const first = (user?.name || "").split(" ")[0];
  const target = communities.find((c) => c.id === communityId);
  const ready = (!!text.trim() || !!file) && !busy;

  const expand = (t) => {
    if (!canPost) { onBlocked?.(); return; }
    setOpen(true);
    if (t) {
      setType(t.key);
      setText((v) => (v.startsWith(t.seed) ? v : t.seed + v));
    }
    // Focus after the textarea exists.
    requestAnimationFrame(() => boxRef.current?.focus());
  };

  const attach = (e) => {
    if (!canPost) { onBlocked?.(); return; }
    const f = e.target.files?.[0];
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setOpen(true);
  };

  const clearPhoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  };

  const reset = () => {
    setText(""); setType(null); clearPhoto(); setOpen(false); setPickerOpen(false);
  };

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    const ok = await onSubmit(communityId, text, file);
    setBusy(false);
    if (ok) reset();
  };

  return (
    <div className="w-full bg-bg-raised rounded-2xl border border-line p-5">
      <div className="flex items-start gap-3.5">
        <Avatar name={user?.name || "Guest"} src={user?.avatarUrl} size={40} />

        <div className="flex-1 min-w-0">
          {open ? (
            <textarea
              ref={boxRef}
              value={text}
              maxLength={2000}
              rows={3}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                if (e.key === "Escape" && !text.trim() && !file) reset();
              }}
              placeholder={
                type === "question" ? "What do you want to ask?" : "What's happening on campus?"
              }
              className="w-full bg-transparent text-ink placeholder:text-ink-3 text-[14.5px]
                leading-relaxed resize-none outline-none"
            />
          ) : (
            <button onClick={() => expand()} className="w-full text-left pt-0.5">
              <span className="block text-[15px] font-semibold text-ink">
                What&apos;s happening on campus{first ? `, ${first}` : ""}?
              </span>
              <span className="hidden sm:block text-[13px] text-ink-3 mt-1">
                Share a thought, ask a question, post an event or just say hi!
              </span>
            </button>
          )}

          {preview && (
            <div className="relative mt-3">
              <img src={preview} alt="" className="w-full max-h-72 object-cover rounded-xl border border-line" />
              <button
                onClick={clearPhoto}
                aria-label="Remove photo"
                className="absolute top-2 right-2 grid place-items-center w-7 h-7 rounded-full
                  bg-black/60 text-white backdrop-blur-sm hover:bg-black/75 transition-colors"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {!open && (
        <div className="flex flex-nowrap sm:flex-wrap items-center gap-2 mt-3 sm:mt-4 overflow-x-auto no-scrollbar -mx-1 px-1">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => expand(t)}
              className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-line
                text-[12.5px] font-medium text-ink-2 hover:text-ink hover:border-line-strong
                hover:bg-bg-sunken transition-colors"
            >
              <Icon name={t.icon} size={15} className={t.tint} />
              {t.label}
            </button>
          ))}
          <button
            onClick={() => expand()}
            aria-label="More"
            className="shrink-0 grid place-items-center w-9 h-9 rounded-full border border-line text-ink-3
              hover:text-ink hover:border-line-strong hover:bg-bg-sunken transition-colors"
          >
            <Icon name="more_horiz" size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-line">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => expand({ key: "snippet", seed: "```\n\n```" })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px]
              font-medium text-ink-2 hover:text-ink hover:bg-bg-sunken transition-colors"
          >
            <Icon name="code_blocks" size={17} className="text-c-blue" />
            <span className="hidden sm:inline">Snippet</span>
          </button>

          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer
            text-[12.5px] font-medium text-ink-2 hover:text-ink hover:bg-bg-sunken transition-colors">
            <Icon name="image" size={17} className="text-c-green" />
            <span className="hidden sm:inline">Media</span>
            <input type="file" accept="image/*" className="hidden" onChange={attach} />
          </label>

          <button
            onClick={() => expand(TYPES[2])}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px]
              font-medium text-ink-2 hover:text-ink hover:bg-bg-sunken transition-colors"
          >
            <Icon name="calendar_today" size={17} className="text-accent" />
            <span className="hidden sm:inline">Event</span>
          </button>

          <button
            onClick={() => expand({ key: "topic", seed: "#" })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12.5px]
              font-medium text-ink-2 hover:text-ink hover:bg-bg-sunken transition-colors"
          >
            <Icon name="tag" size={17} className="text-c-violet" />
            <span className="hidden sm:inline">Topic</span>
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {open && text.length > 0 && (
            <span className="text-[11.5px] text-ink-3 tabular-nums">{text.length}/2000</span>
          )}

          <div className="relative">
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-line
                text-[12.5px] font-medium text-ink-2 hover:text-ink transition-colors max-w-[170px]"
            >
              <Icon name={target ? "groups" : "public"} size={15} className="text-ink-3" />
              <span className="truncate">{target ? target.name.split(" — ")[0] : "Everyone"}</span>
              <Icon name="expand_more" size={15} className="text-ink-3 shrink-0" />
            </button>

            {pickerOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-56 max-h-64 overflow-y-auto
                bg-bg-raised border border-line rounded-2xl shadow-pop z-30 p-1 animate-pop">
                <button
                  onClick={() => { setCommunityId(null); setPickerOpen(false); }}
                  className={cx(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[13px] transition-colors",
                    communityId === null ? "bg-accent-wash text-accent font-semibold" : "text-ink hover:bg-bg-sunken"
                  )}
                >
                  <Icon name="public" size={16} />
                  Everyone on campus
                </button>
                {communities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCommunityId(c.id); setPickerOpen(false); }}
                    className={cx(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[13px] transition-colors",
                      communityId === c.id ? "bg-accent-wash text-accent font-semibold" : "text-ink hover:bg-bg-sunken"
                    )}
                  >
                    <Icon name="groups" size={16} />
                    <span className="truncate">{c.name.split(" — ")[0]}</span>
                  </button>
                ))}
                {communities.length === 0 && (
                  <p className="px-3 py-2 text-[12px] text-ink-3">Join a community to post to one.</p>
                )}
              </div>
            )}
          </div>

          {open && (
            <button
              onClick={reset}
              className="h-9 px-3 rounded-full text-[12.5px] font-medium text-ink-2 hover:text-ink
                hover:bg-bg-sunken transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            onClick={open ? submit : () => expand()}
            disabled={open && !ready}
            className="h-9 px-5 rounded-full bg-accent text-accent-ink text-[13px] font-semibold
              hover:bg-accent-press active:scale-[0.98] transition-all
              disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1.5"
          >
            {busy && <Icon name="progress_activity" size={14} className="animate-spin" />}
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FeedTabs({ value, onChange, tabs }) {
  return (
    <div className="inline-flex items-center gap-1 bg-bg-sunken p-1 rounded-full max-w-full overflow-x-auto no-scrollbar self-start">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cx(
            "px-4 py-2 rounded-full text-[13px] transition-all whitespace-nowrap",
            value === t.key
              ? "bg-accent text-accent-ink font-semibold"
              : "text-ink-2 hover:text-ink font-medium"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
