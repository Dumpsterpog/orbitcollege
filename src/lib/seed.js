import {
  collection, doc, addDoc, setDoc, getDocs, deleteDoc, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db, firebaseReady } from "./firebase.js";
import { slugify } from "../utils/helpers.js";


const DAY = 86400e3;
const at = (days, h = 19, m = 0) => {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(h, m, 0, 0);
  return Timestamp.fromDate(d);
};
const ago = (hours) => Timestamp.fromDate(new Date(Date.now() - hours * 3600e3));

const COMMUNITIES = [
  {
    name: "Orbit Builders",
    category: "Coding & Projects",
    description: "Ship something every week. Design reviews on Thursdays, demo night once a month.",
    official: true,
    tags: ["Coding & Projects", "Networking & Social"],
    rules: [
      { title: "Show your work", body: "Screenshots, repos or a demo. Ideas alone belong in chat." },
      { title: "Critique the build, not the builder", body: "Be specific about what you would change." },
    ],
  },
  {
    name: "cycling community",
    category: "Sports",
    description: "Sunrise rides, coastal loops and the occasional flat tyre. All paces welcome.",
    official: false,
    avatarUrl: "/seed/cycling.jpg",
    tags: ["Sports", "Fitness"],
    rules: [
      { title: "Helmets are not optional", body: "No helmet, no ride. This one is not negotiable." },
      { title: "Nobody gets dropped", body: "We regroup at every junction." },
    ],
  },
  {
    name: "Campus Coffee",
    category: "Cooking",
    description: "Where to find the good stuff on campus, and who is making it.",
    official: false,
    avatarUrl: "/seed/coffee.jpg",
    tags: ["Cooking", "Study"],
    rules: [{ title: "Say where", body: "A recommendation without a location helps nobody." }],
  },
];

const EVENTS = [
  {
    title: "Orbit 2026 Spring Hackathon & Builder Mixer",
    category: "Coding & Projects",
    description: "48 hours, team grants, and mentor matching with alumni founders. Open to all engineers and designers.",
    eventWhen: "April 12-14",
    eventWhere: "Grand Student Commons",
    capacity: 300,
    imageUrl: "/seed/hackathon.jpg",
    startsAt: at(2, 9, 0),
  },
  {
    title: "Web3 & Rust Hack Night",
    category: "Coding & Projects",
    description: "Bring a laptop and a problem. Pizza at eight.",
    eventWhen: "7:00 PM",
    eventWhere: "Innovation Hub",
    capacity: 60,
    startsAt: at(1, 19, 0),
  },
  {
    title: "Weekend Morning Ride",
    category: "Sports",
    description: "28km coastal loop at a casual pace. Espresso stop at the halfway mark.",
    eventWhen: "8:00 AM",
    eventWhere: "North Gate Arch",
    capacity: 40,
    imageUrl: "/seed/cycling.jpg",
    startsAt: at(4, 8, 0),
  },
];

const POSTS = [
  {
    community: "Orbit Builders",
    hoursAgo: 2,
    text: `Just deployed the new lightweight state manager for the campus room tracker. Tested it against 10,000 live WebSocket subscriptions in the study centre. Here is how clean the consumption looks:

\`\`\`typescript
import { createOrbitSignal } from '@orbit/core';

// Real-time campus room broadcast pulse
export const useRoomPulse = createOrbitSignal({
  channel: 'hall-b-quiet-study',
  syncInterval: 250,
  onCollision: (event) => event.reconcile()
});
\`\`\`

Feedback on memory leaks in the broadcast channel very welcome.`,
    codeName: "roomPulseStore.ts",
    sparkCount: 42,
  },
  {
    community: "cycling community",
    hoursAgo: 5,
    text: "Saturday Sunrise Coastal Loop (28km). Pace is casual, 20-22 km/h, no drops. We grab espresso and baked pastries at Bay Roast around kilometre 18. Helmets mandatory, lights recommended.",
    imageUrl: "/seed/cycling.jpg",
    sparkCount: 89,
  },
  {
    community: "Campus Coffee",
    hoursAgo: 8,
    text: "The North Library coffee lounge just installed a cold brew nitro tap. Free oat milk upgrades all finals week for anyone with a student badge.",
    imageUrl: "/seed/coffee.jpg",
    sparkCount: 215,
  },
  {
    community: null, // campus-wide
    hoursAgo: 20,
    text: "Reminder that the 24-hour study rooms in the west wing are open through finals. Book them from the campus portal, not at the door, or you will queue for an hour like I just did.",
    sparkCount: 31,
  },
];

