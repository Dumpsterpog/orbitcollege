// Material Symbol name -> Lucide component.
//
// The app was written against Material Symbols and calls Icon with names like
// "local_fire_department" in about ninety places. The design uses Lucide, whose
// line weight and rounded joins are what actually make it look like the mock --
// Material's outline axis is squarer and reads heavier at nav size.
//
// Rather than rewrite every call site, the names stay and this maps them. New
// code can use Lucide names directly: both are accepted, since the lookup falls
// through to the Lucide export when a key is not found here.

import {
  Activity, ArrowLeft, ArrowRight, AtSign, Ban, Bell, Bookmark, BookOpen, Briefcase,
  Bug, Calendar, CalendarDays, CalendarX, Camera, Check, CheckCircle2, ChevronDown,
  ChevronRight, ChevronsUpDown, CircleHelp, Clock, Code2, Coffee, Compass, Copy,
  CornerDownLeft, Download, Ellipsis, ExternalLink, Eye, Feather, FileText, Flag,
  Flame, Globe, GraduationCap, Hash, Heart, Home, Image, Info, LayoutGrid, Lightbulb,
  Link2, Loader2, LocateFixed, Lock, LogIn, LogOut, Mail, MapPin, Megaphone,
  MessageCircle, MessageSquare, Moon, MoreHorizontal, Pencil, Pin, Plus, QrCode,
  Reply, RotateCw, Search, SearchX, Send, Settings, Share2, Shield, ShieldCheck,
  SlidersHorizontal, Snowflake, Sparkles, Star, Sun, SunMoon, Trash2, TrendingUp,
  Trophy, User, UserCircle, UserPlus, Users, X, PlusCircle,
} from "lucide-react";

export const ICONS = {
  // navigation
  home: Home,
  add_circle: PlusCircle,
  explore: Compass,
  search: Search,
  search_off: SearchX,
  bookmark: Bookmark,
  settings: Settings,
  tune: SlidersHorizontal,
  notifications: Bell,
  groups: Users,
  group: Users,
  person: User,
  account_circle: UserCircle,
  person_add: UserPlus,
  logout: LogOut,
  login: LogIn,

  // campus
  calendar_today: Calendar,
  calendar_month: CalendarDays,
  event: CalendarDays,
  event_busy: CalendarX,
  confirmation_number: CalendarDays,
  local_cafe: Coffee,
  local_fire_department: Flame,
  trending_up: TrendingUp,
  school: GraduationCap,
  workspace_premium: Trophy,

  // actions
  add: Plus,
  close: X,
  check: Check,
  check_circle: CheckCircle2,
  delete: Trash2,
  edit: Pencil,
  edit_square: Feather,
  send: Send,
  reply: Reply,
  share: Share2,
  flag: Flag,
  block: Ban,
  lock: Lock,
  shield: Shield,
  verified_user: ShieldCheck,
  verified: CheckCircle2,
  download: Download,
  content_copy: Copy,
  open_in_new: ExternalLink,
  link: Link2,
  push_pin: Pin,
  qr_code_2: QrCode,
  more_horiz: MoreHorizontal,
  visibility: Eye,

  // content
  image: Image,
  photo_camera: Camera,
  code_blocks: Code2,
  article: FileText,
  description: FileText,
  notes: BookOpen,
  mode_comment: MessageCircle,
  forum: MessageSquare,
  chat_bubble: MessageCircle,
  poll: Activity,
  tag: Hash,
  public: Globe,
  campaign: Megaphone,
  work: Briefcase,
  help: CircleHelp,
  lightbulb: Lightbulb,
  auto_awesome: Sparkles,
  star: Star,
  thumb_up: Heart,
  favorite: Heart,
  emoji_emotions: Sparkles,
  bug_report: Bug,
  mail: Mail,
  badge: AtSign,
  dashboard: LayoutGrid,

  // meta
  schedule: Clock,
  location_on: MapPin,
  my_location: LocateFixed,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  chevron_right: ChevronRight,
  expand_more: ChevronDown,
  unfold_more: ChevronsUpDown,
  keyboard_return: CornerDownLeft,
  progress_activity: Loader2,
  refresh: RotateCw,
  info: Info,

  // theme
  light_mode: Sun,
  dark_mode: Moon,
  brightness_auto: SunMoon,
  ac_unit: Snowflake,
};
