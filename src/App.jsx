import { useState, useMemo, useCallback, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { FONT_IMPORT } from "./data/constants.js";
import { communityTrendScore, slugify, timeAgo } from "./utils/helpers.js";
import { useViewportHeight } from "./utils/useViewportHeight.js";
import { useTheme } from "./utils/useTheme.js";
import { supabase } from "./lib/supabaseClient.js";
import { TopBar } from "./components/TopBar.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { GuestBanner, Toast, Logo } from "./components/Common.jsx";
import { SearchOverlay } from "./components/SearchOverlay.jsx";
import { HomeScreen } from "./components/Home.jsx";
import { ExploreScreen } from "./components/Explore.jsx";
import { EventsScreen } from "./components/Events.jsx";
import { CommunityDetail } from "./components/Community.jsx";
import { CreateCommunity } from "./components/CreateCommunity.jsx";
import { LocaliTeaScreen } from "./components/LocaliTea.jsx";
import { ProfileScreen } from "./components/Profile.jsx";
import { Onboarding } from "./components/Onboarding.jsx";
import { ReportModal } from "./components/ReportModal.jsx";
// ReviewPrompt.jsx is kept in the repo (not deleted) but intentionally not
// wired up — the exit review prompt was removed per product decision.

// ---- Supabase row -> app-shape mappers -------------------------------
// The app's components were built against the original mock shape
// ({ members, creator, lastActive, desc, ... }); rather than touching every
// component, live Supabase rows get converted to that exact shape here so
// Home/Explore/Community/Events etc. don't know or care where the data
// actually came from.
function mapCommunityRow(row) {
  const lastActive = Math.max(0, Math.floor((Date.now() - new Date(row.last_active_at).getTime()) / 60000));
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    tags: row.tags && row.tags.length ? row.tags : [row.category],
    desc: row.description,
    members: row.member_count,
    creator: row.creator_label,
    creatorId: row.creator_id,
    official: row.official,
    handle: row.handle,
    avatarUrl: row.avatar_url,
    postsAdminOnly: row.posts_admin_only,
    lastActive,
  };
}
// One row per post, across every community (not just joined ones) — powers
// Home's Instagram-style "Latest posts" feed. Uses the same profiles!author_id
// relationship hint as Community.jsx's mapPostRow (see the comment there —
// plain profiles(name) returns an ambiguous-relationship HTTP 300 on this
// table specifically).
function mapFeedPostRow(row) {
  return {
    id: row.id,
    communityId: row.community_id,
    who: row.profiles?.name || "Someone",
    text: row.text,
    time: timeAgo(row.created_at),
    hasImage: row.has_image,
    imageUrl: row.image_url,
    sparks: row.spark_count,
  };
}
function mapEventRow(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    tags: row.tags && row.tags.length ? row.tags : [row.category],
    desc: row.description,
    when: row.event_when,
    where: row.event_where,
    capacity: row.capacity,
    imageUrl: row.image_url,
    linkedCommunityId: row.linked_community_id,
  };
}
function mapTeaRow(row) {
  return {
    id: row.id,
    text: row.text,
    category: row.category || "tea", // "tea" | "confession"
    trueCount: row.true_count,
    capCount: row.cap_count,
    reactions: row.reactions || {},
    commentCount: row.comment_count,
    comments: null, // lazy-loaded per post when opened — see loadTeaComments()
    createdAt: new Date(row.created_at).getTime(),
  };
}
function mapTeaCommentRow(row) {
  return { id: row.id, who: "Anonymous", text: row.text, time: "" };
}

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