function need(uid) {
  if (!firebaseReady) throw new Error("Firebase is not configured.");
  if (!uid) throw new Error("Sign in first, then run this again.");
}

/** Creates the demo communities, events and posts. Safe to run twice. */
export async function seedDemo(uid, displayName = "Orbit") {
  need(uid);
  const madeCommunities = {};

  const existing = await getDocs(collection(db, "communities"));
  const byName = new Map(existing.docs.map((d) => [d.data().name, d.id]));

  for (const c of COMMUNITIES) {
    if (byName.has(c.name)) { madeCommunities[c.name] = byName.get(c.name); continue; }
    const ref = await addDoc(collection(db, "communities"), {
      ...c,
      tags: c.tags || [c.category],
      memberCount: 1,
      creatorId: uid,
      creatorLabel: displayName,
      handle: slugify(c.name),
      avatarUrl: c.avatarUrl || null,
      postsAdminOnly: false,
      demo: true,
      createdAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
    });
    await setDoc(doc(db, "communities", ref.id, "members", uid), {
      uid, name: displayName, role: "admin", joinedAt: serverTimestamp(),
    });
    madeCommunities[c.name] = ref.id;
  }

  const existingEvents = await getDocs(collection(db, "events"));
  const eventTitles = new Set(existingEvents.docs.map((d) => d.data().title));
  for (const e of EVENTS) {
    if (eventTitles.has(e.title)) continue;
    await addDoc(collection(db, "events"), {
      ...e,
      tags: [e.category],
      imageUrl: e.imageUrl || null,
      linkedCommunityId: null,
      demo: true,
      createdAt: serverTimestamp(),
    });
  }

  for (const p of POSTS) {
    const cid = p.community ? madeCommunities[p.community] : null;
    if (p.community && !cid) continue;
    const target = cid ? collection(db, "communities", cid, "posts") : collection(db, "posts");
    await addDoc(target, {
      ...(cid ? { communityId: cid } : { communityId: null }),
      authorId: uid,
      authorName: displayName,
      text: p.text,
      imageUrl: p.imageUrl || null,
      codeName: p.codeName || null,
      sparkCount: p.sparkCount || 0,
      commentCount: 0,
      pinned: false,
      demo: true,
      createdAt: ago(p.hoursAgo),
    });
  }

  return {
    communities: Object.keys(madeCommunities).length,
    events: EVENTS.length,
    posts: POSTS.length,
  };
}

/** Removes everything seedDemo created, and nothing else. */
export async function clearDemo() {
  if (!firebaseReady) throw new Error("Firebase is not configured.");
  let removed = 0;

  const communities = await getDocs(collection(db, "communities"));
  for (const c of communities.docs) {
    if (!c.data().demo) continue;
    // Subcollections first: Firestore does not cascade, and a deleted parent
    // leaves its children unreachable rather than removed.
    for (const sub of ["posts", "members"]) {
      const kids = await getDocs(collection(db, "communities", c.id, sub));
      for (const k of kids.docs) { await deleteDoc(k.ref); removed++; }
    }
    await deleteDoc(c.ref);
    removed++;
  }
  for (const name of ["events", "posts"]) {
    const snap = await getDocs(collection(db, name));
    for (const d of snap.docs) {
      if (d.data().demo) { await deleteDoc(d.ref); removed++; }
    }
  }
  return removed;
}
