import { createContext, useContext } from "react";

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
