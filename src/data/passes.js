export const PASSES = [
  { key: "single", label: "Single pass", people: 1, amount: 51, was: 189, blurb: "One person." },
  { key: "stag", label: "Stag pass", people: 4, amount: 170, was: 700, blurb: "Four people on one pass." },
];

export const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const passOf = (key) => PASSES.find((p) => p.key === key) || PASSES[0];

// The number the home page leads with, and whether there is an offer at all.
export const cheapestPass = PASSES.reduce((a, b) => (b.amount < a.amount ? b : a));
export const isEarlyBird = PASSES.some((p) => p.was > p.amount);
