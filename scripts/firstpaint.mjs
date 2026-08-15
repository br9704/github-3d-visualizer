#!/usr/bin/env node
/**
 * Time to the first rendered frame, on a throttled link.
 *
 *   node scripts/firstpaint.mjs [--samples 5] [--profile 4g] [--json docs/firstpaint.json]
 *
 * WHY THIS EXISTS
 *
 * MOTION.md's first acceptance line is binding: "Cold load with no input:
 * styled, branded, moving scene within 2s." Until now the only thing checking
 * it was motion-check.mjs, which loads over localhost — where the entire
 * bundle arrives in a few milliseconds and *every* build passes. That gate
 * could not fail, so it was not measuring the claim.
 *
 * It matters here specifically because S10 splits Three.js into its own chunk.
 * Splitting is unambiguously good for the HUD, which now paints from a small
 * chunk. It is not automatically good for the scene: a dynamic import is not
 * requested until the chunk that contains the import statement has been
 * downloaded, parsed and run, so the largest asset in the app can end up
 * queued *behind* the smallest ones instead of travelling beside them. On
 * localhost that costs nothing. On a real connection it is the whole hero
 * moment.
 *
 * So this measures the thing the claim is actually about: wall-clock time from
 * navigation to the first frame the renderer draws, over a link a visitor
 * might plausibly have.
 *
 * The signal is `window.__vizFrames`, which the render loop increments once
 * per drawn frame. It is trapped with a setter rather than polled, so the
 * timestamp is the frame itself and not up to one poll interval later.
 *
 * This script starts and owns its own preview server on a free port. An
 * earlier version of the harness trusted a fixed port, found another project's
 * dev server sitting on it, and cheerfully measured a different application.
 */
import fs from 'node:fs';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

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

/**
 * Chrome DevTools' own presets. Throughput is bytes/second.
 * `local` keeps a no-throttle baseline in the table, because the point of the
 * table is that localhost and a real link disagree.
 */
const PROFILES = {
  local: { label: 'localhost (no throttle)', throttle: null },
  '4g': {
    label: '4G — 9 Mbit/s down, 40 ms RTT',
    throttle: { downloadThroughput: 1_125_000, uploadThroughput: 187_500, latency: 40 }
  },
  '3g': {
    label: 'Fast 3G — 1.6 Mbit/s down, 563 ms RTT',
    throttle: { downloadThroughput: 188_743, uploadThroughput: 86_400, latency: 563 }
  }
};

const SAMPLES = Number(arg('samples', '5'));
const WANTED = arg('profile', null);
const JSON_OUT = arg('json', null);
const BUDGET_MS = Number(arg('budget', '2000'));
const profiles = WANTED ? [WANTED] : ['local', '4g', '3g'];

/** An OS-assigned free port, so this never lands on another project's server. */
async function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitFor(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`preview server never came up at ${url}`);
}

if (!fs.existsSync('dist/index.html')) {
  console.error('no dist/ — run `npm run build` first.');
  process.exit(1);
}

const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const server = spawn(
  'npx',
  ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
  { stdio: 'ignore' }
);
process.on('exit', () => server.kill());

await waitFor(base);

/**
 * Record the moment of the first drawn frame. The render loop does
 * `window.__vizFrames = (window.__vizFrames || 0) + 1`, so trapping the first
 * write gives the exact timestamp, and then gets out of the way by replacing
 * itself with an ordinary property.
 */
const PROBE = `
  window.__firstFrameAt = null;
  Object.defineProperty(window, '__vizFrames', {
    configurable: true,
    get() { return 0 },
    set(v) {
      window.__firstFrameAt = performance.now();
      Object.defineProperty(window, '__vizFrames', {
        value: v, writable: true, configurable: true
      });
    }
  });
`;

const chromium = loadChromium();
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const results = [];

for (const key of profiles) {
  const profile = PROFILES[key];
  if (!profile) {
    console.error(`unknown profile "${key}" — one of ${Object.keys(PROFILES).join(', ')}`);
    process.exit(1);
  }

  const samples = [];
  for (let i = 0; i < SAMPLES; i++) {
    // A fresh context per sample: a warm HTTP cache would make every run after
    // the first measure nothing at all.
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(PROBE);
    const page = await ctx.newPage();

    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    if (profile.throttle) {
      await cdp.send('Network.emulateNetworkConditions', { offline: false, ...profile.throttle });
    }

    await page.goto(base, { waitUntil: 'commit' });
    try {
      await page.waitForFunction(() => window.__firstFrameAt != null, null, { timeout: 60_000 });
      samples.push(await page.evaluate(() => window.__firstFrameAt));
    } catch {
      samples.push(null);
    }
    await ctx.close();
  }

  const good = samples.filter((s) => s != null);
  const row = {
    profile: key,
    label: profile.label,
    samples: good.length,
    medianMs: good.length ? Math.round(median(good)) : null,
    minMs: good.length ? Math.round(Math.min(...good)) : null,
    maxMs: good.length ? Math.round(Math.max(...good)) : null
  };
  results.push(row);
  console.log(
    `${key.padEnd(6)} ${String(row.medianMs).padStart(6)} ms median  ` +
      `(${row.minMs}–${row.maxMs} ms, n=${row.samples})  ${profile.label}`
  );
}

await browser.close();
server.kill();

if (JSON_OUT) {
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(
    JSON_OUT,
    JSON.stringify(
      {
        measuredAt: new Date().toISOString().slice(0, 10),
        note:
          'Time from navigation to the first frame the renderer draws, cold cache, ' +
          'software WebGL (SwiftShader). MOTION.md requires a moving scene within 2s.',
        budgetMs: BUDGET_MS,
        results
      },
      null,
      2
    ) + '\n'
  );
  console.log(`\nwrote ${JSON_OUT}`);
}

// The 2s bar is MOTION.md's, and 4G is the link it is judged on: a visitor on
// a phone is exactly who the empty state exists for.
const gate = results.find((r) => r.profile === '4g');
if (gate) {
  if (gate.medianMs == null) {
    console.log(`\nFAIL — no frame ever rendered on 4G`);
    process.exit(1);
  }
  if (gate.medianMs > BUDGET_MS) {
    console.log(`\nFAIL — 4G first frame ${gate.medianMs} ms over the ${BUDGET_MS} ms bar`);
    process.exit(1);
  }
  console.log(`\nPASS — 4G first frame ${gate.medianMs} ms, within the ${BUDGET_MS} ms bar`);
}
