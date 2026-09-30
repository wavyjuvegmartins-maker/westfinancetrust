// Crops, cleans and converts the source photos in assets/originals into
// web-ready files in public/images. Run with: node scripts/process-images.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "assets/originals";
const OUT = "public/images";
const WEBP = { quality: 82, effort: 6 };

const raw = async (file) => {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
const toSharp = ({ data, w, h }, channels = 3) => sharp(data, { raw: { width: w, height: h, channels } });

// Paint a rectangle with the colour found just above it, column by column.
// Used for faint watermarks sitting on a flat background.
function fillFromAbove(img, { x0, y0, x1, y1 }) {
  const { data, w } = img;
  for (let x = x0; x < x1; x++) {
    const s = ((y0 - 3) * w + x) * 3;
    for (let y = y0; y < y1; y++) {
      const d = (y * w + x) * 3;
      data[d] = data[s]; data[d + 1] = data[s + 1]; data[d + 2] = data[s + 2];
    }
  }
}

// Cover a rectangle with the median colour of the dark pixels around it,
// blending toward the original over `feather` px so there is no hard edge.
function patchDark(img, { x0, y0, x1, y1 }, feather = 6) {
  const { data, w } = img;
  const ring = [];
  for (let y = y0 - 8; y < y1 + 8; y++)
    for (let x = x0 - 8; x < x1 + 8; x++) {
      if (x >= x0 && x < x1 && y >= y0 && y < y1) continue;
      const i = (y * w + x) * 3;
      if (data[i] + data[i + 1] + data[i + 2] < 150) ring.push([data[i], data[i + 1], data[i + 2]]);
    }
  const med = [0, 1, 2].map((c) => ring.map((p) => p[c]).sort((a, b) => a - b)[ring.length >> 1]);
  for (let y = y0 - feather; y < y1 + feather; y++)
    for (let x = x0 - feather; x < x1 + feather; x++) {
      const dx = Math.max(x0 - x, x - (x1 - 1), 0);
      const dy = Math.max(y0 - y, y - (y1 - 1), 0);
      const t = Math.max(0, 1 - Math.hypot(dx, dy) / feather); // 1 inside, 0 at feather edge
      const i = (y * w + x) * 3;
      // tiny deterministic grain so the patch doesn't look perfectly flat
      const n = ((x * 7 + y * 13) % 5) - 2;
      for (let c = 0; c < 3; c++) data[i + c] = Math.round(data[i + c] * (1 - t) + (med[c] + n) * t);
    }
}

// Flood-fill from the image border to find the background, then return RGBA
// with the background transparent. `isBg(r,g,b)` decides membership; pixels
// bordering the background get partial alpha via `edgeAlpha`.
function removeBackground(img, isBg, edgeAlpha, band = 1) {
  const { data, w, h } = img;
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (bg[p]) return;
    const i = p * 3;
    if (!isBg(data[i], data[i + 1], data[i + 2])) return;
    bg[p] = 1; stack.push(p);
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const p = stack.pop(), x = p % w, y = (p / w) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  // near[p] = 1 for foreground pixels within `band` px of the background
  let reach = bg.slice();
  for (let k = 0; k < band; k++) {
    const next = reach.slice();
    for (let p = 0; p < w * h; p++) {
      if (reach[p]) continue;
      const x = p % w, y = (p / w) | 0;
      if ((x > 0 && reach[p - 1]) || (x < w - 1 && reach[p + 1]) || (y > 0 && reach[p - w]) || (y < h - 1 && reach[p + w])) next[p] = 1;
    }
    reach = next;
  }
  const out = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const i = p * 3, o = p * 4;
    let [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    let a = 255;
    if (bg[p]) a = 0;
    else if (reach[p]) [r, g, b, a] = edgeAlpha(r, g, b);
    out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
  }
  return { data: out, w, h };
}

// Clear opaque islands smaller than `minShare` of the largest one (leftover
// specks such as JPEG seams from a baked-in checkerboard).
function dropIslands(rgba, minShare = 0.02) {
  const { data, w, h } = rgba;
  const label = new Int32Array(w * h).fill(-1);
  const sizes = [];
  for (let start = 0; start < w * h; start++) {
    if (label[start] !== -1 || data[start * 4 + 3] === 0) continue;
    const id = sizes.length, stack = [start];
    let n = 0;
    label[start] = id;
    while (stack.length) {
      const q = stack.pop(), x = q % w;
      n++;
      for (const r of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, q - w, q + w]) {
        if (r < 0 || r >= w * h || label[r] !== -1 || data[r * 4 + 3] === 0) continue;
        label[r] = id; stack.push(r);
      }
    }
    sizes.push(n);
  }
  const min = Math.max(...sizes) * minShare;
  for (let q = 0; q < w * h; q++) if (label[q] !== -1 && sizes[label[q]] < min) data[q * 4 + 3] = 0;
  return rgba;
}

