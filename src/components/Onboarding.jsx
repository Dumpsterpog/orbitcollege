import { useState } from "react";
import { Check, ChevronLeft, ArrowRight, Mail } from "lucide-react";
import { CATEGORIES, COLOR_MAP, ONBOARDING_STEPS } from "../data/constants.js";
import { Logo, AuroraBackground } from "./Common.jsx";
import { supabase } from "../lib/supabaseClient.js";

// This beta build accepts any email (personal/private included) — the
// earlier @muj.manipal.edu-only domain lock (both this client check and the
// enforce_muj_email_domain_trigger in the database) was intentionally
// removed for the first 200-person test round, since campus-mail deliverability
// couldn't be fixed in time. See supabase/drop_domain_lock.sql.
const emailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// Supabase's email-OTP flow sends a numeric code via {{ .Token }} (configured
// in the Supabase Dashboard's "Confirm signup" + "Magic Link" email templates
// — see README/Supabase setup notes). This project's Supabase instance
// generates an 8-digit code (confirmed against a real received email) —
// not the 6-digit length Supabase defaults to in some setups, so this is
// NOT hardcoded from docs, it's set to match what this project actually sends.
const OTP_LENGTH = 8;

export function Onboarding({ onDone, onGuest }) {
  const [step, setStep] = useState("contact");
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const toggleInterest = (catName) => {
    setInterests((cur) => cur.includes(catName) ? cur.filter((x) => x !== catName) : [...cur, catName]);
  };
  const stepIndex = ONBOARDING_STEPS.indexOf(step);
  const emailLooksValid = emailValid(email);
  const trimmedEmail = email.trim();

  const sendOtp = async () => {
    setLoading(true);
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      setErrorMsg(error.message || "Couldn't send the code. Try again.");
      return;
    }
    setOtpSent(true);
  };

  const verifyOtp = async () => {
    setLoading(true);
    setErrorMsg("");
    const { error } = await supabase.auth.verifyOtp({ email: trimmedEmail, token: otp, type: "email" });
    setLoading(false);
    if (error) {
      setErrorMsg(error.message || "That code didn't work. Check it and try again.");
      return;
    }
    setStep("profile");
  };

  const finishProfile = async (finalName, finalInterests) => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("profiles").update({ name: finalName, interests: finalInterests }).eq("id", session.user.id);
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
      {/* Each step is a <form> so pressing Enter in its input submits the
          same way tapping the primary button would — no extra click needed.
          The primary button lives in a shrink-0 footer below a scrollable
          content area, so it always stays on screen instead of getting
          pushed down by long content (e.g. the interests grid). */}
      {step === "contact" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (loading) return;
            if (!otpSent) { if (emailLooksValid) sendOtp(); }
            else if (otp.length >= OTP_LENGTH) verifyOtp();
          }}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-8 text-2xl leading-tight animate-fade-in-up stagger-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Let's get you in
            </p>
            <div className={`flex items-center gap-2 bg-zinc-50/80 dark:bg-zinc-900/80 border rounded-xl px-3.5 py-3 transition-colors animate-fade-in-up stagger-3 ${otpSent ? "border-zinc-200 dark:border-zinc-800 opacity-60" : "border-zinc-200 dark:border-zinc-800 focus-within:border-zinc-900 dark:focus-within:border-zinc-50 focus-within:ring-1 focus-within:ring-zinc-900/20 dark:focus-within:ring-zinc-50/30"}`}>
              <Mail size={16} className="text-zinc-500 shrink-0" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                disabled={otpSent}
                className="flex-1 min-w-0 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 text-sm outline-none disabled:cursor-not-allowed"
              />
              {otpSent && (
                <button type="button" onClick={() => { setOtpSent(false); setOtp(""); setErrorMsg(""); }} className="text-xs text-zinc-900 dark:text-zinc-50 font-medium shrink-0">Change</button>
              )}
            </div>
            {otpSent && (
              <div className="mt-4 animate-fade-in-up">
                <p className="text-sm text-zinc-500 mb-3">Enter the {OTP_LENGTH}-digit code sent to <span className="text-zinc-700 dark:text-zinc-300">{trimmedEmail}</span>.</p>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                  placeholder={"0".repeat(OTP_LENGTH)}
                  inputMode="numeric"
                  autoFocus
                  className="w-full bg-zinc-50/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-3.5 py-4 text-sm tracking-[0.5em] text-center text-2xl outline-none focus:border-zinc-900 dark:focus:border-zinc-50 focus:ring-1 focus:ring-zinc-900/20 dark:focus:ring-zinc-50/30 mono transition-colors"
                />
                <button type="button" onClick={sendOtp} disabled={loading} className="text-xs text-zinc-500 text-center mt-3 w-full disabled:opacity-50">
                  Didn't get a code? <span className="text-zinc-900 dark:text-zinc-50 font-medium">Resend OTP</span>
                </button>
              </div>
            )}
            {errorMsg && (
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-3 animate-fade-in-up">{errorMsg}</p>
            )}
          </div>
          <div className="shrink-0 pt-4">
            <button
              type="submit"
              disabled={loading || (otpSent ? otp.length < OTP_LENGTH : !emailLooksValid)}
              className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-zinc-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 text-white disabled:text-zinc-500 text-sm font-semibold shadow-lg shadow-zinc-900/10 dark:shadow-black/30 disabled:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 animate-fade-in-up stagger-4"
            >
              {loading ? "Please wait…" : otpSent ? "Verify" : <>Send OTP <ArrowRight size={15} /></>}
            </button>
            <button type="button" onClick={onGuest} className="w-full text-xs text-zinc-500 underline underline-offset-2 mt-4 animate-fade-in-up stagger-6">Browse first, verify later</button>
          </div>
        </form>
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
          </div>
          <div className="shrink-0 pt-4">
            <button type="submit" disabled={!name.trim() || loading} className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-zinc-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 text-white disabled:text-zinc-500 text-sm font-semibold shadow-lg shadow-zinc-900/10 dark:shadow-black/30 disabled:shadow-none active:scale-[0.98] transition-all">
              {loading ? "Please wait…" : "Enter Orbit"}
            </button>
          </div>
        </form>
      )}
      </div>
    </div>
  );
}
