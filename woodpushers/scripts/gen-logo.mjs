// Generate the app icon set by rendering the logo in headless Chromium.
// Design: knight silhouette (DejaVu Sans U+265E) on a deep board-green
// gradient, warm off-white glyph. Run from the repo root:
//   node scripts/gen-logo.mjs
import { chromium } from "playwright-core";

const EXE =
  process.env.CHROMIUM_PATH ??
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

function logoHtml(size, { rounded, glyphRatio }) {
  const radius = rounded ? Math.round(size * 0.22) : 0;
  const font = Math.round(size * glyphRatio);
  return `<!doctype html><html><body style="margin:0">
  <div style="width:${size}px;height:${size}px;border-radius:${radius}px;
    background:linear-gradient(160deg,#33684d 0%,#2a5c43 55%,#224a36 100%);
    display:grid;place-items:center;overflow:hidden;position:relative">
    <span style="position:absolute;inset:0;display:grid;place-items:center;
      transform:translate(${size * 0.01}px,-${size * 0.02}px)">
      <span style="font-family:'DejaVu Sans';font-size:${font}px;line-height:1;
        color:#f3efe6;text-shadow:0 ${size * 0.015}px ${size * 0.04}px rgba(0,0,0,0.28)">&#9822;</span>
    </span>
  </div></body></html>`;
}

const jobs = [
  { file: "public/icon-192.png", size: 192, rounded: true, glyphRatio: 0.72 },
  { file: "public/icon-512.png", size: 512, rounded: true, glyphRatio: 0.72 },
  { file: "public/icon-512-maskable.png", size: 512, rounded: false, glyphRatio: 0.56 },
  { file: "app/icon.png", size: 192, rounded: true, glyphRatio: 0.72 },
  { file: "app/apple-icon.png", size: 180, rounded: false, glyphRatio: 0.7 },
];

const browser = await chromium.launch({ executablePath: EXE });
for (const j of jobs) {
  const page = await browser.newPage({
    viewport: { width: j.size, height: j.size },
    deviceScaleFactor: 1,
  });
  await page.setContent(logoHtml(j.size, j), { waitUntil: "load" });
  await page.waitForTimeout(150);
  await page.screenshot({ path: j.file, omitBackground: j.rounded });
  await page.close();
  console.log("wrote", j.file);
}
await browser.close();