// Colour-to-alpha against white (GIMP-style) for anti-aliased logo edges.
const unWhite = (r, g, b) => {
  const a = Math.max(255 - r, 255 - g, 255 - b) / 255;
  if (a <= 0) return [0, 0, 0, 0];
  const un = (c) => Math.max(0, Math.min(255, Math.round((c - 255 * (1 - a)) / a)));
  return [un(r), un(g), un(b), Math.round(a * 255)];
};

const jobs = {
  // Clean images: straight conversion, native size.
  "bank-illustration": (f) => sharp(f),
  "mobile-banking-woman": (f) => sharp(f),
  "phone-receipt": (f) => sharp(f),
  "savings-jar": (f) => sharp(f),

  // Trim to standard ratios.
  "growth-coin-stacks": (f) => sharp(f).extract({ left: 0, top: 16, width: 736, height: 1104 }), // 2:3
  "wallet-hand": (f) => sharp(f).extract({ left: 0, top: 10, width: 736, height: 920 }), // 4:5

  // Remove overlaid third-party text.
  "security-lock": (f) => sharp(f).extract({ left: 0, top: 147, width: 736, height: 589 }), // 5:4, drops headline
  "crypto-coins": (f) => sharp(f).extract({ left: 0, top: 200, width: 735, height: 588 }), // 5:4, drops "Crypto" + caption
  "every-dollar": (f) => sharp(f).extract({ left: 0, top: 118, width: 736, height: 368 }), // 2:1, eyes band only

  // Paint out watermark + stock icon.
  "card-woman-white": async (f) => {
    const img = await raw(f);
    fillFromAbove(img, { x0: 530, y0: 1044, x1: 736, y1: 1104 });
    fillFromAbove(img, { x0: 4, y0: 6, x1: 48, y1: 42 });
    return toSharp(img);
  },

  // Remove the decorative frame and the S·A·B·A logo on the jacket.
  "money-road": async (f) => {
    const img = await raw(f);
    patchDark(img, { x0: 368, y0: 338, x1: 414, y1: 400 });
    return toSharp(img).extract({ left: 32, top: 32, width: 672, height: 672 });
  },

  // Fake-transparency checkerboard -> real transparency, trimmed and squared.
  "pos-terminal": async (f) => {
    const img = await raw(f);
    const isBg = (r, g, b) => Math.min(r, g, b) >= 235 && Math.max(r, g, b) - Math.min(r, g, b) <= 10;
    const cut = dropIslands(removeBackground(img, isBg, (r, g, b) => [r, g, b, 150]));
    const trimmed = await toSharp(cut, 4).png().toBuffer().then((b) => sharp(b).trim().toBuffer({ resolveWithObject: true }));
    const side = Math.max(trimmed.info.width, trimmed.info.height) + 16;
    return sharp(trimmed.data).resize(side, side, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  },
};

async function logo() {
  const img = await raw(`${SRC}/logo.jpg`);
  const isBg = (r, g, b) => Math.min(r, g, b) >= 246;
  const cut = removeBackground(img, isBg, unWhite, 3);
  const png = await toSharp(cut, 4).png().toBuffer();
  const trimmed = sharp(png).trim({ threshold: 1 }).extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } });
  await trimmed.clone().png({ compressionLevel: 9 }).toFile(`${OUT}/logo.png`);
  await trimmed.clone().webp({ ...WEBP, alphaQuality: 100 }).toFile(`${OUT}/logo.webp`);

  // Light variant for dark backgrounds: navy strokes become white, amber stays.
  const { data, info } = await trimmed.clone().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const [r, b] = [data[i], data[i + 2]];
    if (b >= r && r < 170) data[i] = data[i + 1] = data[i + 2] = 255;
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ ...WEBP, alphaQuality: 100 })
    .toFile(`${OUT}/logo-light.webp`);

  // Favicon: the mark centred on a transparent square.
  await trimmed.clone().resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toFile("src/app/icon.png");
}

await mkdir(OUT, { recursive: true });
for (const [name, job] of Object.entries(jobs)) {
  const pipeline = await job(`${SRC}/${name}.jpg`);
  const info = await pipeline.webp(WEBP).toFile(`${OUT}/${name}.webp`);
  console.log(`${name}.webp`.padEnd(26), `${info.width}x${info.height}`, `${(info.size / 1024).toFixed(0)} KB`);
}
await logo();
for (const f of ["logo.png", "logo.webp"]) {
  const m = await sharp(`${OUT}/${f}`).metadata();
  console.log(f.padEnd(26), `${m.width}x${m.height}`, `${((m.size ?? 0) / 1024).toFixed(0)} KB`);
}
