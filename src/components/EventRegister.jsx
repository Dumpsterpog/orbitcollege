import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import * as db from "../lib/db.js";
import { Icon, Button, Input, cx } from "./ui/Primitives.jsx";
import { Screen } from "./ui/Layout.jsx";

// Event registration: details, then slot and pass, then payment, then the pass
// itself.
//
// Payment happens on CCAvenue, which does not call this app back. So the flow
// is deliberately honest about what it knows: the student enters details, pays
// in a separate tab, and tells us they have. That marks the signup "claimed",
// not "paid". An admin verifies it against the payment report, and only a
// verified signup gets an entry pass.
//
// The chat opens as soon as they claim payment rather than after verification.
// A student who has just paid should not sit outside the group waiting for a
// human, and the cost of being wrong is that someone is briefly in a chat.

const CLUB = "IEI Mechatronics";

const SLOTS = [
  { key: "slot1", label: "12:00 pm to 2:00 pm", short: "Slot 1" },
  { key: "slot2", label: "4:00 pm to 6:00 pm", short: "Slot 2" },
];

// A stag pass is one payment covering four people, and one pass code for all
// of them: the person who registered carries it and brings the other three.
const PASSES = [
  { key: "single", label: "Single pass", people: 1, amount: 189, blurb: "One person." },
  { key: "stag", label: "Stag pass", people: 4, amount: 700, blurb: "Four people on one pass." },
];

const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "Postgraduate", "PhD"];
const REFERRALS = [
  "Instagram", "WhatsApp", "A friend", "A club member", "Posters on campus",
  "Orbit", "LinkedIn", "Somewhere else",
];

const card = "w-full bg-bg-raised rounded-2xl border border-line";
const selectClass =
  "w-full h-11 px-3 rounded bg-bg-sunken text-ink border border-transparent focus:outline-none focus:border-line-strong text-base";

const passOf = (key) => PASSES.find((p) => p.key === key) || PASSES[0];
const slotOf = (key) => SLOTS.find((s) => s.key === key) || null;
const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function Field({ label, hint, optional, children }) {
  return (
    <label className="block">
      <span className="flex items-baseline gap-2 mb-1.5">
        <span className="text-xs font-semibold text-ink-2 uppercase tracking-wide">{label}</span>
        {optional && <span className="text-2xs text-ink-3 normal-case">optional</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-ink-3 mt-1">{hint}</span>}
    </label>
  );
}

function Step({ n, label, state }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={cx(
        "grid place-items-center w-6 h-6 rounded-full text-2xs font-bold shrink-0",
        state === "done" ? "bg-c-green/15 text-c-green"
          : state === "on" ? "bg-accent text-accent-ink"
          : "bg-bg-sunken text-ink-3"
      )}>
        {state === "done" ? <Icon name="check" size={13} /> : n}
      </span>
      <span className={cx("text-xs font-semibold truncate hidden sm:block", state === "idle" ? "text-ink-3" : "text-ink")}>
        {label}
      </span>
    </div>
  );
}

// A choice that reads as a choice: the whole tile is the control, and the one
// that is picked says so without relying on colour alone.
function Choice({ on, onClick, title, sub, right }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        "w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-colors",
        on ? "ring-2 ring-accent bg-accent-wash" : "ring-1 ring-line hover:ring-line-strong"
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-ink">{title}</span>
        {sub && <span className="block text-xs text-ink-2 mt-0.5">{sub}</span>}
      </span>
      {right && <span className="text-base font-bold text-ink shrink-0">{right}</span>}
      <Icon
        name={on ? "check_circle" : "radio_button_unchecked"}
        size={20}
        className={cx("shrink-0", on ? "text-c-green" : "text-ink-3")}
      />
    </button>
  );
}

