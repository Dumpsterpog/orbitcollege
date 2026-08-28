import {
  BookOpen, Trophy, Dumbbell, Code2, Home as HomeIcon,
  Plane, Gamepad2, Handshake, Music, ChefHat, Palette, Clapperboard,
  Library, Camera, PawPrint, HeartHandshake,
} from "lucide-react";

export const CATEGORIES = [
  { name: "Study", icon: BookOpen, color: "indigo" },
  { name: "Sports", icon: Trophy, color: "rose" },
  { name: "Fitness", icon: Dumbbell, color: "emerald" },
  { name: "Coding & Projects", icon: Code2, color: "violet" },
  { name: "Roommates", icon: HomeIcon, color: "amber" },
  { name: "Travel", icon: Plane, color: "sky" },
  { name: "Gaming", icon: Gamepad2, color: "fuchsia" },
  { name: "Networking & Social", icon: Handshake, color: "orange" },
  { name: "Music", icon: Music, color: "pink" },
  { name: "Cooking", icon: ChefHat, color: "yellow" },
  { name: "Art & Design", icon: Palette, color: "purple" },
  { name: "Movies & TV", icon: Clapperboard, color: "red" },
  { name: "Books & Reading", icon: Library, color: "teal" },
  { name: "Photography", icon: Camera, color: "cyan" },
  { name: "Pets & Animals", icon: PawPrint, color: "lime" },
  { name: "Volunteering", icon: HeartHandshake, color: "stone" },
];

// Strictly grayscale (per the black-and-white rebrand — no hue anywhere in
// the app, including category tags). The 16 category keys are kept as-is
// (every call site looks them up by name) but now cycle through four
// zinc-only "flavors" of differing intensity, purely so adjacent categories
// in a list still read as visually distinct from each other by weight, not
// by color — differentiation comes from that plus each category's icon.
const FLAVORS = {
  a: { tint: "bg-zinc-900/5 dark:bg-zinc-50/10", text: "text-zinc-600 dark:text-zinc-400", ringc: "ring-zinc-400/20 dark:ring-zinc-500/20", grad: "from-zinc-300 to-zinc-400 dark:from-zinc-700 dark:to-zinc-600" },
  b: { tint: "bg-zinc-900/8 dark:bg-zinc-50/12", text: "text-zinc-700 dark:text-zinc-300", ringc: "ring-zinc-500/20 dark:ring-zinc-400/20", grad: "from-zinc-400 to-zinc-500 dark:from-zinc-600 dark:to-zinc-500" },
  c: { tint: "bg-zinc-900/10 dark:bg-zinc-50/15", text: "text-zinc-800 dark:text-zinc-200", ringc: "ring-zinc-600/20 dark:ring-zinc-300/20", grad: "from-zinc-500 to-zinc-600 dark:from-zinc-500 dark:to-zinc-400" },
  d: { tint: "bg-zinc-900/12 dark:bg-zinc-50/18", text: "text-zinc-900 dark:text-zinc-100", ringc: "ring-zinc-700/20 dark:ring-zinc-200/20", grad: "from-zinc-600 to-zinc-700 dark:from-zinc-400 dark:to-zinc-300" },
};
export const COLOR_MAP = {
  indigo: FLAVORS.a, rose: FLAVORS.b, emerald: FLAVORS.c, violet: FLAVORS.d,
  amber: FLAVORS.a, sky: FLAVORS.b, fuchsia: FLAVORS.c, orange: FLAVORS.d,
  pink: FLAVORS.a, yellow: FLAVORS.b, purple: FLAVORS.c, red: FLAVORS.d,
  teal: FLAVORS.a, cyan: FLAVORS.b, lime: FLAVORS.c, stone: FLAVORS.d,
};

// NOTE: the old SEED_COMMUNITIES / CLUBS / MOCK_EVENTS / MOCK_NOTIFICATIONS /
// MOCK_INCOMING_REQUESTS / MOCK_OUTGOING_REQUESTS / MOCK_INDIVIDUAL_CHATS /
// MOCK_SUGGESTED_PEOPLE / MOCK_TEA mock-data arrays that used to live here
// were removed (PDF improvement list, item 7 — "removal of seed data").
// Every one of them was already dead: communities/events/Locali-Tea have
// been reading from live Supabase since early in the build (see App.jsx),
// and the one component that still imported the two chat-related mocks
// (Chat.jsx) was itself never imported by anything — a leftover from before
// DMs got gated as "coming soon". Deleted both rather than leave unreachable
// code + fake names sitting in the bundle.

export const REPORT_REASONS = ["Spam or scam", "Harassment or bullying", "Inappropriate content", "Fake community or impersonation", "Something else"];

export const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&family=JetBrains+Mono:wght@500;600&display=swap'); .no-scrollbar{scrollbar-width:none;-ms-overflow-style:none;} .no-scrollbar::-webkit-scrollbar{display:none;width:0;height:0} .mono{font-family:'JetBrains Mono',monospace;}`;

export const ONBOARDING_STEPS = ["contact", "profile"];
