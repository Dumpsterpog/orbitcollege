import { useState } from "react";
import { CATEGORIES } from "../data/constants.js";
import { Icon, Button, Input, Textarea, Field, cx } from "./ui/Primitives.jsx";
import { Screen, Column, Empty } from "./ui/Layout.jsx";

// Create flow. Four steps on one centred column with a thin progress rule
// rather than four bordered step chips — the rule shows how far along you
// are without adding another component to the page.

const STEPS = ["Topic", "Details", "Interests", "Review"];

function Progress({ step, onJump }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {STEPS.map((label, i) => {
        const n = i + 1;
        return (
          <button
            key={label}
            disabled={n > step}
            onClick={() => onJump(n)}
            className="group flex-1 text-left disabled:cursor-default"
          >
            <span
              className={cx(
                "block h-1 rounded-full transition-colors",
                n <= step ? "bg-accent" : "bg-line",
                n < step && "group-hover:bg-accent-press"
              )}
            />
            <span
              className={cx(
                "block text-2xs font-semibold uppercase tracking-wide mt-2",
                n === step ? "text-ink" : "text-ink-3"
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function CreateCommunity({ onCreate, onClose, verified, onBlocked, onVerifyNow }) {
  const [step, setStep] = useState(1);
  const [reached, setReached] = useState(1);
  const [category, setCategory] = useState(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState([]);

  const go = (n) => { setStep(n); setReached((m) => Math.max(m, n)); };
  const toggle = (n) => setTags((t) => (t.includes(n) ? t.filter((x) => x !== n) : [...t, n]));

  if (!verified) {
    return (
      <Screen>
        <Empty
          icon="lock"
          title="Sign in to create"
          body="Only signed-in members can start a community on Orbit."
          action={<Button variant="primary" size="lg" onClick={onVerifyNow}>Sign in</Button>}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Column className="max-w-xl pt-8 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-ink">New community</h1>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        </div>

        <Progress step={step} onJump={(n) => n <= reached && setStep(n)} />

        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); if (category) go(2); }}>
            <h2 className="text-xl font-semibold text-ink">Pick a topic</h2>
            <p className="text-base text-ink-2 mt-1 mb-6">One per community. It is what drives discovery.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((c) => {
                const on = category === c.name;
                return (
                  <button
                    type="button"
                    key={c.name}
                    onClick={() => setCategory(c.name)}
                    aria-pressed={on}
                    className={cx(
                      "flex flex-col items-start gap-2.5 p-3.5 rounded text-left transition-all bg-bg-sunken",
                      on ? "ring-2 ring-accent" : "hover:opacity-80"
                    )}
                  >
                    <Icon name={c.msr} size={26} className={c.tint} />
                    <span className="text-xs font-semibold text-ink leading-tight">{c.name}</span>
                  </button>
                );
              })}
            </div>
            <Button type="submit" variant="primary" size="lg" disabled={!category} className="w-full mt-8">
              Continue
            </Button>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              setTags((t) => (t.length ? t : category ? [category] : []));
              go(3);
            }}
          >
            <h2 className="text-xl font-semibold text-ink">Name it</h2>
            <p className="text-base text-ink-2 mt-1 mb-6">Something people would actually tap on.</p>
            <div className="space-y-5">
              <Field label="Name" htmlFor="cc-name" hint={`${name.length}/80`}>
                <Input
                  id="cc-name"
                  autoFocus
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sunday Football League"
                />
              </Field>
              <Field label="Description" htmlFor="cc-desc" hint="Optional: who it is for and what happens.">
                <Textarea id="cc-desc" rows={4} maxLength={800} value={desc} onChange={(e) => setDesc(e.target.value)} />
              </Field>
            </div>
            <div className="flex gap-2 mt-8">
              <Button type="button" variant="soft" size="lg" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" variant="primary" size="lg" disabled={!name.trim()} className="flex-1">Continue</Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={(e) => { e.preventDefault(); go(4); }}>
            <h2 className="text-xl font-semibold text-ink">Tag its interests</h2>
            <p className="text-base text-ink-2 mt-1 mb-6">Everything that applies. This is how the right people find it.</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const on = tags.includes(c.name);
                return (
                  <button
                    type="button"
                    key={c.name}
                    onClick={() => toggle(c.name)}
                    aria-pressed={on}
                    className={cx(
                      "inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold transition-all",
                      on ? "bg-solid text-solid-ink" : "bg-bg-sunken text-ink-2 hover:text-ink"
                    )}
                  >
                    <Icon name={c.msr} size={16} className={on ? "" : c.tint} />
                    {c.name}
                    {c.name === category && <span className="opacity-60">· main</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-8">
              <Button type="button" variant="soft" size="lg" onClick={() => setStep(2)}>Back</Button>
              <Button type="submit" variant="primary" size="lg" disabled={!tags.length} className="flex-1">Continue</Button>
            </div>
          </form>
        )}

        {step === 4 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onCreate({ name, category, desc, tags: tags.length ? tags : [category] });
            }}
          >
            <h2 className="text-xl font-semibold text-ink">Review</h2>
            <p className="text-base text-ink-2 mt-1 mb-6">You get a handle and a QR code once it is live.</p>

            <dl className="divide-y divide-line border-y border-line">
              <div className="flex gap-4 py-3.5">
                <dt className="w-24 shrink-0 text-xs font-semibold text-ink-2 uppercase tracking-wide pt-0.5">Name</dt>
                <dd className="text-base font-semibold text-ink break-words min-w-0">{name}</dd>
              </div>
              <div className="flex gap-4 py-3.5">
                <dt className="w-24 shrink-0 text-xs font-semibold text-ink-2 uppercase tracking-wide pt-0.5">Topic</dt>
                <dd className="text-base text-ink">{category}</dd>
              </div>
              {desc && (
                <div className="flex gap-4 py-3.5">
                  <dt className="w-24 shrink-0 text-xs font-semibold text-ink-2 uppercase tracking-wide pt-0.5">About</dt>
                  <dd className="text-base text-ink-2 leading-normal min-w-0">{desc}</dd>
                </div>
              )}
              <div className="flex gap-4 py-3.5">
                <dt className="w-24 shrink-0 text-xs font-semibold text-ink-2 uppercase tracking-wide pt-0.5">Interests</dt>
                <dd className="flex flex-wrap gap-x-3 gap-y-1.5 min-w-0">
                  {(tags.length ? tags : [category]).map((t) => {
                    const c = CATEGORIES.find((x) => x.name === t);
                    return (
                      <span key={t} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-2">
                        {c && <Icon name={c.msr} size={14} className={c.tint} />}
                        {t}
                      </span>
                    );
                  })}
                </dd>
              </div>
            </dl>

            <div className="flex gap-2 mt-8">
              <Button type="button" variant="soft" size="lg" onClick={() => setStep(3)}>Back</Button>
              <Button type="submit" variant="primary" size="lg" className="flex-1">Create community</Button>
            </div>
          </form>
        )}
      </Column>
    </Screen>
  );
}
