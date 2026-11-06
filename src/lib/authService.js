import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider, firebaseReady } from "./firebase.js";

const NOT_CONFIGURED =
  "Firebase isn't configured yet — add the VITE_FIREBASE_* values to .env to enable Google sign-in.";

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
