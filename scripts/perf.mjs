#!/usr/bin/env node
/**
 * Frame-time measurement.
 *
 * The portfolio copy claims "60fps on 100+ repos". This measures it, on stated
 * hardware, and writes docs/perf.json — which the guards then require to exist
 * before the README is allowed to state any FPS number at all.
 *
 *   node scripts/perf.mjs --repos 100 --repos 250
 *
 * IMPORTANT CAVEAT, and it is recorded in the output: headless Chromium has no
 * GPU here, so this runs on SwiftShader — a CPU rasteriser. Those numbers are a
 * FLOOR, not a representative desktop figure. Any public claim has to say which
 * one it is.
 */
import fs from 'node:fs';
import os from 'node:os';
import { execSync } from 'node:child_process';
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
const counts = argv.reduce((acc, v, i) => {
  if (v === '--repos') acc.push(Number(argv[i + 1]));
  return acc;
}, []);
const REPO_COUNTS = counts.length ? counts : [100, 250];
const BASE = arg('base', 'http://localhost:4173');
const OUT = arg('out', 'docs/perf.json');
const HOLD = Number(arg('hold', '6000'));

const HEADED = argv.includes('--headed');

/**
 * Headless Chromium has no GPU, so it rasterises on the CPU via SwiftShader.
 * Numbers from that path are a floor and cannot support or refute a 60fps
 * claim. --headed opens a real window and uses the real GPU, which is the only
 * way to get a figure that means anything for a desktop visitor.
 */
const chromium = loadChromium();
const browser = await chromium.launch(
  HEADED
    ? { headless: false, args: ['--window-size=1500,1000'] }
    : {
        headless: true,
        args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
      }
);

const runs = [];

for (const count of REPO_COUNTS) {
  const repos = makeRepos(count);
  const user = makeUser('fixture', count);

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**://api.github.com/**', (r) => {
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

  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.fill('input[aria-label="GitHub username"]', 'fixture');
  await page.keyboard.press('Enter');

  // Let the entrance finish before sampling — the entrance is a transient,
  // not the steady state the claim is about.
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    window.__vizFrameStats = null;
  });
  await page.waitForTimeout(HOLD);

  const stats = await page.evaluate(() => window.__vizFrameStats);
  const drawCalls = await page.evaluate(() => window.__vizDrawCalls ?? null);

  if (stats) {
    runs.push({
      repos: count,
      samples: stats.samples,
      medianMs: Number(stats.median.toFixed(2)),
      p95Ms: Number(stats.p95.toFixed(2)),
      worstMs: Number(stats.worst.toFixed(2)),
      medianFps: Number((1000 / stats.median).toFixed(1)),
      p95Fps: Number((1000 / stats.p95).toFixed(1)),
      // Time actually spent inside the render loop. On fast hardware the frame
      // INTERVAL is pinned by vsync and says nothing about headroom; this does.
      workMedianMs: stats.workMedian != null ? Number(stats.workMedian.toFixed(2)) : null,
      workP95Ms: stats.workP95 != null ? Number(stats.workP95.toFixed(2)) : null,
      drawCalls
    });
    const r = runs[runs.length - 1];
    console.log(
      `${count} repos  median ${r.medianMs}ms (${r.medianFps} fps)  ` +
        `p95 ${r.p95Ms}ms (${r.p95Fps} fps)  work ${r.workMedianMs}ms/p95 ${r.workP95Ms}ms` +
        (drawCalls != null ? `  draw calls ${drawCalls}` : '')
    );
  } else {
    console.log(`${count} repos — no stats collected`);
  }

  await ctx.close();
}

await browser.close();

const report = {
  measuredAt: new Date().toISOString().slice(0, 10),
  renderer: HEADED
    ? 'GPU-backed Chromium (headed) on the machine named below'
    : 'SwiftShader (software WebGL2) — headless Chromium, no GPU',
  mode: HEADED ? 'headed' : 'headless',
  caveat: HEADED
    ? 'Measured in a GPU-backed browser window on one machine. Representative ' +
      'of that machine only; a public claim must name the hardware.'
    : 'These are a FLOOR, not a desktop figure. Headless Chromium here has no ' +
      'GPU, so rasterisation runs on the CPU via SwiftShader. Any public FPS ' +
      'claim must state which of the two it is.',
  hardware: (() => {
    try {
      if (process.platform === 'darwin') {
        return execSync('sysctl -n machdep.cpu.brand_string').toString().trim();
      }
    } catch {}
    return `${os.type()} ${os.arch()} x${os.cpus().length}`;
  })(),
  viewport: '1440x900',
  runs
};

// Merge rather than overwrite: the headless (SwiftShader) floor and the
// GPU-backed figure are both worth keeping, and a public claim needs to name
// which one it is quoting.
fs.mkdirSync('docs', { recursive: true });
let existing = {};
try {
  existing = JSON.parse(fs.readFileSync(OUT, 'utf8'));
} catch {}
const merged = {
  measuredAt: report.measuredAt,
  hardware: report.hardware,
  viewport: report.viewport,
  modes: { ...(existing.modes || {}), [report.mode]: {
    renderer: report.renderer,
    caveat: report.caveat,
    runs: report.runs
  } }
};
fs.writeFileSync(OUT, JSON.stringify(merged, null, 2) + '\n');
console.log(`\nwrote ${OUT} (mode: ${report.mode})`);
