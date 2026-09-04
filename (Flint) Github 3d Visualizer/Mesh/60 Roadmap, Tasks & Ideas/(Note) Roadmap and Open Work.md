---
id: fa7125d6-714f-448d-a442-a36daf845818
title: "Roadmap and Open Work"
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

# Roadmap and Open Work

## The one thing worth building next

⚠️ **A deployment-routing check.**

The README names it as *Next*, and it is the only gap that has already cost production. The
proxy's **13** unit tests all passed while the live proxy was down for every real path,
because the bug was that **the handler was never invoked**. Only curling production caught
it.

> Nothing in CI would catch a repeat today, and it would still be invisible.

This is a smoke test against a deployed URL, not a unit test. It is the highest-value item
in the project by a distance.

## Owner-gated

| Item | State |
|---|---|
| **Rewrite commit authorship** | ⚠️ **48** of 72 commits are attributed to `OpenClaw Bot` and `Claude Code`. Rewriting is a force-push over public history, so it needs Bruno. Tracked as S11 in `masterplan.md`. It is the **only** item in that block |

Note the contrast with Collab Dashboard, where the equivalent rewrite was **done** in
Sprint 8 with author dates preserved and the tree byte-identical. The decision here is
whether to match that or to state the bot authorship permanently. **The README already
states it**, which is a defensible resting place.

## Live defects, disclosed

| Defect | Detail |
|---|---|
| ⚠️ **Three inert language aliases** | `F#`, `Objective-C` and `Shell` map to keys with **no colour defined**, so they render in the grey "Other" bucket despite appearing in the alias table. Same class as the C++/`cpp` bug that hid for months. Fix is a colour definition or removing the alias |
| **No non-3D fallback** | A visitor without WebGL gets a printed message rather than the data. `prefers-reduced-motion` is honoured, but the app is inherently visual |
| **"Share & Annotate" is local-only** | No server, no real-time sync. State travels by copied URL; annotations live in one browser's `localStorage`. The panel's name promises more than it does |

## Unmet measurement intent

⚠️ **`MOTION.md` asked for a measurement on integrated graphics.** It has never been taken.
Frame times come from an **Apple M4 Pro**, which is not representative hardware. The only
other figure is a software-rasteriser floor — headless Chromium, no GPU, SwiftShader, at
**72–78 ms per frame** — which is a floor, not a desktop number.

## Accepted, not open

**On Fast 3G the first frame lands at 2,665 ms**, missing this project's own 2 s bar. The
unsplit build misses it too. Shipping a WebGL renderer over a 1.6 Mbit/s link costs what it
costs. The gate runs on **4G**, because a bar nothing can clear is not a bar. This is
resolved, not deferred.

## Hub-level task, not a code task

⚠️ **Fix `Main/Mesh/Notes/Projects/(Note) 3D GitHub Visualizer.md`.** Six factual
corrections, itemised in [[(Report) Gaps & Questions]]. The repo, the README,
`PROJECT.json`, `CHANGELOG.md`, the GitHub metadata and the live case study all agree with
each other and disagree with it.

## Sprints, for the record

| Sprint | State |
|---|---|
| S0 — honesty pass, 37 process reports deleted | ✅ |
| S1 — SIGNAL foundation | ✅ |
| S2 — HUD architecture | ✅ |
| S3 — Three.js 0.185 + drop `three-stdlib` | ✅ |
| S4 — ambient galaxy + entrance motion | ✅ |
| S5 — instanced scene + interaction motion | ✅ |
| S6 — visual proof | ✅ |
| S7 — token proxy, mock-verified | ✅ |
| S8 — gitpulse scene-graph import | ✅ |
| S9 — tests + CI | ✅ |
| S10 — bundle + perf | ✅ |
| Sprint D — documentation | ~ |
| **S11 — owner-gated** | ⚠️ **one item left** |