export default function App() {
  useViewportHeight(); // keyboard-float fix — see utils/useViewportHeight.js
  const { theme, toggleTheme } = useTheme(); // dark/light — see utils/useTheme.js
  const [loadingSession, setLoadingSession] = useState(true);
  const [stage, setStage] = useState("onboarding");
  const [authUser, setAuthUser] = useState(null); // { id, email } from Supabase, or null
  const [user, setUser] = useState({ name: "", verified: false, interests: [] });

  // Live data (Supabase) — core flow: auth, communities/clubs, join/leave, events.
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
  const [activeTab, setActiveTab] = useState("home");
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [teaOpen, setTeaOpen] = useState(false);
  const [teaPosts, setTeaPosts] = useState([]); // real, Supabase-backed — see fetchTea()
  const [myTeaVotes, setMyTeaVotes] = useState({}); // Tea tab: postId -> "true" | "cap"
  const [myTeaReactions, setMyTeaReactions] = useState({}); // Confessions tab: postId -> emoji
  const [myTeaPostIds, setMyTeaPostIds] = useState(() => loadIdSet("orbit_my_tea_post_ids"));
  const [myTeaCommentIds, setMyTeaCommentIds] = useState(() => loadIdSet("orbit_my_tea_comment_ids"));
  const [exploreTab, setExploreTab] = useState("clubs");

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
  const fetchMyJoins = useCallback(async (userId) => {
    await supabase.auth.getSession();
    const { data } = await supabase.from("community_members").select("community_id").eq("user_id", userId);
    if (data) setJoinedIds(data.map((r) => r.community_id));
  }, []);
  const fetchMyRegistrations = useCallback(async (userId) => {
    await supabase.auth.getSession();
    const { data } = await supabase.from("event_registrations").select("event_id").eq("user_id", userId);
    if (data) setRegisteredEventIds(data.map((r) => r.event_id));
  }, []);

  // Communities + events are public-readable (RLS allows anon), so they load
  // immediately on mount regardless of auth state — guests see the real feed too.
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("communities").select("*").order("created_at", { ascending: false });
      if (!error && data) setDbCommunities(data.map(mapCommunityRow));
    })();
    (async () => {
      const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: true });
      if (!error && data) setEvents(data.map(mapEventRow));
    })();
  }, []);

  // Home dashboard's "Latest posts" feed — every community's posts, newest
  // first, across the whole app (not just joined ones), Instagram-style.
  // RLS on community_posts is "to authenticated using (true)" (see
  // schema_content.sql), so this only ever returns rows for a signed-in
  // user, same as the rest of the app's guest-gating.
  // Also subscribed to Realtime below — a post from any community (or a
  // spark landing on one) shows up in the feed live, no manual refresh.
  useEffect(() => {
    if (!authUser) { setFeedPosts([]); setFeedSparkIds([]); return; }
    (async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, community_id, text, has_image, image_url, spark_count, created_at, profiles!author_id(name)")
        .order("created_at", { ascending: false })
        .limit(40);
      if (!error && data) setFeedPosts(data.map(mapFeedPostRow));
      const { data: myRows } = await supabase
        .from("community_post_sparks")
        .select("post_id")
        .eq("user_id", authUser.id);
      if (myRows) setFeedSparkIds(myRows.map((r) => r.post_id));
    })();

    // App-wide (no community_id filter, unlike Community.jsx's scoped
    // channel) — a new/edited/deleted post anywhere updates Home's feed
    // live. INSERT/UPDATE payloads carry raw columns only (no joined
    // profiles.name), so those two re-fetch just that one row with the
    // same relationship hint the initial query uses.
    const channel = supabase
      .channel("home-feed-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, async (payload) => {
        const { data } = await supabase
          .from("community_posts")
          .select("id, community_id, text, has_image, image_url, spark_count, created_at, profiles!author_id(name)")
          .eq("id", payload.new.id)
          .single();
        if (!data) return;
        const mapped = mapFeedPostRow(data);
        setFeedPosts((ps) => (ps.some((p) => p.id === mapped.id) ? ps : [mapped, ...ps].slice(0, 60)));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_posts" }, (payload) => {
        setFeedPosts((ps) => ps.map((p) => (p.id === payload.new.id ? { ...p, sparks: payload.new.spark_count, text: payload.new.text } : p)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_posts" }, (payload) => {
        setFeedPosts((ps) => ps.filter((p) => p.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authUser]);

  // Realtime: member counts / new communities update live for everyone in
  // the app without a manual refresh (e.g. someone else joining a community
  // you're looking at right now).
  useEffect(() => {
    const channel = supabase
      .channel("communities-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "communities" }, (payload) => {
        setDbCommunities((cs) => {
          if (payload.eventType === "DELETE") return cs.filter((c) => c.id !== payload.old.id);
          const mapped = mapCommunityRow(payload.new);
          return cs.some((c) => c.id === mapped.id)
            ? cs.map((c) => (c.id === mapped.id ? mapped : c))
            : [mapped, ...cs];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Realtime: Events tab updates live too (new event posted, one edited or
  // removed) — same pattern as the communities channel above. Safe to
  // broadcast in full (unlike tea_posts below): events has no anonymity
  // requirement and its "readable by anyone" RLS already exposes every
  // column to begin with.
  useEffect(() => {
    const channel = supabase
      .channel("events-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, (payload) => {
        setEvents((es) => {
          if (payload.eventType === "DELETE") return es.filter((e) => e.id !== payload.old.id);
          const mapped = mapEventRow(payload.new);
          return es.some((e) => e.id === mapped.id)
            ? es.map((e) => (e.id === mapped.id ? mapped : e))
            : [...es, mapped];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Session bootstrap — returning users with a valid Supabase session skip
  // onboarding entirely, matching "no repeated re-verification."
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && session) {
        const { data: profile } = await supabase.from("profiles").select("name, interests, bio").eq("id", session.user.id).single();
        setAuthUser({ id: session.user.id, email: session.user.email });
        setUser({ name: profile?.name || "", verified: true, interests: profile?.interests || [], bio: profile?.bio || "" });
        setStage("app");
        fetchMyJoins(session.user.id);
        fetchMyRegistrations(session.user.id);
      }
      if (mounted) setLoadingSession(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session ? { id: session.user.id, email: session.user.email } : null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [fetchMyJoins, fetchMyRegistrations]);

  // Android hardware back button: close whatever overlay is open first (same
  // as tapping its own back/close button), and exit once nothing is open.
  // No-op on web/dev, only runs inside the APK. (No exit review prompt —
  // deliberately removed per product call; ReviewPrompt.jsx + app_reviews
  // stay in the repo if this gets re-added later.)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listenerPromise = CapacitorApp.addListener("backButton", () => {
      if (stage !== "app") { CapacitorApp.exitApp(); return; }
      if (selectedCommunity) { setSelectedCommunity(null); return; }
      if (showCreate) { setShowCreate(false); return; }
      if (searchOpen) { setSearchOpen(false); return; }
      if (teaOpen) { setTeaOpen(false); return; }
      if (reportTarget) { setReportTarget(null); return; }
      if (notifOpen) { setNotifOpen(false); return; }
      CapacitorApp.exitApp();
    });
    return () => { listenerPromise.then((l) => l.remove()); };
  }, [stage, selectedCommunity, showCreate, searchOpen, teaOpen, reportTarget, notifOpen]);

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

  const handleBlocked = () => showToast("Verify your account first — head to Profile");

  const handleJoinToggle = async (id) => {
    const isJoined = joinedIds.includes(id);
    const delta = isJoined ? -1 : 1;
    setJoinedIds((ids) => (isJoined ? ids.filter((x) => x !== id) : [...ids, id]));
    setDbCommunities((cs) => cs.map((c) => (c.id === id ? { ...c, members: c.members + delta } : c)));
    setSelectedCommunity((sc) => (sc && sc.id === id ? { ...sc, members: sc.members + delta } : sc));
    showToast(isJoined ? "Left" : "Joined");

    if (!authUser) return;
    const { error } = isJoined
      ? await supabase.from("community_members").delete().eq("community_id", id).eq("user_id", authUser.id)
      : await supabase.from("community_members").insert({ community_id: id, user_id: authUser.id });
    if (error) {
      setJoinedIds((ids) => (isJoined ? [...ids, id] : ids.filter((x) => x !== id)));
      setDbCommunities((cs) => cs.map((c) => (c.id === id ? { ...c, members: c.members - delta } : c)));
      showToast("Something went wrong — try again");
    }
  };

  const handleSpark = (id) => {
    setSparkedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  // Sparking a post from Home's feed — real, persisted to community_post_sparks,
  // same table/pattern Community.jsx's Posts tab already uses (see its
  // toggleSpark). Optimistic update with rollback on failure, same as every
  // other write in this app.
  const handleSparkPost = async (postId) => {
    if (!user.verified || !authUser) { handleBlocked(); return; }
    const wasSparked = feedSparkIds.includes(postId);
    setFeedSparkIds((ids) => (wasSparked ? ids.filter((x) => x !== postId) : [...ids, postId]));
    setFeedPosts((posts) => posts.map((p) => (p.id === postId ? { ...p, sparks: p.sparks + (wasSparked ? -1 : 1) } : p)));
    const { error } = wasSparked
      ? await supabase.from("community_post_sparks").delete().eq("post_id", postId).eq("user_id", authUser.id)
      : await supabase.from("community_post_sparks").insert({ post_id: postId, user_id: authUser.id });
    if (error) {
      setFeedSparkIds((ids) => (wasSparked ? [...ids, postId] : ids.filter((x) => x !== postId)));
      setFeedPosts((posts) => posts.map((p) => (p.id === postId ? { ...p, sparks: p.sparks + (wasSparked ? 1 : -1) } : p)));
    }
  };

  const handleCreate = async ({ name, category, desc, tags }) => {
    if (!authUser) { handleBlocked(); return; }
    const handle = `${slugify(name)}-${Math.random().toString(36).slice(2, 8)}`;
    // tags now comes from the creator's own multi-select (CreateCommunity
    // step 3), not just [category] — this is the real signal a future
    // personalization/recommendation pass needs. Falls back to [category]
    // if somehow empty so a row is never written with no tags at all.
    const finalTags = tags && tags.length ? tags : [category];
    const { data, error } = await supabase
      .from("communities")
      .insert({
        name, category, tags: finalTags, description: desc || "No description yet.",
        member_count: 0, creator_id: authUser.id, creator_label: "You", official: false, handle,
      })
      .select()
      .single();
    if (error || !data) { showToast("Couldn't create — try again"); return; }
    const mapped = mapCommunityRow(data);
    setDbCommunities((cs) => [{ ...mapped, members: 1 }, ...cs]);
    setJoinedIds((ids) => [...ids, mapped.id]);
    await supabase.from("community_members").insert({ community_id: mapped.id, user_id: authUser.id });
    showToast("Community created");
    setShowCreate(false);
    setActiveTab("home");
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
    const { error } = await supabase.from("communities").update(dbUpdates).eq("id", id);
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
    const { error } = await supabase.from("profiles").update({ name: trimmedName, bio }).eq("id", authUser.id);
    showToast(error ? "Couldn't save profile — try again" : "Profile updated");
  };

  const handleDeleteCommunity = async (id) => {
    setDbCommunities((cs) => cs.filter((c) => c.id !== id));
    setJoinedIds((ids) => ids.filter((x) => x !== id));
    setSelectedCommunity(null);
    const { error } = await supabase.from("communities").delete().eq("id", id);
    showToast(error ? "Delete failed — refresh and retry" : "Deleted");
  };

  // Previously this only console.log'd — nothing was ever saved, so reports
  // silently vanished even though the UI said "submitted for review." Now a
  // real row in public.reports (supabase/schema_security_hardening.sql);
  // view submissions from the Supabase dashboard.
  const handleReportSubmit = async (reason) => {
    const target = reportTarget;
    setReportTarget(null);
    setSelectedCommunity(null);
    showToast("Report submitted for review");
    if (!authUser) return;
    await supabase.from("reports").insert({ reporter_id: authUser.id, target: String(target), reason });
  };

  // Registering for an event is the access gate to its community — the
  // register_for_event() RPC (supabase/schema.sql) creates the linked
  // community on the first registration (or reuses it) and joins the caller,
  // atomically, server-side.
  const handleRegisterEvent = async (event) => {
    if (!authUser) { handleBlocked(); return; }
    const { data: communityId, error } = await supabase.rpc("register_for_event", { p_event_id: event.id });
    if (error || !communityId) { showToast("Registration failed — try again"); return; }

    setRegisteredEventIds((ids) => [...ids, event.id]);
    setJoinedIds((ids) => (ids.includes(communityId) ? ids : [...ids, communityId]));
    setEvents((es) => es.map((e) => (e.id === event.id ? { ...e, linkedCommunityId: communityId } : e)));

    if (!dbCommunities.some((c) => c.id === communityId)) {
      const { data: row } = await supabase.from("communities").select("*").eq("id", communityId).single();
      if (row) setDbCommunities((cs) => [mapCommunityRow(row), ...cs]);
    }
    showToast(`Registered for ${event.title}`);
  };

  // Locali-Tea: anonymous, 48h self-expiring — real Supabase data (posts,
  // votes, comments), just not realtime-subscribed (see schema_tea.sql for
  // why: postgres_changes would leak author_id over the wire, breaking the
  // anonymity the whole feature is built on). Refetches on open instead.
  const fetchTea = useCallback(async () => {
    // See the getSession() note on fetchMyJoins/Community.jsx — tea_posts
    // and friends are also "to authenticated" RLS, same stale-JWT race.
    await supabase.auth.getSession();
    const { data } = await supabase
      .from("tea_posts")
      .select("id, text, category, true_count, cap_count, reactions, comment_count, created_at")
      .order("created_at", { ascending: false });
    if (data) setTeaPosts((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]));
      return data.map((row) => {
        const mapped = mapTeaRow(row);
        const existing = byId.get(row.id);
        return existing ? { ...mapped, comments: existing.comments } : mapped;
      });
    });
    if (authUser) {
      const { data: votes } = await supabase.from("tea_votes").select("post_id, vote").eq("user_id", authUser.id);
      if (votes) setMyTeaVotes(Object.fromEntries(votes.map((v) => [v.post_id, v.vote])));
      const { data: reactions } = await supabase.from("tea_reactions").select("post_id, emoji").eq("user_id", authUser.id);
      if (reactions) setMyTeaReactions(Object.fromEntries(reactions.map((r) => [r.post_id, r.emoji])));
    }
  }, [authUser]);

  useEffect(() => {
    if (!teaOpen) return;
    fetchTea();
    // Polls instead of Realtime (see the comment on fetchTea above) — still
    // "auto refresh," just on a short interval rather than a live push, so
    // new tea/confessions and updated vote counts show up without the user
    // manually reopening the screen.
    const id = setInterval(fetchTea, 5000);
    return () => clearInterval(id);
  }, [teaOpen, fetchTea]);

  const loadTeaComments = useCallback(async (postId) => {
    const { data } = await supabase
      .from("tea_comments")
      .select("id, text, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setTeaPosts((ts) => ts.map((t) => (t.id === postId ? { ...t, comments: (data || []).map(mapTeaCommentRow) } : t)));
  }, []);

  const handlePostTea = async (text, category = "tea") => {
    if (!authUser) { handleBlocked(); return; }
    const { data, error } = await supabase
      .from("tea_posts")
      .insert({ author_id: authUser.id, text, category })
      .select("id, text, category, true_count, cap_count, reactions, comment_count, created_at")
      .single();
    if (!error && data) {
      setTeaPosts((ts) => [{ ...mapTeaRow(data), comments: [] }, ...ts]);
      setMyTeaPostIds((ids) => { const next = new Set(ids); next.add(data.id); saveIdSet("orbit_my_tea_post_ids", next); return next; });
      showToast("Posted anonymously — gone in 48h");
    } else {
      showToast("Couldn't post — try again");
    }
  };

  const handleDeleteTea = async (id) => {
    const prevPosts = teaPosts;
    setTeaPosts((ts) => ts.filter((t) => t.id !== id));
    const { error } = await supabase.from("tea_posts").delete().eq("id", id);
    if (error) {
      setTeaPosts(prevPosts);
      showToast("Couldn't delete — try again");
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
    const { error } = await supabase.from("tea_comments").delete().eq("id", commentId);
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
      const { error } = await supabase.from("tea_reactions").delete().eq("post_id", id).eq("user_id", authUser.id);
      if (error) fetchTea();
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
    const { error } = prev
      ? await supabase.from("tea_reactions").update({ emoji }).eq("post_id", id).eq("user_id", authUser.id)
      : await supabase.from("tea_reactions").insert({ post_id: id, user_id: authUser.id, emoji });
    if (error) fetchTea();
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
    const { error } = prev
      ? await supabase.from("tea_votes").update({ vote }).eq("post_id", id).eq("user_id", authUser.id)
      : await supabase.from("tea_votes").insert({ post_id: id, user_id: authUser.id, vote });
    if (error) fetchTea(); // out of sync — just re-pull the truth
  };

  const handleCommentTea = async (id, text) => {
    if (!authUser) { handleBlocked(); return; }
    const { data, error } = await supabase
      .from("tea_comments")
      .insert({ post_id: id, author_id: authUser.id, text })
      .select("id, text, created_at")
      .single();
    if (!error && data) {
      setTeaPosts((ts) => ts.map((t) => (
        t.id === id ? { ...t, comments: [...(t.comments || []), mapTeaCommentRow(data)], commentCount: (t.commentCount || 0) + 1 } : t
      )));
      setMyTeaCommentIds((ids) => { const next = new Set(ids); next.add(data.id); saveIdSet("orbit_my_tea_comment_ids", next); return next; });
    }
  };

  const handleOpenEventCommunity = (event) => {
    const communityId = eventCommunityMap[event.id];
    const community = dbCommunities.find((c) => c.id === communityId);
    if (community) setSelectedCommunity(community);
  };

  // Verify / log in / log out all route back to the initial onboarding page.
  const goToInitialPage = async () => {
    await supabase.auth.signOut();
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
  // Auth-flow shell (loading spinner, onboarding) stays the phone-frame card
  // on every screen size, including desktop — a centered auth card is the
  // normal pattern there, not a full-width layout.
  const shellClass = "w-full h-[var(--app-height,100dvh)] max-w-none sm:max-w-sm sm:h-[calc(100dvh-2rem)] mx-auto bg-white dark:bg-zinc-950 sm:my-4 sm:rounded-3xl sm:border sm:border-zinc-200 dark:sm:border-zinc-800 sm:shadow-2xl sm:shadow-zinc-400/30 dark:sm:shadow-black/50 overflow-hidden relative flex flex-col animate-fade-in";
  // Signed-in app shell: same phone-frame card up through the sm/md range,
  // but from lg (1024px+) up it drops the frame entirely and becomes a real
  // full-width desktop layout — Sidebar on the left, content pane on the
  // right — instead of a mobile card floating in empty space.
  const shellClassApp = `${shellClass} lg:max-w-none lg:my-0 lg:h-[var(--app-height,100dvh)] lg:rounded-none lg:border-0 lg:shadow-none lg:flex-row lg:items-stretch`;

  if (loadingSession) {
    return (
      <div className={shellClass} style={{ fontFamily: "'Inter', sans-serif" }}>
        <style>{FONT_IMPORT}</style>
        <div className="flex-1 flex items-center justify-center">
          <Logo size="text-2xl" />
        </div>
      </div>
    );
  }

  if (stage === "onboarding") {
    return (
      <div className={shellClass} style={{ fontFamily: "'Inter', sans-serif" }}>
        <style>{FONT_IMPORT}</style>
        <Onboarding
          onDone={async (name, interests) => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              setAuthUser({ id: session.user.id, email: session.user.email });
              setUser({ name, verified: true, interests });
              fetchMyJoins(session.user.id);
              fetchMyRegistrations(session.user.id);
            }
            setStage("app");
          }}
          onGuest={() => { setUser({ name: "Guest", verified: false, interests: [] }); setStage("app"); }}
        />
      </div>
    );
  }

  const showingSubPage = !!selectedCommunity || showCreate || searchOpen || teaOpen;
  const goToTab = (tab) => {
    setSelectedCommunity(null);
    setShowCreate(false);
    setSearchOpen(false);
    setTeaOpen(false);
    setActiveTab(tab);
  };
  // Shared with both TopBar/HomeScreen (mobile) and Sidebar (desktop, lg+) so
  // the two nav surfaces trigger the exact same behavior instead of drifting.
  const openTea = () => { if (!user.verified) { handleBlocked(); return; } setTeaOpen(true); };
  const openSearch = () => setSearchOpen(true);
  const openCreate = () => { if (!user.verified) { handleBlocked(); return; } setShowCreate(true); };

  return (
    <div className={shellClassApp} style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <Sidebar active={activeTab} setActive={goToTab} onTeaClick={openTea} onSearchClick={openSearch} onCreateClick={openCreate} verified={user.verified} />
      <div className="flex-1 flex flex-col overflow-hidden lg:h-full min-w-0">
      {!showingSubPage && (
        <TopBar notifOpen={notifOpen} setNotifOpen={setNotifOpen}
          onTeaClick={openTea}
          onSearchClick={openSearch}
          onMessagesClick={() => showToast("DMs — coming soon")}
          onLogoClick={() => goToTab("home")} />
      )}
      {!showingSubPage && !user.verified && <GuestBanner onVerify={goToInitialPage} />}
      <div className="flex-1 overflow-hidden flex flex-col lg:max-w-5xl lg:mx-auto lg:w-full">
      {selectedCommunity ? (
        <CommunityDetail
          key={selectedCommunity.id}
          c={selectedCommunity} joined={joinedIds.includes(selectedCommunity.id)}
          onJoinToggle={handleJoinToggle} onClose={() => setSelectedCommunity(null)}
          onReport={() => setReportTarget(selectedCommunity.name)}
          verified={user.verified} onBlocked={handleBlocked}
          sparked={sparkedIds.includes(selectedCommunity.id)} onSpark={handleSpark}
          onUpdate={handleUpdateCommunity} onDelete={handleDeleteCommunity}
          trendRank={topTrendingIds.includes(selectedCommunity.id) ? topTrendingIds.indexOf(selectedCommunity.id) + 1 : null}
          interests={user.interests}
          authUserId={authUser?.id} myName={user.name}
        />
      ) : showCreate ? (
        <CreateCommunity onCreate={handleCreate} onClose={() => setShowCreate(false)} verified={user.verified} onBlocked={handleBlocked} onVerifyNow={goToInitialPage} />
      ) : searchOpen ? (
        <SearchOverlay communities={allGroups} onOpen={setSelectedCommunity} onClose={() => setSearchOpen(false)} />
      ) : teaOpen ? (
        <LocaliTeaScreen
          teaPosts={teaPosts} onClose={() => setTeaOpen(false)}
          verified={user.verified} onBlocked={handleBlocked}
          onPost={handlePostTea} onValidate={handleValidateTea} onComment={handleCommentTea}
          onReport={(label) => setReportTarget(label)}
          myVotes={myTeaVotes} onOpenPost={loadTeaComments}
          onReact={handleReactTea} myReactions={myTeaReactions}
          myPostIds={myTeaPostIds} myCommentIds={myTeaCommentIds} canModerate={isTeaModerator}
          onDeletePost={handleDeleteTea} onDeleteComment={handleDeleteTeaComment}
        />
      ) : activeTab === "home" ? (
        <HomeScreen
          communities={communities} joinedIds={joinedIds}
          onOpen={setSelectedCommunity} interests={user.interests}
          feedPosts={feedPosts} feedSparkIds={feedSparkIds} onSparkPost={handleSparkPost}
          onAdClick={() => showToast("Ads — demo content for this presentation, not a live ad network")}
          onCreateClick={openCreate}
        />
      ) : activeTab === "explore" ? (
        <ExploreScreen subTab={exploreTab} setSubTab={setExploreTab} clubs={clubs} communities={communities} onOpen={setSelectedCommunity} />
      ) : activeTab === "events" ? (
        <EventsScreen
          events={events} interests={user.interests}
          onComingSoon={() => showToast("Registration — coming soon")}
        />
      ) : activeTab === "profile" ? (
        <ProfileScreen
          user={user} joinedCommunities={joinedCommunities}
          onSaveProfile={handleUpdateProfile}
          onVerifyGuest={goToInitialPage}
          onLogout={goToInitialPage}
          onComingSoon={() => showToast("Coming soon")}
          theme={theme} onToggleTheme={toggleTheme}
        />
      ) : null}
      </div>
      <div className="lg:hidden">
        <BottomNav active={activeTab} setActive={goToTab} />
      </div>
      {reportTarget && (
        <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} onSubmit={handleReportSubmit} />
      )}
      <Toast message={toastMsg} />
      </div>
    </div>
  );
}
