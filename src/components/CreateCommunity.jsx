import { useState } from "react";
import { ShieldCheck, Check, ChevronLeft, ArrowRight } from "lucide-react";
import { CATEGORIES } from "../data/constants.js";
import { Button, Input, Textarea, Field, Card, Badge, SectionLabel, cx } from "./ui/Primitives.jsx";
import { Screen, PageHeader } from "./ui/Layout.jsx";
import { EmptyState } from "./EmptyState.jsx";

// Four-step create flow, rebuilt with a labelled step rail instead of four
// anonymous progress bars — on the old version you could see how far along
// you were but not what any step was, and steps you'd finished weren't
// clickable to go back and change.
//
// `category` stays the single primary bucket that drives discovery; `tags`
// is the creator's broader read on what the community touches, seeded from
// the category so step 3 never opens empty.

const STEPS = [
  { n: 1, label: "Category" },
  { n: 2, label: "Details" },
  { n: 3, label: "Interests" },
  { n: 4, label: "Confirm" },
];

function StepRail({ step, setStep, maxReached }) {
  return (
    <ol className="flex items-center gap-1 mb-6 shrink-0">
      {STEPS.map((s, i) => {
        const done = s.n < step;
        const current = s.n === step;
        const reachable = s.n <= maxReached;
        return (
          <li key={s.n} className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && setStep(s.n)}
              className={cx(
                "flex items-center gap-1.5 h-6 px-2 rounded-sm text-2xs font-medium transition-colors",
                current && "bg-surface-inset text-content",
                !current && done && "text-content-secondary hover:text-content hover:bg-surface-inset",
                !current && !done && "text-content-faint",
                !reachable && "cursor-default"
              )}
            >
              <span
                className={cx(
                  "grid place-items-center h-4 w-4 rounded-full text-[9px] shrink-0 border",
                  done ? "bg-solid text-solid-fg border-transparent"
                       : current ? "border-content text-content"
                                 : "border-line text-content-faint"
                )}
              >
                {done ? <Check size={9} /> : s.n}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <span className="w-3 h-px bg-line shrink-0" />}
          </li>
        );
      })}
    </ol>
  );
}

function StepShell({ title, description, onBack, children, footer }) {
  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs text-content-muted hover:text-content mb-3 transition-colors"
          >
            <ChevronLeft size={13} />Back
          </button>
        )}
        <h2 className="text-lg font-semibold text-content">{title}</h2>
        {description && <p className="text-sm text-content-muted mt-1 mb-5 leading-relaxed">{description}</p>}
        {children}
      </div>
      <div className="shrink-0 pt-4">{footer}</div>
    </>
  );
}

