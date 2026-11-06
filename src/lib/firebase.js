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

let _app = null, _auth = null, _db = null, _storage = null, _googleProvider = null;

if (firebaseReady) {
  _app = initializeApp(firebaseConfig);
  _auth = getAuth(_app);
  _db = getFirestore(_app);
  _storage = getStorage(_app);
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
