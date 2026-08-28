import { useState } from "react";
import {
  BadgeCheck, Settings, LogOut, LogIn, ShieldCheck, Grid3x3, Users2, Camera, Sun, Moon,
} from "lucide-react";
import { CATEGORIES, COLOR_MAP } from "../data/constants.js";
import { useClickOutside } from "../utils/hooks.js";
import { Avatar } from "./Common.jsx";
import { EmptyState } from "./EmptyState.jsx";

export function ProfileScreen({ user, joinedCommunities, onSaveProfile, onVerifyGuest, onLogout, onComingSoon, theme, onToggleTheme }) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(user.name);
  const [draftBio, setDraftBio] = useState(user.bio || "");
  const [gridTab, setGridTab] = useState("posts");
  const [menuOpen, setMenuOpen] = useState(false);
  const createdCommunities = joinedCommunities.filter((c) => c.creator === "You");
  const interests = user.interests || [];
  const bio = user.bio || "";
  const settingsMenuRef = useClickOutside(menuOpen, () => setMenuOpen(false));
  const saveProfile = () => { onSaveProfile(draftName, draftBio); setEditing(false); };
  return (
    <div className="relative flex-1 overflow-y-auto no-scrollbar pb-6">
      <div className="relative z-10">
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-zinc-900 dark:text-zinc-50 text-base">{user.name}</p>
          {user.verified && <BadgeCheck size={15} className="text-zinc-900 dark:text-zinc-50" />}
        </div>
        <div ref={settingsMenuRef} className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900">
            <Settings size={19} className="text-zinc-700 dark:text-zinc-300" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl shadow-zinc-400/30 dark:shadow-black/50 z-40 overflow-hidden">
              <button onClick={() => { onToggleTheme(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                {theme === "dark" ? <Sun size={15} className="text-zinc-500" /> : <Moon size={15} className="text-zinc-500" />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
              <button onClick={() => { setMenuOpen(false); onComingSoon(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"><Settings size={15} className="text-zinc-500" />App preferences</button>
              {user.verified ? (
                <button onClick={() => { setMenuOpen(false); onLogout(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"><LogOut size={15} />Log out</button>
              ) : (
                <button onClick={() => { setMenuOpen(false); onLogout(); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800"><LogIn size={15} />Log in</button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-6 px-5 pt-6">
        <Avatar label={user.name[0]} size={76} ring={user.verified} />
        <div className="flex-1 grid grid-cols-3 gap-1 text-center">
          <div>
            <p className="text-base font-bold text-zinc-900 dark:text-zinc-50 mono">{joinedCommunities.length}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Joined</p>
          </div>
          <div>
            <p className="text-base font-bold text-zinc-900 dark:text-zinc-50 mono">{createdCommunities.length}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Created</p>
          </div>
          <div>
            <p className="text-base font-bold text-zinc-900 dark:text-zinc-50 mono">{interests.length}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Interests</p>
          </div>
        </div>
      </div>
      <div className="px-5 pt-3.5">
        {editing ? (
          <div className="space-y-2 mb-3">
            <input
              value={draftName} onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveProfile(); }}
              placeholder="Your name"
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:focus:border-zinc-50"
            />
            <textarea value={draftBio} onChange={(e) => setDraftBio(e.target.value)} placeholder="Short bio — what are you looking for nearby?" rows={2} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:focus:border-zinc-50" />
            <button onClick={saveProfile} className="text-xs text-zinc-900 dark:text-zinc-50 font-medium">Save</button>
          </div>
        ) : (
          <>
            {!user.verified && (
              <button onClick={onVerifyGuest} className="flex items-center gap-1 text-xs text-zinc-700 dark:text-zinc-300 font-medium mb-2.5"><ShieldCheck size={13} />Not verified — tap to verify</button>
            )}
            {bio && <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-snug mb-3">{bio}</p>}
            {interests.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Your vibe</p>
                <div className="flex gap-1.5 flex-wrap">
                  {interests.map((name) => {
                    const cat = CATEGORIES.find((x) => x.name === name);
                    const cm = COLOR_MAP[cat.color];
                    return (
                      <span key={name} className={`${cm.tint} ${cm.text} text-[11px] px-2 py-1 rounded-full font-medium flex items-center gap-1`}>
                        <cat.icon size={11} />{name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            <button onClick={() => { setDraftBio(bio); setEditing(true); }} className="w-full py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-medium">Edit profile</button>
          </>
        )}
      </div>
      <div className="flex border-t border-zinc-100 dark:border-zinc-900 mt-5">
        <button onClick={() => setGridTab("posts")} className={`flex-1 flex items-center justify-center gap-1.5 py-3 border-b-2 text-xs font-medium ${gridTab === "posts" ? "border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50" : "border-transparent text-zinc-400 dark:text-zinc-600"}`}>
          <Grid3x3 size={15} />Posts
        </button>
        <button onClick={() => setGridTab("communities")} className={`flex-1 flex items-center justify-center gap-1.5 py-3 border-b-2 text-xs font-medium ${gridTab === "communities" ? "border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50" : "border-transparent text-zinc-400 dark:text-zinc-600"}`}>
          <Users2 size={15} />Communities
        </button>
      </div>
      {gridTab === "posts" && (
        <div className="pt-2">
          <EmptyState
            icon={Camera}
            title="Profile posts — coming soon"
            subtitle="Posting photos to your own profile isn't live yet. Your posts inside communities (Posts tab) already work — this is a separate, personal profile grid, still being built."
          />
        </div>
      )}
      {gridTab === "communities" && (
        joinedCommunities.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-10">You haven't joined any communities or clubs yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 mt-0.5">
            {joinedCommunities.map((c) => {
              const cat = CATEGORIES.find((x) => x.name === c.category);
              const cm = COLOR_MAP[cat.color];
              return (
                <div key={c.id} className={`aspect-square p-2 flex flex-col justify-between bg-gradient-to-br ${cm.grad}`}>
                  <cat.icon size={15} className="text-white/90" />
                  <p className="text-[10px] font-semibold text-white leading-tight line-clamp-2">{c.name}</p>
                </div>
              );
            })}
          </div>
        )
      )}
      </div>
    </div>
  );
}
