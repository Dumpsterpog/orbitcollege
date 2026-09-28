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
        "w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-colors",
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
  event, payUrl, user, authUserId, onSignIn, onBack, onJoinCommunity, onOpenCommunity, onToast,
}) {
  const [signup, setSignup] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paymentOpened, setPaymentOpened] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");

  // Everything before the signup document exists is local: details first, then
  // slot and pass. Once it exists, the document decides what is on screen.
  const [localStep, setLocalStep] = useState("details");

  const [form, setForm] = useState({
    name: user?.name || "",
    college: user?.university || "Manipal University Jaipur",
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
    if (!form.year) { setError("Please pick your year of study."); return; }
    // Required: the club needs a way to reach someone on the day, and email
    // is not it when the queue is moving.
    const digits = form.phone.replace(/\D/g, "");
    if (!digits) { setError("Please enter a phone number so the club can reach you."); return; }
    if (digits.length < 10) { setError("That phone number looks too short."); return; }
    if (digits.length > 13) { setError("That phone number looks too long."); return; }

    setError("");
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
        branch: form.branch.trim(),
        year: form.year,
        phone: form.phone.replace(/[^0-9+]/g, ""),
        referral: form.referral,
        eventTitle: event.title || "",
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
    setBusy(true);
    setError("");
    try {
      await db.markPaymentClaimed(event.id, authUserId, paymentRef.trim() || null);
      await onJoinCommunity?.(event);
      onToast?.("You are in. The event chat is open.");
    } catch (err) {
      console.error("[orbit] payment claim failed", err);
      setError("Could not record that. Try again.");
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

          <div className={cx(card, "p-4 flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar")}>
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

              <div className="grid gap-4 mt-5">
                <Field label="Full name">
                  <Input value={form.name} maxLength={120} onChange={set("name")} placeholder="As it should appear on your pass" className="h-11" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="College">
                    <Input value={form.college} maxLength={120} onChange={set("college")} className="h-11" />
                  </Field>
                  <Field label="Branch or course" optional>
                    <Input value={form.branch} maxLength={80} onChange={set("branch")} placeholder="e.g. CSE" className="h-11" />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Year of study">
                    <select value={form.year} onChange={set("year")} className={selectClass}>
                      <option value="">Select year</option>
                      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </Field>
                  <Field label="Phone" hint="The club calls this number if anything changes on the day.">
                    <Input value={form.phone} maxLength={15} inputMode="tel" onChange={set("phone")} placeholder="10 digit number" className="h-11" />
                  </Field>
                </div>
                <Field label="Where did you hear about this?" optional>
                  <select value={form.referral} onChange={set("referral")} className={selectClass}>
                    <option value="">Prefer not to say</option>
                    {REFERRALS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
              </div>

              {error && <p className="text-base text-c-red mt-4 leading-relaxed">{error}</p>}

              <Button tone="blue" size="lg" className="w-full mt-5" onClick={submitDetails}>
                Next: slot and pass
              </Button>
            </section>
          ) : stage === "options" ? (
            <section className={cx(card, "p-4 sm:p-6")}>
              <h1 className="text-xl font-bold text-ink">Pick your slot and pass</h1>
              <p className="text-base text-ink-2 mt-1 leading-relaxed">
                Both slots cover the same workshop. Choose the one you can make.
              </p>

              <div className="mt-5">
                <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2">Slot</p>
                <div className="flex flex-col gap-2.5">
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

              <div className="mt-6">
                <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2">Pass</p>
                <div className="flex flex-col gap-2.5">
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
                <div className="mt-6">
                  <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide">Who else is coming</p>
                  <p className="text-xs text-ink-3 mt-1 mb-3 leading-relaxed">
                    You are the first of four. Add the other three, with their college registration numbers.
                    One pass covers all of you, and it belongs to you.
                  </p>
                  <div className="flex flex-col gap-3">
                    {team.map((row, i) => (
                      <div key={i} className="grid gap-2.5 sm:grid-cols-[1fr_180px]">
                        <Input
                          value={row.name}
                          maxLength={120}
                          onChange={setTeamField(i, "name")}
                          placeholder={`Person ${i + 2} full name`}
                          className="h-11"
                        />
                        <Input
                          value={row.regNo}
                          maxLength={40}
                          onChange={setTeamField(i, "regNo")}
                          placeholder="Registration number"
                          className="h-11"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-line flex items-center justify-between gap-3">
                <span className="text-base text-ink-2">Total to pay</span>
                <span className="text-xl font-bold text-ink tabular-nums">{rupees(chosenPass.amount)}</span>
              </div>

              {error && <p className="text-base text-c-red mt-4 leading-relaxed">{error}</p>}

              <div className="grid gap-2 sm:grid-cols-[auto_1fr] mt-5">
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
                The workshop is run by {CLUB}. Payment opens in a new tab on CCAvenue, the university's payment
                page. Pay there, close that tab, then come back here and confirm.
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

              <div className="mt-5 pt-5 border-t border-line">
                <p className="text-base font-semibold text-ink">Paid already?</p>
                <p className="text-xs text-ink-2 mt-1 leading-relaxed">
                  CCAvenue does not tell Orbit when a payment lands, so tell us here. {CLUB} checks it against
                  the payment report, and your entry pass appears on this page once it is confirmed.
                </p>

                <div className="mt-3">
                  <Field label="Payment reference" optional
                         hint="The order or transaction id from CCAvenue, if you have it. It makes checking your payment quicker.">
                    <Input
                      value={paymentRef}
                      maxLength={60}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="e.g. 1234567890"
                      className="h-11"
                    />
                  </Field>
                </div>

                <Button
                  variant={paymentOpened ? "primary" : "soft"}
                  tone={paymentOpened ? "blue" : undefined}
                  size="lg"
                  className="w-full mt-3"
                  onClick={confirmPaid}
                  disabled={busy}
                  loading={busy}
                >
                  I have paid, open the event chat
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
                <dt className="text-ink-3">Year</dt><dd className="text-ink text-right">{signup.year}</dd>
                {signup.branch && <><dt className="text-ink-3">Branch</dt><dd className="text-ink text-right">{signup.branch}</dd></>}
              </dl>

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
            <section className={cx(card, "overflow-hidden")}>
              <img src="/poster.jpg" alt={event.title} className="w-full block" />
            </section>

            <section className={cx(card, "p-4")}>
              <div className="flex items-center gap-2 mb-3">
                <Icon name="calendar_today" size={18} className="text-accent" />
                <h3 className="text-[14px] font-bold text-ink tracking-tight">The event</h3>
              </div>
              <div className="flex flex-col gap-2 text-base text-ink-2">
                <span className="flex items-start gap-2">
                  <Icon name="schedule" size={15} className="text-ink-3 shrink-0 mt-0.5" />
                  <span className="min-w-0">{event.when}</span>
                </span>
                {event.where && (
                  <span className="flex items-start gap-2">
                    <Icon name="location_on" size={15} className="text-c-pink shrink-0 mt-0.5" />
                    <span className="min-w-0 break-words">{event.where}</span>
                  </span>
                )}
                <span className="flex items-start gap-2">
                  <Icon name="group" size={15} className="text-c-violet shrink-0 mt-0.5" />
                  <span>Run by {CLUB}</span>
                </span>
              </div>
            </section>

            <section className={cx(card, "p-4")}>
              <div className="flex items-center gap-2 mb-3">
                <Icon name="confirmation_number" size={18} className="text-c-green" />
                <h3 className="text-[14px] font-bold text-ink tracking-tight">Passes</h3>
              </div>
              <div className="flex flex-col gap-2">
                {PASSES.map((p) => (
                  <div key={p.key} className="flex items-center justify-between gap-3 text-base">
                    <span className="text-ink-2 min-w-0 truncate">
                      {p.label}{p.people > 1 ? ` (${p.people})` : ""}
                    </span>
                    <span className="text-ink font-semibold tabular-nums shrink-0">{rupees(p.amount)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink-3 mt-3 leading-relaxed">
                A stag pass is one payment and one QR for four people. Whoever registers carries it.
              </p>
            </section>

            <section className={cx(card, "p-4")}>
              <div className="flex items-center gap-2 mb-3">
                <Icon name="info" size={18} className="text-c-blue" />
                <h3 className="text-[14px] font-bold text-ink tracking-tight">How this works</h3>
              </div>
              <ol className="flex flex-col gap-2.5 text-xs text-ink-2 leading-relaxed">
                <li className="flex gap-2.5">
                  <span className="grid place-items-center w-5 h-5 rounded-full bg-bg-sunken text-2xs font-bold text-ink shrink-0">1</span>
                  Your details, so {CLUB} can reach you on the day.
                </li>
                <li className="flex gap-2.5">
                  <span className="grid place-items-center w-5 h-5 rounded-full bg-bg-sunken text-2xs font-bold text-ink shrink-0">2</span>
                  Your slot and pass.
                </li>
                <li className="flex gap-2.5">
                  <span className="grid place-items-center w-5 h-5 rounded-full bg-bg-sunken text-2xs font-bold text-ink shrink-0">3</span>
                  Payment on the university's CCAvenue page, in a new tab.
                </li>
                <li className="flex gap-2.5">
                  <span className="grid place-items-center w-5 h-5 rounded-full bg-bg-sunken text-2xs font-bold text-ink shrink-0">4</span>
                  The club checks the payment, then your QR pass appears here and on your profile.
                </li>
              </ol>
            </section>
          </div>
        </aside>
      </div>
    </Screen>
  );
}
