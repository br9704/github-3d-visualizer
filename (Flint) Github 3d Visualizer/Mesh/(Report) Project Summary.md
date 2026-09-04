---
id: e9ca2f6e-0959-4447-ad9f-29c2f85f8b3a
title: "Project Summary — 3D GitHub Visualizer"
type: project-summary
project: "3D GitHub Visualizer"
kind: "web app"
stack: "React 18 · Three.js 0.185.1 · WebGL · Vite 5 · Vercel serverless function · Vitest 2 · Playwright"
tags:
  - "#report"
  - "#project"
  - "#ld/living"
  - "#stack/threejs"
  - "#status/shipped"
  - "#cluster/personal"
status: shipped
health: green
health_note: "Deployed, authenticated, rate-limited at the edge, 74 tests and 11 guards green in CI, every published number traced to an artifact in docs/. The one real gap is that deployment routing is covered by no test, which is exactly the seam that took production down once."
last_commit: "2026-08-15"
path: "/Users/brunojaamaa/Desktop/github-3d-visualizer"
live_url: "https://github-3d-visualizer.vercel.app"
case_study_url: "https://brunojaamaa.dev/projects/3d-github-visualizer"
repo: "https://github.com/br9704/github-3d-visualizer"
cluster: "personal"
source_path: "/Users/brunojaamaa/Desktop/github-3d-visualizer"
created: "2026-08-17"
updated: "2026-08-19"
---

# 3D GitHub Visualizer — Project Summary

🚀 **Shipped and live.** Any GitHub profile rendered as a navigable 3D universe: every
repository is a geodesic icosahedron sized by √stars, coloured by language, positioned by
age on X, stars on Y and forks on Z — and the whole scene is **3 draw calls**, constant in
repository count.

**Finished, not a scaffold.** **72** commits, **74** tests, **11** guards, **15** browser
motion checks, all green in CI. **0** `TODO` or `FIXME` markers. Deployed on Vercel with
`main` as the production branch.

## Purpose

Make GitHub data spatial rather than tabular. The interesting engineering is not the
spheres — it is the three problems underneath them: an empty state that has to be the
product, a positioning model that survives power-law data, and a verification harness that
was **measuring nothing** for months.

## State

Eleven sprints, each closed against acceptance criteria **with a screenshot rather than a
green build**. That distinction is the project's whole thesis.

The August 2026 audit found `npm run build` exiting 0, transforming 404 modules, producing
no console errors — while the app rendered a near-blank white page. None of the causes was
visible to a compiler: the canvas mounted `position: fixed` with no `z-index` and painted
over the header; an `alpha: true` renderer let a light-theme background show through; eleven
components each positioned themselves independently; geometry was built at radius `size`
**and** scaled by `size`, so rendered radius was `size²`.

**The verification itself was broken, which mattered more than any single bug.** Headless
Chromium has no WebGL, so `canvas.getContext('webgl2')` returns `null` and every automated
check ever run had been screenshotting an empty canvas and passing.

## Key numbers

| | |
|---|---|
| Commits | **72** on `main`, last **2026-08-15**, clean, 0 unpushed |
| Tests · guards · browser checks | **74 · 11 · 15** |
| Eager JS payload | **223.81 → 85.07 kB** gzip, a **62%** cut |
| Total JS shipped | 225.01 kB gzip — ⚠️ it went **up** slightly |
| First drawn frame, 4G | **529 ms** |
| First drawn frame, Fast 3G | **2,665 ms** — ⚠️ misses the project's own 2 s bar |
| Frame work p95 at 250 repos | **0.2 ms** of a 16.7 ms budget, Apple M4 Pro |
| Draw calls | **3**, constant at 100 **and** 250 repositories |
| Ambient galaxy nodes on cold load | **88**, seeded, no network |
| Rate limit, authenticated | ~**4,900** remaining vs **60** unauthenticated |
| Edge rate limit | **100** requests / 60 s per IP |
| Code | **50** JS files, ~7,600 lines |
| `TODO`/`FIXME` | **0** |

## Top risks

1. ⚠️ **Deployment routing is covered by no test.** The proxy's 13 unit tests exercise the
   handler; the bug that took the live proxy down for every real path was that the handler
   **was never invoked**. Only curling production caught it, and nothing in CI would catch a
   repeat.
2. ⚠️ **The hub note describes an architecture that no longer exists** — frustum culling,
   per-node LOD, `three-stdlib`, "60 fps", "~197 KB gzipped". All superseded by the
   instanced scene in Sprint 5 and the bundle split in Sprint 10. Six corrections in
   [[(Report) Gaps & Questions]].
3. **Frame times come from one machine**, an Apple M4 Pro. There is no measurement on
   integrated graphics, which is what `MOTION.md` originally asked for.
4. **Commit authorship is a bot.** **48** of the 72 commits are attributed to `OpenClaw Bot`
   and `Claude Code`. Rewriting is a force-push over public history and is owner-gated.
5. **Three language aliases are inert.** `F#`, `Objective-C` and `Shell` map to keys with no
   colour defined, so they render grey despite appearing in the alias table.

## Next 5 actions

1. **Add a deployment-routing check.** The README names this as *Next* and it is the only
   gap that has already cost production.
2. **Fix the hub note** — six factual corrections, listed in [[(Report) Gaps & Questions]].
3. Define colours for `F#`, `Objective-C` and `Shell`, or remove them from the alias table.
4. Measure frame work on integrated graphics to close the `MOTION.md` intent.
5. Decide the owner-gated commit-authorship rewrite: do it, or state the bot authorship
   permanently. The README already states it.

## The ten links that matter

[[(Map) Master Map]] · [[(Note) What the Visualizer Is]] · [[(Note) Honest State]] ·
[[(Note) The Render Pipeline]] · [[(Note) The GitHub Proxy]] ·
[[(Note) Positioning and the Empty State]] · [[(Note) Key Decisions]] ·
[[(Note) Scene Graph Interchange]] · [[(Report) Gaps & Questions]] ·
[[(Report) Folder Audit]]
