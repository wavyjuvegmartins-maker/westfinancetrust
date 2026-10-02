// Builds the installable-app icons in public/app from the logo.
// Run with: node scripts/make-app-icons.mjs
import sharp from "sharp";

const LOGO = "public/images/logo.png";
const OUT = "public/app";
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// The logo centred on a white square. `pad` is the share of the side left
// empty around it; maskable icons need ~20% so Android's mask shapes don't clip it.
async function icon(size, pad, file) {
  const inner = Math.round(size * (1 - pad * 2));
  const mark = await sharp(LOGO).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: mark, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/${file}`);
  console.log(`${OUT}/${file}`);
}

await icon(192, 0.1, "icon-192.png");
await icon(512, 0.1, "icon-512.png");
await icon(512, 0.2, "icon-maskable-512.png");
// Android's small status-bar icon: the logo's shape in white on transparent.
const badgeMark = await sharp(LOGO).resize(80, 80, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < badgeMark.data.length; i += 4) badgeMark.data[i] = badgeMark.data[i + 1] = badgeMark.data[i + 2] = 255;
await sharp({ create: { width: 96, height: 96, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: await sharp(badgeMark.data, { raw: badgeMark.info }).png().toBuffer(), gravity: "center" }])
  .png()
  .toFile(`${OUT}/badge-96.png`);
console.log(`${OUT}/badge-96.png`);

// iOS home-screen icon, picked up by the app/apple-icon.png file convention.
await icon(180, 0.1, "../../src/app/apple-icon.png");
