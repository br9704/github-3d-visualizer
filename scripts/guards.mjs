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
// The palette again, as "r, g, b" — because a colour written rgba(59,130,246,.12)
// is the same violation as #3b82f6 and the hex-only check could not see it.
// That hole was not theoretical: it hid a blue info panel, an indigo button
// hover, two slate-grey text colours and a literal white label through S1's
// entire colour purge and every gate since.
const PALETTE_RGB = new Set(
  [...PALETTE].map((hex) => {
    const h = hex.length === 4
      ? [...hex.slice(1)].map((c) => c + c).join('')
      : hex.slice(1, 7);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
  })
);
check('only SIGNAL palette colours in CSS', () => {
  const hits = [];
  for (const [p, s] of files(['.css'])) {
    s.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        if (!PALETTE.has(m[0].toLowerCase())) {
          hits.push(`${p}:${i + 1}  ${m[0]}  ${line.trim().slice(0, 46)}`);
        }
      }
      // rgb()/rgba() with a literal triple. Alpha is free — transparency over
      // the warm-black ground is how the panels are built — but the underlying
      // colour still has to be one of ours.
      for (const m of line.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*[,)]/g)) {
        const rgb = `${m[1]},${m[2]},${m[3]}`;
        if (!PALETTE_RGB.has(rgb)) {
          hits.push(`${p}:${i + 1}  rgb(${rgb})  ${line.trim().slice(0, 40)}`);
        }
      }
    });
  }
  return hits;
});

