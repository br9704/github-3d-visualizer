---
id: abcf07d6-fefa-432a-b8f5-9cdc89e3c215
title: "Key Decisions"
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

# Key Decisions

## The two the README names as carrying the design

### The proxy is an allowlist, not a passthrough

Four endpoint patterns are proxied; everything else returns **403** and never reaches GitHub.

**Without it, `/api/github/<anything>` would be an open proxy authenticating with our
token** — including `/user`, which would reveal whose token it is. Query parameters are
bounded too: `per_page=9999` clamps to 100, an unknown `client_secret` is dropped.

**One code path, not a production-only branch.** `vite.config.js` proxies the same route
unauthenticated in dev, so the deployed path is the one local development exercises.

### Layout is optional in the scene-graph format, but all-or-nothing

A producer that only knows about repositories should not have to invent 3D coordinates —
omit `position` and `size` and this app computes them. A producer with a layout it cares
about can pin it.

**It is honoured only if *every* node carries it**, because half a layout would put some
nodes at meaningful coordinates and the rest at the origin, **which renders as a bug rather
than as data**.

## Three.js directly, not React Three Fiber

Full control over the render loop, instancing and the shader-side billboarding.

Worth noting against the rest of the estate: Bruno's *later* 3D work goes the other way and
uses R3F. **The choice is scene-complexity-dependent, not dogma.** Here the scene is one
`InstancedMesh` with a custom vertex shader for labels, which is exactly the case R3F's
declarative layer makes harder.

## Instancing replaced frustum culling and level-of-detail

⚠️ **The March 2026 design used per-node meshes** with frustum culling (+15–20 fps claimed),
LOD scaling by repository count, material and geometry instance caching, and pre-allocated
`Frustum`/`Matrix4` objects.

Sprint 5 replaced the whole field with one `InstancedMesh`. **There is no per-node mesh left
to cull or to simplify**, so all four techniques became dead weight. `three-stdlib` was
dropped in Sprint 3 alongside the 0.159 → 0.185.1 upgrade.

This is the largest single divergence between the code and the hub note.

## Frame work, not frames per second

On hardware fast enough, the frame *interval* is pinned by the display, so an fps figure
measures the monitor. 100 and 250 repositories both reported an identical 4.2 ms before the
harness changed. The project now quotes **time spent inside the render loop**, and does not
publish an fps number at all.

## Rank mapping, not linear min-max

Stars and forks are power-law distributed. Rank mapping is distribution-free. See
[[(Note) Positioning and the Empty State]].

## The empty state is uncoloured, deliberately

Language colour carries meaning. **Decoration must not borrow it.** The obvious move — make
the ambient galaxy attractive and colourful — would have made the real data unreadable.

## Guard #11 instead of raising `chunkSizeWarningLimit`

Vite prints a 500 kB chunk-size warning for `three` at 545.56 kB. Silencing it would **mute a
real regression detector**. Guard #11 asserts the *blocking* graph instead — entry chunk plus
transitive static imports, under 500 kB, with `three` absent.

## Sprints close against a screenshot, not a green build

The founding lesson. `npm run build` exited 0 and the app rendered a blank white page for
months. Eleven sprints, each closed against acceptance criteria **with a screenshot**.
`shots/` holds twelve of them.
