import { useState } from "react";
import { CATEGORIES } from "../data/constants.js";
import { Icon, Input, cx } from "./ui/Primitives.jsx";
import { signInWithGoogle, saveProfile, fetchProfile } from "../lib/authService.js";
import { auth } from "../lib/firebase.js";

// Onboarding, built to the reference layout: a two-pane card floating on a
// neutral field. The left pane is a fixed context column — brand, then
// hairline-separated blocks of "here's how to reach a human", with social
// links pinned to its base. The right pane is the only thing that changes
// between steps: mark, headline, sub, the question, then Go back / Continue.
//
// The reference's second question is a slider ("how large is your company").
// There's no equivalent field on the Orbit profile — the schema stores a
// name and interests, nothing numeric — so rather than invent a question to
// justify a control, that slot is left out. Everything else is 1:1.

/* --------------------------------------------------------------- pieces */

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

// The app mark, at the size the reference uses for its rounded-square logo.
function Mark({ size = 44, radius = "rounded-[12px]" }) {
  return (
    <span
      className={cx("grid place-items-center shrink-0 bg-gradient-to-br from-c-violet via-c-pink to-c-orange", radius)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="none" stroke="white"
           strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" />
        <path d="M10.4 21.9a10 10 0 0 0 9.941-15.416" /><path d="M13.5 2.1a10 10 0 0 0-9.841 15.416" />
      </svg>
    </span>
  );
}

// Left-pane block: title, one line of copy, then the action. Divided by a
// hairline from the next, exactly as in the reference.
function InfoBlock({ title, body, children, last }) {
  return (
    <div className={cx("py-5", !last && "border-b border-line")}>
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="text-base text-ink-2 mt-1 leading-normal">{body}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function InfoLink({ href, children }) {
  return (
    <a
      href={href}
      className="block text-base font-medium text-ink underline underline-offset-[3px] decoration-line
        hover:decoration-ink transition-colors"
    >
      {children}
    </a>
  );
}

// The reference's chip: small, pill, quiet fill, and a dark ring when picked.
function Chip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-base font-medium",
        "transition-[background-color,box-shadow,color] duration-150 active:scale-[0.97]",
        selected
          ? "bg-ink text-bg shadow-[inset_0_0_0_1px_rgb(var(--ink))]"
          : "bg-bg-sunken text-ink hover:bg-black/[0.07] dark:hover:bg-white/[0.12]"
      )}
    >
      {children}
    </button>
  );
}

function GoBack({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 h-11 px-5 rounded-full text-base font-semibold text-ink
        ring-1 ring-line hover:bg-bg-sunken active:scale-[0.98] transition-all duration-150"
    >
      <Icon name="arrow_back" size={18} />Go back
    </button>
  );
}