// ── 5b. Tokens used in the wrong role ────────────────────────────────────
// A text token used as a BACKGROUND produces a light box on a dark ground —
// that is how the export panel ended up with white cards after the S1 colour
// map, which only knew each colour's text role.
check('no token used in the wrong role', () => {
  const hits = [];
  for (const [p, s] of files(['.css'])) {
    s.split('\n').forEach((line, i) => {
      if (/^\s*(\*|\/\/|\/\*)/.test(line)) return;
      if (/background(-color)?:\s*var\(--text-(primary|secondary)\)/.test(line))
        hits.push(`${p}:${i + 1}  text token as background — ${line.trim().slice(0, 44)}`);
      if (/^\s*color:\s*var\(--(bg|surface|surface-raised|hairline)\)/.test(line))
        hits.push(`${p}:${i + 1}  surface token as text — ${line.trim().slice(0, 44)}`);
      if (/background(-color)?:\s*(white|#fff\b|#ffffff\b)/i.test(line))
        hits.push(`${p}:${i + 1}  literal white background`);
    });
  }
  return hits;
});

// ── 5c. Only HudLayout positions chrome ──────────────────────────────────
// Eleven components each declaring `position: fixed` is what produced the
// detached panel and the overlaps. Overlays and the scene are exempt.
check('only HudLayout positions chrome', () => {
  const EXEMPT = /HudLayout\.css|Header\.css|App\.css|RepoDetails\.css|KeyboardHelpModal\.css/;
  const EXEMPT_SEL = /overlay|\.scene|\.hud|\.app::after|dialog|modal|tooltip/i;
  const hits = [];
  for (const [p, s] of files(['.css'])) {
    if (EXEMPT.test(p)) continue;
    const lines = s.split('\n');
    lines.forEach((line, i) => {
      if (!/position:\s*fixed/.test(line)) return;
      // Look back for the selector this rule belongs to.
      let sel = '';
      for (let j = i; j >= 0 && j > i - 12; j--) {
        if (lines[j].includes('{')) { sel = lines[j]; break; }
      }
      if (EXEMPT_SEL.test(sel)) return;
      hits.push(`${p}:${i + 1}  ${sel.trim().slice(0, 50)}`);
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

  // Every local image the README references must actually exist. A README
  // pointing at a missing screenshot is the same class of problem as the
  // placeholder hero it replaced.
  for (const m of readme.matchAll(/!\[[^\]]*\]\((?!https?:)([^)]+)\)/g)) {
    if (!fs.existsSync(m[1])) hits.push(`README.md  missing image: ${m[1]}`);
  }
  // A CI badge must point at a workflow that exists and actually runs the
  // suite. A badge for a workflow that only builds is the same overstatement
  // as ten test reports against zero tests.
  const badge = readme.match(/actions\/workflows\/([\w.-]+)\/badge\.svg/);
  if (badge) {
    const wf = `.github/workflows/${badge[1]}`;
    if (!fs.existsSync(wf)) {
      hits.push(`README.md  badge points at missing workflow ${wf}`);
    } else {
      const yml = fs.readFileSync(wf, 'utf8');
      for (const required of ['npm test', 'npm run guards', 'npm run build']) {
        if (!yml.includes(required)) {
          hits.push(`${wf}  badge implies CI, but it never runs \`${required}\``);
        }
      }
    }
  }

  // A bare FPS number is only allowed if a measurement artifact exists.
  const fps = readme.match(/\b\d+\s*(?:FPS|fps)\b/g);
  if (fps && !fs.existsSync('docs/perf.json')) {
    hits.push(`README.md  ${fps.join(', ')} with no docs/perf.json behind it`);
  }
  return hits;
});

// ── 7b. Initial-load budget ──────────────────────────────────────────────
// S10's goal was "the 3D engine loads after first paint", and Vite's own
// chunk-size warning cannot express that: it fires per chunk, so a perfectly
// deferred 545 kB `three` trips it while a 499 kB entry chunk does not.
//
// The thing that actually matters is the BLOCKING graph — the entry chunk plus
// everything it statically imports, transitively. That is what has to be
// downloaded, parsed and executed before React can render anything.
//
// A `<link rel="modulepreload">` is deliberately NOT part of that graph. It is
// a fetch hint: it tells the browser to start downloading a chunk early, but
// nothing waits on it. The scene chunks are preloaded on purpose (see
// preloadSceneChunks in vite.config.js) because without the hint the browser
// will not request Three.js until the entry chunk has downloaded and run,
// which cost 944 ms of the hero moment on a slow link. Reading preload tags as
// though they were imports would flag that fix as the very regression it fixes
// — the two are opposites and this guard has to tell them apart.
const INITIAL_BUDGET_KB = 500;
check('initial JS payload under budget, with three deferred', () => {
  if (!fs.existsSync('dist/index.html')) {
    notes.push('initial-load budget skipped — no dist/, run `npm run build` first');
    return [];
  }
  const html = fs.readFileSync('dist/index.html', 'utf8');
  const hits = [];

  const entry = html.match(/<script[^>]+src="\/([^"]+\.js)"/)?.[1];
  if (!entry) {
    hits.push('dist/index.html  no entry script found — did the build change?');
    return hits;
  }

  /**
   * Walk static imports from the entry chunk. Rollup emits them minified as
   * `from"./react-abc.js"` and bare side-effect `import"./x.js"`. A dynamic
   * import is `import("./x.js")` — the parenthesis is what distinguishes it,
   * and it is excluded on purpose: dynamic means nothing blocks on it.
   */
  const blocking = new Set();
  const walk = (asset) => {
    if (blocking.has(asset)) return;
    blocking.add(asset);
    const file = path.join('dist', asset);
    if (!fs.existsSync(file)) {
      hits.push(`dist/index.html  references missing asset ${asset}`);
      return;
    }
    const code = fs.readFileSync(file, 'utf8');
    const specs = [
      ...code.matchAll(/from\s*["']\.\/([^"']+\.js)["']/g),
      ...code.matchAll(/(?:^|[;\s}])import\s*["']\.\/([^"']+\.js)["']/g)
    ].map((m) => m[1]);
    for (const s of specs) walk(path.posix.join(path.posix.dirname(asset), s));
  };
  walk(entry);

  let total = 0;
  for (const asset of blocking) {
    const file = path.join('dist', asset);
    if (!fs.existsSync(file)) continue;
    total += fs.statSync(file).size;
    // Three.js in the BLOCKING graph means the split regressed — one stray
    // static `import ... from 'three'` outside the scene module is enough to
    // pull the whole engine back in front of first paint.
    if (/^three-/.test(path.basename(asset))) {
      hits.push(`${asset}  three is statically imported by the entry — the scene split regressed`);
    }
  }

  const kb = total / 1000;
  if (kb > INITIAL_BUDGET_KB) {
    hits.push(
      `blocking JS ${kb.toFixed(2)} kB over the ${INITIAL_BUDGET_KB} kB budget ` +
        `(${[...blocking].join(', ')})`
    );
  } else {
    notes.push(
      `blocking JS ${kb.toFixed(2)} kB of the ${INITIAL_BUDGET_KB} kB budget ` +
        `(${blocking.size} chunk(s))`
    );
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
