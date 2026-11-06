import {
  Users,
  Lightbulb,
  BookOpen, Trophy, Dumbbell, Code2, Home as HomeIcon,
  Plane, Gamepad2, Handshake, Music, ChefHat, Palette, Clapperboard,
  Library, Camera, PawPrint, HeartHandshake,
} from "lucide-react";

export const categoryOf = (name) =>
  CATEGORIES.find((c) => c.name === name) || FALLBACK_CATEGORY;

export const FALLBACK_CATEGORY = {
  name: "Community", icon: Users, color: "slate", msr: "groups",
  tint: "text-c-blue", ring: "bg-c-blue",
};

export const CATEGORIES = [
  { name: "Workshop", icon: Lightbulb, color: "amber", msr: "lightbulb", tint: "text-c-amber", ring: "bg-c-amber" },
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


export const REPORT_REASONS = ["Spam or scam", "Harassment or bullying", "Inappropriate content", "Fake community or impersonation", "Something else"];

export const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&family=JetBrains+Mono:wght@100..900&display=swap'); .no-scrollbar{scrollbar-width:none;-ms-overflow-style:none;} .no-scrollbar::-webkit-scrollbar{display:none;width:0;height:0} .mono{font-family:'JetBrains Mono',monospace;} `;

export const ONBOARDING_STEPS = ["contact", "profile"];