function Continue({ onClick, disabled, loading, children = "Continue", type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center justify-center gap-2 h-11 px-7 rounded-full text-base font-semibold
        bg-solid text-solid-ink hover:bg-solid-press active:scale-[0.98] transition-all duration-150
        disabled:opacity-40 disabled:pointer-events-none"
    >
      {loading && <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
      {children}
    </button>
  );
}

const SOCIALS = [
  { label: "Instagram", icon: "photo_camera", href: "#" },
  { label: "X", icon: "tag", href: "#" },
  { label: "LinkedIn", icon: "work", href: "#" },
  { label: "YouTube", icon: "smart_display", href: "#" },
  { label: "Email", icon: "mail", href: "mailto:atharvat2006@gmail.com" },
];

/* ----------------------------------------------------------------- flow */

export function Onboarding({ onDone, onGuest }) {
  const [step, setStep] = useState("signin"); // signin → name → interests
  const [name, setName] = useState("");
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const toggle = (n) =>
    setInterests((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));

  const handleGoogle = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const user = await signInWithGoogle();
      if (!user) { setLoading(false); return; } // popup dismissed / redirect handoff
      const existing = await fetchProfile(user.uid);
      if (existing?.name && existing.interests?.length) {
        setLoading(false);
        onDone(existing.name, existing.interests);
        return;
      }
      setName(existing?.name || user.displayName || "");
      setInterests(existing?.interests || []);
      setLoading(false);
      setStep("name");
    } catch (err) {
      setLoading(false);
      setErrorMsg(err?.message || "Couldn't sign in with Google. Try again.");
    }
  };

  const finish = async (finalInterests) => {
    setLoading(true);
    setErrorMsg("");
    const uid = auth?.currentUser?.uid;
    if (uid) {
      try {
        await saveProfile(uid, { name: name.trim(), interests: finalInterests });
      } catch (err) {
        setLoading(false);
        setErrorMsg(err?.message || "Couldn't save your profile. Try again.");
        return;
      }
    }
    setLoading(false);
    onDone(name.trim(), finalInterests);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-bg-sunken">
      <div className="min-h-full w-full flex items-center justify-center p-4 sm:p-8">
        {/* The card. Two panes, one radius, one shadow. */}
        <div className="w-full max-w-[1040px] bg-bg rounded-[20px] shadow-pop overflow-hidden flex flex-col lg:flex-row">

          {/* ---------------- Left: context ---------------- */}
          <div className="lg:w-[350px] shrink-0 bg-bg-sunken lg:bg-bg border-b lg:border-b-0 lg:border-r border-line
            p-6 sm:p-8 flex flex-col">
            <div className="flex items-center gap-3">
              <Mark size={36} radius="rounded-[10px]" />
              <span className="text-xl font-bold text-ink tracking-tight">Orbit</span>
            </div>

            <div className="mt-6 flex-1">
              <InfoBlock
                title="Every club, one place"
                body="Communities, clubs and campus events for Manipal University Jaipur."
              />
              <InfoBlock
                title="Made by students"
                body="Built at MUJ, for MUJ. Tell us what's broken and we'll fix it."
              >
                <InfoLink href="mailto:atharvat2006@gmail.com?subject=Orbit%20feedback">
                  atharvat2006@gmail.com
                </InfoLink>
              </InfoBlock>
              <InfoBlock
                title="Your data"
                body="We store your name and interests. Nothing else, and nothing is sold."
              >
                <span className="inline-flex items-center gap-2 text-base font-medium text-ink">
                  <a href="/privacy" className="underline underline-offset-[3px] decoration-line hover:decoration-ink transition-colors">
                    Privacy
                  </a>
                  <span className="text-ink-3">·</span>
                  <a href="/terms" className="underline underline-offset-[3px] decoration-line hover:decoration-ink transition-colors">
                    Terms
                  </a>
                </span>
              </InfoBlock>
              <InfoBlock
                title="Just looking?"
                body="Browse without an account. Joining and posting need one."
                last
              >
                <button
                  onClick={onGuest}
                  className="inline-flex items-center gap-1.5 text-base font-semibold text-ink
                    underline underline-offset-[3px] decoration-line hover:decoration-ink transition-colors"
                >
                  Continue as guest<Icon name="arrow_forward" size={16} />
                </button>
              </InfoBlock>
            </div>

            <div className="flex items-center gap-4 pt-6">
              {SOCIALS.map((s) => (
                <a key={s.label} href={s.href} aria-label={s.label} title={s.label}
                   className="text-ink-2 hover:text-ink transition-colors">
                  <Icon name={s.icon} size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* ---------------- Right: the step ---------------- */}
          <div className="flex-1 min-w-0 p-6 sm:p-10 lg:p-12 flex flex-col">
            <Mark size={44} />

            {step === "signin" && (
              <div className="mt-6 animate-rise">
                <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                  Welcome to Orbit
                </h1>
                <p className="text-md text-ink-2 mt-2 max-w-md">
                  Sign in with Google — the first sign-in creates your account, so there's nothing separate to register.
                </p>

                <button
                  onClick={handleGoogle}
                  disabled={loading}
                  className="mt-8 inline-flex items-center justify-center gap-3 h-12 px-6 rounded-full
                    text-base font-semibold text-ink ring-1 ring-line bg-bg
                    hover:bg-bg-sunken active:scale-[0.98] transition-all duration-150
                    disabled:opacity-50 disabled:pointer-events-none w-full sm:w-auto"
                >
                  {loading
                    ? <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    : <GoogleMark size={20} />}
                  Continue with Google
                </button>

                {errorMsg && <p className="text-base text-danger mt-4">{errorMsg}</p>}

                <p className="text-base text-ink-2 mt-8 max-w-md leading-relaxed">
                  By continuing you agree to our{" "}
                  <a href="/terms" className="text-ink font-medium underline underline-offset-[3px] decoration-line hover:decoration-ink">Terms</a>
                  {" "}and{" "}
                  <a href="/privacy" className="text-ink font-medium underline underline-offset-[3px] decoration-line hover:decoration-ink">Privacy Policy</a>.
                </p>
              </div>
            )}

            {step === "name" && (
              <form
                className="mt-6 animate-rise flex flex-col flex-1"
                onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep("interests"); }}
              >
                <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                  What should we call you?
                </h1>
                <p className="text-md text-ink-2 mt-2 max-w-md">
                  This is the name on your posts and in community chats.
                </p>

                <div className="mt-8 max-w-md">
                  <label htmlFor="ob-name" className="block text-base font-semibold text-ink mb-2">
                    Display name
                  </label>
                  <Input
                    id="ob-name"
                    autoFocus
                    value={name}
                    maxLength={60}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Atharva T"
                    className="h-12 rounded-full px-5 text-md ring-1 ring-line bg-bg focus:ring-ink border-transparent"
                  />
                  <p className="text-base text-ink-2 mt-2">You can change this later in Settings.</p>
                </div>

                {errorMsg && <p className="text-base text-danger mt-4">{errorMsg}</p>}

                <div className="flex items-center justify-between gap-3 mt-10 pt-2">
                  <GoBack onClick={() => setStep("signin")} />
                  <Continue type="submit" disabled={!name.trim()} />
                </div>
              </form>
            )}

            {step === "interests" && (
              <div className="mt-6 animate-rise flex flex-col flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                  Can you tell us what you're into?
                </h1>
                <p className="text-md text-ink-2 mt-2 max-w-lg">
                  We'll use it to pick which communities show up first. Nothing is hidden from you either way.
                </p>

                <div className="mt-9">
                  <p className="text-base font-semibold text-ink mb-3">What are you interested in?</p>
                  <div className="flex flex-wrap gap-2.5 max-w-2xl">
                    {CATEGORIES.map((cat) => {
                      const on = interests.includes(cat.name);
                      return (
                        <Chip key={cat.name} selected={on} onClick={() => toggle(cat.name)}>
                          <Icon name={cat.msr} size={16} className={on ? "" : cat.tint} />
                          {cat.name}
                        </Chip>
                      );
                    })}
                  </div>
                  <p className="text-base text-ink-2 mt-4">
                    {interests.length === 0
                      ? "Pick as many as you like — or skip and see everything."
                      : <><span className="font-semibold text-ink tabular-nums">{interests.length}</span> selected</>}
                  </p>
                </div>

                {errorMsg && <p className="text-base text-danger mt-4">{errorMsg}</p>}

                <div className="flex items-center justify-between gap-3 mt-10 pt-2">
                  <GoBack onClick={() => setStep("name")} />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => finish([])}
                      disabled={loading}
                      className="h-11 px-4 rounded-full text-base font-semibold text-ink-2 hover:text-ink
                        hover:bg-bg-sunken transition-colors disabled:opacity-40"
                    >
                      Skip
                    </button>
                    <Continue onClick={() => finish(interests)} loading={loading}>
                      {interests.length ? "Enter Orbit" : "Continue"}
                    </Continue>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
