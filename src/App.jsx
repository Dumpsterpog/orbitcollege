import { useState, useMemo, useCallback, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { OrbitProvider } from "./context/OrbitContext.jsx";
import { FONT_IMPORT } from "./data/constants.js";
import { communityTrendScore, slugify, timeAgo } from "./utils/helpers.js";
import { useViewportHeight } from "./utils/useViewportHeight.js";
import { useTheme } from "./utils/useTheme.js";
import * as db from "./lib/db.js";
import { cached, reviveDates, setCacheScope } from "./lib/cache.js";
import { checkPostLimit, notePost, checkCommunityLimit, MAX_COMMUNITIES } from "./lib/limits.js";
import { checkText, checkFields, classifyPost } from "./lib/moderation.js";
import { onAuthChange, completeRedirectSignIn, fetchProfile, signOut as fbSignOut } from "./lib/authService.js";
import { auth } from "./lib/firebase.js";
import { TopBar } from "./components/TopBar.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { GuestBanner, Toast, ThemeNotice, Logo } from "./components/Common.jsx";
import { Onboarding } from "./components/Onboarding.jsx";
import { ReportModal } from "./components/ReportModal.jsx";


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
  const [feedPosts, setFeedPosts] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [myPasses, setMyPasses] = useState([]);
  const [ads, setAds] = useState([]);
  const [feedSparkIds, setFeedSparkIds] = useState([]);

  // Still mock/local for this first build — see App architecture notes.
  const [sparkedIds, setSparkedIds] = useState([]);
  const [reportTarget, setReportTarget] = useState(null);
  // Session-only: Settings marks these as unsaved rather than pretending
  // a backend is storing them.
  const [notifPrefs, setNotifPrefs] = useState({ events: true, posts: true, replies: true });
  const [notifOpen, setNotifOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
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

  const fetchMyJoins = useCallback(async (userId) => {
    try { setJoinedIds(await db.fetchMyJoins(userId)); }
    catch (e) { console.error("[orbit] fetchMyJoins", e); }
  }, []);
  const fetchMyRegistrations = useCallback(async (userId) => {
    try { setRegisteredEventIds(await db.fetchMyRegistrations(userId)); }
    catch (e) { console.error("[orbit] fetchMyRegistrations", e); }
  }, []);

  useEffect(() => db.watchCommunities(
    cached("communities", setDbCommunities, reviveDates(["createdAt"]))
  ), []);
  useEffect(() => db.watchEvents(
    cached("events", setEvents, reviveDates(["startsAt"]))
  ), []);
  const needsFeed = location.pathname.startsWith("/profile");
  useEffect(() => {
    if (!needsFeed) return;
    return db.watchFeed(cached("feed", setFeedPosts, reviveDates(["createdAt"])));
  }, [needsFeed]);
  useEffect(() => db.watchAnnouncements(setAnnouncements), []);
  useEffect(() => db.watchAds(setAds), []);

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

  useEffect(() => {
    if (!authUser || registeredEventIds.length === 0) { setMyPasses([]); return; }
    const byEvent = new Map();
    const unsubs = registeredEventIds.map((eventId) =>
      db.watchMySignup(eventId, authUser.id, (signup) => {
        if (signup) byEvent.set(eventId, { ...signup, eventId });
        else byEvent.delete(eventId);
        setMyPasses([...byEvent.values()]);
      })
    );
    return () => unsubs.forEach((stop) => stop());
  }, [authUser, registeredEventIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Your own posts still in the review queue, so the feed can say they are
  // waiting instead of looking like they vanished.
  useEffect(() => {
    if (!authUser) { setPendingPosts([]); return; }
    return db.watchMyPendingPosts(authUser.id, setPendingPosts);
  }, [authUser]);

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
        setCacheScope(fbUser.uid);
        setAuthUser({ id: fbUser.uid, email: fbUser.email });
        setUser({
          name: profile?.name || fbUser.displayName || "",
          verified: true,
          interests: profile?.interests || [],
          bio: profile?.bio || "",
          avatarUrl: profile?.avatarUrl || null,
          bannerUrl: profile?.bannerUrl || null,
          university: profile?.university || "",
          suspended: profile?.suspended === true,
        });
        setStage("app");
        fetchMyJoins(fbUser.uid);
        fetchMyRegistrations(fbUser.uid);
      } else {
        setCacheScope(null);
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
  const isTeaModerator = !!authUser && dbCommunities.some((c) => c.handle === "orbit" && c.creatorId === authUser.id);
  const joinedCommunities = useMemo(() => allGroups.filter((c) => joinedIds.includes(c.id)), [allGroups, joinedIds]);
  const topTrendingIds = useMemo(() => (
    [...communities].sort((a, b) => communityTrendScore(b) - communityTrendScore(a)).slice(0, 3).map((c) => c.id)
  ), [communities]);
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

  const handleCreatePost = async (communityId, text, file = null) => {
    if (!user.verified || !authUser) { handleBlocked(); return false; }

    if (user.suspended) { showToast("Your account is suspended, so posting is turned off"); return false; }
    const verdict = classifyPost(text);
    if (verdict.action === "block") { showToast(verdict.reason); return false; }

    const limit = checkPostLimit();
    if (!limit.ok) { showToast(limit.message); return false; }
    const body = text.trim();
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
      if (verdict.action === "review") {
        await db.submitForReview({
          communityId,
          authorId: authUser.id,
          authorName: user.name,
          text: body,
          imageUrl,
          labels: verdict.labels,
          matched: verdict.matched,
        });
        // Counts toward the rate limit like any post: a queue that anyone can
        // fill without limit is just a slower way to spam the moderators.
        notePost();
        showToast(verdict.reason);
        return true;
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
    notePost();
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

    const clean = checkFields([
      name, desc,
      ...rules.flatMap((r) => [r.title, r.body]),
    ]);
    if (!clean.ok) { showToast(clean.reason); return; }

    const owned = dbCommunities.filter((c) => c.creatorId === authUser.id).length;
    const cap = checkCommunityLimit(owned);
    if (!cap.ok) { showToast(cap.message); return; }
    const handle = `${slugify(name)}-${Math.random().toString(36).slice(2, 8)}`;
    const finalTags = tags && tags.length ? tags : [category];
    let mapped;
    try {
      mapped = await db.createCommunity({
        name, category, desc, tags: finalTags, rules,
        creatorId: authUser.id,
        creatorLabel: user.name || "You",
      });
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

  const handleUpdateProfile = async (nameOrFields, bioArg) => {
    const input = nameOrFields && typeof nameOrFields === "object"
      ? nameOrFields
      : { name: nameOrFields, bio: bioArg };
    const trimmedName = String(input.name || "").trim();
    if (!trimmedName || !authUser) return;

    const bio = String(input.bio || "").trim();
    const clean = checkFields([trimmedName, bio]);
    if (!clean.ok) { showToast(clean.reason); return; }

    const fields = { name: trimmedName, bio };
    if (Array.isArray(input.interests)) fields.interests = input.interests;

    setUser((u) => ({ ...u, ...fields }));
    const error = await saveProfile(authUser.id, fields).then(() => null).catch((e) => e);
    showToast(error ? "Couldn't save profile, try again" : "Profile updated");
  };

  const handleProfileImage = async (kind, file) => {
    if (!user.verified || !authUser) { handleBlocked(); return; }
    const field = kind === "banner" ? "bannerUrl" : "avatarUrl";
    const noun = kind === "banner" ? "Banner" : "Profile photo";

    if (file === null) {
      setUser((u) => ({ ...u, [field]: null }));
      const error = await saveProfile(authUser.id, { [field]: null }).then(() => null).catch((e) => e);
      showToast(error ? "Couldn't remove it, try again" : `${noun} removed`);
      return;
    }
    if (!file?.type?.startsWith("image/")) { showToast("That file is not an image"); return; }
    if (file.size > 5 * 1024 * 1024) { showToast("Images have to be under 5 MB"); return; }

    showToast(`Uploading ${noun.toLowerCase()}…`);
    try {
      const { url } = await db.uploadImage("community-media", file, authUser.id,
                                          kind === "banner" ? "banner" : "avatar");
      await saveProfile(authUser.id, { [field]: url });
      setUser((u) => ({ ...u, [field]: url }));
      showToast(`${noun} updated`);
    } catch (err) {
      console.error("[orbit] profile image failed", err);
      showToast(err?.code === "storage/unauthorized" ? "Upload refused by Storage rules" : "Upload failed, try again");
    }
  };

  const handleDeleteCommunity = async (id) => {
    setDbCommunities((cs) => cs.filter((c) => c.id !== id));
    setJoinedIds((ids) => ids.filter((x) => x !== id));
    setSelectedCommunity(null);
    const error = await db.deleteCommunity(id).then(() => null).catch((e) => e);
    showToast(error ? "Delete failed, refresh and retry" : "Deleted");
  };

  const handleReportSubmit = async (reason, detail) => {
    const target = reportTarget;
    setReportTarget(null);
    setSelectedCommunity(null);
    showToast("Report submitted for review");
    if (!authUser) return;
    const body = detail ? `${reason}: ${detail}` : reason;
    await db.createReport({ reporterId: authUser.id, target, reason: body });
  };

  const handleRegisterEvent = async (event) => {
    if (!authUser) { handleBlocked(); return; }
    let communityId;
    try {
      communityId = await db.registerForEvent(event, authUser.id, user.name);
    } catch {
      showToast("Registration failed, try again");
      return;
    }
    // No community yet is not a failed registration. The signup stands; the
    // chat appears once an admin links one to the event.
    setRegisteredEventIds((ids) => (ids.includes(event.id) ? ids : [...ids, event.id]));
    if (communityId) {
      setJoinedIds((ids) => (ids.includes(communityId) ? ids : [...ids, communityId]));
      setEvents((es) => es.map((e) => (e.id === event.id ? { ...e, linkedCommunityId: communityId } : e)));
    }
    // watchCommunities delivers the new community on its own; no manual fetch.
    showToast(communityId ? `Registered for ${event.title}` : "Registered. The event chat opens shortly.");
    return communityId;
  };

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
    const id = setInterval(fetchTea, 5000);
    return () => clearInterval(id);
  }, [location.pathname, fetchTea]);

  const loadTeaComments = useCallback(async (postId) => {
    const comments = await db.fetchTeaComments(postId);
    setTeaPosts((ts) => ts.map((t) => (t.id === postId ? { ...t, comments } : t)));
  }, []);

  const handlePostTea = async (text, category = "tea") => {
    if (!authUser) { handleBlocked(); return; }

    // Anonymity is exactly why this needs filtering: it is the surface where
    // someone assumes nothing traces back to them.
    const clean = checkText(text);
    if (!clean.ok) { showToast(clean.reason); return; }

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

    const clean = checkText(text);
    if (!clean.ok) { showToast(clean.reason); return; }

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

  const TAB_FOR_PATH = { "": "home", explore: "explore", events: "events", profile: "profile", settings: "settings" };
  const seg = location.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
  const activeTab = TAB_FOR_PATH[seg] || "home";

  const SUBPAGE_SEGMENTS = ["c", "create", "search", "tea"];
  const showingSubPage = SUBPAGE_SEGMENTS.includes(seg);

  const goToTab = (tab) => navigate(tab === "home" ? "/" : `/${tab}`);

  const setSelectedCommunity = (c) => { if (c?.id) navigate(`/c/${c.id}`); };

  // Shared by both nav surfaces so mobile and desktop cannot drift apart.
  const openTea = () => { if (!user.verified) { handleBlocked(); return; } navigate("/tea"); };
  const openSearch = () => navigate("/search");
  const openCreate = () => { if (!user.verified) { handleBlocked(); return; } navigate("/create"); };
  const openComposer = () => { if (!user.verified) { handleBlocked(); return; } setComposerOpen(true); };

  const openEventCount = events.filter((e) => !registeredEventIds.includes(e.id)).length;

  // Surfaced so the create flow can refuse up front instead of at submit.
  const ownedCommunities = authUser
    ? dbCommunities.filter((c) => c.creatorId === authUser.id).length
    : 0;

  const ctx = {
    // identity
    user, authUser, verified: user.verified,
    // live data
    communities, clubs, allGroups, dbCommunities, events, feedPosts, feedSparkIds, pendingPosts, announcements, ads, myPasses,
    joinedIds, joinedCommunities, registeredEventIds, sparkedIds, topTrendingIds,
    teaPosts, myTeaVotes, myTeaReactions, myTeaPostIds, myTeaCommentIds, isTeaModerator,
    // preferences
    theme, themeMode, toggleTheme, setThemeMode, notifPrefs, setNotifPrefs,
    exploreTab, setExploreTab,
    // navigation
    goToTab, openTea, openSearch, openCreate, openComposer, setSelectedCommunity,
    goToInitialPage, showToast,
    ownedCommunities, maxCommunities: MAX_COMMUNITIES,
    // writes
    handleJoinToggle, handleCreate, handleCreatePost, handleSparkPost, handleSpark,
    handleUpdateCommunity, handleDeleteCommunity, handleUpdateProfile, handleProfileImage, handleRegisterEvent,
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
              user={user}
              email={authUser?.email}
              themeMode={themeMode}
              onThemeChange={setThemeMode}
              onOpenProfile={() => goToTab("profile")}
              onOpenSettings={() => goToTab("settings")}
              onSignIn={goToInitialPage}
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

        {reportTarget && (
          <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} onSubmit={handleReportSubmit} />
        )}
        {!showingSubPage && !user.verified && !themeNotice && <GuestBanner onVerify={goToInitialPage} />}
        {themeNotice && (
          <ThemeNotice
            theme={themeNotice}
            onDismiss={dismissThemeNotice}
            onOpenSettings={() => goToTab("settings")}
            raised={false}
          />
        )}
        <Toast message={toastMsg} />
      </div>
    </OrbitProvider>
  );
}