export function CreateCommunity({ onCreate, onClose, verified, onBlocked, onVerifyNow }) {
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [category, setCategory] = useState(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [interests, setInterests] = useState([]);

  const go = (n) => { setStep(n); setMaxReached((m) => Math.max(m, n)); };
  const toggleInterest = (n) =>
    setInterests((ints) => (ints.includes(n) ? ints.filter((x) => x !== n) : [...ints, n]));

  if (!verified) {
    return (
      <Screen>
        <PageHeader title="New community" onBack={onClose} />
        <EmptyState
          icon={ShieldCheck}
          title="Sign in to create a community"
          subtitle="Only signed-in members can start new communities on Orbit."
          action={<Button variant="primary" size="md" onClick={onVerifyNow}>Sign in</Button>}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title="New community" onBack={onClose} />

      <div className="flex-1 min-h-0 flex flex-col max-w-2xl w-full mx-auto px-5 lg:px-8 py-5">
        <StepRail step={step} setStep={setStep} maxReached={maxReached} />

        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); if (category) go(2); }} className="flex-1 flex flex-col min-h-0">
            <StepShell
              title="Pick a category"
              description="Every community has exactly one. This is what drives discovery."
              footer={<Button type="submit" variant="primary" size="lg" disabled={!category} className="w-full">Continue <ArrowRight size={15} /></Button>}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const selected = category === cat.name;
                  return (
                    <button
                      type="button"
                      key={cat.name}
                      onClick={() => setCategory(cat.name)}
                      aria-pressed={selected}
                      className={cx(
                        "flex flex-col items-start gap-2 p-3 rounded-lg border text-left transition-colors",
                        selected
                          ? "border-line-strong bg-surface-inset"
                          : "border-line hover:border-line-strong hover:bg-surface-inset"
                      )}
                    >
                      <span className="h-7 w-7 rounded grid place-items-center bg-surface-inset border border-line">
                        <Icon size={14} className={selected ? "text-accent" : "text-content-secondary"} />
                      </span>
                      <span className="text-xs font-medium text-content leading-tight">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </StepShell>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              setInterests((ints) => (ints.length ? ints : category ? [category] : []));
              go(3);
            }}
            className="flex-1 flex flex-col min-h-0"
          >
            <StepShell
              title="Name it"
              description="Make it sound like something people would actually tap on."
              onBack={() => setStep(1)}
              footer={<Button type="submit" variant="primary" size="lg" disabled={!name.trim()} className="w-full">Continue <ArrowRight size={15} /></Button>}
            >
              <div className="space-y-4">
                <Field label="Name" htmlFor="cc-name" hint={`${name.length}/80`}>
                  <Input
                    id="cc-name" value={name} maxLength={80} autoFocus
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sunday Football League"
                  />
                </Field>
                <Field label="Description" htmlFor="cc-desc" hint="Optional — what is this community for?">
                  <Textarea
                    id="cc-desc" value={desc} rows={4} maxLength={800}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Who it's for, when you meet, what happens here."
                  />
                </Field>
              </div>
            </StepShell>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={(e) => { e.preventDefault(); go(4); }} className="flex-1 flex flex-col min-h-0">
            <StepShell
              title="Tag its interests"
              description="Pick everything that applies — this is how the community gets matched to the right people. Be generous."
              onBack={() => setStep(2)}
              footer={<Button type="submit" variant="primary" size="lg" disabled={!interests.length} className="w-full">Continue <ArrowRight size={15} /></Button>}
            >
              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const selected = interests.includes(cat.name);
                  const isPrimary = cat.name === category;
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
                      <span className="text-xs font-medium truncate flex-1">
                        {cat.name}
                        {isPrimary && <span className="text-content-faint"> · main</span>}
                      </span>
                      {selected && <Check size={12} className="text-accent shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </StepShell>
          </form>
        )}

        {step === 4 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onCreate({ name, category, desc, tags: interests.length ? interests : [category] });
            }}
            className="flex-1 flex flex-col min-h-0"
          >
            <StepShell
              title="Confirm"
              description="Your community gets a unique handle and QR code once it's created."
              onBack={() => setStep(3)}
              footer={<Button type="submit" variant="primary" size="lg" className="w-full">Create community</Button>}
            >
              <Card className="divide-y divide-line">
                <div className="flex items-baseline gap-4 px-3.5 py-3">
                  <span className="text-xs text-content-muted w-20 shrink-0">Name</span>
                  <span className="text-sm text-content font-medium min-w-0 break-words">{name}</span>
                </div>
                <div className="flex items-baseline gap-4 px-3.5 py-3">
                  <span className="text-xs text-content-muted w-20 shrink-0">Category</span>
                  <span className="text-sm text-content font-medium">{category}</span>
                </div>
                {desc && (
                  <div className="flex items-baseline gap-4 px-3.5 py-3">
                    <span className="text-xs text-content-muted w-20 shrink-0">About</span>
                    <span className="text-sm text-content-secondary min-w-0 leading-relaxed">{desc}</span>
                  </div>
                )}
                <div className="flex items-baseline gap-4 px-3.5 py-3">
                  <span className="text-xs text-content-muted w-20 shrink-0">Interests</span>
                  <span className="flex flex-wrap gap-1.5 min-w-0">
                    {(interests.length ? interests : [category]).map((t) => (
                      <Badge key={t} tone={t === category ? "accent" : "neutral"}>{t}</Badge>
                    ))}
                  </span>
                </div>
              </Card>
            </StepShell>
          </form>
        )}
      </div>
    </Screen>
  );
}
