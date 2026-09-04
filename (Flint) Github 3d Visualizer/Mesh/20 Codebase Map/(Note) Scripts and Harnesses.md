---
id: e90f975f-70c5-4b59-9f68-6fa2e0d99ca1
title: "Scripts and Harnesses"
type: note
project: "3D GitHub Visualizer"
tags:
  - "#note"
  - "#project"
  - "#ld/living"
  - "#stack/threejs"
  - "#status/shipped"
  - "#cluster/personal"
status: shipped
source_path: "/Users/brunojaamaa/Desktop/github-3d-visualizer/scripts"
created: "2026-08-17"
updated: "2026-08-19"
---

# Scripts and Harnesses

**Where every published number comes from.** Seven scripts in `scripts/`, five test suites in
`tests/`, and the artifacts they write in `docs/`.

## `tests/` — 74 tests, 5 suites, Vitest 2

| Suite | Lines | Tests | Covers |
|---|---|---|---|
| `proxy.test.mjs` | **277** | **13** | allowlist, token handling, cache split, rate-limit passthrough |
| `sceneGraph.test.mjs` | **197** | **14** | the interchange contract, lossless round trip |
| `scene.test.mjs` | **196** | **22** | language colours and codes, easing, seeded galaxy, liveness |
| `dom/services.test.mjs` | **178** | **15** | annotations, snapshots, preferences under jsdom |
| `positioning.test.mjs` | **162** | **10** | axis spread on power-law data, separation, determinism |

**Nothing in the suite touches the network.** GitHub is mocked from
`tests/fixtures/github.mjs`, so a run **can never be broken by the rate limit**.

## `scripts/` — the measurement and guard harnesses

| Script | Lines | Produces |
|---|---|---|
| `motion-check.mjs` | **376** | the **15** `MOTION.md` acceptance checks |
| `guards.mjs` | **346** | the **11** design-system and honesty guards |
| `firstpaint.mjs` | **238** | `docs/firstpaint.json` — throttled time to first drawn frame |
| `perf.mjs` | **174** | `docs/perf.json` — frame work and draw calls |
| `capture.mjs` | **169** | the hero recording |
| `shots.mjs` | **158** | `shots/` — both viewports, GitHub mocked |
| `histcmp.mjs` | — | histogram comparison |

## The 11 guards

Mechanical design-system and honesty checks, run by `npm run guards`:

1. no emoji in `src/` — fourteen of fifteen components once used emoji as controls
2. no light theme
3. palette-only colours in CSS, **hex and `rgb()`**
4. every `var(--x)` defined
5. only `HudLayout` positions chrome
6. every README image present
7. a CI badge pointing at a workflow that **actually runs the suite**
8. ⚠️ no token literal anywhere
9. the blocking-payload budget — entry chunk plus transitive static imports under 500 kB with `three` absent
10. …and the rest, in `scripts/guards.mjs`

Guard #11 exists specifically so Vite's chunk-size warning can stay noisy without being
silenced. Raising `chunkSizeWarningLimit` would mute a real regression detector.

## Why the harnesses are trusted now and were not before

⚠️ Three of them were once **measuring nothing**:

| Harness | The failure |
|---|---|
| Every browser check | headless Chromium has **no WebGL** — `getContext('webgl2')` returns `null`, so screenshots of an empty canvas passed |
| The motion checks | a WebGL canvas cannot be read back with `drawImage` without `preserveDrawingBuffer`, so the first version measured **zero every time** |
| The browser suite | it hardcoded a port and started no server. On a busy machine it once ran **against a different application** and scored that application's page |

All three are fixed. `154aeae` also warms the harness before the first timed check, because a
cold first sample was polluting the median.

## `docs/` — the artifacts

| File | Holds |
|---|---|
| `perf.json` | frame work and draw calls at 100 and 250 repos, 240 samples, plus a SwiftShader floor |
| `firstpaint.json` | time to first drawn frame across localhost / 4G / Fast 3G, 9 samples each |
| `example-scene.json` | the reference scene-graph file |
| `hero.gif` · `empty-desktop.png` · `empty-mobile.png` · `scene-desktop.png` · `scene-mobile.png` | the README images guard #7 asserts exist |

## `shots/` — 12 committed screenshots

Real browser captures at both viewports, including the four motion states
(`motion-404`, `motion-cold-2s`, `motion-ratelimit`, `motion-reduced`) and the two
scene-import states. **Sprints closed against a screenshot rather than a green build**, and
these are the evidence.
