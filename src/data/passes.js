// What a pass costs, in one place.
//
// The registration form and the home page both quote these, and a price that
// disagrees with itself across two screens is the kind of thing people
// screenshot. `was` is the price before the early bird discount; where it is
// higher than `amount`, the screens show it struck through.

export const PASSES = [
  { key: "single", label: "Single pass", people: 1, amount: 149, was: 189, blurb: "One person." },
  { key: "stag", label: "Stag pass", people: 4, amount: 500, was: 700, blurb: "Four people on one pass." },
];

export const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const passOf = (key) => PASSES.find((p) => p.key === key) || PASSES[0];

// The number the home page leads with, and whether there is an offer at all.
export const cheapestPass = PASSES.reduce((a, b) => (b.amount < a.amount ? b : a));
export const isEarlyBird = PASSES.some((p) => p.was > p.amount);
