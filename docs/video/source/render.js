/* ==========================================================================
   render.js — renders launch.html frame by frame and encodes it with ffmpeg.
   --------------------------------------------------------------------------
     node render.js                     → out/animatic.mp4 (the preview)
     node render.js --mode overlay      → out/overlay/%05d.png (graphics layer
                                          with transparency, for the final cut)
     node render.js --from 11 --to 20   → only that stretch
   Needs Playwright with Chromium, ffmpeg, and `npm ci` in frontend/ (fonts).
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const MODE = arg("mode", "animatic");
const FPS = +arg("fps", 30);
const WORKERS = +arg("workers", 3);
const OUT = path.resolve(arg("out", path.join(__dirname, "out")));
const overlay = MODE === "overlay";

async function main() {
  const frameDir = path.join(OUT, overlay ? "overlay" : "frames");
  fs.mkdirSync(frameDir, { recursive: true });
  const url = `file://${path.join(__dirname, "launch.html")}?mode=${MODE}&render=1`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });

  const probe = await browser.newPage();
  await probe.goto(url);
  const duration = await probe.evaluate(() => window.DURATION);
  await probe.close();
  const from = +arg("from", 0);
  const to = +arg("to", duration);
  const frames = [];
  for (let f = Math.round(from * FPS); f < Math.round(to * FPS); f++) frames.push(f);

  let done = 0;
  const started = Date.now();
  await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    await page.goto(url);
    await page.waitForFunction(() => window.timelineReady && document.fonts.status === "loaded");
    await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => null))));
    for (let i = w; i < frames.length; i += WORKERS) {
      const f = frames[i];
      await page.evaluate((t) => window.seek(t), f / FPS);
      const file = path.join(frameDir, `${String(f).padStart(5, "0")}.${overlay ? "png" : "jpg"}`);
      await page.screenshot(overlay ? { path: file, omitBackground: true } : { path: file, type: "jpeg", quality: 94 });
      if (++done % 150 === 0) console.log(`${done}/${frames.length} frames · ${Math.round((Date.now() - started) / 1000)} s`);
    }
    await page.close();
  }));
  await browser.close();

  if (overlay) return console.log(`✓ ${frames.length} overlay frames in ${frameDir}`);
  const first = frames[0];
  const mp4 = path.join(OUT, from === 0 && to === duration ? "animatic.mp4" : `animatic-${from}-${to}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-start_number", String(first),
    "-i", path.join(frameDir, "%05d.jpg"), "-frames:v", String(frames.length),
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4], { stdio: "inherit" });
  console.log(`✓ ${path.relative(process.cwd(), mp4)}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
