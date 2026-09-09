import { useState } from "react";
import { CATEGORIES } from "../data/constants.js";
import { Icon, Input, cx } from "./ui/Primitives.jsx";
import { signInWithGoogle, saveProfile, fetchProfile } from "../lib/authService.js";
import { auth } from "../lib/firebase.js";

// Onboarding — two-pane card, five steps, sign-in last.
//
// Sign-in moving to the end changes the shape of the flow: there's no uid
// while the questions are being answered, so everything is held in local
// state and written in a single saveProfile once Google returns. Nothing is
// persisted before then, which is also the honest behaviour — abandon it
// halfway and you've left nothing behind.
//
// The cost of asking first is returning users, who shouldn't re-answer four
// screens to get back in. Step one carries a "Sign in" shortcut that jumps
// straight to the last step; if that account already has a profile it goes
// through, and if it doesn't they land back at step one to fill it.
//
// saveProfile is setDoc(merge) on Firestore, so university / year
// are new fields on the existing profile doc — no migration needed.

// Four steps. Phone sat between interests and sign-in: optional, skippable,
// and asking for a number before anyone had an account to attach it to. It
// bought a field almost nobody filled and cost a step everybody had to get
// past.
const STEPS = ["name", "study", "interests", "signin"];

// Orbit is a single-campus product, so university isn't a question — it's a
// fact the step states. A chip group with one option would be asking
// something there is no second answer to.
const UNIVERSITY = "Manipal University Jaipur";

const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "5th year+"];

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

function Mark({ size = 44, radius = "rounded-[12px]" }) {
  return (
    <span
      className={cx("grid place-items-center shrink-0 bg-accent", radius)}
      style={{ width: size, height: size }}
    >
      <img src="/orbitcollege.png" alt="" width={26} height={26} className="object-contain" style={{ width: 26, height: 26 }} />
    </span>
  );
}

