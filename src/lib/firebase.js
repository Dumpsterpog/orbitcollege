// Firebase app singleton — replaces lib/supabaseClient.js.
//
// Config comes from .env (VITE_FIREBASE_*) rather than being committed, same
// arrangement the Supabase client used. These values are not secrets in the
// way a service key is — Firebase web config ships to the browser by design
// and access is enforced by Firestore security rules, not by hiding the
// apiKey — but keeping them in .env still lets dev/staging/prod differ without
// a code change.
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// Everything below stays null until the .env values are filled in.
//
// This guard is load-bearing, not defensive padding: getAuth() throws
// auth/invalid-api-key synchronously on an unconfigured app, and because this
// module is imported at the top of App.jsx that throw happens during module
// evaluation — which blanks the entire app, guest browsing included, before
// React ever mounts. Failing at the point of *use* instead keeps the dashboard
// and the guest flow working on a fresh clone with no Firebase project yet.
let _app = null, _auth = null, _db = null, _storage = null, _googleProvider = null;

if (firebaseReady) {
  _app = initializeApp(firebaseConfig);
  _auth = getAuth(_app);
  _db = getFirestore(_app);
  _storage = getStorage(_app);
  // Google is the only configured provider — see AUTH decision: no email OTP,
  // no phone SMS. Firebase has no email 6-digit-code flow, and phone OTP would
  // require the Blaze plan, so sign-in and sign-up are the same single action.
  _googleProvider = new GoogleAuthProvider();
  _googleProvider.setCustomParameters({ prompt: "select_account" });
} else {
  console.warn(
    "Firebase is not configured — auth and cloud data are disabled, the app " +
    "runs in guest mode only. Fill the VITE_FIREBASE_* values in .env from " +
    "Firebase console -> Project settings -> Your apps -> SDK setup and configuration."
  );
}

export const auth = _auth;
export const db = _db;
export const storage = _storage;
export const googleProvider = _googleProvider;

export default _app;
