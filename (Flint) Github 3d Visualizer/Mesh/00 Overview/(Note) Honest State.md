---
id: 52cbd864-fb59-4100-9ed9-b4bb97dbe6df
title: "Honest State"
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
source_path: "/Users/brunojaamaa/Desktop/github-3d-visualizer/masterplan.md"
created: "2026-08-17"
updated: "2026-08-19"
---

# Honest State

🚀 **Working, tested, deployed, authenticated and rate-limited.** **72** commits, **74**
tests, **11** guards, **15** browser motion checks, all green. **0** `TODO` or `FIXME`
markers in the source. **0** unpushed commits, clean tree at **2026-08-15**.

## The rule this repository exists to teach

> **"It builds" is not "it works."**

`npm run build` exited 0, transformed 404 modules, produced no console errors — **and the app
rendered a near-blank white page**. A build-level check had been passing for months against
something no visitor could use.

None of the causes was visible to a compiler:

| Bug | Why nothing caught it |
|---|---|
| Canvas mounted `position: fixed; inset: 0` with no `z-index` | the header was never missing, it was **covered** |
| Renderer created with `alpha: true` while the theme defaulted to `prefers-color-scheme: light` | the page background showed **through** the canvas as white |
| Eleven components each declared `position: fixed` independently | one preferences panel floated detached in a corner |
| Geometry built at radius `size` **and** scaled by `size` | rendered radius was `size²`. A 0.3 repository shrank to **0.09** and vanished; a 4.0 one ballooned to **16** and swallowed the scene |
| Fourteen of fifteen components used emoji as controls | nothing checks for that. Guard #1 does now |

## The verification was broken, which mattered more

⚠️ **Headless Chromium has no WebGL.** `canvas.getContext('webgl2')` returns `null`, so
every automated check ever run against this project had been **screenshotting an empty
canvas and passing**.

Two more gates were later found measuring nothing:

- A WebGL canvas cannot be read back with `drawImage` without `preserveDrawingBuffer`, so
  the first version of the motion checks **measured zero every time**.
- The browser suite hardcoded a port and started no server of its own. On a machine where
  another project held that port it ran end-to-end **against a different application** and
  scored that application's page as a rendered scene.

Every green *"cold load renders a scene within 2 s"* recorded before Sprint 10 was measured
on unthrottled localhost, which no visitor has.

## Measurement changed the code, twice

**A frame-*interval* figure is useless on fast hardware.** 100 and 250 repositories both
reported an identical 4.2 ms, which is the display refresh rather than the app. The harness
now records time spent **inside** the render loop.

**Splitting Three.js was a regression until it was measured.** A dynamic import is not
requested until the chunk containing the import statement has downloaded, parsed and run, so
the largest asset queued behind the two smallest ones and cost **944 ms** to first frame on
Fast 3G. The fix is a build-time `modulepreload`, and it exists because the number was
checked rather than assumed.

## What the tests found on their first run

Ten test reports claiming comprehensive coverage were deleted along with 27 other process
documents, because there were **zero tests** behind them. The suite that replaced them found
three bugs immediately — most tellingly that `"C++".toLowerCase()` is `c++` while the colour
map's key is `cpp`, so **C++ and C# repositories were falling through to the grey "Other"
bucket**.

> A grey sphere among grey spheres reads as data, not as a bug, which is exactly why nobody
> had ever noticed.

## Measured, with receipts

| | Measured | Artifact |
|---|---|---|
| Eager JS payload | **223.81 → 85.07 kB** gzip, a **62%** cut | `npm run build` · guard #11 |
| First drawn frame, 4G (9 Mbit/s, 40 ms RTT) | **529 ms** | `docs/firstpaint.json` |
| First drawn frame, Fast 3G (1.6 Mbit/s, 563 ms RTT) | **2,665 ms** | `docs/firstpaint.json` |
| Frame work p95, 250 repos | **0.2 ms** of 16.7 ms | `docs/perf.json` |
| Draw calls | **3** at 100 **and** at 250 repos | `docs/perf.json` |
| Tests · guards · browser checks | **74 · 11 · 15** | `tests/` · `scripts/` |

## What is not true, stated plainly

⚠️ **Total JS did not go down.** It rose slightly, 223.81 → **225.01 kB** gzip, mostly from
the Three.js 0.159 → 0.185.1 upgrade. The win is entirely on the **critical path**. Vite
still prints its 500 kB chunk-size warning for `three` at 545.56 kB, deliberately — raising
`chunkSizeWarningLimit` to silence it would mute a real regression detector.

⚠️ **On Fast 3G it misses its own 2 s target**, and so does the unsplit build. That is a
property of shipping a WebGL renderer, not something the split introduced. The gate runs on
4G, because a bar nothing can clear is not a bar.

## Limitations

| Limit | Detail |
|---|---|
| ⚠️ **Deployment routing is untested** | The proxy's 13 unit tests exercise the handler. The bug that took the live proxy down for every real path was that the handler **was never invoked**. Nothing in CI would catch a repeat — only curling production did |
| **One machine** | Frame times come from an Apple M4 Pro, which is not representative hardware. The only other figure is a software-rasteriser floor (72–78 ms/frame, headless, SwiftShader). ⚠️ No measurement on integrated graphics, which is what `MOTION.md` asked for |
| **"Share & Annotate" is local-only** | No server, no real-time sync. State travels by copied URL; annotations live in one browser's `localStorage` |
| **No non-3D fallback** | `prefers-reduced-motion` is honoured, but a visitor without WebGL gets a printed message rather than the data |
| **Bot commit authorship** | **48** of 72 commits are attributed to `OpenClaw Bot` and `Claude Code`. Rewriting is a force-push over public history — owner-gated |
| **Three inert language aliases** | `F#`, `Objective-C` and `Shell` map to keys with no colour defined, so they render grey despite appearing in the alias table |

## What the hub note gets wrong

Six things, all superseded rather than never-true. Listed in [[(Report) Gaps & Questions]].
