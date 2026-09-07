import { useState, useMemo, useCallback, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { OrbitProvider } from "./context/OrbitContext.jsx";
import { FONT_IMPORT } from "./data/constants.js";
import { communityTrendScore, slugify, timeAgo } from "./utils/helpers.js";
import { useViewportHeight } from "./utils/useViewportHeight.js";
import { useTheme } from "./utils/useTheme.js";
import * as db from "./lib/db.js";
import { onAuthChange, completeRedirectSignIn, fetchProfile, signOut as fbSignOut } from "./lib/authService.js";
import { auth } from "./lib/firebase.js";
import { TopBar } from "./components/TopBar.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { GuestBanner, Toast, ThemeNotice, Logo } from "./components/Common.jsx";
import { Onboarding } from "./components/Onboarding.jsx";
import { ReportModal } from "./components/ReportModal.jsx";

// Firestore document -> app shape mapping now lives in lib/db.js, next to the
// queries that produce it, so a collection and the shape it yields cannot
// drift apart.
// One row per post, across every community (not just joined ones) — powers
// Home's Instagram-style "Latest posts" feed. Uses the same profiles!author_id
// relationship hint as Community.jsx's mapPostRow (see the comment there —
// plain profiles(name) returns an ambiguous-relationship HTTP 300 on this
// table specifically).

// Tea/Confessions are deliberately anonymous server-side — author_id is
// never selectable (see schema_tea.sql), so there's no way to ask the
// server "which of these are mine?". Instead we remember locally, at the
// moment of posting, which ids are ours — that's enough to show a delete
// button on your own content without ever exposing authorship to anyone
// else or changing the anonymity model. Persisted so it survives a reload
// (posts only live 48h anyway, so this never grows unbounded for long).
function loadIdSet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}
function saveIdSet(key, set) {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch { /* ignore */ }
}

