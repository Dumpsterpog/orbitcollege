import { useState, useMemo, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CATEGORIES, categoryOf } from "../data/constants.js";
import { baseSparks, handleFor, timeAgo } from "../utils/helpers.js";
import { Icon, Avatar, Button, IconButton, Input, Textarea, Field, Spinner, cx } from "./ui/Primitives.jsx";
import { Switch } from "./ui/Primitives.jsx";
import { Screen, PageHeader, Modal } from "./ui/Layout.jsx";
import { EmptyState } from "./EmptyState.jsx";
import { PostComments } from "./Common.jsx";
import * as db from "../lib/db.js";
import { classifyPost } from "../lib/moderation.js";

export function CommunitySettings({ c, onSave, onDelete, onClose }) {
  const [name, setName] = useState(c.name);
  const [desc, setDesc] = useState(c.desc);
  const [category, setCategory] = useState(c.category);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(c.avatarUrl || null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [postsAdminOnly, setPostsAdminOnly] = useState(!!c.postsAdminOnly);

  const pickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError("");
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    if (!name.trim()) return;
    const updates = { name: name.trim(), desc: desc.trim() || "No description yet.", category, tags: [category], postsAdminOnly };
    if (avatarFile) {
      setSavingAvatar(true);
      setAvatarError("");
      const path = `${c.id}/${Date.now()}-${avatarFile.name}`;
      let uploaded = null;
      try { uploaded = await db.uploadImage("community-avatars", avatarFile, c.id); } catch (e) { var upErr = e; }
      if (upErr) {
        setSavingAvatar(false);
        setAvatarError(upErr.message || "Image upload failed.");
        // Stop here instead of calling onSave — the parent closes this sheet
        // the moment onSave fires, which would hide this error before
        // anyone could read it. Name/description changes aren't lost, just
        // held until the image either uploads or is removed and Save is
        // pressed again.
        return;
      }
      const pub = uploaded ? { publicUrl: uploaded.url } : null;
      if (pub?.publicUrl) updates.avatarUrl = pub.publicUrl;
      setSavingAvatar(false);
    }
    onSave(updates);
  };
  return (
    <Modal
      title="Community settings"
      onClose={onClose}
      max="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" onClick={save} disabled={!name.trim()} loading={savingAvatar}>
            {savingAvatar ? "Saving…" : "Save changes"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 max-h-[60vh] overflow-y-auto -mx-4 px-4">
        <div>
          <p className="text-2xs font-semibold text-ink-2 uppercase tracking-wider mb-1.5">Status image</p>
          <p className="text-2xs text-ink-2 mb-2.5 leading-relaxed">
            Shown on this community's page and in the joined-communities strip. Only you can change it.
          </p>
          <label className="flex items-center gap-3 cursor-pointer w-fit">
            <span className="w-14 h-14 rounded-lg bg-bg-sunken border border-line overflow-hidden grid place-items-center shrink-0">
              {avatarPreview
                ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                : <Icon name="image" size={17} className="text-ink-3" />}
            </span>
            <span className="text-xs font-medium text-ink-2 inline-flex items-center gap-1.5">
              <Icon name="photo_camera" size={13} className="text-c-teal" />{avatarPreview ? "Change image" : "Upload image"}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={pickAvatar} />
          </label>
          {avatarError && <p className="text-2xs text-danger mt-2">{avatarError}</p>}
        </div>

        <Field label="Name" htmlFor="cs-name">
          <Input
            id="cs-name" value={name} maxLength={80}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); }}
          />
        </Field>

        <Field label="Description" htmlFor="cs-desc">
          <Textarea id="cs-desc" value={desc} rows={3} maxLength={800} onChange={(e) => setDesc(e.target.value)} />
        </Field>

        <div className="flex items-center gap-4 bg-bg-sunken border border-line rounded px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">Only admins can post</p>
            <p className="text-2xs text-ink-2 mt-0.5 leading-relaxed">
              Posts tab only. Chat stays open to every member either way.
            </p>
          </div>
          <Switch label="Only admins can post" checked={postsAdminOnly} onChange={setPostsAdminOnly} />
        </div>

        <div>
          <p className="text-2xs font-semibold text-ink-2 uppercase tracking-wider mb-2">Category</p>
          <div className="grid grid-cols-2 gap-1.5">
            {CATEGORIES.map((cat) => {
              const selected = category === cat.name;
                            return (
                <button
                  type="button"
                  key={cat.name}
                  onClick={() => setCategory(cat.name)}
                  aria-pressed={selected}
                  className={cx(
                    "flex items-center gap-2 h-9 px-2.5 rounded border text-left transition-colors",
                    selected
                      ? "border-line-strong bg-bg-sunken text-ink"
                      : "border-line text-ink-2 hover:border-line-strong hover:text-ink"
                  )}
                >
                  <Icon size={14} className={cx("shrink-0", selected ? "text-accent" : "text-ink-3")} />
                  <span className="text-xs font-medium truncate flex-1">{cat.name}</span>
                  {selected && <Icon name="check" size={12} className="text-accent shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-1 border-t border-line">
          {!confirmDelete ? (
            <Button variant="danger" size="md" icon={Trash2} onClick={() => setConfirmDelete(true)} className="mt-4">
              Delete community
            </Button>
          ) : (
            <div className="mt-4 border border-danger/30 bg-danger-wash rounded p-3.5">
              <p className="text-xs text-ink-2 mb-3 leading-relaxed">
                This deletes the community for everyone, including all its posts and chat. This can't be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                <Button variant="danger" size="sm" onClick={onDelete}>Yes, delete it</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function mapPostRow(row) {
  return {
    id: row.id,
    who: row.profiles?.name || "Someone",
    authorId: row.author_id,
    text: row.text,
    time: timeAgo(row.created_at),
    hasImage: row.has_image,
    imageUrl: row.image_url,
    sparks: row.spark_count,
    pinned: row.pinned,
  };
}

function mapMemberRow(r) {
  return {
    userId: r.user_id,
    name: r.profiles?.name || "Someone",
    interests: r.profiles?.interests || [],
    joinedAt: r.joined_at,
    dbRole: r.role, // "member" | "admin" — creator status is separate, checked against c.creatorId
  };
}

function mapMessageRow(row) {
  return {
    id: row.id,
    who: row.profiles?.name || "Someone",
    authorId: row.author_id,
    text: row.text,
    time: timeAgo(row.created_at),
    imageUrl: row.image_url,
    pinned: row.pinned,
  };
}

// Banner wash per category, written as whole class strings so Tailwind's
// scanner keeps them.
const BANNER = {
  "text-c-blue":   "from-c-blue/70 to-c-violet/60",
  "text-c-violet": "from-c-violet/70 to-c-pink/55",
  "text-c-pink":   "from-c-pink/70 to-c-orange/55",
  "text-c-orange": "from-c-orange/70 to-c-amber/55",
  "text-c-amber":  "from-c-amber/70 to-c-orange/55",
  "text-c-green":  "from-c-green/70 to-c-teal/55",
  "text-c-teal":   "from-c-teal/70 to-c-blue/55",
  "text-c-red":    "from-c-red/70 to-c-pink/55",
  default:         "from-c-blue/70 to-c-violet/60",
};

// A community name may carry a subtitle after an em dash; the head is the name.
const nameHead = (name = "") => name.split(" \u2014 ")[0];

function RailPanel({ title, children }) {
  return (
    <section className="rounded-2xl border border-line p-4">
      <h3 className="text-base font-bold text-ink mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-bg px-3 py-2.5">
      <p className="text-2xs text-ink-3">{label}</p>
      <p className="text-md font-semibold text-ink tabular-nums mt-0.5 truncate">{value}</p>
    </div>
  );
}

export function CommunityDetail({ c, joined, onJoinToggle, onClose, onReport, verified, onBlocked, sparked, onSpark, onUpdate, onDelete, trendRank, interests, authUserId, myName }) {
  const cat = categoryOf(c.category);
    const sparks = baseSparks(c) + (sparked ? 1 : 0);
  const isAdmin = !!authUserId && c.creatorId === authUserId;
  const isLive = c.lastActive <= 10;
  const [tab, setTab] = useState("posts");
  const [sort, setSort] = useState("hot");
  const [shareNote, setShareNote] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [postImageFile, setPostImageFile] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState(null);
  const [postingImage, setPostingImage] = useState(false);
  const handle = useMemo(() => handleFor(c.name, c.id), [c.name, c.id]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [postSparkIds, setPostSparkIds] = useState([]);
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]); // [{ userId, name, interests, joinedAt }]
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [stickers, setStickers] = useState([]);
  const [stickersLoaded, setStickersLoaded] = useState(false);
  const [uploadingSticker, setUploadingSticker] = useState(false);

  // Live subscriptions, scoped to this one community. App.jsx remounts this
  // component (key={selectedCommunity.id}) on every switch, so a mount-time
  // effect is enough.
  //
  // This replaced about ninety lines. Most of what was here existed to work
  // around Postgres-era problems that no longer exist:
  //
  //   A getSession() call before every read, plus a 400ms retry, because a
  //   stale JWT made RLS silently scope the request as anon and return an
  //   empty 200 that overwrote real posts. Firestore's SDK holds the auth
  //   state itself and re-runs the listener when it changes.
  //
  //   A profiles!author_id join hint, because PostgREST returned HTTP 300
  //   "more than one relationship was found". Author names are denormalised
  //   onto the document now, so there is no join to disambiguate.
  //
  //   Three postgres_changes channels with manual insert/update/delete
  //   reconciliation. onSnapshot delivers the whole current list.
  useEffect(() => {
    const stopPosts = db.watchCommunityPosts(c.id, setPosts);
    // Chat is members-only by rule, so subscribing as a non-member is a query
    // we already know will be refused. Issuing it anyway produced a
    // permission-denied in the console on every community you had not joined,
    // which buried the denials that actually meant something.
    const stopMessages = joined
      ? db.watchMessages(c.id, setChatMessages)
      : (setChatMessages([]), () => {});

    let cancelled = false;
    db.fetchMembers(c.id).then((m) => { if (!cancelled) setMembers(m); });
    if (authUserId) {
      db.fetchMySparks(authUserId).then((ids) => { if (!cancelled) setPostSparkIds(ids); });
    }

    return () => { cancelled = true; stopPosts(); stopMessages(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, c.id, authUserId]);

  const total = members.length || c.members;
  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    const list = members.map((m) => ({ ...m, role: m.userId === c.creatorId ? "Creator" : m.dbRole === "admin" ? "Admin" : "Member" }));
    return q ? list.filter((m) => m.name.toLowerCase().includes(q)) : list;
  }, [memberQuery, members, c.creatorId]);
  // Whether the signed-in user can post to the Posts tab: always true unless
  // the creator has switched this community to admin-only posting, in which
  // case only the creator and members promoted to "admin" can.
  const myMemberRole = members.find((m) => m.userId === authUserId)?.dbRole;
  const canPost = !c.postsAdminOnly || isAdmin || myMemberRole === "admin";
  const recentlyJoined = useMemo(
    () => [...members].sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt)).slice(0, 4),
    [members]
  );
  const matchedMembers = useMemo(() => {
    if (!interests || interests.length === 0) return [];
    return members
      .filter((m) => m.userId !== authUserId)
      .map((m) => ({ ...m, overlap: (m.interests || []).filter((s) => interests.includes(s)) }))
      .filter((m) => m.overlap.length > 0);
  }, [members, interests, authUserId]);
  const faceStack = members.slice(0, 5);
  const extraCount = Math.max(0, total - faceStack.length);
  const orderedPosts = useMemo(() => {
    // Pinned first, always. A pin is the creator saying "read this first", and
    // no sort should be able to bury it.
    const pinned = posts.filter((p) => p.pinned);
    const rest = posts.filter((p) => !p.pinned);

    const byNew = (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
    const byTop = (a, b) => (b.sparks || 0) - (a.sparks || 0) || byNew(a, b);
    // Hot decays a post's sparks against its age, so a day-old post with five
    // sparks outranks a month-old one with six. Without the decay "hot" and
    // "top" would return the same list forever.
    const heat = (x) => {
      const hours = Math.max(1, (Date.now() - (x.createdAt?.getTime() || 0)) / 3600e3);
      return (x.sparks || 0) / Math.pow(hours + 2, 0.6);
    };
    const byHot = (a, b) => heat(b) - heat(a) || byNew(a, b);

    const cmp = sort === "new" ? byNew : sort === "top" ? byTop : byHot;
    return [...pinned.sort(byNew), ...rest.sort(cmp)];
  }, [posts, sort]);

  // Posts now require a photo — text-only updates belong in Chat instead
  // (see the composer UI below), so the feed reads as an actual photo feed
  // rather than a mix of text posts and photo posts. Caption stays optional.
  // Copies a link to the community. Deep links to a single post do not exist
  // yet, so this does not pretend to be one.
  const sharePost = async () => {
    const url = window.location.origin + "/c/" + handle;
    try {
      await navigator.clipboard.writeText(url);
      setShareNote("Link copied");
    } catch {
      setShareNote("Could not copy the link");
    }
    setTimeout(() => setShareNote(""), 1800);
  };

  const handlePost = async () => {
    const t = draft.trim();
    const file = postImageFile;
    // Text alone is a post. This used to require a photo, on the theory that
    // text belonged in Chat -- but chat is members-only and ephemeral, so the
    // rule quietly meant a community could not have a written announcement.
    if (!authUserId || (!t && !file)) return;

    // Same three-way decision as the home composer. This path used to have no
    // filter at all, which made a community the way around the feed's.
    const verdict = classifyPost(t);
    if (verdict.action === "block") {
      setShareNote(verdict.reason);
      setTimeout(() => setShareNote(""), 3200);
      return;
    }

    setDraft("");
    setPostImageFile(null);
    setPostImagePreview(null);
    setPostingImage(true);

    let imageUrl = null;
    if (file) {
      try {
        ({ url: imageUrl } = await db.uploadImage("community-media", file, authUserId));
      } catch {
        // A failed upload should not silently drop what was written, so the
        // post still goes up -- without the picture.
        imageUrl = null;
      }
    }

    try {
      if (verdict.action === "review") {
        await db.submitForReview({
          communityId: c.id, authorId: authUserId, authorName: myName, text: t, imageUrl,
          labels: verdict.labels, matched: verdict.matched,
        });
        setShareNote(verdict.reason);
        setTimeout(() => setShareNote(""), 3200);
      } else {
        await db.createPost({ communityId: c.id, authorId: authUserId, authorName: myName, text: t, imageUrl });
      }
    } catch (err) {
      console.error("[orbit] community post failed", err);
    } finally {
      setPostingImage(false);
    }
  };

  // Author can always remove their own post/message; the community's
  // creator can remove anything posted inside it (moderation) — matches
  // the delete RLS policies in schema_media_and_moderation.sql. Optimistic
  // + rollback, same pattern as the rest of this file.
  const deletePost = async (post) => {
    if (!(post.authorId === authUserId || isAdmin)) return;
    setPosts((ps) => ps.filter((p) => p.id !== post.id));
    const error = await db.deletePost(c.id, post.id).then(() => null).catch((e) => e);
    if (error) setPosts((ps) => [post, ...ps]);
  };

  const deleteMessage = async (message) => {
    if (!(message.authorId === authUserId || isAdmin)) return;
    setChatMessages((ms) => ms.filter((m) => m.id !== message.id));
    const error = await db.deleteMessage(c.id, message.id).then(() => null).catch((e) => e);
    if (error) setChatMessages((ms) => [...ms, message]);
  };

  const loadStickers = async () => {
    const rows = await db.fetchStickers();
    setStickers(rows.map((r) => ({ id: r.id, image_url: r.url })));
    setStickersLoaded(true);
  };

  const uploadSticker = async (file) => {
    if (!authUserId || !file) return;
    setUploadingSticker(true);
    try {
      const { url } = await db.uploadImage("stickers", file, authUserId);
      const created = await db.addSticker({ url, authorId: authUserId });
      setStickers((prev) => [{ id: created.id, image_url: url }, ...prev]);
    } catch { /* leave the picker as it was */ }
    setUploadingSticker(false);
  };

  const sendSticker = async (sticker) => {
    if (!authUserId) return;
    setStickerPickerOpen(false);
    try {
      await db.sendMessage({ communityId: c.id, authorId: authUserId, authorName: myName, text: "", imageUrl: sticker.image_url });
    } catch { /* watchMessages stays the source of truth */ }
  };

  const togglePostSpark = async (id) => {
    if (!authUserId) return;
    const already = postSparkIds.includes(id);
    setPostSparkIds((ids) => (already ? ids.filter((x) => x !== id) : [...ids, id]));
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, sparks: p.sparks + (already ? -1 : 1) } : p)));
    const { error } = already
      ? await db.toggleSpark(c.id, id, authUserId).then(() => ({})).catch((e) => ({ error: e }))
      : await db.toggleSpark(c.id, id, authUserId).then(() => ({})).catch((e) => ({ error: e }));
    if (error) {
      setPostSparkIds((ids) => (already ? [...ids, id] : ids.filter((x) => x !== id)));
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, sparks: p.sparks + (already ? 1 : -1) } : p)));
    }
  };

  const togglePin = async (post) => {
    const currentlyPinned = posts.find((p) => p.pinned);
    if (currentlyPinned && currentlyPinned.id !== post.id) {
      await db.setPostPinned(c.id, currentlyPinned.id, false);
    }
    const nextPinned = !post.pinned;
    await db.setPostPinned(c.id, post.id, nextPinned);
    setPosts((ps) => ps.map((p) => (p.id === post.id ? { ...p, pinned: nextPinned } : currentlyPinned && p.id === currentlyPinned.id ? { ...p, pinned: false } : p)));
  };

  const togglePinMessage = async (message) => {
    const currentlyPinned = chatMessages.find((m) => m.pinned);
    if (currentlyPinned && currentlyPinned.id !== message.id) {
      await db.setMessagePinned(c.id, currentlyPinned.id, false);
    }
    const nextPinned = !message.pinned;
    await db.setMessagePinned(c.id, message.id, nextPinned);
    setChatMessages((ms) => ms.map((m) => (m.id === message.id ? { ...m, pinned: nextPinned } : currentlyPinned && m.id === currentlyPinned.id ? { ...m, pinned: false } : m)));
  };

  // Was a dead button (no handler at all) — now a real delete, backed by the
  // "community creator can remove a member" policy in
  // schema_security_hardening.sql. Optimistic + rollback, same pattern as
  // the rest of this file.
  const removeMember = async (member) => {
    if (!isAdmin) return;
    setMembers((ms) => ms.filter((m) => m.userId !== member.userId));
    const error = await db.leaveCommunity(c.id, member.userId).then(() => null).catch((e) => e);
    if (error) {
      setMembers((ms) => [...ms, member]);
    }
  };

  // Only the creator can promote/demote — a promoted admin can't promote
  // anyone else, matching the app's single-owner moderation model.
  const toggleMemberAdmin = async (member) => {
    if (!isAdmin) return;
    const nextRole = member.dbRole === "admin" ? "member" : "admin";
    setMembers((ms) => ms.map((m) => (m.userId === member.userId ? { ...m, dbRole: nextRole } : m)));
    const error = await db.setMemberRole(c.id, member.userId, nextRole).then(() => null).catch((e) => e);
    if (error) {
      setMembers((ms) => ms.map((m) => (m.userId === member.userId ? { ...m, dbRole: member.dbRole } : m)));
    }
  };

  const sendChat = async () => {
    const t = chatDraft.trim();
    if (!t || !authUserId) return;
    setChatDraft("");
    try {
      await db.sendMessage({ communityId: c.id, authorId: authUserId, authorName: myName, text: t });
    } catch { setChatDraft(t); }
  };

  const TABS = [
    { key: "posts", label: "Posts", icon: "feed" },
    { key: "chat", label: "Chat", icon: "forum" },
    { key: "members", label: "Members", icon: "group", count: total },
  ];

  return (
    <Screen>
      <PageHeader
        title={c.name}
        onBack={onClose}
        actions={
          isAdmin
            ? <IconButton icon="settings" label="Community settings" size={20} onClick={() => setSettingsOpen(true)} />
            : <Button variant="ghost" size="sm" icon="flag" onClick={onReport}>Report</Button>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Banner. A community rarely has cover art, so the fallback is a wash
            in its own category colour rather than a grey slab or a stock photo. */}
        <div className={cx("relative h-32 sm:h-40 overflow-hidden bg-gradient-to-br", BANNER[cat.tint] || BANNER.default)}>
          {c.avatarUrl && (
            <img src={c.avatarUrl} alt="" aria-hidden="true"
                 className="absolute inset-0 w-full h-full object-cover opacity-25 blur-xl scale-110" />
          )}
          <div className="absolute top-3 right-4 flex items-center gap-2">
            {isLive && (
              <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-black/35 backdrop-blur-sm text-white text-2xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-c-green animate-pulse" />
                Active now
              </span>
            )}
            {trendRank && (
              <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-black/35 backdrop-blur-sm text-white text-2xs font-semibold">
                <Icon name="trending_up" size={13} />
                #{trendRank} in {c.category}
              </span>
            )}
          </div>
        </div>

        <div className="max-w-6xl w-full mx-auto px-5 lg:px-8">
          {/* Identity. The avatar straddles the banner edge, which is what stops
              the header reading as two unrelated bands. */}
          <div className="flex items-end gap-4 -mt-11 sm:-mt-12">
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden ring-4 ring-bg bg-bg-sunken grid place-items-center">
                {c.avatarUrl
                  ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <Icon name={cat.msr} size={38} className={cat.tint} />}
              </div>
              {c.official && (
                <span className="absolute -bottom-1 -right-1 grid place-items-center w-6 h-6 rounded-full bg-bg">
                  <Icon name="verified" size={19} className="text-c-blue" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 pb-1 hidden sm:flex justify-end gap-1.5">
              <Button variant="secondary" size="sm" icon="qr_code_2" onClick={() => setQrOpen(true)}>Share</Button>
              <Button
                variant={joined ? "secondary" : "primary"}
                size="sm"
                icon={joined ? "check" : undefined}
                onClick={() => { if (!verified) { onBlocked(); return; } onJoinToggle(c.id); }}
              >
                {joined ? "Joined" : "Join"}
              </Button>
            </div>
          </div>

          <div className="mt-3.5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-ink leading-tight">{nameHead(c.name)}</h2>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-bg-sunken text-ink-2 text-2xs font-semibold">
                  <Icon name={cat.msr} size={11} className={cat.tint} />{c.category}
                </span>
                {c.official && (
                  <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-accent-wash text-accent text-2xs font-semibold">
                    <Icon name="verified" size={11} className="text-c-blue" />Official club
                  </span>
                )}
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-bg-sunken text-ink-2 text-2xs font-semibold">
                    <Icon name="workspace_premium" size={11} className="text-c-amber" />You created this
                  </span>
                )}
              </div>
            </div>
            <div className="sm:hidden shrink-0">
              <Button
                variant={joined ? "secondary" : "primary"}
                size="sm"
                onClick={() => { if (!verified) { onBlocked(); return; } onJoinToggle(c.id); }}
              >
                {joined ? "Joined" : "Join"}
              </Button>
            </div>
          </div>

          {c.desc && <p className="text-md text-ink-2 leading-relaxed mt-3 max-w-2xl">{c.desc}</p>}

          {/* Meta strip. Every figure on it is real; nothing is invented to
              fill the row out. */}
          <div className="flex items-center gap-x-5 gap-y-2 mt-3.5 flex-wrap text-base text-ink-2">
            <button onClick={() => setTab("members")} className="inline-flex items-center gap-2 hover:text-ink transition-colors">
              <span className="flex -space-x-1.5">
                {faceStack.map((m, i) => (
                  <span key={m.userId || i} className="ring-2 ring-bg rounded-full">
                    <Avatar name={m.name} size={20} />
                  </span>
                ))}
              </span>
              <span><span className="font-semibold text-ink tabular-nums">{total}</span> members</span>
            </button>

            <button onClick={() => onSpark(c.id)} aria-pressed={sparked}
              className={cx("inline-flex items-center gap-1.5 transition-colors", sparked ? "text-accent" : "hover:text-ink")}>
              <Icon name="local_fire_department" size={16} className="text-c-orange" />
              <span className="tabular-nums font-semibold text-ink">{sparks}</span> interested
            </button>

            {c.createdAt && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="schedule" size={16} className="text-ink-3" />
                Since {c.createdAt.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
              </span>
            )}

            <button onClick={() => setQrOpen(true)} className="inline-flex items-center gap-1.5 sm:hidden hover:text-ink transition-colors">
              <Icon name="qr_code_2" size={16} className="text-ink-3" />Share
            </button>
          </div>

          {matchedMembers.length > 0 && (
            <div className="mt-4 flex items-center gap-2.5 bg-accent-wash rounded-xl px-3.5 py-2.5">
              <Avatar name={matchedMembers[0].name} size={24} />
              <p className="text-base text-ink-2 leading-snug min-w-0">
                <span className="font-semibold text-ink">{matchedMembers[0].name}</span> shares your interest in {matchedMembers[0].overlap.join(", ")}
                {matchedMembers.length > 1 && <> · +{matchedMembers.length - 1} more here</>}
              </p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-line mt-6 overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-current={tab === t.key ? "page" : undefined}
                className={cx(
                  "inline-flex items-center gap-1.5 px-3.5 h-11 -mb-px border-b-2 text-base font-semibold shrink-0 transition-colors",
                  tab === t.key
                    ? "border-accent text-ink"
                    : "border-transparent text-ink-2 hover:text-ink"
                )}
              >
                <Icon name={t.icon} size={17} className={tab === t.key ? cat.tint : "text-ink-3"} />
                {t.label}
                {typeof t.count === "number" && <span className="text-ink-3 tabular-nums font-mono text-xs">{t.count}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Body: content beside a rail carrying everything about the community
            that is not a post. The rail is what lets the header stay short. */}
        <div className="max-w-6xl w-full mx-auto lg:px-8 grid lg:grid-cols-[minmax(0,1fr)_310px] gap-x-8 items-start">
          <div className="min-w-0">
        {tab === "chat" && (
          <div className="flex flex-col h-[420px]">
            {(() => {
              const pinnedMessage = chatMessages.find((m) => m.pinned);
              if (!pinnedMessage) return null;
              return (
                <div className="flex items-start gap-2 mx-5 lg:mx-8 mt-3 px-3 py-2 rounded bg-accent-wash border border-accent/20">
                  <Icon name="push_pin" size={12} className="text-accent mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-2xs text-accent font-semibold">Pinned · {pinnedMessage.who}</p>
                    <p className="text-xs text-ink-2 truncate">{pinnedMessage.text}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => togglePinMessage(pinnedMessage)} className="text-[10px] text-ink-2 hover:text-ink-2 shrink-0">Unpin</button>
                  )}
                </div>
              );
            })()}
            <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-3 space-y-2.5">
              {!joined && (
                <p className="text-xs text-ink-2 text-center py-6">Join this {c.official ? "club" : "community"} to send messages. You can still read along.</p>
              )}
              {chatMessages.map((m) => (
                <div key={m.id} className="flex gap-2.5 group">
                  <Avatar name={m.who} size={26} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink-2"><span className="font-medium text-ink">{m.who}</span></p>
                    {m.text && <p className="text-sm text-ink-2">{m.text}</p>}
                    {m.imageUrl && (
                      <img src={m.imageUrl} alt="" className="mt-1 max-h-32 max-w-[160px] rounded-lg object-contain border border-line bg-bg-sunken" />
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-ink-2 mono">{m.time}</p>
                      {isAdmin && (
                        <button onClick={() => togglePinMessage(m)} className="text-[11px] text-ink-3 hover:text-ink flex items-center gap-0.5">
                          <Icon name="push_pin" size={10} className="text-c-amber" />{m.pinned ? "Unpin" : "Pin"}
                        </button>
                      )}
                      {(m.authorId === authUserId || isAdmin) && (
                        <button onClick={() => deleteMessage(m)} className="text-[11px] text-ink-3 hover:text-ink-2 flex items-center gap-0.5">
                          <Icon name="delete" size={10} className="text-c-red" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {stickerPickerOpen && (
              <div className="border-t border-line px-5 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-ink-2 uppercase tracking-wide">Stickers</p>
                  <label className="text-[11px] text-ink font-medium flex items-center gap-1 cursor-pointer">
                    {uploadingSticker ? <Icon name="progress_activity" size={11} className="animate-spin text-ink-2" /> : <Icon name="photo_camera" size={11} className="text-c-teal" />}
                    Add one
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingSticker} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSticker(f); }} />
                  </label>
                </div>
                {!stickersLoaded ? (
                  <p className="text-xs text-ink-3 py-3 text-center">Loading...</p>
                ) : stickers.length === 0 ? (
                  <p className="text-xs text-ink-3 py-3 text-center">No stickers yet. Add the first one.</p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {stickers.map((s) => (
                      <button key={s.id} onClick={() => sendSticker(s)} className="w-14 h-14 rounded-xl bg-bg-sunken border border-line overflow-hidden shrink-0 active:scale-90 transition-transform">
                        <img src={s.image_url} alt="" className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {joined && (
              <div className="flex items-center gap-2 px-5 py-3 border-t border-line">
                <button
                  onClick={() => { setStickerPickerOpen((v) => !v); if (!stickersLoaded) loadStickers(); }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${stickerPickerOpen ? "bg-bg-sunken text-ink" : "text-ink-2 hover:bg-bg-sunken"}`}
                >
                  <Icon name="emoji_emotions" size={17} className="text-c-pink" />
                </button>
                <input
                  value={chatDraft} onChange={(e) => setChatDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || !chatDraft.trim()) return;
                    sendChat();
                  }}
                  placeholder="Message the group"
                  maxLength={1000}
                  className="flex-1 bg-bg-sunken border border-line text-ink placeholder:text-ink-3 rounded-full px-4 py-2 text-sm outline-none focus:border-line-strong"
                />
                <button
                  onClick={sendChat}
                  className="w-9 h-9 rounded-full bg-solid text-solid-ink flex items-center justify-center shrink-0"
                >
                  <Icon name="send" size={15} className="text-c-violet" />
                </button>
              </div>
            )}
          </div>
        )}
        {tab === "posts" && (
          <div className="px-5 lg:px-0 pt-5 pb-16">
            {joined && !canPost && (
              <p className="text-base text-ink-2 text-center py-4 mb-4 rounded-2xl border border-line">
                Only this community&apos;s admins can post right now.
              </p>
            )}

            {joined && canPost && (
              <div className="rounded-2xl border border-line p-3.5 mb-5">
                <div className="flex gap-3">
                  <Avatar name={myName} size={40} />
                  <div className="min-w-0 flex-1">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost(); }}
                      placeholder={"Share something with " + nameHead(c.name) + "…"}
                      rows={3}
                      maxLength={2000}
                      className="w-full bg-bg-sunken rounded-xl px-3.5 py-3 text-ink placeholder:text-ink-3 text-md
                        outline-none resize-none leading-relaxed border border-transparent focus:border-line-strong transition-colors"
                    />

                    {postImagePreview && (
                      <div className="relative mt-1">
                        <img src={postImagePreview} alt="" className="w-full max-h-80 object-cover rounded-xl border border-line" />
                        <button
                          onClick={() => { setPostImageFile(null); setPostImagePreview(null); }}
                          aria-label="Remove photo"
                          className="absolute top-2 right-2 grid place-items-center w-7 h-7 rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/75 transition-colors"
                        >
                          <Icon name="close" size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-line">
                  <label
                    title="Add a photo"
                    className="inline-grid place-items-center w-9 h-9 rounded-full shrink-0 cursor-pointer text-c-teal hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
                  >
                    <Icon name="photo_camera" size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setPostImageFile(file);
                      setPostImagePreview(URL.createObjectURL(file));
                    }} />
                  </label>
                  <span className="text-xs text-ink-3 tabular-nums">{draft.length}/2000</span>
                  <span className="hidden sm:inline text-xs text-ink-3 ml-auto mr-2">Ctrl + Enter</span>
                  <Button
                    tone="blue"
                    size="md"
                    className={cx("shrink-0", "sm:ml-0 ml-auto")}
                    disabled={(!draft.trim() && !postImageFile) || postingImage}
                    loading={postingImage}
                    onClick={handlePost}
                  >
                    Post
                  </Button>
                </div>
              </div>
            )}

            {/* Sort. Pinned posts ignore it, because a pin is the creator
                saying "read this first" and no ordering should bury it. */}
            {orderedPosts.length > 0 && (
              <div className="flex items-center gap-1 mb-4">
                {[
                  { key: "hot", label: "Hot discussions", icon: "local_fire_department" },
                  { key: "new", label: "Newest", icon: null },
                  { key: "top", label: "Top rated", icon: null },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSort(s.key)}
                    className={cx(
                      "inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-semibold transition-colors",
                      sort === s.key ? "bg-accent-wash text-accent" : "text-ink-2 hover:text-ink hover:bg-bg-sunken"
                    )}
                  >
                    {s.icon && <Icon name={s.icon} size={14} className={sort === s.key ? "" : "text-c-orange"} />}
                    {s.label}
                  </button>
                ))}
                <span className="ml-auto font-mono text-xs tabular-nums text-ink-3">
                  {orderedPosts.length} {orderedPosts.length === 1 ? "post" : "posts"}
                </span>
              </div>
            )}

            {orderedPosts.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-lg font-bold text-ink">Nothing posted yet</p>
                <p className="text-base text-ink-2 mt-2 max-w-[36ch] mx-auto leading-relaxed">
                  {joined && canPost
                    ? "Yours would be the first."
                    : "Join to start the conversation here."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orderedPosts.map((p) => {
                  const isPinned = p.pinned;
                  const postSparked = postSparkIds.includes(p.id);
                  const mine = p.authorId === authUserId;
                  const byCreator = p.authorId === c.creatorId;

                  return (
                    <article
                      key={p.id}
                      className={cx(
                        "rounded-2xl border overflow-hidden transition-colors",
                        isPinned ? "border-accent/35" : "border-line hover:border-line-strong"
                      )}
                    >
                      {isPinned && (
                        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-line">
                          <Icon name="push_pin" size={15} className="text-c-amber" />
                          <span className="text-xs font-bold text-accent">Pinned announcement</span>
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex items-start gap-3.5">
                          <Avatar name={p.who} size={44} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-md font-bold text-ink truncate">{p.who}</span>
                              {byCreator && <Icon name="verified" size={15} className="text-c-blue shrink-0" />}
                              {byCreator && (
                                <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-accent-wash text-accent text-[10px] font-bold">
                                  <Icon name="workspace_premium" size={10} className="text-c-amber" />Creator
                                </span>
                              )}
                              {mine && !byCreator && (
                                <span className="inline-flex items-center h-5 px-2 rounded-full bg-bg-sunken text-ink-2 text-[10px] font-bold">You</span>
                              )}
                              <span className="text-base text-ink-3">· {p.time}</span>
                            </div>

                            {p.text && (
                              <p className="text-md text-ink leading-[1.65] mt-2 whitespace-pre-wrap break-words">
                                {p.text}
                              </p>
                            )}
                          </div>

                          {(mine || isAdmin) && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              {isAdmin && (
                                <IconButton
                                  icon="push_pin"
                                  label={isPinned ? "Unpin" : "Pin"}
                                  size={17}
                                  onClick={() => togglePin(p)}
                                />
                              )}
                              <IconButton icon="delete" label="Delete" size={17} onClick={() => deletePost(p)} />
                            </div>
                          )}
                        </div>

                        {p.imageUrl && (
                          <img
                            src={p.imageUrl}
                            alt=""
                            loading="lazy"
                            className="w-full max-h-[520px] object-cover rounded-xl border border-line mt-3"
                          />
                        )}

                        <div className="flex items-center flex-wrap gap-2 mt-4 pt-3 border-t border-line">
                          <button
                            onClick={() => togglePostSpark(p.id)}
                            aria-pressed={postSparked}
                            className={cx(
                              "inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-xs font-semibold transition-colors",
                              postSparked
                                ? "bg-accent-wash text-accent"
                                : "bg-bg-sunken text-ink-2 hover:text-ink"
                            )}
                          >
                            <Icon name="local_fire_department" size={16} className="text-c-orange" />
                            <span className="tabular-nums">{p.sparks || 0}</span>
                          </button>

                          <button
                            onClick={() => sharePost(p)}
                            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-xs font-semibold
                              text-ink-2 hover:text-ink hover:bg-bg-sunken transition-colors"
                          >
                            <Icon name="share" size={16} className="text-c-teal" />
                            <span className="hidden sm:inline">Share</span>
                          </button>

                          <PostComments
                            communityId={c.id}
                            postId={p.id}
                            count={p.comments}
                            authUserId={authUserId}
                            myName={myName}
                            canWrite={!!authUserId}
                            onBlocked={onBlocked}
                          />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {tab === "members" && (
          <div className="px-5 pt-4 pb-6">
            {!memberQuery && recentlyJoined.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-semibold text-ink-2 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  Recently joined
                </p>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {recentlyJoined.map((m) => (
                    <div key={m.userId} className="flex flex-col items-center gap-1 w-14 shrink-0">
                      <Avatar name={m.name} size={32} />
                      <p className="text-[10px] text-ink-2 truncate w-full text-center">{m.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 bg-bg-sunken border border-line rounded-xl px-3 py-2 mb-4">
              <Icon name="search" size={14} className="text-ink-2 shrink-0" />
              <input value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} placeholder="Search members" className="flex-1 bg-transparent text-ink placeholder:text-ink-3 text-sm outline-none" />
            </div>
            <div className="space-y-1">
              {filteredMembers.map((m) => {
                const overlap = interests ? (m.interests || []).filter((s) => interests.includes(s)) : [];
                return (
                  <div key={m.userId} className="flex items-center gap-3 py-2">
                    <Avatar name={m.name} size={30} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{m.name}</p>
                      <p className="text-[11px] text-ink-2 flex items-center gap-1">
                        {m.role === "Creator" && <Icon name="workspace_premium" size={10} className="text-ink-2" />}{m.role}
                        {overlap.length > 0 && <span className="text-ink">· shares {overlap.join(", ")}</span>}
                      </p>
                    </div>
                    {isAdmin && m.role !== "Creator" && (
                      <div className="flex items-center gap-2.5 shrink-0">
                        <button onClick={() => toggleMemberAdmin(m)} className="text-[11px] text-ink-2 hover:text-ink">
                          {m.role === "Admin" ? "Remove admin" : "Make admin"}
                        </button>
                        <button onClick={() => removeMember(m)} className="text-[11px] text-ink-2 hover:text-ink-2">Remove</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredMembers.length === 0 && <p className="text-sm text-ink-2 text-center py-8">No members match "{memberQuery}".</p>}
            </div>
          </div>
        )}
      </div>
          </div>

          <aside className="hidden lg:block pt-5 pb-16">
            <div className="sticky top-4 space-y-4">
              <RailPanel title="About">
                <p className="text-base text-ink-2 leading-relaxed">
                  {c.desc || "No description yet."}
                </p>
                <div className="grid grid-cols-2 gap-px mt-4 bg-line rounded-xl overflow-hidden">
                  <Stat label="Members" value={total} />
                  <Stat label="Posts" value={posts.length} />
                  <Stat label="Founded" value={c.createdAt ? c.createdAt.toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "Unknown"} />
                  <Stat label="Rank" value={trendRank ? "#" + trendRank : "Unranked"} />
                </div>
              </RailPanel>

              {c.rules?.length > 0 && (
                <RailPanel title="House rules">
                  <ol className="space-y-3.5">
                    {c.rules.map((r, i) => (
                      <li key={i}>
                        <p className="text-base font-semibold text-ink">
                          <span className="font-mono text-ink-3 mr-1.5">{i + 1}.</span>{r.title}
                        </p>
                        {r.body && <p className="text-base text-ink-2 leading-relaxed mt-0.5 pl-5">{r.body}</p>}
                      </li>
                    ))}
                  </ol>
                </RailPanel>
              )}

              {isAdmin && !c.rules?.length && (
                <RailPanel title="House rules">
                  <p className="text-base text-ink-2 leading-relaxed">
                    None set yet. A community with rules gets reported a lot less than one without.
                  </p>
                </RailPanel>
              )}

              {c.tags?.length > 0 && (
                <RailPanel title="Topics">
                  <div className="flex flex-wrap gap-1.5">
                    {c.tags.map((t) => {
                      const tc = CATEGORIES.find((x) => x.name === t);
                      return (
                        <span key={t} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-bg-sunken text-ink-2 text-2xs font-semibold">
                          {tc && <Icon name={tc.msr} size={12} className={tc.tint} />}{t}
                        </span>
                      );
                    })}
                  </div>
                </RailPanel>
              )}
            </div>
          </aside>
        </div>
      {settingsOpen && (
        <CommunitySettings
          c={c}
          onClose={() => setSettingsOpen(false)}
          onSave={(updates) => { onUpdate(c.id, updates); setSettingsOpen(false); }}
          onDelete={() => onDelete(c.id)}
        />
      )}
      {shareNote && (
        <div className="fixed inset-x-0 bottom-8 z-[90] flex justify-center px-4 pointer-events-none">
          <div className="bg-solid text-solid-ink text-base font-medium px-4 py-2.5 rounded-full shadow-pop">
            {shareNote}
          </div>
        </div>
      )}
      {qrOpen && (
        <Modal title={c.name} onClose={() => setQrOpen(false)} max="max-w-xs">
          <div className="text-center">
            <p className="text-xs text-ink-2 mb-4">{c.category}</p>
            <div className="bg-white rounded p-3 inline-block">
              <QRCodeSVG value={`https://orbit.app/${c.official ? "club" : "c"}/${handle}`} size={168} />
            </div>
            <p className="text-2xs text-ink-2 mt-4 leading-relaxed">
              Scan to open this {c.official ? "club" : "community"} on Orbit
            </p>
          </div>
        </Modal>
      )}
    </Screen>
  );
}
