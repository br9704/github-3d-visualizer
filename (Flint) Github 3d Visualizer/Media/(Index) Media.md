---
id: b854330c-dc18-4c09-bf1d-96c9eb085971
title: "Media"
type: index
project: "3D GitHub Visualizer"
tags:
  - "#index"
  - "#project"
  - "#ld/living"
  - "#status/shipped"
  - "#cluster/personal"
status: shipped
source_path: "/Users/brunojaamaa/Desktop/github-3d-visualizer/docs"
created: "2026-08-17"
updated: "2026-08-19"
---

# Media

**Nothing is copied here.** The repo's media is large and already versioned, so this index
points at it by absolute path.

## The hero and screenshots — `docs/`

| Asset | Path | What it is |
|---|---|---|
| Hero recording | `.../github-3d-visualizer/docs/hero.gif` | The entrance sequence: an ambient galaxy on cold load, dissolving as a profile's repositories grow into place. ⚠️ **The profile is a deterministic fixture, not a real account**, so the asset reproduces and does not put someone else's repository names in the README |
| Empty state | `docs/empty-desktop.png` · `docs/empty-mobile.png` | The seeded 88-node galaxy before any input |
| Loaded scene | `docs/scene-desktop.png` · `docs/scene-mobile.png` | A real profile rendered |
| Open Graph | `public/og.png` | |

⚠️ **Guard #7 asserts every README image exists.** Renaming one of these breaks the build
gate, which is the intended behaviour.

## The evidence artifacts — `docs/`

These are data, not images, and they are what every performance claim points at.

| File | Holds |
|---|---|
| `docs/perf.json` | frame work and draw calls at 100 and 250 repos, 240 samples, plus a SwiftShader floor |
| `docs/firstpaint.json` | time to first drawn frame across localhost / 4G / Fast 3G, 9 samples each |
| `docs/example-scene.json` | the reference scene-graph file |

## `shots/` — 13 committed browser captures

Both viewports, plus four motion states (`motion-404`, `motion-cold-2s`,
`motion-ratelimit`, `motion-reduced`) and two scene-import states. **Sprints closed against a
screenshot rather than a green build**, and these are that evidence.

Regenerate with `npm run shots` and `npm run capture`. Both need a GPU-backed browser —
⚠️ headless Chromium has no WebGL and will capture an empty canvas.

Up: [[(Map) Master Map]]