// Dev landing switch: with VITE_SKIP_AUTH=true the app boots straight into the
// full-width Home dashboard as a guest, skipping the phone-frame OTP card.
// Unset it (or set false) and the normal onboarding flow comes back untouched.
const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === "true";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  useViewportHeight(); // keyboard-float fix — see utils/useViewportHeight.js
  const { theme, mode: themeMode, toggleTheme, setThemeMode, themeNotice, dismissThemeNotice } = useTheme(); // see utils/useTheme.js
  const [loadingSession, setLoadingSession] = useState(true);
  const [stage, setStage] = useState(SKIP_AUTH ? "app" : "onboarding");
  const [authUser, setAuthUser] = useState(null); // { id, email } from Firebase Auth, or null
  const [user, setUser] = useState(
    SKIP_AUTH ? { name: "Guest", verified: false, interests: [] }
              : { name: "", verified: false, interests: [] });

  // Live data (Firestore) — core flow: auth, communities/clubs, join/leave, events.
  const [dbCommunities, setDbCommunities] = useState([]);
  const [events, setEvents] = useState([]);
  const [joinedIds, setJoinedIds] = useState([]);
  const [registeredEventIds, setRegisteredEventIds] = useState([]);
  // Home dashboard: Instagram-style "Latest posts" feed — every community's
  // posts, newest first (not just joined ones) — see the feedPosts effect
  // below. feedSparkIds tracks which of those posts the signed-in user has
  // already sparked, same one-row-per-user-per-post pattern as Community.jsx.
  const [feedPosts, setFeedPosts] = useState([]);
  const [feedSparkIds, setFeedSparkIds] = useState([]);

  // Still mock/local for this first build — see App architecture notes.
  const [sparkedIds, setSparkedIds] = useState([]);
  const [reportTarget, setReportTarget] = useState(null);
  // Session-only: Settings marks these as unsaved rather than pretending
  // a backend is storing them.
  const [notifPrefs, setNotifPrefs] = useState({ events: true, posts: true, replies: true });
  const [notifOpen, setNotifOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  // "/" opens search, the way the sidebar's kbd hint advertises. Ignored while
  // the user is typing into a field or a contentEditable, otherwise the key
  // would be unusable in every text input in the app.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      e.preventDefault();
      navigate("/search");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
  const [teaPosts, setTeaPosts] = useState([]); // real, Firestore-backed — see fetchTea()
  const [myTeaVotes, setMyTeaVotes] = useState({}); // Tea tab: postId -> "true" | "cap"
  const [myTeaReactions, setMyTeaReactions] = useState({}); // Confessions tab: postId -> emoji
  const [myTeaPostIds, setMyTeaPostIds] = useState(() => loadIdSet("orbit_my_tea_post_ids"));
  const [myTeaCommentIds, setMyTeaCommentIds] = useState(() => loadIdSet("orbit_my_tea_comment_ids"));
  const [exploreTab, setExploreTab] = useState("clubs");

  // Demo content, reachable from the browser console while signed in. It
  // writes through the same rules the app obeys, so a refusal here is a
  // refusal the app would also have hit -- which makes it a smoke test as much
  // as a way to get something on screen.
  useEffect(() => {
    window.orbitSeed = async () => {
      const { seedDemo } = await import("./lib/seed.js");
      const out = await seedDemo(authUser?.id, user.name || "Orbit");
      console.info("[orbit] seeded", out);
      return out;
    };
    window.orbitClearDemo = async () => {
      const { clearDemo } = await import("./lib/seed.js");
      const n = await clearDemo();
      console.info("[orbit] removed", n, "demo documents");
      return n;
    };
  }, [authUser, user.name]);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2200);
  }, []);

  // Both queries below are RLS-scoped "to authenticated" — see the
  // getSession() note in Community.jsx for why each one waits on a fresh
  // session first. Without it, a stale/expiring JWT could make one of these
  // silently come back empty (200 OK, not an error) and wipe joinedIds /
  // registeredEventIds, which would visibly flip "Joined ✓" back to "Join"
  // even though the membership/registration row was never actually deleted.
  // db.js degrades rather than throwing for these, but a rejection here would
  // otherwise be unhandled and take out whatever called it.
  const fetchMyJoins = useCallback(async (userId) => {
    try { setJoinedIds(await db.fetchMyJoins(userId)); }
    catch (e) { console.error("[orbit] fetchMyJoins", e); }
  }, []);
  const fetchMyRegistrations = useCallback(async (userId) => {
    try { setRegisteredEventIds(await db.fetchMyRegistrations(userId)); }
    catch (e) { console.error("[orbit] fetchMyRegistrations", e); }
  }, []);

  // Communities, events and the feed are all live subscriptions now. In
  // Firestore onSnapshot delivers the first page and every later change
  // through the same callback, so the separate initial-fetch effects and the
  // three Realtime channels this used to need collapse into one line each.
  //
  // All three read signed out as well as signed in, so a guest sees the real
  // campus feed instead of an empty page.
  useEffect(() => db.watchCommunities(setDbCommunities), []);
  useEffect(() => db.watchEvents(setEvents), []);
  useEffect(() => db.watchFeed(setFeedPosts), []);

  // Which of those posts you personally sparked needs a "you", so it stays
  // signed-in only and refetches when the session changes.
  useEffect(() => {
    if (!authUser) { setFeedSparkIds([]); return; }
    let alive = true;
    db.fetchMySparks(authUser.id)
      .then((ids) => { if (alive) setFeedSparkIds(ids); })
      .catch((e) => console.error("[orbit] fetchMySparks", e));
    return () => { alive = false; };
  }, [authUser]);

  // Session bootstrap — returning users with a live Firebase session skip
  // onboarding entirely, matching "no repeated re-verification."
  //
  // onAuthChange replaces the old getSession() + onAuthStateChange pair:
  // Firebase resolves persisted sessions asynchronously and reports the
  // result through this one listener, so the first callback (user or null) is
  // also what tells us the session check has finished.
  useEffect(() => {
    let mounted = true;
    // Picks up a sign-in that came back via the redirect fallback; resolves
    // null on an ordinary load. Fires before the listener settles.
    completeRedirectSignIn();

    const unsub = onAuthChange(async (fbUser) => {
      if (!mounted) return;
      if (fbUser) {
        const profile = await fetchProfile(fbUser.uid);
        if (!mounted) return;
        setAuthUser({ id: fbUser.uid, email: fbUser.email });
        setUser({
          name: profile?.name || fbUser.displayName || "",
          verified: true,
          interests: profile?.interests || [],
          bio: profile?.bio || "",
        });
        setStage("app");
        fetchMyJoins(fbUser.uid);
        fetchMyRegistrations(fbUser.uid);
      } else {
        setAuthUser(null);
      }
      setLoadingSession(false);
    });
    return () => { mounted = false; unsub(); };
  }, [fetchMyJoins, fetchMyRegistrations]);


  // All communities and clubs share the same shape, so most screens work
  // across both — Explore is the only place that splits them by sub-tab.
  const communities = useMemo(() => dbCommunities.filter((c) => !c.official), [dbCommunities]);
  const clubs = useMemo(() => dbCommunities.filter((c) => c.official), [dbCommunities]);
  const allGroups = dbCommunities;
  // Tea/Confessions has no per-post admin (it's not tied to a community) —
  // the Orbit community's creator doubles as the app-wide moderator for
  // anonymous content, matching the "orbit admin can delete any tea ..."
  // policies in schema_media_and_moderation.sql.
  const isTeaModerator = !!authUser && dbCommunities.some((c) => c.handle === "orbit" && c.creatorId === authUser.id);
  const joinedCommunities = useMemo(() => allGroups.filter((c) => joinedIds.includes(c.id)), [allGroups, joinedIds]);
  const topTrendingIds = useMemo(() => (
    [...communities].sort((a, b) => communityTrendScore(b) - communityTrendScore(a)).slice(0, 3).map((c) => c.id)
  ), [communities]);
  // Derived, not stored — always in sync with events, no separate map to
  // keep updated by hand (the old mock version kept this as its own state).
  const eventCommunityMap = useMemo(() => (
    Object.fromEntries(events.filter((e) => e.linkedCommunityId).map((e) => [e.id, e.linkedCommunityId]))
  ), [events]);

  const handleBlocked = () => showToast("Verify your account first. Head to Profile");

  const handleJoinToggle = async (id) => {
    const isJoined = joinedIds.includes(id);
    const delta = isJoined ? -1 : 1;
    setJoinedIds((ids) => (isJoined ? ids.filter((x) => x !== id) : [...ids, id]));
    setDbCommunities((cs) => cs.map((c) => (c.id === id ? { ...c, members: c.members + delta } : c)));
    setSelectedCommunity((sc) => (sc && sc.id === id ? { ...sc, members: sc.members + delta } : sc));
    showToast(isJoined ? "Left" : "Joined");

    if (!authUser) return;
    try {
      if (isJoined) await db.leaveCommunity(id, authUser.id);
      else await db.joinCommunity(id, authUser.id, user.name);
    } catch {
      setJoinedIds((ids) => (isJoined ? [...ids, id] : ids.filter((x) => x !== id)));
      setDbCommunities((cs) => cs.map((c) => (c.id === id ? { ...c, members: c.members - delta } : c)));
      showToast("Something went wrong, try again");
    }
  };

  const handleSpark = (id) => {
    setSparkedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  // Sparking a post from Home's feed — real, persisted to community_post_sparks,
  // same table/pattern Community.jsx's Posts tab already uses (see its
  // toggleSpark). Optimistic update with rollback on failure, same as every
  // other write in this app.
  // Posting from Home. The same community_posts insert Community.jsx does,
  // except the community is chosen in the composer instead of being implied
  // by which page you're on — which is what makes Home a feed you can post
  // to rather than a feed you can only read.
  const handleCreatePost = async (communityId, text, file = null) => {
    if (!user.verified || !authUser) { handleBlocked(); return false; }
    const body = text.trim();
    // A photo with no caption is a valid post, so only the pair being empty
    // is a reason to refuse.
    // communityId null is a campus post, addressed to everyone.
    if (!body && !file) return false;

    let created;
    try {
      // Upload first. A post that references an image which failed to upload
      // is worse than no post, and this way a storage failure costs nothing.
      let imageUrl = null;
      if (file) {
        showToast("Uploading photo…");
        ({ url: imageUrl } = await db.uploadImage("community-media", file, authUser.id));
      }
      created = await db.createPost({
        communityId,
        authorId: authUser.id,
        authorName: user.name,
        text: body,
        imageUrl,
      });
    } catch (err) {
      // "Try again" is the wrong advice for the two failures that actually
      // happen here, and retrying makes neither of them better. Say which.
      console.error("[orbit] post failed", err);
      showToast(
        err?.code === "permission-denied"
          ? "Post refused. Publish firestore.rules, or join the community first"
          : err?.code === "unauthenticated"
            ? "Signed out. Sign in and try again"
            : `Couldn't post (${err?.code || "unknown error"})`
      );
      return false;
    }

    // watchFeed will deliver this too, but optimistically prepending keeps the
    // post on screen in the same frame the composer closes.
    setFeedPosts((ps) => (ps.some((p) => p.id === created.id) ? ps : [created, ...ps]));
    showToast("Posted");
    return true;
  };

  const handleSparkPost = async (postId) => {
    if (!user.verified || !authUser) { handleBlocked(); return; }
    const wasSparked = feedSparkIds.includes(postId);
    setFeedSparkIds((ids) => (wasSparked ? ids.filter((x) => x !== postId) : [...ids, postId]));
    setFeedPosts((posts) => posts.map((p) => (p.id === postId ? { ...p, sparks: p.sparks + (wasSparked ? -1 : 1) } : p)));
    const post = feedPosts.find((p) => p.id === postId);
    try {
      await db.toggleSpark(post?.communityId, postId, authUser.id);
    } catch {
      setFeedSparkIds((ids) => (wasSparked ? [...ids, postId] : ids.filter((x) => x !== postId)));
      setFeedPosts((posts) => posts.map((p) => (p.id === postId ? { ...p, sparks: p.sparks + (wasSparked ? 1 : -1) } : p)));
    }
  };

  const handleCreate = async ({ name, category, desc, tags, rules = [], avatarFile = null }) => {
    if (!authUser) { handleBlocked(); return; }
    const handle = `${slugify(name)}-${Math.random().toString(36).slice(2, 8)}`;
    // tags now comes from the creator's own multi-select (CreateCommunity
    // step 3), not just [category] — this is the real signal a future
    // personalization/recommendation pass needs. Falls back to [category]
    // if somehow empty so a row is never written with no tags at all.
    const finalTags = tags && tags.length ? tags : [category];
    let mapped;
    try {
      mapped = await db.createCommunity({
        name, category, desc, tags: finalTags, rules,
        creatorId: authUser.id,
        creatorLabel: user.name || "You",
      });
      // The photo is uploaded after the fact because Storage paths are keyed
      // by community id, which does not exist until the document does. A
      // failed upload leaves a real community with no picture rather than
      // losing the community, so it is caught separately.
      if (avatarFile) {
        try {
          const { url } = await db.uploadImage("community-avatars", avatarFile, authUser.id);
          await db.updateCommunity(mapped.id, { avatarUrl: url });
          mapped = { ...mapped, avatarUrl: url };
        } catch (err) {
          console.error("[orbit] community photo upload failed", err);
          showToast("Community created, but the photo did not upload");
        }
      }
    } catch {
      showToast("Couldn't create, try again");
      return;
    }
    setDbCommunities((cs) => (cs.some((c) => c.id === mapped.id) ? cs : [mapped, ...cs]));
    setJoinedIds((ids) => [...ids, mapped.id]);
    showToast("Community created");
    setShowCreate(false);
    navigate("/");
  };

  const handleUpdateCommunity = async (id, updates) => {
    setDbCommunities((cs) => cs.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    setSelectedCommunity((sc) => (sc && sc.id === id ? { ...sc, ...updates } : sc));
    const dbUpdates = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.desc !== undefined) dbUpdates.description = updates.desc;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.postsAdminOnly !== undefined) dbUpdates.posts_admin_only = updates.postsAdminOnly;
    const error = await db.updateCommunity(id, updates).then(() => null).catch((e) => e);
    showToast(error ? "Update failed" : "Updated");
  };

  // "Edit profile" used to only update local React state (setUser) — it
  // looked like it saved, but nothing ever reached the database: the name
  // change was invisible to every other user/community, and reset back to
  // whatever profiles.name actually held on the next reload. Bio was worse
  // — there wasn't even a bio column, so it was never anything more than
  // component state. Both now write to profiles for real.
  const handleUpdateProfile = async (name, bio) => {
    const trimmedName = name.trim();
    if (!trimmedName || !authUser) return;
    setUser((u) => ({ ...u, name: trimmedName, bio }));
    const error = await saveProfile(authUser.id, { name: trimmedName, bio }).then(() => null).catch((e) => e);
    showToast(error ? "Couldn't save profile, try again" : "Profile updated");
  };

  const handleDeleteCommunity = async (id) => {
    setDbCommunities((cs) => cs.filter((c) => c.id !== id));
    setJoinedIds((ids) => ids.filter((x) => x !== id));
    setSelectedCommunity(null);
    const error = await db.deleteCommunity(id).then(() => null).catch((e) => e);
    showToast(error ? "Delete failed, refresh and retry" : "Deleted");
  };

  // Previously this only console.log'd — nothing was ever saved, so reports
  // silently vanished even though the UI said "submitted for review." Now a
  // real document in the reports collection;
  // view submissions from the Firebase console.
  // `detail` is the optional free-text box the rebuilt ReportModal adds. It's
  // appended to the reason rather than sent as its own column, since the
  // reports table has no field for it — a schema change is backend work.
  const handleReportSubmit = async (reason, detail) => {
    const target = reportTarget;
    setReportTarget(null);
    setSelectedCommunity(null);
    showToast("Report submitted for review");
    if (!authUser) return;
    const body = detail ? `${reason}: ${detail}` : reason;
    await db.createReport({ reporterId: authUser.id, target, reason: body });
  };

  // Registering for an event is the access gate to its community — the
  // Registering is the access gate to an event's community. db.registerForEvent
  // runs it as a Firestore transaction: create-or-reuse the linked community,
  // add the registration, add the membership, bump the count — all or nothing,
  // the same guarantee the plpgsql function used to give.
  const handleRegisterEvent = async (event) => {
    if (!authUser) { handleBlocked(); return; }
    let communityId;
    try {
      communityId = await db.registerForEvent(event, authUser.id, user.name);
    } catch {
      showToast("Registration failed, try again");
      return;
    }
    if (!communityId) { showToast("Registration failed, try again"); return; }

    setRegisteredEventIds((ids) => [...ids, event.id]);
    setJoinedIds((ids) => (ids.includes(communityId) ? ids : [...ids, communityId]));
    setEvents((es) => es.map((e) => (e.id === event.id ? { ...e, linkedCommunityId: communityId } : e)));
    // watchCommunities delivers the new community on its own; no manual fetch.
    showToast(`Registered for ${event.title}`);
  };

  // Locali-Tea: anonymous, 48h self-expiring — real Firestore data (posts,
  // votes, comments), just not realtime-subscribed (see schema_tea.sql for
  // why: postgres_changes would leak author_id over the wire, breaking the
  // anonymity the whole feature is built on). Refetches on open instead.
  const fetchTea = useCallback(async () => {
    const rows = await db.fetchTea();
    setTeaPosts((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]));
      // Comments are lazy-loaded per post, so a refetch must not throw away
      // the ones already open on screen.
      return rows.map((r) => {
        const existing = byId.get(r.id);
        return existing ? { ...r, comments: existing.comments } : r;
      });
    });
    if (authUser) {
      setMyTeaVotes(await db.fetchMyTeaVotes(authUser.id));
      setMyTeaReactions(await db.fetchMyTeaReactions(authUser.id));
    }
  }, [authUser]);

  useEffect(() => {
    if (location.pathname !== "/tea") return;
    fetchTea();
    // Polls instead of Realtime (see the comment on fetchTea above) — still
    // "auto refresh," just on a short interval rather than a live push, so
    // new tea/confessions and updated vote counts show up without the user
    // manually reopening the screen.
    const id = setInterval(fetchTea, 5000);
    return () => clearInterval(id);
  }, [location.pathname, fetchTea]);

  const loadTeaComments = useCallback(async (postId) => {
    const comments = await db.fetchTeaComments(postId);
    setTeaPosts((ts) => ts.map((t) => (t.id === postId ? { ...t, comments } : t)));
  }, []);

  const handlePostTea = async (text, category = "tea") => {
    if (!authUser) { handleBlocked(); return; }
    let newId;
    try {
      newId = await db.postTea({ text, category, authorId: authUser.id });
    } catch {
      showToast("Couldn't post, try again");
      return;
    }
    await fetchTea();
    setMyTeaPostIds((ids) => { const next = new Set(ids); next.add(newId); saveIdSet("orbit_my_tea_post_ids", next); return next; });
    showToast("Posted anonymously, gone in 48h");
  };

  const handleDeleteTea = async (id) => {
    const prevPosts = teaPosts;
    setTeaPosts((ts) => ts.filter((t) => t.id !== id));
    const error = await db.deleteTea(id).then(() => null).catch((e) => e);
    if (error) {
      setTeaPosts(prevPosts);
      showToast("Couldn't delete, try again");
    } else {
      setMyTeaPostIds((ids) => { const next = new Set(ids); next.delete(id); saveIdSet("orbit_my_tea_post_ids", next); return next; });
    }
  };

  const handleDeleteTeaComment = async (postId, commentId) => {
    setTeaPosts((ts) => ts.map((t) => (
      t.id === postId
        ? { ...t, comments: (t.comments || []).filter((c) => c.id !== commentId), commentCount: Math.max(0, (t.commentCount || 1) - 1) }
        : t
    )));
    const error = await db.deleteTeaComment(postId, commentId).then(() => null).catch((e) => e);
    if (error) {
      loadTeaComments(postId); // out of sync — just re-pull the truth
    } else {
      setMyTeaCommentIds((ids) => { const next = new Set(ids); next.delete(commentId); saveIdSet("orbit_my_tea_comment_ids", next); return next; });
    }
  };

  // Confessions tab: emoji reactions, one per user per post, changeable —
  // tapping the same emoji again removes it (same toggle pattern as sparks).
  const handleReactTea = async (id, emoji) => {
    if (!authUser) { handleBlocked(); return; }
    const prev = myTeaReactions[id];
    if (prev === emoji) {
      setMyTeaReactions((rs) => { const next = { ...rs }; delete next[id]; return next; });
      setTeaPosts((ts) => ts.map((t) => (t.id === id ? { ...t, reactions: { ...t.reactions, [emoji]: Math.max(0, (t.reactions?.[emoji] || 0) - 1) } } : t)));
      try { await db.reactTea(id, authUser.id, emoji); } catch { fetchTea(); }
      return;
    }
    setMyTeaReactions((rs) => ({ ...rs, [id]: emoji }));
    setTeaPosts((ts) => ts.map((t) => {
      if (t.id !== id) return t;
      const next = { ...t.reactions };
      if (prev) next[prev] = Math.max(0, (next[prev] || 0) - 1);
      next[emoji] = (next[emoji] || 0) + 1;
      return { ...t, reactions: next };
    }));
    try { await db.reactTea(id, authUser.id, emoji); } catch { fetchTea(); }
  };

  const handleValidateTea = async (id, vote) => {
    if (!authUser) { handleBlocked(); return; }
    const prev = myTeaVotes[id];
    if (prev === vote) return;
    setMyTeaVotes((votes) => ({ ...votes, [id]: vote }));
    setTeaPosts((ts) => ts.map((t) => {
      if (t.id !== id) return t;
      let { trueCount, capCount } = t;
      if (prev === "true") trueCount -= 1;
      if (prev === "cap") capCount -= 1;
      if (vote === "true") trueCount += 1;
      if (vote === "cap") capCount += 1;
      return { ...t, trueCount, capCount };
    }));
    try { await db.voteTea(id, authUser.id, vote); } catch { fetchTea(); } // out of sync, re-pull the truth
  };

  const handleCommentTea = async (id, text) => {
    if (!authUser) { handleBlocked(); return; }
    let commentId;
    try {
      commentId = await db.commentTea(id, text, authUser.id);
    } catch {
      showToast("Couldn't post, try again");
      return;
    }
    setTeaPosts((ts) => ts.map((t) => (
      t.id === id
        ? { ...t, comments: [...(t.comments || []), { id: commentId, who: "Anonymous", text, time: "just now" }], commentCount: (t.commentCount || 0) + 1 }
        : t
    )));
    setMyTeaCommentIds((ids) => { const next = new Set(ids); next.add(commentId); saveIdSet("orbit_my_tea_comment_ids", next); return next; });
  };

  const handleOpenEventCommunity = (event) => {
    const communityId = eventCommunityMap[event.id];
    const community = dbCommunities.find((c) => c.id === communityId);
    if (community) setSelectedCommunity(community);
  };

  // Verify / log in / log out all route back to the initial onboarding page.
  const goToInitialPage = async () => {
    await fbSignOut();
    setAuthUser(null);
    setUser({ name: "", verified: false, interests: [] });
    setJoinedIds([]);
    setRegisteredEventIds([]);
    setStage("onboarding");
  };

  // Base height reads the JS-tracked --app-height custom property (see
  // useViewportHeight) instead of a raw dvh unit, so the shell actually
  // shrinks to match the visible screen once a keyboard opens instead of
  // staying sized for the pre-keyboard viewport. Falls back to 100dvh when
  // the property isn't set yet (first paint) or visualViewport is
  // unsupported. The sm: desktop-frame override is untouched — physical
  // keyboards don't trigger this bug, so it stays on plain dvh.
  // Auth-flow shell is now full-bleed at every width: the rebuilt Onboarding
  // owns its own responsive two-pane layout (brand column + form), so wrapping
  // it in the phone card would re-cage the thing that was just uncaged.
  // Signed-in shell. Below lg it's a plain full-height column — the floating
  // phone card with its rounded corners and drop shadow is gone, since this
  // renders as a web app at every size rather than a simulated handset.
  // App frame. No phone card, no max-width cage: the rail sits against the
  // content and each screen owns its own measure.
  const shellClass = "w-full h-[var(--app-height,100dvh)] bg-bg text-ink overflow-hidden relative flex flex-col";
  const shellClassAuth = shellClass;
  const shellClassApp = `${shellClass} lg:flex-row`;

  if (loadingSession) {
    return (
      <div className={shellClassAuth} style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <style>{FONT_IMPORT}</style>
        <div className="flex-1 flex items-center justify-center">
          <Logo size={26} />
        </div>
      </div>
    );
  }

  if (stage === "onboarding") {
    return (
      <div className={shellClassAuth} style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <style>{FONT_IMPORT}</style>
        <Onboarding
          onDone={async (name, interests) => {
            // onAuthChange above has usually already set authUser/user by the
            // time this runs; this applies the name and interests the user just
            // picked, which the listener's profile read may have missed by a
            // beat, and moves the stage on regardless.
            const fbUser = auth?.currentUser;
            if (fbUser) {
              setAuthUser({ id: fbUser.uid, email: fbUser.email });
              setUser({ name, verified: true, interests });
              fetchMyJoins(fbUser.uid);
              fetchMyRegistrations(fbUser.uid);
            }
            setStage("app");
          }}
          onGuest={() => { setUser({ name: "Guest", verified: false, interests: [] }); setStage("app"); }}
        />
      </div>
    );
  }

  // Which nav item is lit, derived from the URL rather than held in state.
  // The old `activeTab` was the only thing that decided what you saw, which is
  // why nothing here had a route: the address bar never changed. Now the URL
  // is the truth and the rail just reads it.
  const TAB_FOR_PATH = { "": "home", explore: "explore", events: "events", profile: "profile", settings: "settings" };
  const seg = location.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
  const activeTab = TAB_FOR_PATH[seg] || "home";

  // A sub-page owns the whole viewport: no bottom bar, no top bar, no guest
  // pill competing with its own back affordance.
  const SUBPAGE_SEGMENTS = ["c", "create", "search", "tea"];
  const showingSubPage = SUBPAGE_SEGMENTS.includes(seg);

  const goToTab = (tab) => navigate(tab === "home" ? "/" : `/${tab}`);

  // Kept named as it was so the twenty call sites below did not all have to
  // change. It navigates now instead of setting state.
  const setSelectedCommunity = (c) => { if (c?.id) navigate(`/c/${c.id}`); };

  // Shared by both nav surfaces so mobile and desktop cannot drift apart.
  const openTea = () => { if (!user.verified) { handleBlocked(); return; } navigate("/tea"); };
  const openSearch = () => navigate("/search");
  const openCreate = () => { if (!user.verified) { handleBlocked(); return; } navigate("/create"); };
  const openComposer = () => { if (!user.verified) { handleBlocked(); return; } setComposerOpen(true); };

  // Everything the routed screens need. They cannot be handed props any more,
  // because the router renders them, not this component.
  // The only badge with a real number behind it. Notifications are not built,
  // so that row carries no count rather than a decorative one.
  const openEventCount = events.filter((e) => !registeredEventIds.includes(e.id)).length;

  const ctx = {
    // identity
    user, authUser, verified: user.verified,
    // live data
    communities, clubs, allGroups, dbCommunities, events, feedPosts, feedSparkIds,
    joinedIds, joinedCommunities, registeredEventIds, sparkedIds, topTrendingIds,
    teaPosts, myTeaVotes, myTeaReactions, myTeaPostIds, myTeaCommentIds, isTeaModerator,
    // preferences
    theme, themeMode, toggleTheme, setThemeMode, notifPrefs, setNotifPrefs,
    exploreTab, setExploreTab,
    // navigation
    goToTab, openTea, openSearch, openCreate, openComposer, setSelectedCommunity,
    goToInitialPage, showToast,
    // writes
    handleJoinToggle, handleCreate, handleCreatePost, handleSparkPost, handleSpark,
    handleUpdateCommunity, handleDeleteCommunity, handleUpdateProfile, handleRegisterEvent,
    handleBlocked, handlePostTea, handleValidateTea, handleCommentTea, handleReactTea,
    handleDeleteTea, handleDeleteTeaComment, loadTeaComments, setReportTarget,
  };

  return (
    <OrbitProvider value={ctx}>
      <div className={shellClassApp} style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <style>{FONT_IMPORT}</style>

        <Sidebar
          active={activeTab}
          setActive={goToTab}
          onTeaClick={openTea}
          onSearchClick={openSearch}
          onCreateClick={openCreate}
          verified={user.verified}
          user={user}
          onUnbuilt={showToast}
          joinedCommunities={joinedCommunities}
          onOpenCommunity={setSelectedCommunity}
          onSupport={() => showToast("Email team.orbit@gmail.com and we will answer")}
          onSignOut={goToInitialPage}
          badges={{ events: openEventCount }}
        />

        <div className="flex-1 flex flex-col overflow-hidden lg:h-full min-w-0">
          {!showingSubPage && (
            <TopBar
              notifOpen={notifOpen}
              setNotifOpen={setNotifOpen}
              onSearchClick={openSearch}
              onLogoClick={() => goToTab("home")}
              onAccountClick={() => goToTab("profile")}
              user={user}
            />
          )}

          <div className="flex-1 overflow-hidden flex flex-col min-w-0">
            {/* The router decides what goes here. See main.jsx. */}
            <Outlet />
          </div>

          {!showingSubPage && (
            <BottomNav active={activeTab} setActive={goToTab} onCreateClick={openCreate} user={user} />
          )}
        </div>

        {/* Global overlays: they float above whatever route is showing, so
            they belong to the layout rather than to any one page. */}
        {reportTarget && (
          <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} onSubmit={handleReportSubmit} />
        )}
        {!showingSubPage && !user.verified && <GuestBanner onVerify={goToInitialPage} />}
        {themeNotice && (
          <ThemeNotice
            theme={themeNotice}
            onDismiss={dismissThemeNotice}
            onOpenSettings={() => goToTab("settings")}
            raised={!showingSubPage && !user.verified}
          />
        )}
        <Toast message={toastMsg} />
      </div>
    </OrbitProvider>
  );
}
