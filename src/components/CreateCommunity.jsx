import { useState } from "react";
import { ArrowLeft, ChevronLeft, ShieldCheck, Check } from "lucide-react";
import { CATEGORIES, COLOR_MAP } from "../data/constants.js";

export function CreateCommunity({ onCreate, onClose, verified, onBlocked, onVerifyNow }) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  // Interests tags — separate from `category` (which stays the single
  // primary bucket used for discovery grouping/icon). This is the creator's
  // own read on which interests the community touches, collected up front
  // so future personalization/recommendation logic has real signal to work
  // with instead of only ever inferring one tag from the category.
  const [interests, setInterests] = useState([]);
  const toggleInterest = (name) => {
    setInterests((ints) => (ints.includes(name) ? ints.filter((x) => x !== name) : [...ints, name]));
  };
  return (
    <div className="relative flex-1 bg-white dark:bg-zinc-950 flex flex-col min-h-0">
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-2 shrink-0">
        <button onClick={onClose} className="w-8 h-8 -ml-1.5 flex items-center justify-center rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900"><ArrowLeft size={18} className="text-zinc-700 dark:text-zinc-300" /></button>
        <p className="font-bold text-zinc-900 dark:text-zinc-50">New community</p>
      </div>
        {!verified ? (
          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center justify-center text-center px-8 py-10">
            <ShieldCheck size={30} className="text-zinc-700 mb-3" />
            <p className="font-semibold text-zinc-800 dark:text-zinc-200">Verify your account to create a community</p>
            <p className="text-sm text-zinc-500 mt-1.5">Only verified members can start new communities on Orbit.</p>
            <button onClick={onVerifyNow} className="mt-4 text-sm text-zinc-900 dark:text-zinc-50 font-medium">Verify now</button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 px-5 pt-5 pb-8">
            <div className="flex items-center gap-2 mb-5 shrink-0">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-zinc-900 dark:bg-zinc-50" : "bg-zinc-100 dark:bg-zinc-800"}`} />
              ))}
            </div>
            {/* Each step is a <form> so Enter in a text field submits like
                tapping the primary button, and that button sits in a
                shrink-0 footer below the scrollable content so it's always
                visible even when the content above (e.g. the category
                grid) is taller than the screen. */}
            {step === 1 && (
              <form
                onSubmit={(e) => { e.preventDefault(); if (category) setStep(2); }}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <p className="font-bold text-zinc-900 dark:text-zinc-50 text-lg mb-1">Pick a category</p>
                  <p className="text-sm text-zinc-500 mb-4">Every community needs exactly one. This drives discovery.</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {CATEGORIES.map((cat) => {
                      const cm = COLOR_MAP[cat.color];
                      const Icon = cat.icon;
                      const selected = category === cat.name;
                      return (
                        <button type="button" key={cat.name} onClick={() => setCategory(cat.name)} className={`rounded-2xl p-3.5 text-left border ${selected ? "border-zinc-900 dark:border-zinc-50 ring-1 ring-zinc-900/20 dark:ring-zinc-50/30 bg-zinc-900/5 dark:bg-zinc-50/5" : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"}`}>
                          <div className={`${cm.tint} ${cm.text} w-9 h-9 rounded-xl flex items-center justify-center mb-2`}><Icon size={18} /></div>
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-snug">{cat.name}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="shrink-0 pt-4">
                  <button type="submit" disabled={!category} className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 text-white dark:text-zinc-900 disabled:text-zinc-500 text-sm font-semibold">Continue</button>
                </div>
              </form>
            )}
            {step === 2 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!name.trim()) return;
                  // Primary category is always part of the interest set, seeded
                  // here (once, not on every re-render) so step 3 opens with it
                  // already checked instead of an empty grid.
                  setInterests((ints) => (ints.length ? ints : category ? [category] : []));
                  setStep(3);
                }}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <button type="button" onClick={() => setStep(1)} className="text-xs text-zinc-500 flex items-center gap-1 mb-3"><ChevronLeft size={14} />Back</button>
                  <p className="font-bold text-zinc-900 dark:text-zinc-50 text-lg mb-1">Name it</p>
                  <p className="text-sm text-zinc-500 mb-4">Freeform — make it sound like something people would actually tap on.</p>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunday Football League" maxLength={80} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 rounded-xl px-3.5 py-2.5 text-sm mb-3 outline-none focus:border-zinc-900 dark:focus:border-zinc-50" />
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description (optional)" rows={3} maxLength={800} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900 dark:focus:border-zinc-50" />
                </div>
                <div className="shrink-0 pt-4">
                  <button type="submit" disabled={!name.trim()} className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 text-white dark:text-zinc-900 disabled:text-zinc-500 text-sm font-semibold">Continue</button>
                </div>
              </form>
            )}
            {step === 3 && (
              <form
                onSubmit={(e) => { e.preventDefault(); setStep(4); }}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <button type="button" onClick={() => setStep(2)} className="text-xs text-zinc-500 flex items-center gap-1 mb-3"><ChevronLeft size={14} />Back</button>
                  <p className="font-bold text-zinc-900 dark:text-zinc-50 text-lg mb-1">Tag its interests</p>
                  <p className="text-sm text-zinc-500 mb-4">Pick everything that applies — this is how we match your community to the right people and events, so be generous.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => {
                      const cm = COLOR_MAP[cat.color];
                      const Icon = cat.icon;
                      const selected = interests.includes(cat.name);
                      const isPrimary = cat.name === category;
                      return (
                        <button
                          type="button"
                          key={cat.name}
                          onClick={() => toggleInterest(cat.name)}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left border transition-all active:scale-[0.97] ${selected ? "border-zinc-900 dark:border-zinc-50 ring-1 ring-zinc-900/20 dark:ring-zinc-50/30 bg-zinc-900/5 dark:bg-zinc-50/5" : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700"}`}
                        >
                          <div className={`${cm.tint} ${cm.text} w-7 h-7 rounded-lg flex items-center justify-center shrink-0`}><Icon size={14} /></div>
                          <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-tight">{cat.name}{isPrimary ? " (main)" : ""}</p>
                          {selected && <Check size={13} className="text-zinc-900 dark:text-zinc-50 ml-auto shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="shrink-0 pt-4">
                  <button type="submit" disabled={!interests.length} className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 text-white dark:text-zinc-900 disabled:text-zinc-500 text-sm font-semibold">Continue</button>
                </div>
              </form>
            )}
            {step === 4 && (
              <form
                onSubmit={(e) => { e.preventDefault(); onCreate({ name, category, desc, tags: interests.length ? interests : [category] }); }}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <button type="button" onClick={() => setStep(3)} className="text-xs text-zinc-500 flex items-center gap-1 mb-3"><ChevronLeft size={14} />Back</button>
                  <p className="font-bold text-zinc-900 dark:text-zinc-50 text-lg mb-1">Confirm</p>
                  <p className="text-sm text-zinc-500 mb-4">Your community gets a unique handle and QR code once created.</p>
                  <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-zinc-500">Category</span><span className="font-medium text-zinc-800 dark:text-zinc-200">{category}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-zinc-500">Name</span><span className="font-medium text-zinc-800 dark:text-zinc-200">{name}</span></div>
                    <div className="flex justify-between text-sm gap-3"><span className="text-zinc-500 shrink-0">Interests</span><span className="font-medium text-zinc-800 dark:text-zinc-200 text-right">{(interests.length ? interests : [category]).join(", ")}</span></div>
                  </div>
                </div>
                <div className="shrink-0 pt-4">
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-semibold">Create community</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
      </div>
  );
}