function InfoBlock({ title, body, children, last }) {
  return (
    <div className={cx("py-5", !last && "border-b border-line")}>
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="text-base text-ink-2 mt-1 leading-normal">{body}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

// Selected fill per hue. `text-bg` rather than a literal white: the palette
// inverts between themes (c-blue is a deep blue on white and a light blue on
// black), so the label has to follow the page background to stay legible in
// both. Whole class strings so Tailwind's scanner keeps them.
const FILL = {
  "text-c-blue": "bg-c-blue text-bg",
  "text-c-violet": "bg-c-violet text-bg",
  "text-c-pink": "bg-c-pink text-bg",
  "text-c-orange": "bg-c-orange text-bg",
  "text-c-amber": "bg-c-amber text-bg",
  "text-c-green": "bg-c-green text-bg",
  "text-c-teal": "bg-c-teal text-bg",
  "text-c-red": "bg-c-red text-bg",
};

const YEAR_TONES = [
  "text-c-blue", "text-c-violet", "text-c-pink",
  "text-c-orange", "text-c-teal", "text-c-green",
];

// `tone` is the category's own hue. Selected chips take that colour rather
// than all going black — with sixteen of them, a single fill turns the grid
// into an unreadable block, and the colour is already how each category is
// identified everywhere else in the app.
function Chip({ selected, onClick, children, tone }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-base font-medium",
        "transition-[background-color,color,box-shadow] duration-150 active:scale-[0.97]",
        selected
          ? cx(FILL[tone] || "bg-ink text-bg", "shadow-lift")
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

function SkipLink({ onClick, children = "Skip", disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-11 px-4 rounded-full text-base font-semibold text-ink-2 hover:text-ink
        hover:bg-bg-sunken transition-colors disabled:opacity-40"
    >
      {children}
    </button>
  );
}

// Progress. Filled track, in the shape of the reference's slider.
function Progress({ index }) {
  const pct = ((index + 1) / STEPS.length) * 100;
  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-2.5">
        <p className="text-base font-semibold text-ink-2">
          Step <span className="text-ink tabular-nums">{index + 1}</span> of {STEPS.length}
        </p>
      </div>
      <div className="h-1.5 rounded-full bg-bg-sunken overflow-hidden">
        <div
          className="h-full rounded-full bg-ink transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const SOCIALS = [
  { label: "Instagram", icon: "photo_camera", href: "#" },
  { label: "X", icon: "tag", href: "#" },
  { label: "LinkedIn", icon: "work", href: "#" },
  { label: "YouTube", icon: "smart_display", href: "#" },
  { label: "Email", icon: "mail", href: "mailto:team.orbit@gmail.com" },
];

/* ----------------------------------------------------------------- flow */

export function Onboarding({ onDone, onGuest }) {
  const [step, setStep] = useState("name");
  const [returning, setReturning] = useState(false); // jumped straight to sign-in

  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [interests, setInterests] = useState([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const index = STEPS.indexOf(step);
  const go = (s) => { setErrorMsg(""); setStep(s); };
  const toggle = (n) =>
    setInterests((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));

  // Optional, but if something's been typed it should look like a number.

  const finish = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const user = await signInWithGoogle();
      if (!user) { setLoading(false); return; } // popup dismissed / redirect handoff

      const existing = await fetchProfile(user.uid);

      // Came in via the "Sign in" shortcut: nothing was filled, so use what
      // the account already has. If it has nothing, send them to step one.
      if (returning) {
        if (existing?.name) {
          setLoading(false);
          onDone(existing.name, existing.interests || []);
          return;
        }
        setLoading(false);
        setName(user.displayName || "");
        setReturning(false);
        go("name");
        return;
      }

      const finalName = name.trim() || user.displayName || "";
      await saveProfile(user.uid, {
        name: finalName,
        interests,
        university: UNIVERSITY,
        year: year || null,
      });

      setLoading(false);
      onDone(finalName, interests);
    } catch (err) {
      setLoading(false);
      setErrorMsg(err?.message || "Couldn't sign in with Google. Try again.");
    }
  };

  // The campus photo comes in from the step that names the campus onward, so
  // it lands as a response to "you're at MUJ" rather than as decoration that
  // was always there. Scrimmed heavily — it is a backdrop behind a form, and
  // the card has to stay the thing you read.
  const showCampus = index >= 1;

  return (
    <div className="relative flex-1 min-h-0 overflow-y-auto bg-bg-sunken">
      <div
        aria-hidden="true"
        className={cx(
          "fixed inset-0 bg-cover bg-center transition-opacity duration-700 pointer-events-none",
          showCampus ? "opacity-100" : "opacity-0"
        )}
        style={{ backgroundImage: "url('/muj.jpg')" }}
      />
      <div
        aria-hidden="true"
        className={cx(
          "fixed inset-0 pointer-events-none transition-opacity duration-700",
          "bg-bg-sunken/85 dark:bg-bg-sunken/90 backdrop-blur-[2px]",
          showCampus ? "opacity-100" : "opacity-0"
        )}
      />
      <div className="relative min-h-full w-full flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[1040px] bg-bg rounded-[20px] shadow-pop overflow-hidden flex flex-col lg:flex-row">

          {/* ---------------- Left: context ---------------- */}
          <div className="lg:w-[350px] shrink-0 bg-bg-sunken lg:bg-bg border-b lg:border-b-0 lg:border-r border-line p-6 sm:p-8 flex flex-col">
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
                <a
                  href="mailto:team.orbit@gmail.com?subject=Orbit%20feedback"
                  className="block text-base font-medium text-ink underline underline-offset-[3px] decoration-line hover:decoration-ink transition-colors"
                >
                  team.orbit@gmail.com
                </a>
              </InfoBlock>
              <InfoBlock
                title="Your data"
                body="Nothing is saved until you finish. Nothing is sold, ever."
              >
                <span className="inline-flex items-center gap-2 text-base font-medium text-ink">
                  <a href="/privacy" className="underline underline-offset-[3px] decoration-line hover:decoration-ink transition-colors">Privacy</a>
                  <span className="text-ink-3">·</span>
                  <a href="/terms" className="underline underline-offset-[3px] decoration-line hover:decoration-ink transition-colors">Terms</a>
                </span>
              </InfoBlock>
              <InfoBlock
                title="Just looking?"
                body="Browse without an account. Joining and posting need one."
                last
              >
                <button
                  onClick={onGuest}
                  className="inline-flex items-center gap-1.5 text-base font-semibold text-ink underline underline-offset-[3px] decoration-line hover:decoration-ink transition-colors"
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

            <div className="mt-8">
              <Progress index={index} />
            </div>

            {/* 1 — Name */}
            {step === "name" && (
              <form className="animate-rise flex flex-col flex-1"
                    onSubmit={(e) => { e.preventDefault(); if (name.trim()) go("study"); }}>
                <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">What should we call you?</h1>
                <p className="text-md text-ink-2 mt-2 max-w-md">
                  This is the name on your posts and in community chats.
                </p>

                <div className="mt-8 max-w-md">
                  <label htmlFor="ob-name" className="block text-base font-semibold text-ink mb-2">Display name</label>
                  <Input
                    id="ob-name" autoFocus value={name} maxLength={60}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Atharva T"
                    className="h-12 rounded-full px-5 text-md ring-1 ring-line bg-bg focus:ring-ink border-transparent"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 mt-10 pt-2">
                  <button
                    type="button"
                    onClick={() => { setReturning(true); go("signin"); }}
                    className="text-base font-semibold text-ink-2 hover:text-ink underline underline-offset-[3px] decoration-line hover:decoration-ink transition-colors"
                  >
                    Already have an account?
                  </button>
                  <Continue type="submit" disabled={!name.trim()} />
                </div>
              </form>
            )}

            {/* 2 — Study */}
            {step === "study" && (
              <form className="animate-rise flex flex-col flex-1"
                    onSubmit={(e) => { e.preventDefault(); go("interests"); }}>
                <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">What year are you in?</h1>
                <p className="text-md text-ink-2 mt-2 max-w-md">
                  Helps put you alongside people at the same stage.
                </p>

                {/* University is stated, not asked — Orbit is one campus. */}
                <div className="mt-8 max-w-md flex items-center gap-3 rounded-[14px] ring-1 ring-line px-4 py-3.5">
                  <span className="grid place-items-center w-9 h-9 rounded-full bg-c-blue/10 shrink-0">
                    <Icon name="school" size={20} className="text-c-blue" />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block text-base font-semibold text-ink truncate">{UNIVERSITY}</span>
                    <span className="block text-base text-ink-2">Your campus</span>
                  </span>
                  <Icon name="check_circle" size={20} className="text-c-green shrink-0" />
                </div>

                <div className="mt-8">
                  <p className="text-base font-semibold text-ink mb-3">
                    Year <span className="font-normal text-ink-2">· optional</span>
                  </p>
                  <div className="flex flex-wrap gap-2.5 max-w-2xl">
                    {YEARS.map((y, i) => (
                      <Chip
                        key={y}
                        selected={year === y}
                        tone={YEAR_TONES[i % YEAR_TONES.length]}
                        onClick={() => setYear(year === y ? "" : y)}
                      >
                        {y}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 mt-10 pt-2">
                  <GoBack onClick={() => go("name")} />
                  <div className="flex items-center gap-2">
                    <SkipLink onClick={() => { setYear(""); go("interests"); }} />
                    <Continue type="submit" />
                  </div>
                </div>
              </form>
            )}

            {/* 3 — Interests */}
            {step === "interests" && (
              <div className="animate-rise flex flex-col flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">What are you into?</h1>
                <p className="text-md text-ink-2 mt-2 max-w-lg">
                  We'll use it to pick which communities show up first. Nothing is hidden from you either way.
                </p>

                <div className="mt-8">
                  <div className="flex flex-wrap gap-2.5 max-w-2xl">
                    {CATEGORIES.map((cat) => {
                      const on = interests.includes(cat.name);
                      return (
                        <Chip key={cat.name} selected={on} tone={cat.tint} onClick={() => toggle(cat.name)}>
                          <Icon name={cat.msr} size={16} className={on ? "" : cat.tint} />
                          {cat.name}
                        </Chip>
                      );
                    })}
                  </div>
                  <p className="text-base text-ink-2 mt-4">
                    {interests.length === 0
                      ? "Pick as many as you like."
                      : <><span className="font-semibold text-ink tabular-nums">{interests.length}</span> selected</>}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 mt-10 pt-2">
                  <GoBack onClick={() => go("study")} />
                  <div className="flex items-center gap-2">
                    <SkipLink onClick={() => { setInterests([]); go("signin"); }} />
                    <Continue onClick={() => go("signin")} />
                  </div>
                </div>
              </div>
            )}

            {/* 5 — Sign in */}
            {step === "signin" && (
              <div className="animate-rise flex flex-col flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                  {returning ? "Welcome back" : "Last thing, sign in"}
                </h1>
                <p className="text-md text-ink-2 mt-2 max-w-md">
                  {returning
                    ? "Sign in with Google and we'll pick up where you left off."
                    : "Sign in with Google to save your profile. Nothing has been stored until now."}
                </p>

                {/* What's about to be saved. Shown because this is the moment
                    it actually gets written, and it's the last chance to go
                    back and change any of it. */}
                {!returning && (
                  <dl className="mt-7 max-w-md rounded-[14px] ring-1 ring-line divide-y divide-line">
                    {[
                      { k: "Name", v: name.trim() || "Not set", step: "name" },
                      { k: "University", v: UNIVERSITY, step: "study" },
                      { k: "Year", v: year || "Not set", step: "study" },
                      { k: "Interests", v: interests.length ? `${interests.length} selected` : "None", step: "interests" },
                    ].map((row) => (
                      <div key={row.k} className="flex items-center gap-3 px-4 py-3">
                        <dt className="text-base text-ink-2 w-24 shrink-0">{row.k}</dt>
                        <dd className="text-base font-medium text-ink flex-1 min-w-0 truncate">{row.v}</dd>
                        <button
                          type="button"
                          onClick={() => go(row.step)}
                          className="text-base font-semibold text-ink-2 hover:text-ink shrink-0"
                        >
                          Edit
                        </button>
                      </div>
                    ))}
                  </dl>
                )}

                <button
                  onClick={finish}
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

                <p className="text-base text-ink-2 mt-7 max-w-md leading-relaxed">
                  By continuing you agree to our{" "}
                  <a href="/terms" className="text-ink font-medium underline underline-offset-[3px] decoration-line hover:decoration-ink">Terms</a>
                  {" "}and{" "}
                  <a href="/privacy" className="text-ink font-medium underline underline-offset-[3px] decoration-line hover:decoration-ink">Privacy Policy</a>.
                </p>

                <div className="mt-8 pt-2">
                  <GoBack onClick={() => { if (returning) { setReturning(false); go("name"); } else go("interests"); }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
