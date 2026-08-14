#!/usr/bin/env node
/**
 * Capture the README assets.
 *
 * MOTION.md is explicit: "The README hero is a recording of the entrance
 * sequence, not a static render." So this drives the real app in a real
 * browser and records the sequence, rather than compositing something.
 *
 *   node scripts/capture.mjs            # stills + hero GIF
 *   node scripts/capture.mjs --stills   # stills only
 *
 * GitHub renders animated GIF inline in a README; it does not play webm, which
 * is why the hero is a GIF rather than the video Playwright can record.
 *
 * Requires a server on --base and ffmpeg on PATH.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { makeRepos, makeUser, README_TEXT } from '../tests/fixtures/github.mjs';

const require_ = createRequire(import.meta.url);
function loadChromium() {
  for (const c of [
    'playwright',
    '/Users/brunojaamaa/bruno-portfolio/node_modules/playwright/index.js'
  ]) {
    try {
      return require_(c).chromium;
    } catch {}
  }
  throw new Error('Playwright not found.');
}

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};
const BASE = arg('base', 'http://localhost:4173');
const OUT = arg('out', 'docs');
const STILLS_ONLY = argv.includes('--stills');

fs.mkdirSync(OUT, { recursive: true });

const repos = makeRepos(100);
const user = makeUser('fixture', 100);

/**
 * The captured profile is a fixture, not a real account. Using a real
 * username would put someone else's repository names in this project's README
 * and make the asset impossible to reproduce once their profile changed.
 */
async function mock(ctx) {
  await ctx.route('**/api/github/**', (r) => {
    const url = r.request().url();
    const json = (b) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (/\/readme/.test(url))
      return r.fulfill({ status: 200, contentType: 'text/plain', body: README_TEXT });
    if (/\/users\/[^/]+\/repos/.test(url)) return json(repos);
    if (/\/search\/users/.test(url)) return json({ items: [] });
    if (/\/users\//.test(url)) return json(user);
    return json({});
  });
}

const chromium = loadChromium();
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});

/* ── Stills ──────────────────────────────────────────────────────────────── */

const SHOTS = [
  { name: 'empty-desktop', width: 1440, height: 900, search: false },
  { name: 'empty-mobile', width: 390, height: 844, search: false },
  { name: 'scene-desktop', width: 1440, height: 900, search: true },
  { name: 'scene-mobile', width: 390, height: 844, search: true }
];

for (const shot of SHOTS) {
  const ctx = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 2 // retina, so the README asset is not soft
  });
  await mock(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);

  if (shot.search) {
    await page.fill('input[aria-label="GitHub username"]', 'fixture');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(6000);
  }

  const file = path.join(OUT, `${shot.name}.png`);
  await page.screenshot({ path: file });
  console.log(`  ${file}`);
  await ctx.close();
}

/* ── Hero recording ──────────────────────────────────────────────────────── */

if (!STILLS_ONLY) {
  const FRAMES = 60;
  const INTERVAL = 110; // ms between captures -> ~6.6s of sequence
  const tmp = fs.mkdtempSync(path.join(OUT, '.frames-'));

  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 750 },
    deviceScaleFactor: 1
  });
  await mock(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });

  // Start on the ambient galaxy so the recording shows the whole story:
  // living empty state -> typing -> dissolve -> entrance -> settle.
  await page.waitForTimeout(1800);

  let frame = 0;
  const grab = async () => {
    await page.screenshot({
      path: path.join(tmp, `f${String(frame++).padStart(3, '0')}.png`)
    });
  };

  for (let i = 0; i < 8; i++) {
    await grab();
    await page.waitForTimeout(INTERVAL);
  }

  await page.click('input[aria-label="GitHub username"]');
  for (const ch of 'fixture') {
    await page.keyboard.type(ch);
    await grab();
    await page.waitForTimeout(60);
  }

  await page.keyboard.press('Enter');
  while (frame < FRAMES) {
    await grab();
    await page.waitForTimeout(INTERVAL);
  }

  await ctx.close();

  const gif = path.join(OUT, 'hero.gif');
  // Two-pass palette: a single global palette makes the warm-black ground
  // band badly, and banding is the one thing that would make this look cheap.
  const palette = path.join(tmp, 'palette.png');
  execFileSync('ffmpeg', [
    '-y', '-framerate', '9', '-i', path.join(tmp, 'f%03d.png'),
    '-vf', 'scale=860:-1:flags=lanczos,palettegen=max_colors=160:stats_mode=diff',
    palette
  ], { stdio: 'ignore' });
  execFileSync('ffmpeg', [
    '-y', '-framerate', '9', '-i', path.join(tmp, 'f%03d.png'), '-i', palette,
    '-lavfi', 'scale=860:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5',
    '-loop', '0', gif
  ], { stdio: 'ignore' });

  fs.rmSync(tmp, { recursive: true, force: true });
  const kb = (fs.statSync(gif).size / 1024).toFixed(0);
  console.log(`  ${gif} (${kb} kB, ${frame} frames)`);
}

await browser.close();
console.log('\ncaptured');