export function EventRegisterScreen({
  event, payUrl, user, email, authUserId, onSignIn, onBack, onJoinCommunity, onOpenCommunity, onToast,
}) {
  const [signup, setSignup] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paymentOpened, setPaymentOpened] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");
  const [proof, setProof] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [checking, setChecking] = useState(false);

  // Everything before the signup document exists is local: details first, then
  // slot and pass. Once it exists, the document decides what is on screen.
  const [localStep, setLocalStep] = useState("details");

  const [form, setForm] = useState({
    name: user?.name || "",
    college: user?.university || "Manipal University Jaipur",
    regNo: "",
    branch: "",
    year: "",
    phone: "",
    referral: "",
    slot: "",
    passType: "single",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Three companions for a stag pass. The registrant is the fourth and already
  // gave their details on the first step.
  const [team, setTeam] = useState([
    { name: "", regNo: "" },
    { name: "", regNo: "" },
    { name: "", regNo: "" },
  ]);
  const setTeamField = (i, key) => (e) =>
    setTeam((rows) => rows.map((row, idx) => (idx === i ? { ...row, [key]: e.target.value } : row)));

  useEffect(() => {
    if (!authUserId || !event?.id) { setLoaded(true); return; }
    return db.watchMySignup(event.id, authUserId, (s) => { setSignup(s); setLoaded(true); });
  }, [event?.id, authUserId]);

  useEffect(() => {
    if (user?.name && !form.name) setForm((f) => ({ ...f, name: user.name }));
  }, [user?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // An object URL is a live handle into memory; dropping the reference without
  // revoking it leaks the image for the tab's life.
  useEffect(() => () => { if (proofPreview) URL.revokeObjectURL(proofPreview); }, [proofPreview]);

  const attachProof = (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) { setError("That file is not an image."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Screenshots have to be under 5 MB."); return; }
    setError("");
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProof(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const stage = !signup
    ? localStep
    : signup.status === "pending_payment" ? "payment" : "done";

  const chosenPass = passOf(form.passType);
  const chosenSlot = slotOf(form.slot);

  // What the scanner reads. Versioned so a future change to the format can be
  // told apart from this one, and carrying the ids the admin tool needs to find
  // the signup without a lookup table.
  const passPayload = `orbit:v1:${event?.id || ""}:${authUserId || ""}:${signup?.passCode || ""}`;

  const submitDetails = () => {
    const name = form.name.trim();
    if (!name) { setError("Please enter your full name."); return; }
    if (!form.college.trim()) { setError("Please enter your college."); return; }
    if (!form.regNo.trim()) { setError("Please enter your college registration number."); return; }
    if (!form.year) { setError("Please pick your year of study."); return; }
    // Required: the club needs a way to reach someone on the day, and email
    // is not it when the queue is moving.
    const digits = form.phone.replace(/\D/g, "");
    if (!digits) { setError("Please enter a phone number so the club can reach you."); return; }
    if (digits.length < 10) { setError("That phone number looks too short."); return; }
    if (digits.length > 13) { setError("That phone number looks too long."); return; }

    setError("");
    setChecking(true);
  };

  const confirmDetails = () => {
    setChecking(false);
    setLocalStep("options");
  };

  const submitOptions = async () => {
    if (!form.slot) { setError("Pick the slot you want to attend."); return; }

    const members = form.passType === "stag"
      ? team.map((row) => ({ name: row.name.trim(), regNo: row.regNo.trim() }))
      : [];
    if (form.passType === "stag" && members.some((m) => !m.name || !m.regNo)) {
      setError("A stag pass covers four people. Add the other three names and registration numbers.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      await db.createSignup(event.id, authUserId, {
        name: form.name.trim(),
        college: form.college.trim(),
        regNo: form.regNo.trim(),
        branch: form.branch.trim(),
        year: form.year,
        phone: form.phone.replace(/[^0-9+]/g, ""),
        referral: form.referral,
        eventTitle: event.title || "",
        email: email || "",
        slot: form.slot,
        slotLabel: chosenSlot?.label || "",
        passType: form.passType,
        passLabel: chosenPass.label,
        people: chosenPass.people,
        amount: chosenPass.amount,
        participants: members,
      });
    } catch (err) {
      console.error("[orbit] signup failed", err);
      setError(err?.code === "permission-denied"
        ? "Registration was refused. Publish the latest firestore.rules, then try again."
        : "Could not save your details. Try again.");
    }
    setBusy(false);
  };

  const openPayment = () => {
    setPaymentOpened(true);
    window.open(payUrl, "_blank", "noopener,noreferrer");
  };

  const confirmPaid = async () => {
    if (!proof) { setError("Attach the payment screenshot so the club can check it."); return; }
    setBusy(true);
    setError("");
    try {
      const { url, path } = await db.uploadPaymentProof(authUserId, proof);
      await db.markPaymentClaimed(event.id, authUserId, {
        paymentRef: paymentRef.trim() || null,
        proofUrl: url,
        proofPath: path,
      });
      await onJoinCommunity?.(event);
      onToast?.("You are in. The event chat is open.");
    } catch (err) {
      console.error("[orbit] payment claim failed", err);
      setError(err?.code === "storage/unauthorized"
        ? "The upload was refused by Storage. Tell the club, and try the reference number instead."
        : "Could not record that. Try again.");
    }
    setBusy(false);
  };

  if (!event) {
    return (
      <Screen>
        <div className="w-full max-w-[760px] mx-auto px-3 sm:px-6 py-10 text-center">
          <p className="text-lg font-bold text-ink">Event not found</p>
          <p className="text-base text-ink-2 mt-2">It may have been removed.</p>
          <Button tone="blue" className="mt-6" onClick={onBack}>Back to events</Button>
        </div>
      </Screen>
    );
  }

  if (!authUserId) {
    return (
      <Screen>
        <div className="w-full max-w-[560px] mx-auto px-3 sm:px-6 py-10">
          <div className={cx(card, "p-6 sm:p-8 text-center")}>
            <span className="grid place-items-center w-14 h-14 rounded-full bg-bg-sunken mx-auto mb-4">
              <Icon name="lock" size={26} className="text-c-violet" />
            </span>
            <h1 className="text-xl font-bold text-ink">Sign in to register</h1>
            <p className="text-base text-ink-2 mt-2 leading-relaxed">
              Registering for {event.title} takes a minute. Sign in with Google first so your pass and the
              event chat stay attached to your account.
            </p>
            <Button tone="blue" size="lg" className="w-full mt-6" onClick={onSignIn}>Sign in with Google</Button>
          </div>
        </div>
      </Screen>
    );
  }

  const stagOnFile = signup?.passType === "stag";
  const peopleOnFile = signup?.people || passOf(signup?.passType).people;

  return (
    <Screen>
      <div className="w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 grid justify-center gap-6
        grid-cols-1 max-w-[1420px] lg:grid-cols-[minmax(0,760px)_360px]">
        <div className="min-w-0 flex flex-col gap-3 sm:gap-4">
          <div className={cx(card, "px-3 sm:px-4 h-14 flex items-center gap-2")}>
            <button onClick={onBack} aria-label="Back"
                    className="grid place-items-center w-9 h-9 rounded-full text-ink-2 hover:bg-bg-sunken hover:text-ink transition-colors">
              <Icon name="arrow_back" size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-ink truncate">{event.title}</p>
              <p className="text-xs text-ink-3 truncate">{event.when}{event.where ? ` · ${event.where}` : ""}</p>
            </div>
          </div>

          <div className={cx(card, "px-4 py-3 flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar")}>
            <Step n={1} label="Your details" state={stage === "details" ? "on" : "done"} />
            <span className="h-px flex-1 min-w-[12px] bg-line" />
            <Step n={2} label="Slot and pass"
                  state={stage === "options" ? "on" : stage === "details" ? "idle" : "done"} />
            <span className="h-px flex-1 min-w-[12px] bg-line" />
            <Step n={3} label="Payment"
                  state={stage === "payment" ? "on" : stage === "done" ? "done" : "idle"} />
            <span className="h-px flex-1 min-w-[12px] bg-line" />
            <Step n={4} label="Your pass" state={stage === "done" ? "done" : "idle"} />
          </div>

          {!loaded ? (
            <div className={cx(card, "p-10 grid place-items-center")}>
              <span className="w-6 h-6 rounded-full border-2 border-ink border-t-transparent animate-spin" />
            </div>
          ) : stage === "details" ? (
            <section className={cx(card, "p-4 sm:p-6")}>
              <h1 className="text-xl font-bold text-ink">Register for {event.title}</h1>
              <p className="text-base text-ink-2 mt-1 leading-relaxed">
                We need a few details for your entry pass. The slot and pass come next.
              </p>

              <div className="grid gap-3.5 mt-4">
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Field label="Full name">
                    <Input value={form.name} maxLength={120} onChange={set("name")} placeholder="As it should appear on your pass" className="h-11" />
                  </Field>
                  <Field label="Registration number">
                    <Input value={form.regNo} maxLength={40} onChange={set("regNo")} placeholder="Your college registration number" className="h-11" />
                  </Field>
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Field label="College">
                    <Input value={form.college} maxLength={120} onChange={set("college")} className="h-11" />
                  </Field>
                  <Field label="Branch or course" optional>
                    <Input value={form.branch} maxLength={80} onChange={set("branch")} placeholder="e.g. CSE" className="h-11" />
                  </Field>
                </div>
                <div className="grid gap-3.5 sm:grid-cols-3">
                  <Field label="Year">
                    <select value={form.year} onChange={set("year")} className={selectClass}>
                      <option value="">Select year</option>
                      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </Field>
                  <Field label="Phone">
                    <Input value={form.phone} maxLength={15} inputMode="tel" onChange={set("phone")} placeholder="10 digit number" className="h-11" />
                  </Field>
                  <Field label="Heard from" optional>
                    <select value={form.referral} onChange={set("referral")} className={selectClass}>
                      <option value="">Prefer not to say</option>
                      {REFERRALS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Field>
                </div>
              </div>

              {error && <p className="text-base text-c-red mt-4 leading-relaxed">{error}</p>}

              <Button tone="blue" size="lg" className="w-full mt-5" onClick={submitDetails}>
                Next: slot and pass
              </Button>

              {checking && (
                <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-fade-in"
                     onClick={() => setChecking(false)}>
                  <div onClick={(e) => e.stopPropagation()}
                       className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto bg-bg-raised rounded-t-2xl sm:rounded-2xl shadow-pop animate-pop">
                    <div className="p-5 sm:p-6">
                      <h2 className="text-lg font-bold text-ink">Are these right?</h2>
                      <p className="text-base text-ink-2 mt-1 leading-relaxed">
                        {CLUB} matches your payment to these details. If the name or registration number is
                        wrong, your pass cannot be confirmed.
                      </p>

                      <dl className="mt-4 rounded-xl bg-bg-sunken px-4 py-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-base">
                        <dt className="text-ink-3">Name</dt>
                        <dd className="text-ink text-right break-words">{form.name.trim()}</dd>
                        <dt className="text-ink-3">Registration no.</dt>
                        <dd className="text-ink text-right font-mono text-xs break-words">{form.regNo.trim()}</dd>
                        <dt className="text-ink-3">College</dt>
                        <dd className="text-ink text-right break-words">{form.college.trim()}</dd>
                        <dt className="text-ink-3">Year</dt>
                        <dd className="text-ink text-right">{form.year}</dd>
                        <dt className="text-ink-3">Phone</dt>
                        <dd className="text-ink text-right tabular-nums">{form.phone}</dd>
                        {email && (<>
                          <dt className="text-ink-3">Email</dt>
                          <dd className="text-ink text-right break-all text-xs">{email}</dd>
                        </>)}
                      </dl>

                      <div className="grid gap-2 sm:grid-cols-2 mt-5">
                        <Button variant="soft" size="lg" onClick={() => setChecking(false)}>
                          Change something
                        </Button>
                        <Button tone="blue" size="lg" onClick={confirmDetails}>
                          Yes, continue
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : stage === "options" ? (
            <section className={cx(card, "p-4 sm:p-5")}>
              <h1 className="text-xl font-bold text-ink">Pick your slot and pass</h1>
              <p className="text-base text-ink-2 mt-0.5">Both slots cover the same workshop.</p>

              <div className="mt-4">
                <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2">Slot</p>
                <div className="flex flex-col gap-2">
                  {SLOTS.map((s) => (
                    <Choice
                      key={s.key}
                      on={form.slot === s.key}
                      onClick={() => setForm((f) => ({ ...f, slot: s.key }))}
                      title={s.short}
                      sub={s.label}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2">Pass</p>
                <div className="flex flex-col gap-2">
                  {PASSES.map((p) => (
                    <Choice
                      key={p.key}
                      on={form.passType === p.key}
                      onClick={() => setForm((f) => ({ ...f, passType: p.key }))}
                      title={`${p.label}${p.people > 1 ? ` (${p.people})` : ""}`}
                      sub={p.blurb}
                      right={rupees(p.amount)}
                    />
                  ))}
                </div>
              </div>

              {form.passType === "stag" && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide">Who else is coming</p>
                  <p className="text-xs text-ink-3 mt-0.5 mb-2">
                    You are the first of four. One pass covers all of you.
                  </p>
                  <div className="flex flex-col gap-2">
                    {team.map((row, i) => (
                      <div key={i} className="grid gap-2 sm:grid-cols-[1fr_180px]">
                        <Input
                          value={row.name}
                          maxLength={120}
                          onChange={setTeamField(i, "name")}
                          placeholder={`Person ${i + 2} full name`}
                          className="h-10"
                        />
                        <Input
                          value={row.regNo}
                          maxLength={40}
                          onChange={setTeamField(i, "regNo")}
                          placeholder="Registration number"
                          className="h-10"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-3">
                <span className="text-base text-ink-2">Total to pay</span>
                <span className="text-xl font-bold text-ink tabular-nums">{rupees(chosenPass.amount)}</span>
              </div>

              {error && <p className="text-base text-c-red mt-4 leading-relaxed">{error}</p>}

              <div className="grid gap-2 sm:grid-cols-[auto_1fr] mt-4">
                <Button variant="soft" size="lg" onClick={() => { setError(""); setLocalStep("details"); }}>
                  Back
                </Button>
                <Button tone="blue" size="lg" onClick={submitOptions} disabled={busy} loading={busy}>
                  Next: payment
                </Button>
              </div>
            </section>
          ) : stage === "payment" ? (
            <section className={cx(card, "p-4 sm:p-6")}>
              <h1 className="text-xl font-bold text-ink">Pay to confirm your place</h1>
              <p className="text-base text-ink-2 mt-1 leading-relaxed">
                Run by {CLUB}. Payment opens in a new tab on CCAvenue. Pay there, then come back and confirm.
              </p>

              <dl className="mt-5 rounded-xl bg-bg-sunken px-4 py-3.5 grid grid-cols-2 gap-y-2.5 text-base">
                <dt className="text-ink-3">Slot</dt>
                <dd className="text-ink text-right">{signup.slotLabel || slotOf(signup.slot)?.label || "—"}</dd>
                <dt className="text-ink-3">Pass</dt>
                <dd className="text-ink text-right">
                  {signup.passLabel || passOf(signup.passType).label}
                  {peopleOnFile > 1 ? ` · ${peopleOnFile} people` : ""}
                </dd>
                <dt className="text-ink-3">Club</dt>
                <dd className="text-ink text-right">{CLUB}</dd>
                <dt className="text-ink font-semibold">Amount</dt>
                <dd className="text-ink text-right font-bold tabular-nums">
                  {rupees(signup.amount || passOf(signup.passType).amount)}
                </dd>
              </dl>

              <Button tone="blue" size="lg" className="w-full mt-4" onClick={openPayment}>
                <Icon name="open_in_new" size={17} className="mr-1.5" />
                Open the payment page
              </Button>

              <div className="mt-4 pt-4 border-t border-line">
                <p className="text-base font-semibold text-ink">Paid? Show us the screenshot</p>
                <p className="text-xs text-ink-2 mt-1 leading-relaxed">
                  CCAvenue tells Orbit nothing, so the screenshot is what {CLUB} checks your payment against.
                  Attach it and the event chat opens straight away.
                </p>

                <div className="grid gap-2.5 sm:grid-cols-[auto_1fr] mt-3">
                  <label className={cx(
                    "relative grid place-items-center w-full sm:w-[104px] h-[104px] rounded-xl cursor-pointer overflow-hidden transition-colors",
                    proofPreview ? "ring-1 ring-line" : "bg-bg-sunken ring-1 ring-dashed ring-line-strong hover:ring-accent"
                  )}>
                    {proofPreview ? (
                      <>
                        <img src={proofPreview} alt="Payment screenshot" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 grid place-items-center w-6 h-6 rounded-full bg-black/60 text-white">
                          <Icon name="edit" size={13} />
                        </span>
                      </>
                    ) : (
                      <span className="flex flex-col items-center gap-1 text-ink-3">
                        <Icon name="photo_camera" size={20} />
                        <span className="text-2xs font-semibold">Attach</span>
                      </span>
                    )}
                    <input type="file" accept="image/*" className="hidden"
                           onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; attachProof(f); }} />
                  </label>

                  <div className="min-w-0">
                    <Field label="Payment reference" optional hint="The CCAvenue order id, if you have it.">
                      <Input
                        value={paymentRef}
                        maxLength={60}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="e.g. 1234567890"
                        className="h-11"
                      />
                    </Field>
                    {proof && (
                      <p className="text-xs text-ink-3 mt-1.5 truncate">
                        {proof.name} · {(proof.size / 1024).toFixed(0)} KB
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  variant={proof ? "primary" : "soft"}
                  tone={proof ? "blue" : undefined}
                  size="lg"
                  className="w-full mt-3"
                  onClick={confirmPaid}
                  disabled={busy}
                  loading={busy}
                >
                  {busy ? "Sending…" : "Submit screenshot and join the chat"}
                </Button>
              </div>

              {error && <p className="text-base text-c-red mt-4 leading-relaxed">{error}</p>}
            </section>
          ) : (
            <section className={cx(card, "p-4 sm:p-6")}>
              <div className="flex items-start gap-3">
                <span className={cx("grid place-items-center w-11 h-11 rounded-full shrink-0",
                  signup.status === "verified" ? "bg-c-green/15" : "bg-c-amber/15")}>
                  <Icon name={signup.status === "verified" ? "check_circle" : "schedule"} size={22}
                        className={signup.status === "verified" ? "text-c-green" : "text-c-amber"} />
                </span>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-ink">
                    {signup.status === "verified" ? "You are confirmed" : "Payment recorded"}
                  </h1>
                  <p className="text-base text-ink-2 mt-1 leading-relaxed">
                    {signup.status === "verified"
                      ? "Your place is confirmed. Show the pass below at the entrance."
                      : `${CLUB} is checking your payment against the report. Your entry pass appears here once it is confirmed, usually within a day.`}
                  </p>
                </div>
              </div>

              {signup.passCode && (
                <div className="mt-5 p-5 rounded-xl bg-bg-sunken text-center">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-ink-3">Entry pass</p>
                  {/* White plate behind the code on purpose: a scanner reading a
                      dark-theme screen needs the quiet zone and the contrast. */}
                  <div className="mt-3 inline-block p-3 bg-white rounded-xl">
                    <QRCodeSVG value={passPayload} size={168} level="M" includeMargin={false} />
                  </div>
                  <p className="text-xl font-bold text-ink tracking-[0.2em] mt-3">{signup.passCode}</p>
                  <p className="text-xs text-ink-2 mt-2 leading-relaxed">
                    {peopleOnFile > 1
                      ? `One pass for all ${peopleOnFile} of you. Arrive together and show this once.`
                      : "Show this at the entrance. If the scanner will not read it, they can type the code."}
                  </p>
                </div>
              )}

              <div className="mt-5 pt-5 border-t border-line grid gap-2 sm:grid-cols-2">
                <Button tone="blue" size="lg" onClick={() => onOpenCommunity?.(event)}>Open event chat</Button>
                <Button variant="soft" size="lg" onClick={onBack}>Back to events</Button>
              </div>

              <dl className="mt-5 pt-5 border-t border-line grid grid-cols-2 gap-y-3 text-base">
                <dt className="text-ink-3">Name</dt><dd className="text-ink text-right">{signup.name}</dd>
                <dt className="text-ink-3">Slot</dt>
                <dd className="text-ink text-right">{signup.slotLabel || slotOf(signup.slot)?.label || "—"}</dd>
                <dt className="text-ink-3">Pass</dt>
                <dd className="text-ink text-right">
                  {signup.passLabel || passOf(signup.passType).label}
                  {signup.amount ? ` · ${rupees(signup.amount)}` : ""}
                </dd>
                <dt className="text-ink-3">College</dt><dd className="text-ink text-right break-words">{signup.college}</dd>
                {signup.regNo && (<><dt className="text-ink-3">Registration no.</dt><dd className="text-ink text-right font-mono text-xs">{signup.regNo}</dd></>)}
                {(signup.email || email) && (<><dt className="text-ink-3">Email</dt><dd className="text-ink text-right break-all text-xs">{signup.email || email}</dd></>)}
                <dt className="text-ink-3">Year</dt><dd className="text-ink text-right">{signup.year}</dd>
                {signup.branch && <><dt className="text-ink-3">Branch</dt><dd className="text-ink text-right">{signup.branch}</dd></>}
              </dl>

              {signup.proofUrl && (
                <div className="mt-5 pt-5 border-t border-line">
                  <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2.5">Payment screenshot</p>
                  <a href={signup.proofUrl} target="_blank" rel="noopener noreferrer"
                     className="block w-full max-w-[220px] rounded-xl overflow-hidden ring-1 ring-line hover:ring-line-strong transition-colors">
                    <img src={signup.proofUrl} alt="Your payment screenshot" className="w-full block" />
                  </a>
                </div>
              )}

              {stagOnFile && signup.participants?.length > 0 && (
                <div className="mt-5 pt-5 border-t border-line">
                  <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2.5">Coming with you</p>
                  <div className="flex flex-col gap-2">
                    {signup.participants.map((m, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 text-base">
                        <span className="text-ink truncate">{m.name}</span>
                        <span className="text-ink-3 font-mono text-xs shrink-0">{m.regNo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="hidden lg:block h-full">
          <div className="sticky top-6 flex flex-col gap-4">
            <section className={cx(card, "p-3.5 flex items-start gap-3")}>
              <span className="w-16 h-[88px] rounded-xl overflow-hidden bg-bg-sunken shrink-0">
                <img src="/poster.jpg" alt={event.title} className="w-full h-full object-cover" />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[14px] font-bold text-ink truncate">{event.title}</span>
                <span className="flex items-center gap-1.5 text-xs text-ink-2 mt-1.5">
                  <Icon name="schedule" size={13} className="text-ink-3 shrink-0" />{event.when}
                </span>
                {event.where && (
                  <span className="flex items-start gap-1.5 text-xs text-ink-2 mt-1">
                    <Icon name="location_on" size={13} className="text-c-pink shrink-0 mt-0.5" />
                    <span className="min-w-0 break-words">{event.where}</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-ink-3 mt-1">
                  <Icon name="group" size={13} className="shrink-0" />Run by {CLUB}
                </span>
              </span>
            </section>

            <section className={cx(card, "p-3.5")}>
              <div className="flex items-center gap-2 mb-2">
                <Icon name="confirmation_number" size={16} className="text-c-green" />
                <h3 className="text-[13px] font-bold text-ink tracking-tight">Passes</h3>
              </div>
              <div className="flex flex-col gap-1.5">
                {PASSES.map((p) => (
                  <div key={p.key} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-ink-2 min-w-0 truncate">
                      {p.label}{p.people > 1 ? ` (${p.people})` : ""}
                    </span>
                    <span className="text-ink font-semibold tabular-nums shrink-0">{rupees(p.amount)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink-3 mt-2 leading-relaxed">
                A stag pass is one payment and one QR for four people.
              </p>
            </section>

            <section className={cx(card, "p-3.5")}>
              <div className="flex items-center gap-2 mb-2">
                <Icon name="info" size={16} className="text-c-blue" />
                <h3 className="text-[13px] font-bold text-ink tracking-tight">How this works</h3>
              </div>
              <ol className="flex flex-col gap-1.5 text-xs text-ink-2 leading-relaxed">
                <li className="flex gap-2"><span className="text-ink-3 font-mono">1</span>Your details.</li>
                <li className="flex gap-2"><span className="text-ink-3 font-mono">2</span>Slot and pass.</li>
                <li className="flex gap-2"><span className="text-ink-3 font-mono">3</span>Pay on CCAvenue, in a new tab.</li>
                <li className="flex gap-2"><span className="text-ink-3 font-mono">4</span>{CLUB} confirms it, your QR appears here.</li>
              </ol>
            </section>
          </div>
        </aside>
      </div>
    </Screen>
  );
}
