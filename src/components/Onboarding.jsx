import { useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { CATEGORIES, COLOR_MAP, ONBOARDING_STEPS } from "../data/constants.js";
import { Logo, AuroraBackground } from "./Common.jsx";
import { signInWithGoogle, saveProfile, fetchProfile } from "../lib/authService.js";
import { auth } from "../lib/firebase.js";

// Google is the only sign-in method. The email + 8-digit-OTP flow this screen
// used to run went away with Supabase: Firebase Auth has no email-code
// equivalent (only magic links), and phone OTP would need the Blaze plan, so
// "log in" and "register" collapse into this one button — a uid Firebase has
// never seen before simply gets a profile document written on first sight.
//
// The two-step shape is kept: Google supplies a name and avatar, but not what
// someone is *into*, so the interests step still has a job to do.

// lucide-react ships no brand marks, so Google's four-color G is inlined
// here. Google's branding guidelines require the official mark on a
// "Sign in with Google" control rather than a generic icon.
function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

export function Onboarding({ onDone, onGuest }) {
  const [step, setStep] = useState("contact");
  const [name, setName] = useState("");
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const toggleInterest = (catName) => {
    setInterests((cur) => cur.includes(catName) ? cur.filter((x) => x !== catName) : [...cur, catName]);
  };
  const stepIndex = ONBOARDING_STEPS.indexOf(step);

  const handleGoogle = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const user = await signInWithGoogle();
      // null means the popup was dismissed, or we handed off to a full-page
      // redirect — either way there's nothing to advance to from here.
      if (!user) { setLoading(false); return; }

      // A returning user already has a name and interests saved; don't make
      // them re-enter what they set last time, just go straight in.
      const existing = await fetchProfile(user.uid);
      if (existing?.name && existing.interests?.length) {
        setLoading(false);
        onDone(existing.name, existing.interests);
        return;
      }
      setName(existing?.name || user.displayName || "");
      setInterests(existing?.interests || []);
      setLoading(false);
      setStep("profile");
    } catch (err) {
      setLoading(false);
      setErrorMsg(err?.message || "Couldn't sign in with Google. Try again.");
    }
  };

  const finishProfile = async (finalName, finalInterests) => {
    setLoading(true);
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await saveProfile(uid, { name: finalName, interests: finalInterests });
      } catch (err) {
        setLoading(false);
        setErrorMsg(err?.message || "Couldn't save your profile. Try again.");
        return;
      }
    }
    setLoading(false);
    onDone(finalName, finalInterests);
  };

  return (
    <div className="relative flex-1 flex flex-col px-7 pt-9 pb-8 min-h-0 overflow-hidden">
      <AuroraBackground />
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between animate-fade-in-up shrink-0">
        <Logo size="text-2xl" />
        <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-900/10 dark:bg-zinc-50/10 border border-zinc-900/20 dark:border-zinc-50/20 px-2 py-1 rounded-full">Testing phase</span>
      </div>
      <p className="text-[11px] text-zinc-500 mt-2 animate-fade-in-up shrink-0">
        You're using an early beta of Orbit — things may break or change. Thanks for helping test it.
      </p>
      <div className="flex items-center gap-1.5 mt-6 mb-8 animate-fade-in-up stagger-1 shrink-0">
        {ONBOARDING_STEPS.map((s, i) => (
          <span key={s} className={`h-1 rounded-full transition-all duration-300 ${i === stepIndex ? "w-7 bg-zinc-900 dark:bg-zinc-50 shadow-[0_0_8px_rgba(96,165,250,0.6)]" : i < stepIndex ? "w-4 bg-zinc-900/40 dark:bg-zinc-50/40" : "w-4 bg-zinc-100 dark:bg-zinc-800"}`} />
        ))}
      </div>

      {step === "contact" && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2 text-2xl leading-tight animate-fade-in-up stagger-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Let's get you in
            </p>
            <p className="text-sm text-zinc-500 mb-8 animate-fade-in-up stagger-3">
              Sign in with Google — first time in creates your account, no separate sign-up.
            </p>
            {errorMsg && (
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-3 animate-fade-in-up">{errorMsg}</p>
            )}
          </div>
          <div className="shrink-0 pt-4">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-white dark:bg-zinc-50 border border-zinc-200 dark:border-transparent disabled:opacity-60 text-zinc-800 dark:text-zinc-900 text-sm font-semibold shadow-lg shadow-zinc-900/10 dark:shadow-black/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 animate-fade-in-up stagger-4"
            >
              <GoogleMark />
              {loading ? "Please wait…" : "Continue with Google"}
            </button>
            <button type="button" onClick={onGuest} className="w-full text-xs text-zinc-500 underline underline-offset-2 mt-4 animate-fade-in-up stagger-6">Browse first, verify later</button>
          </div>
        </div>
      )}

      {step === "profile" && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (name.trim() && !loading) finishProfile(name.trim(), interests); }}
          className="flex-1 flex flex-col min-h-0 animate-fade-in-up"
        >
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <button type="button" onClick={() => setStep("contact")} className="text-xs text-zinc-500 flex items-center gap-1 mb-3 -mt-1 w-fit"><ChevronLeft size={14} />Back</button>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1 text-2xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Set up your profile</p>
            <p className="text-sm text-zinc-500 mb-5">Just the basics to get you set up.</p>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={60} className="w-full bg-zinc-50/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 rounded-xl px-3.5 py-2.5 text-sm mb-5 outline-none focus:border-zinc-900 dark:focus:border-zinc-50 focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/30 transition-colors" />
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">What are you into?</p>
              <button type="button" onClick={() => finishProfile(name.trim(), [])} disabled={!name.trim() || loading} className="text-xs text-zinc-900 dark:text-zinc-50 font-medium disabled:text-zinc-400 dark:disabled:text-zinc-600">Skip — show me everything</button>
            </div>
            <p className="text-xs text-zinc-500 mb-3">Pick as many as you like — we'll personalize your home feed. Or skip to see all communities and clubs.</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat, i) => {
                const cm = COLOR_MAP[cat.color];
                const selected = interests.includes(cat.name);
                const Icon = cat.icon;
                return (
                  <button
                    type="button"
                    key={cat.name}
                    onClick={() => toggleInterest(cat.name)}
                    className={`animate-pop-in stagger-${Math.min((i % 8) + 1, 8)} flex items-center gap-2 rounded-xl px-3 py-2.5 text-left border transition-all active:scale-[0.97] ${selected ? "border-zinc-900 dark:border-zinc-50 ring-1 ring-zinc-900/20 dark:ring-zinc-50/30 bg-zinc-900/5 dark:bg-zinc-50/5" : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700"}`}
                  >
                    <div className={`${cm.tint} ${cm.text} w-7 h-7 rounded-lg flex items-center justify-center shrink-0`}><Icon size={14} /></div>
                    <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-tight">{cat.name}</p>
                    {selected && <Check size={13} className="text-zinc-900 dark:text-zinc-50 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
            {errorMsg && (
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-3 animate-fade-in-up">{errorMsg}</p>
            )}
          </div>
          <div className="shrink-0 pt-4">
            <button type="submit" disabled={!name.trim() || loading} className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-zinc-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 text-white dark:text-zinc-900 disabled:text-zinc-500 text-sm font-semibold shadow-lg shadow-zinc-900/10 dark:shadow-black/30 disabled:shadow-none active:scale-[0.98] transition-all">
              {loading ? "Please wait…" : "Enter Orbit"}
            </button>
          </div>
        </form>
      )}
      </div>
    </div>
  );
}
