import { useState } from "react";
import { Check, ChevronLeft, ArrowRight } from "lucide-react";
import { CATEGORIES } from "../data/constants.js";
import { Button, Input, Field, Logo, Badge, SectionLabel, cx } from "./ui/Primitives.jsx";
import { signInWithGoogle, saveProfile, fetchProfile } from "../lib/authService.js";
import { auth } from "../lib/firebase.js";

// Sign-in / first-run setup, rebuilt on the token system.
//
// Two panes on desktop: a quiet brand column and the actual form. The old
// version centred a single narrow phone card at every width, which on a wide
// monitor left one small box floating in a field of empty background — the
// screenshot that started this rebuild. Below lg it collapses back to the
// single column, which is the right shape for a phone.
//
// Google is the only sign-in method, so "log in" and "register" are one
// action: a uid Firebase hasn't seen gets a profile document on first sight.

function GoogleMark({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

const HIGHLIGHTS = [
  "Every club and community on campus, in one place",
  "Events you can actually find and register for",
  "Anonymous confessions, moderated and time-limited",
];

export function Onboarding({ onDone, onGuest }) {
  const [step, setStep] = useState("signin");
  const [name, setName] = useState("");
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const toggleInterest = (catName) =>
    setInterests((cur) => (cur.includes(catName) ? cur.filter((x) => x !== catName) : [...cur, catName]));

  const handleGoogle = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const user = await signInWithGoogle();
      // null = popup dismissed, or we handed off to a full-page redirect.
      if (!user) { setLoading(false); return; }
      // A returning user already chose these; don't make them redo it.
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
    const uid = auth?.currentUser?.uid;
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
    <div className="flex-1 min-h-0 flex bg-surface">
      {/* Brand column — desktop only. Deliberately static and quiet: it's
          context, not something competing with the form for attention. */}
      <aside className="hidden lg:flex flex-col justify-between w-[44%] max-w-lg shrink-0 border-r border-line bg-surface-subtle p-10">
        <Logo size={22} />
        <div className="space-y-5">
          <h1 className="text-3xl font-semibold text-content" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Every club.<br />Every community.<br />One platform.
          </h1>
          <ul className="space-y-2.5">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-start gap-2.5 text-sm text-content-secondary">
                <Check size={14} className="text-accent mt-0.5 shrink-0" />
                {h}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-2xs text-content-faint">Built for Manipal University Jaipur.</p>
      </aside>

      {/* Form column */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        <header className="flex items-center justify-between px-6 lg:px-10 py-5 shrink-0">
          <div className="lg:hidden"><Logo size={20} /></div>
          <div className="hidden lg:block" />
          <Badge tone="neutral">Testing phase</Badge>
        </header>

        <div className="flex-1 flex flex-col justify-center px-6 lg:px-10 pb-10 max-w-md w-full mx-auto">
          {step === "signin" && (
            <div className="animate-fade-in-up">
              <h2 className="text-2xl font-semibold text-content" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Sign in to Orbit
              </h2>
              <p className="text-sm text-content-muted mt-2 mb-7">
                Continue with Google — your first sign-in creates the account, so there's no separate registration.
              </p>

              <Button variant="secondary" size="lg" onClick={handleGoogle} loading={loading} className="w-full">
                {!loading && <GoogleMark size={16} />}
                Continue with Google
              </Button>

              {errorMsg && <p className="text-xs text-danger mt-3">{errorMsg}</p>}

              <div className="flex items-center gap-3 my-6">
                <div className="h-px flex-1 bg-line" />
                <span className="text-2xs text-content-faint uppercase tracking-wider">or</span>
                <div className="h-px flex-1 bg-line" />
              </div>

              <Button variant="ghost" size="md" onClick={onGuest} className="w-full">
                Browse as guest
              </Button>
              <p className="text-2xs text-content-faint text-center mt-2.5">
                You can look around, but joining, posting and chat need an account.
              </p>

              <p className="text-2xs text-content-faint mt-8 text-center">
                By continuing you agree to our{" "}
                <a href="/terms" className="text-content-secondary underline underline-offset-2 hover:text-content">Terms</a>
                {" "}and{" "}
                <a href="/privacy" className="text-content-secondary underline underline-offset-2 hover:text-content">Privacy Policy</a>.
              </p>
            </div>
          )}

          {step === "profile" && (
            <form
              className="animate-fade-in-up"
              onSubmit={(e) => { e.preventDefault(); if (name.trim() && !loading) finishProfile(name.trim(), interests); }}
            >
              <button
                type="button"
                onClick={() => setStep("signin")}
                className="inline-flex items-center gap-1 text-xs text-content-muted hover:text-content mb-4 transition-colors"
              >
                <ChevronLeft size={13} />Back
              </button>

              <h2 className="text-2xl font-semibold text-content" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Set up your profile
              </h2>
              <p className="text-sm text-content-muted mt-2 mb-6">Two quick things, then you're in.</p>

              <Field label="Display name" htmlFor="ob-name">
                <Input
                  id="ob-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={60}
                  autoFocus
                />
              </Field>

              <div className="flex items-baseline justify-between mt-6 mb-1">
                <SectionLabel>What are you into?</SectionLabel>
                <button
                  type="button"
                  onClick={() => finishProfile(name.trim(), [])}
                  disabled={!name.trim() || loading}
                  className="text-2xs text-content-muted hover:text-content disabled:opacity-40 transition-colors"
                >
                  Skip
                </button>
              </div>
              <p className="text-2xs text-content-faint mb-3">
                Personalizes your feed. Skip to see everything instead.
              </p>

              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORIES.map((cat) => {
                  const selected = interests.includes(cat.name);
                  const Icon = cat.icon;
                  return (
                    <button
                      type="button"
                      key={cat.name}
                      onClick={() => toggleInterest(cat.name)}
                      aria-pressed={selected}
                      className={cx(
                        "flex items-center gap-2 h-9 px-2.5 rounded border text-left transition-colors",
                        selected
                          ? "border-line-strong bg-surface-inset text-content"
                          : "border-line text-content-secondary hover:border-line-strong hover:text-content"
                      )}
                    >
                      <Icon size={14} className={cx("shrink-0", selected ? "text-accent" : "text-content-faint")} />
                      <span className="text-xs font-medium truncate">{cat.name}</span>
                      {selected && <Check size={12} className="ml-auto shrink-0 text-accent" />}
                    </button>
                  );
                })}
              </div>

              {errorMsg && <p className="text-xs text-danger mt-3">{errorMsg}</p>}

              <Button type="submit" variant="primary" size="lg" disabled={!name.trim()} loading={loading} className="w-full mt-6">
                Enter Orbit <ArrowRight size={15} />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
