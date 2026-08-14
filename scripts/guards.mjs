#!/usr/bin/env node
/**
 * Design-system and honesty guards.
 *
 * These are the mechanical half of a sprint gate — the half a build can check.
 * The other half is looking at a screenshot, which no script can do for you.
 *
 *   npm run guards
 *
 * Exits non-zero on any violation, so CI can gate on it (S9).
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'src';
const failures = [];
const notes = [];

/** Walk src/ and yield [relPath, contents] for matching files. */
function* files(exts, dir = SRC) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(exts, p);
    else if (exts.some((e) => entry.name.endsWith(e))) {
      yield [p, fs.readFileSync(p, 'utf8')];
    }
  }
}

function check(name, fn) {
  const hits = fn();
  if (hits.length) {
    failures.push({ name, hits });
    console.log(`✗ ${name} — ${hits.length} violation(s)`);
    for (const h of hits.slice(0, 8)) console.log(`    ${h}`);
    if (hits.length > 8) console.log(`    … and ${hits.length - 8} more`);
  } else {
    console.log(`✓ ${name}`);
  }
}

// ── 1. No emoji in the UI ────────────────────────────────────────────────
// Extended_Pictographic catches ⭐ ✅ ❌ ⚡ 🔥 📥 and the emoji-presentation
// forms of ▶ ▪. It deliberately permits → ← ▸ ▾ ✓ ✕ ░ █ ┌ ─ ┐ — those are
// monospace glyphs, which the system asks for.
check('no emoji in src/', () => {
  const re = /\p{Extended_Pictographic}|️/u;
  const hits = [];
  for (const [p, s] of files(['.js', '.jsx', '.css'])) {
    s.split('\n').forEach((line, i) => {
      const m = line.match(new RegExp(re, 'gu'));
      if (m) hits.push(`${p}:${i + 1}  ${m.join('')}  ${line.trim().slice(0, 50)}`);
    });
  }
  return hits;
});

// ── 2. Geometry: border-radius max 2px ───────────────────────────────────
check('border-radius <= 2px', () => {
  const hits = [];
  for (const [p, s] of files(['.css', '.jsx'])) {
    s.split('\n').forEach((line, i) => {
      // Skip comments — the rule is documented in prose in signal.css.
      if (/^\s*(\*|\/\/|\/\*)/.test(line)) return;
      const m = line.match(/border-?[Rr]adius:?\s*['"]?([^;,'"}\n]+)/);
      if (!m) return;
      const v = m[1].trim();
      if (v.startsWith('var(--radius)') || v === '0' || v === '0px') return;
      const px = v.match(/^(\d+(?:\.\d+)?)px$/);
      if (px && Number(px[1]) <= 2) return;
      hits.push(`${p}:${i + 1}  ${line.trim().slice(0, 60)}`);
    });
  }
  return hits;
});

// ── 3. No light theme ────────────────────────────────────────────────────
check('no light theme', () => {
  const hits = [];
  for (const [p, s] of files(['.css', '.js', '.jsx'])) {
    s.split('\n').forEach((line, i) => {
      if (/data-theme.{0,3}light|prefers-color-scheme:\s*light/.test(line)) {
        hits.push(`${p}:${i + 1}  ${line.trim().slice(0, 60)}`);
      }
    });
  }
  return hits;
});

// ── 4. No shadows ────────────────────────────────────────────────────────
check('no shadows', () => {
  const hits = [];
  for (const [p, s] of files(['.css', '.jsx'])) {
    s.split('\n').forEach((line, i) => {
      if (/(box|text)-[Ss]hadow\s*:/.test(line) && !/none/.test(line)) {
        hits.push(`${p}:${i + 1}  ${line.trim().slice(0, 60)}`);
      }
    });
  }
  return hits;
});

// ── 5. Colour: only SIGNAL tokens ────────────────────────────────────────
// Language swatches are DATA and are generated in JSX from utils/colors.js,
// so they never appear as literals in CSS.
const PALETTE = new Set([
  '#050505', '#0b0a09', '#100e0c', '#f0ece4', '#98928a', '#55504a',
  '#ffb000', '#ffc94d', '#8f6300', '#2c2925', '#1b1916', '#3fb950'
]);
check('only SIGNAL palette hex values in CSS', () => {
  const hits = [];
  for (const [p, s] of files(['.css'])) {
    s.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        if (!PALETTE.has(m[0].toLowerCase())) {
          hits.push(`${p}:${i + 1}  ${m[0]}  ${line.trim().slice(0, 46)}`);
        }
      }
    });
  }
  return hits;
});

// ── 6. Every CSS custom property resolves ────────────────────────────────
check('every var(--x) is defined in signal.css', () => {
  const signal = fs.readFileSync('src/styles/signal.css', 'utf8');
  const defined = new Set(
    [...signal.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1])
  );
  const hits = [];
  for (const [p, s] of files(['.css'])) {
    for (const m of s.matchAll(/var\((--[a-z0-9-]+)/g)) {
      if (!defined.has(m[1])) hits.push(`${p}  ${m[1]}`);
    }
  }
  return [...new Set(hits)];
});

// ── 7. Honesty: no placeholder hero, no unbacked perf claims ─────────────
check('README claims nothing the repo cannot back', () => {
  const readme = fs.readFileSync('README.md', 'utf8');
  const hits = [];
  if (readme.includes('via.placeholder.com')) hits.push('README.md  via.placeholder.com hero');
  // A bare FPS number is only allowed if a measurement artifact exists.
  const fps = readme.match(/\b\d+\s*(?:FPS|fps)\b/g);
  if (fps && !fs.existsSync('docs/perf.json')) {
    hits.push(`README.md  ${fps.join(', ')} with no docs/perf.json behind it`);
  }
  return hits;
});

// ── 8. No secret can reach the client bundle ─────────────────────────────
check('no GitHub token literal in src/', () => {
  const hits = [];
  for (const [p, s] of files(['.js', '.jsx'])) {
    s.split('\n').forEach((line, i) => {
      if (/\b(gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,})/.test(line)) {
        hits.push(`${p}:${i + 1}  token literal`);
      }
    });
  }
  return hits;
});

console.log('');
if (notes.length) notes.forEach((n) => console.log(`note: ${n}`));
if (failures.length) {
  console.log(`FAIL — ${failures.length} guard(s) failed`);
  process.exit(1);
}
console.log('PASS — all guards green');
