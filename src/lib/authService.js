// Auth surface for the app — Google sign-in only.
//
// Replaces the Supabase email-OTP flow (signInWithOtp / verifyOtp). There is
// deliberately no "register" path separate from "login": with an OAuth
// provider the first successful sign-in *is* the registration, so both
// buttons in the UI call signInWithGoogle() and the profile document is
// created on first sight of a uid.
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider, firebaseReady } from "./firebase.js";

// Every entry point below tolerates an unconfigured Firebase project rather
// than throwing, so a fresh clone still runs in guest mode. Sign-in is the one
// action that can't degrade quietly — it reports why it can't proceed.
const NOT_CONFIGURED =
  "Firebase isn't configured yet — add the VITE_FIREBASE_* values to .env to enable Google sign-in.";

// Popup is the better experience when it works, but browsers block it in a
// few real situations (Safari with cross-site tracking prevention, embedded
// webviews, and any context where the click isn't seen as user-initiated).
// Falling back to redirect keeps those users able to sign in at all rather
// than showing them a popup-blocked error they can't act on.
const POPUP_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/cancelled-popup-request",
]);

export async function signInWithGoogle() {
  if (!firebaseReady) throw new Error(NOT_CONFIGURED);
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    await ensureProfile(cred.user);
    return cred.user;
  } catch (err) {
    if (POPUP_FALLBACK_CODES.has(err?.code)) {
      // Hands off to a full-page redirect; completeRedirectSignIn() picks the
      // result up on the way back, so nothing is returned here.
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    // The user closing the popup themselves isn't an error worth surfacing.
    if (err?.code === "auth/popup-closed-by-user") return null;
    throw err;
  }
}

// Call once on app boot: if we're returning from the redirect fallback above,
// this resolves with the credential and the profile gets written. Resolves
// with null on a normal load, which is the common case.
export async function completeRedirectSignIn() {
  if (!firebaseReady) return null;
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await ensureProfile(result.user);
      return result.user;
    }
  } catch (err) {
    console.error("Google redirect sign-in failed:", err);
  }
  return null;
}

export function signOut() {
  if (!firebaseReady) return Promise.resolve();
  return fbSignOut(auth);
}

export function onAuthChange(cb) {
  // Report "signed out" once and hand back a no-op unsubscribe, so callers
  // get the same shape either way and their loading state still resolves.
  if (!firebaseReady) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, cb);
}

// First sign-in creates the profile document; later sign-ins leave the
// user's own edits (name, bio, interests) alone. merge:true on a doc that
// already exists would happily overwrite name/photo back to the Google
// values on every login, which is why this reads first instead.
export async function ensureProfile(user) {
  if (!firebaseReady || !user) return null;
  const ref = doc(db, "profiles", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() };

  const profile = {
    name: user.displayName || "",
    email: user.email || "",
    avatarUrl: user.photoURL || "",
    bio: "",
    interests: [],
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return { id: user.uid, ...profile };
}

export async function fetchProfile(uid) {
  if (!firebaseReady || !uid) return null;
  const snap = await getDoc(doc(db, "profiles", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveProfile(uid, fields) {
  if (!firebaseReady || !uid) return;
  await setDoc(doc(db, "profiles", uid), fields, { merge: true });
}
