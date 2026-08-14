#!/usr/bin/env node
/**
 * Rotation-tolerant screenshot comparison.
 *
 *   node scripts/histcmp.mjs before.png after.png
 *
 * Used to prove the Three.js 0.159 -> 0.185 upgrade changed nothing visible.
 */
// Rotation-tolerant comparison: the scene auto-orbits, so pixel diffs are
// meaningless. A colour histogram is not — if colour management or lighting
// changed across the Three.js upgrade, the distribution moves.
import { createRequire } from 'node:module';
const require_ = createRequire(import.meta.url);
const { chromium } = require_('/Users/brunojaamaa/bruno-portfolio/node_modules/playwright/index.js');

async function hist(file) {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });
  const data = await p.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    // Scene region only — exclude the HUD rails.
    const d = g.getImageData(340, 40, 860, 820).data;
    const bins = new Array(16 * 3).fill(0);
    let lit = 0;
    for (let i = 0; i < d.length; i += 4) {
      const [r, gg, bb] = [d[i], d[i + 1], d[i + 2]];
      if (r + gg + bb < 40) continue;   // background
      lit++;
      bins[Math.min(15, r >> 4)]++;
      bins[16 + Math.min(15, gg >> 4)]++;
      bins[32 + Math.min(15, bb >> 4)]++;
    }
    return { bins, lit };
  }, 'data:image/png;base64,' + (await import('node:fs')).readFileSync(file).toString('base64'));
  await b.close();
  return data;
}

const [a, bFile] = process.argv.slice(2);
const A = await hist(a), B = await hist(bFile);
const norm = (h) => h.bins.map((v) => v / Math.max(1, h.lit));
const na = norm(A), nb = norm(B);
// Total variation distance across the three channel histograms.
let tv = 0;
for (let i = 0; i < na.length; i++) tv += Math.abs(na[i] - nb[i]);
tv /= 3 * 2; // per-channel, normalised to [0,1]
console.log(`lit pixels: before=${A.lit}  after=${B.lit}  (delta ${((B.lit - A.lit) / A.lit * 100).toFixed(1)}%)`);
console.log(`colour histogram total-variation distance: ${tv.toFixed(4)}`);
console.log(tv < 0.06 ? 'PASS — colour distribution unchanged within orbit tolerance' : 'FAIL — colour distribution shifted');
