---
id: 105c49e2-dc98-4b36-9cf6-fd3ae18944bf
title: "The Render Pipeline"
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
source_path: "/Users/brunojaamaa/Desktop/github-3d-visualizer/src/scene/instancedField.js"
created: "2026-08-17"
updated: "2026-08-19"
---

# The Render Pipeline

**Three draw calls for the whole scene, constant in repository count.** At 100 repositories
and at 250. That number is the design.

## How

The entire field is one `InstancedMesh`. `src/scene/instancedField.js` (**377** lines)
builds it. Three calls cover:

1. the geodesic icosahedron nodes
2. the hairline wireframe shells
3. **the full label set**

The labels are the interesting one. They live in a **single canvas atlas** drawn as one
instanced quad and **billboarded in the vertex shader**, so there is **no per-frame CPU work
for them at all**. A per-node `Sprite` or DOM label would have made label count a draw-call
multiplier and put text layout on the main thread every frame.

⚠️ **This replaced the March 2026 design outright.** That version used per-node meshes with
frustum culling, level-of-detail scaling by repository count, material and geometry instance
caching, and pre-allocated `Frustum`/`Matrix4` objects. **Instancing made all of it
unnecessary** — there is no per-node mesh left to cull or simplify. `three-stdlib` was
dropped in Sprint 3 at the same time as the Three.js 0.159 → **0.185.1** upgrade.

## Why frame work, not fps

| Repositories | Frame work median | p95 | Draw calls |
|---|---|---|---|
| 100 | 0.1 ms | **0.2 ms** | 3 |
| 250 | 0.2 ms | **0.2 ms** | 3 |

Measured on an **Apple M4 Pro** at 1440×900 in a GPU-backed Chromium window, **240 samples**
per run, 2026-08-14.

> "Frame work" is time spent **inside** the render loop. It is quoted instead of
> frames-per-second because on this hardware the frame *interval* is pinned by the display,
> so an fps figure would measure the monitor rather than the app.

A 60 fps budget is 16.7 ms per frame. This uses **0.2 ms** of it at 250 repositories.

⚠️ The hub note's **"stable 60 fps on 100+ repositories"** is exactly the figure this project
stopped quoting, and for a stated reason. `docs/perf.json` also records a
software-rasteriser run (headless Chromium, no GPU, SwiftShader) at **72–78 ms** per frame —
a floor for a machine with no GPU acceleration, not a desktop figure.

## The HUD layering

The audit found **eleven components each declaring `position: fixed` independently**, which
is why one preferences panel floated detached in a corner. Sprint 2 replaced that with a
single owner:

- **`HudLayout` owns every fixed position.** Guard #6 asserts it — nothing else may position
  chrome.
- HUD sits at `z-index` 10+; the scene sits at 0. The canvas painting over the header was
  the original blank-page bug.
- One warm-black ground, no light theme. Guard #3 asserts no light theme exists; guard #4
  asserts palette-only colours in CSS, in hex **and** `rgb()` form.

## The bundle split

Three.js is code-split out of the critical path and advertised with a build-time
`modulepreload`, so it downloads **beside** the app rather than behind it.

| | Before | After |
|---|---|---|
| Eager JS, blocking first paint | 834.06 kB / 223.81 kB gzip | **270.74 kB / 85.07 kB gzip** |
| Total JS shipped | 834.06 kB / 223.81 kB gzip | ⚠️ 835.72 kB / **225.01 kB gzip** |

**Total went up.** The win is entirely on the critical path.

⚠️ **The split was a regression until it was measured.** A dynamic import is not requested
until the chunk containing the import statement has downloaded, parsed and run — so the
largest asset queued behind the two smallest ones and cost **944 ms** to first frame on Fast
3G. The `modulepreload` exists because the number was checked, not assumed.

Vite still prints its 500 kB chunk-size warning for `three` at 545.56 kB, deliberately.
Tree-shaking already removes **27%** of the library, and what remains is `WebGLRenderer` and
the shader library. Raising `chunkSizeWarningLimit` would mute a real regression detector, so
**guard #11** asserts the *blocking* graph instead — the entry chunk plus its transitive
static imports — stays under 500 kB with `three` absent from it.

## Where it lives

| File | Lines | Role |
|---|---|---|
| `src/components/Visualizer.jsx` | **821** | scene lifecycle, camera, renderer, interaction |
| `src/scene/instancedField.js` | **377** | the one `InstancedMesh` and the label atlas |
| `src/scene/ambientGalaxy.js` | — | the seeded 88-node cold-load scene |
| `src/scene/sceneGraph.js` | **206** | the interchange format |
| `src/scene/easing.js` | — | the motion curves `MOTION.md` gates |
| `src/hooks/useThreeScene.js` | — | the React binding |
