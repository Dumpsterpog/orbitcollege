import {
  BookOpen, Trophy, Dumbbell, Code2, Home as HomeIcon,
  Plane, Gamepad2, Handshake, Music, ChefHat, Palette, Clapperboard,
  Library, Camera, PawPrint, HeartHandshake,
} from "lucide-react";

// `icon` is the lucide component the pre-M3 screens still render; `msr` is
// the filled Material Symbols ligature the rebuilt dashboard uses. `tint`
// gives each category its own filled colour so a directory of sixteen
// doesn't read as sixteen identical grey glyphs.
// Each category owns a filled glyph and a hue for the life of the app, so
// the same subject is recognisable at a glance in a feed row, a directory
// tile and a filter pill without reading the label. `icon` is the legacy
// lucide component, kept only for screens not yet migrated.
export const CATEGORIES = [
  { name: "Study", icon: BookOpen, color: "indigo", msr: "menu_book", tint: "text-c-blue", ring: "bg-c-blue" },
  { name: "Sports", icon: Trophy, color: "rose", msr: "sports_soccer", tint: "text-c-green", ring: "bg-c-green" },
  { name: "Fitness", icon: Dumbbell, color: "emerald", msr: "fitness_center", tint: "text-c-teal", ring: "bg-c-teal" },
  { name: "Coding & Projects", icon: Code2, color: "violet", msr: "code", tint: "text-c-violet", ring: "bg-c-violet" },
  { name: "Roommates", icon: HomeIcon, color: "amber", msr: "house", tint: "text-c-amber", ring: "bg-c-amber" },
  { name: "Travel", icon: Plane, color: "sky", msr: "flight", tint: "text-c-blue", ring: "bg-c-blue" },
  { name: "Gaming", icon: Gamepad2, color: "fuchsia", msr: "sports_esports", tint: "text-c-pink", ring: "bg-c-pink" },
  { name: "Networking & Social", icon: Handshake, color: "orange", msr: "handshake", tint: "text-c-orange", ring: "bg-c-orange" },
  { name: "Music", icon: Music, color: "pink", msr: "music_note", tint: "text-c-pink", ring: "bg-c-pink" },
  { name: "Cooking", icon: ChefHat, color: "yellow", msr: "restaurant", tint: "text-c-orange", ring: "bg-c-orange" },
  { name: "Art & Design", icon: Palette, color: "purple", msr: "palette", tint: "text-c-violet", ring: "bg-c-violet" },
  { name: "Movies & TV", icon: Clapperboard, color: "red", msr: "movie", tint: "text-c-red", ring: "bg-c-red" },
  { name: "Books & Reading", icon: Library, color: "teal", msr: "local_library", tint: "text-c-teal", ring: "bg-c-teal" },
  { name: "Photography", icon: Camera, color: "cyan", msr: "photo_camera", tint: "text-c-teal", ring: "bg-c-teal" },
  { name: "Pets & Animals", icon: PawPrint, color: "lime", msr: "pets", tint: "text-c-green", ring: "bg-c-green" },
  { name: "Volunteering", icon: HeartHandshake, color: "stone", msr: "volunteer_activism", tint: "text-c-green", ring: "bg-c-green" },
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
// been reading from the live database since early in the build (see App.jsx),
// and the one component that still imported the two chat-related mocks
// (Chat.jsx) was itself never imported by anything — a leftover from before
// DMs got gated as "coming soon". Deleted both rather than leave unreachable
// code + fake names sitting in the bundle.

export const REPORT_REASONS = ["Spam or scam", "Harassment or bullying", "Inappropriate content", "Fake community or impersonation", "Something else"];

export const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&family=JetBrains+Mono:wght@100..900&display=swap'); .no-scrollbar{scrollbar-width:none;-ms-overflow-style:none;} .no-scrollbar::-webkit-scrollbar{display:none;width:0;height:0} .mono{font-family:'JetBrains Mono',monospace;} `;

export const ONBOARDING_STEPS = ["contact", "profile"];
