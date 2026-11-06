// Storage needs the Blaze plan and this project is on Spark, so a picture is
// a shrunken JPEG in an images document and the referrer stores "img:<id>".
import { collection, doc, addDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db, firebaseReady } from "./firebase.js";

const PREFIX = "img:";

// Sizes are per purpose: an avatar is drawn at 40 pixels and never needs to
// be a megabyte, while a post photo is looked at properly.
export const IMAGE_KINDS = {
  avatar: { maxEdge: 480, budget: 90 * 1024 },
  sticker: { maxEdge: 320, budget: 60 * 1024 },
  photo: { maxEdge: 1400, budget: 420 * 1024 },
  banner: { maxEdge: 1600, budget: 480 * 1024 },
  proof: { maxEdge: 1400, budget: 680 * 1024 },
};

const EDGE_STEPS = [1, 0.78, 0.6];
const QUALITIES = [0.78, 0.66, 0.54, 0.42, 0.32];

export const isStoredRef = (src) => typeof src === "string" && src.startsWith(PREFIX);

function render(img, edge) {
  const scale = Math.min(1, edge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  // JPEG carries no alpha. Without a white ground, anything saved as a
  // transparent PNG encodes to solid black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

// Shrink until it fits, giving up dimensions before quality: a smaller sharp
// picture reads better than a full-size smeared one.
export function shrinkToDataUrl(file, { maxEdge = 1400, budget = 420 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        for (const step of EDGE_STEPS) {
          const canvas = render(img, Math.round(maxEdge * step));
          for (const quality of QUALITIES) {
            const out = canvas.toDataURL("image/jpeg", quality);
            if (out.length <= budget) { resolve(out); return; }
          }
        }
        reject(new Error("image-too-large"));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("not-an-image")); };
    img.src = url;
  });
}

// Resolved pictures are kept for the life of the tab. The same avatar appears
// in a feed, a sidebar and a member list; it should cost one read, not thirty.
const cache = new Map();
const inflight = new Map();

export function cachedImage(src) {
  if (!isStoredRef(src)) return src || null;
  return cache.get(src.slice(PREFIX.length)) || null;
}

export async function resolveImage(src) {
  if (!isStoredRef(src)) return src || null;
  const id = src.slice(PREFIX.length);
  if (cache.has(id)) return cache.get(id);
  if (!firebaseReady) return null;

  // Two components asking for the same picture at once share the one read.
  if (!inflight.has(id)) {
    inflight.set(id, (async () => {
      try {
        const snap = await getDoc(doc(db, "images", id));
        const data = snap.exists() ? snap.data().dataUrl || null : null;
        cache.set(id, data);
        return data;
      } catch (err) {
        console.warn("[orbit/img] could not load a picture", err);
        return null;
      } finally {
        inflight.delete(id);
      }
    })());
  }
  return inflight.get(id);
}

export async function saveImage(file, uid, kind = "photo") {
  if (!firebaseReady) throw new Error("offline");
  if (!file?.type?.startsWith("image/")) throw new Error("not-an-image");
  const dataUrl = await shrinkToDataUrl(file, IMAGE_KINDS[kind] || IMAGE_KINDS.photo);
  const created = await addDoc(collection(db, "images"), {
    dataUrl,
    uid: uid || null,
    kind,
    createdAt: serverTimestamp(),
  });
  cache.set(created.id, dataUrl);
  return { url: PREFIX + created.id, path: `images/${created.id}`, id: created.id };
}
