#!/usr/bin/env node
/**
 * Screenshot harness — the other half of every sprint gate.
 *
 * "It builds" is not "it works." This drives a real browser against the
 * production build at 1440x900 and 390x844, with GitHub mocked from
 * tests/fixtures so the run never depends on the network or on the
 * 60 req/hour unauthenticated limit.
 *
 *   node scripts/shots.mjs --tag s1 --out /tmp/shots
 *   node scripts/shots.mjs --tag s1 --repos 250
 *
 * Requires a server already running on --base (default http://localhost:4173).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { makeRepos, makeUser, README_TEXT } from '../tests/fixtures/github.mjs';

const require_ = createRequire(import.meta.url);

/** Playwright is not a dependency of this app; borrow it if it is installed. */
function loadChromium() {
  const candidates = [
    'playwright',
    '/Users/brunojaamaa/bruno-portfolio/node_modules/playwright/index.js'
  ];
  for (const c of candidates) {
    try {
      return require_(c).chromium;
    } catch {
      /* try next */
    }
  }
  throw new Error(
    'Playwright not found. Install it (npm i -D playwright) or run from a ' +
      'checkout that has it.'
  );
}

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const BASE = arg('base', 'http://localhost:4173');
const OUT = arg('out', 'shots');
const TAG = arg('tag', 'shot');
const REPO_COUNT = Number(arg('repos', '100'));
const SETTLE = Number(arg('settle', '2600'));

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
];

const repos = makeRepos(REPO_COUNT);
const user = makeUser('fixture', REPO_COUNT);

/** Serve every api.github.com call from the fixtures. */
async function mockGitHub(context) {
  await context.route('**://api.github.com/**', async (route) => {
    const url = route.request().url();
    const json = (body) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600)
        },
        body: JSON.stringify(body)
      });

    if (/\/readme/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: README_TEXT
      });
    }
    if (/\/users\/[^/]+\/repos/.test(url)) return json(repos);
    if (/\/search\/users/.test(url)) return json({ items: [] });
    if (/\/users\//.test(url)) return json(user);
    return json({});
  });
}

const chromium = loadChromium();
fs.mkdirSync(OUT, { recursive: true });

/**
 * Headless Chromium ships with NO WebGL at all — `canvas.getContext('webgl2')`
 * returns null. Without these flags every screenshot of this app would show an
 * empty scene and the harness would silently "pass" while verifying nothing.
 * SwiftShader gives a software WebGL2 context so the 3D scene actually renders.
 */
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
let failed = false;

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    reducedMotion: has('reduced-motion') ? 'reduce' : 'no-preference'
  });
  await mockGitHub(context);

  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

  await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
  // MOTION.md: "cold load with no input: styled, branded, moving scene within
  // 2s". The ambient entrance is 88 spheres x 15ms stagger + 500ms grow, so
  // 2000ms is the bar being checked, not an arbitrary wait.
  await page.waitForTimeout(Number(arg('empty-settle', '2000')));

  // 1 — empty state, the view most visitors will only ever see
  const empty = path.join(OUT, `${TAG}-${vp.name}-empty.png`);
  await page.screenshot({ path: empty });
  console.log(`  ${empty}`);

  // 2 — populated state, driven through the real search path
  const input = page.locator('input[aria-label="GitHub username"]');
  if (await input.count()) {
    await input.fill('fixture');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(SETTLE);
    const full = path.join(OUT, `${TAG}-${vp.name}-scene.png`);
    await page.screenshot({ path: full });
    console.log(`  ${full}`);
  }

  // 3 — every rail module expanded, which is where overlap bugs hide
  if (has('expand')) {
    const heads = page.locator('[data-hud-head]');
    const n = await heads.count();
    for (let i = 0; i < n; i++) await heads.nth(i).click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(700);
    const open = path.join(OUT, `${TAG}-${vp.name}-open.png`);
    await page.screenshot({ path: open, fullPage: false });
    console.log(`  ${open}`);
  }

  if (errors.length) {
    failed = true;
    console.log(`  ✗ ${vp.name} console errors (${errors.length}):`);
    errors.slice(0, 6).forEach((e) => console.log(`      ${e}`));
  } else {
    console.log(`  ✓ ${vp.name} no console errors`);
  }

  await context.close();
}

await browser.close();
console.log(failed ? 'FAIL — console errors present' : 'PASS — clean run');
process.exit(failed ? 1 : 0);
