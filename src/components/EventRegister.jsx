import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import * as db from "../lib/db.js";
import { Icon, Button, Input, cx } from "./ui/Primitives.jsx";
import { Screen } from "./ui/Layout.jsx";

// Event registration: details, then payment, then the event's group chat.
//
// Payment happens on CCAvenue, which does not call this app back. So the flow
// is deliberately honest about what it knows: the student enters details, pays
// in a separate tab, and tells us they have. That marks the signup "claimed",
// not "paid". An admin verifies it against the CCAvenue report, and only a
// verified signup gets an entry pass.
//
// The chat opens as soon as they claim payment rather than after verification.
// A student who has just paid should not sit outside the group waiting for a
// human, and the cost of being wrong is that someone is briefly in a chat.

const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "Postgraduate", "PhD"];
const REFERRALS = [
  "Instagram", "WhatsApp", "A friend", "A club member", "Posters on campus",
  "Orbit", "LinkedIn", "Somewhere else",
];

const card = "w-full bg-bg-raised rounded-2xl border border-line";

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
      <span className={cx("text-xs font-semibold truncate", state === "idle" ? "text-ink-3" : "text-ink")}>{label}</span>
    </div>
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

  const [form, setForm] = useState({
    name: user?.name || "",
    college: user?.university || "Manipal University Jaipur",
    branch: "",
    year: "",
    phone: "",
    referral: "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!authUserId || !event?.id) { setLoaded(true); return; }
    return db.watchMySignup(event.id, authUserId, (s) => { setSignup(s); setLoaded(true); });
  }, [event?.id, authUserId]);

  useEffect(() => {
    if (user?.name && !form.name) setForm((f) => ({ ...f, name: user.name }));
  }, [user?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const stage = !signup ? "details" : signup.status === "pending_payment" ? "payment" : "done";

  // What the scanner reads. Versioned so a future change to the format can be
  // told apart from this one, and carrying the ids the admin tool needs to find
  // the signup without a lookup table.
  const passPayload = `orbit:v1:${event?.id || ""}:${authUserId || ""}:${signup?.passCode || ""}`;

  const submitDetails = async () => {
    const name = form.name.trim();
    if (!name) { setError("Please enter your full name."); return; }
    if (!form.college.trim()) { setError("Please enter your college."); return; }
    if (!form.year) { setError("Please pick your year of study."); return; }
    // Required: the club needs a way to reach someone on the day, and email
    // is not it when the queue is moving.
    const phone = form.phone.replace(/[^0-9+]/g, "");
    const digits = phone.replace(/\D/g, "");
    if (!digits) { setError("Please enter a phone number so the club can reach you."); return; }
    if (digits.length < 10) { setError("That phone number looks too short."); return; }
    if (digits.length > 13) { setError("That phone number looks too long."); return; }

    setError("");
    setBusy(true);
    try {
      await db.createSignup(event.id, authUserId, {
        name,
        college: form.college.trim(),
        branch: form.branch.trim(),
        year: form.year,
        phone,
        referral: form.referral,
        eventTitle: event.title || "",
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
      await db.markPaymentClaimed(event.id, authUserId, null);
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

  return (
    <Screen>
      <div className="w-full max-w-[760px] mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-3 sm:gap-4">
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
          <span className="h-px flex-1 min-w-[16px] bg-line" />
          <Step n={2} label="Payment" state={stage === "payment" ? "on" : stage === "done" ? "done" : "idle"} />
          <span className="h-px flex-1 min-w-[16px] bg-line" />
          <Step n={3} label="Event chat" state={stage === "done" ? "done" : "idle"} />
        </div>

        {!loaded ? (
          <div className={cx(card, "p-10 grid place-items-center")}>
            <span className="w-6 h-6 rounded-full border-2 border-ink border-t-transparent animate-spin" />
          </div>
        ) : stage === "details" ? (
          <section className={cx(card, "p-4 sm:p-6")}>
            <h1 className="text-xl font-bold text-ink">Register for {event.title}</h1>
            <p className="text-base text-ink-2 mt-1 leading-relaxed">
              We need a few details for your entry pass. Payment is the next step.
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
                  <select value={form.year} onChange={set("year")}
                          className="w-full h-11 px-3 rounded bg-bg-sunken text-ink border border-transparent focus:outline-none focus:border-line-strong text-base">
                    <option value="">Select year</option>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </Field>
                <Field label="Phone" hint="The club calls this number if anything changes on the day.">
                  <Input value={form.phone} maxLength={15} inputMode="tel" onChange={set("phone")} placeholder="10 digit number" className="h-11" />
                </Field>
              </div>
              <Field label="Where did you hear about this?" optional>
                <select value={form.referral} onChange={set("referral")}
                        className="w-full h-11 px-3 rounded bg-bg-sunken text-ink border border-transparent focus:outline-none focus:border-line-strong text-base">
                  <option value="">Prefer not to say</option>
                  {REFERRALS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>

            {error && <p className="text-base text-c-red mt-4 leading-relaxed">{error}</p>}

            <Button tone="blue" size="lg" className="w-full mt-5" onClick={submitDetails} disabled={busy} loading={busy}>
              Next: payment
            </Button>
          </section>
        ) : stage === "payment" ? (
          <section className={cx(card, "p-4 sm:p-6")}>
            <h1 className="text-xl font-bold text-ink">Pay to confirm your place</h1>
            <p className="text-base text-ink-2 mt-1 leading-relaxed">
              Payment opens in a new tab on CCAvenue, the university's payment page. Pay there, close that tab,
              then come back here and confirm.
            </p>

            <Button tone="blue" size="lg" className="w-full mt-5" onClick={openPayment}>
              <Icon name="open_in_new" size={17} className="mr-1.5" />
              Open the payment page
            </Button>

            <div className="mt-5 pt-5 border-t border-line">
              <p className="text-base font-semibold text-ink">Paid already?</p>
              <p className="text-xs text-ink-2 mt-1 leading-relaxed">
                CCAvenue does not tell Orbit when a payment lands, so tell us here. Your place is confirmed once
                the club checks it against the payment report, and your entry pass appears on this page.
              </p>
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
                    : "The club is checking your payment against the CCAvenue report. Your entry pass appears here once it is confirmed, usually within a day."}
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
                  Show this at the entrance. If the scanner will not read it, they can type the code.
                </p>
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-line grid gap-2 sm:grid-cols-2">
              <Button tone="blue" size="lg" onClick={() => onOpenCommunity?.(event)}>Open event chat</Button>
              <Button variant="soft" size="lg" onClick={onBack}>Back to events</Button>
            </div>

            <dl className="mt-5 pt-5 border-t border-line grid grid-cols-2 gap-y-3 text-base">
              <dt className="text-ink-3">Name</dt><dd className="text-ink text-right">{signup.name}</dd>
              <dt className="text-ink-3">College</dt><dd className="text-ink text-right break-words">{signup.college}</dd>
              <dt className="text-ink-3">Year</dt><dd className="text-ink text-right">{signup.year}</dd>
              {signup.branch && <><dt className="text-ink-3">Branch</dt><dd className="text-ink text-right">{signup.branch}</dd></>}
            </dl>
          </section>
        )}
      </div>
    </Screen>
  );
}
