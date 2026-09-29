// Firebase Storage is a paid-plan feature and this project is on the free one,
// so a payment screenshot has to reach the club through Firestore, which takes
// one document of one mebibyte. A phone screenshot is two to six megabytes of
// PNG, and none of that detail matters: the only question anyone asks of it is
// whether it says the money left. So it gets redrawn smaller and re-encoded as
// JPEG until it fits, trying size before quality because a slightly smaller
// legible screenshot beats a full-size smeared one.

const EDGES = [1400, 1080, 800];
const QUALITIES = [0.72, 0.6, 0.48, 0.36];

// Base64 is ASCII, so one character is one byte in Firestore. The budget
// leaves room under the 1 MiB document ceiling for the rest of the fields.
export const PROOF_BUDGET = 680 * 1024;

function draw(img, edge) {
  const scale = Math.min(1, edge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  // JPEG has no alpha channel. Without a white ground under it, a screenshot
  // saved as a transparent PNG encodes to solid black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

export function shrinkToDataUrl(file, budget = PROOF_BUDGET) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        for (const edge of EDGES) {
          const canvas = draw(img, edge);
          for (const quality of QUALITIES) {
            const out = canvas.toDataURL("image/jpeg", quality);
            if (out.length <= budget) { resolve(out); return; }
          }
        }
        reject(new Error("proof-too-large"));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("not-an-image")); };
    img.src = url;
  });
}
