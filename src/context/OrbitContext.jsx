import { createContext, useContext } from "react";

// Everything App.jsx owns -- the live Firestore data, the signed-in user, and
// every handler that writes -- reaches the screens through here.
//
// It exists because of routing. App used to render each screen itself and hand
// it props, which is why there were no routes to look at: the URL never
// changed and `activeTab` was the only thing that decided what you saw. Now
// the router renders the screens, so it cannot pass props down -- the data has
// to arrive out of band, and this is that band.
//
// One context rather than several. Splitting it (auth / data / actions) would
// cut re-renders, but every screen here needs most of it, so the split would
// buy little and cost a lot of plumbing. Worth revisiting if a screen starts
// re-rendering on data it does not read.

const OrbitContext = createContext(null);

export function OrbitProvider({ value, children }) {
  return <OrbitContext.Provider value={value}>{children}</OrbitContext.Provider>;
}

export function useOrbit() {
  const ctx = useContext(OrbitContext);
  if (!ctx) {
    // A screen rendered outside the layout would otherwise fail later with
    // "cannot read property of null" somewhere unrelated to the real mistake.
    throw new Error("useOrbit must be used inside the app layout route.");
  }
  return ctx;
}
