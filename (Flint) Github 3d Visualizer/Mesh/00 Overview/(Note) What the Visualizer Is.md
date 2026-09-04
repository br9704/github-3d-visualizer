---
id: 6cb4dcff-b169-4c32-82e1-acd8c0e4f1a7
title: "What the Visualizer Is"
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
source_path: "/Users/brunojaamaa/Desktop/github-3d-visualizer/README.md"
created: "2026-08-17"
updated: "2026-08-19"
---

# What the Visualizer Is

**You give it a GitHub username and it builds a universe out of that profile.**

Every repository becomes a geodesic icosahedron. Its radius scales with the **square root**
of its star count. Its colour comes from its primary language. Its position encodes three
axes at once — **age on X, stars on Y, forks on Z**. A hairline wireframe shell shows the
facet structure, and each node carries a billboarded monospace language code (`JS`, `PY`,
`RS`, `C++`) rather than an icon.

You orbit it, hover it, click into a repository, filter by language, and export what you are
looking at as JSON, CSV, a PNG, or a shareable URL.

## The three problems that were actually hard

**The empty state, which is the majority case.** A visitor who never types a username used
to get a blank white page. So the empty state became the product: on cold load, before any
network request, a seeded procedural generator streams **88** uncoloured placeholder spheres
into a drifting galaxy. It works offline, it can never rate-limit, and it dims to **25%** on
your first keystroke before dissolving as real data arrives.

> The scenery is deliberately **uncoloured**, because language colour carries meaning here
> and decoration must not borrow it.

**Positioning, because stars and forks are power-law distributed.** One repository with
60,000 stars and ninety under fifty is the normal shape of a profile. A linear min-max map
collapses almost every node onto the same coordinate and renders the universe as one
overlapping mass with a couple of outliers stranded far away. Axes are mapped by **rank**
instead, which is distribution-free, followed by a deterministic relaxation pass that
separates anything still closer than the sum of its radii.

**Draw calls, because a profile can be large.** The whole scene is one `InstancedMesh`, so
draw calls stay constant as repository count grows: **3 for the entire scene at 250
repositories**, covering nodes, wireframe shells and the full label set. The labels live in
a single canvas atlas drawn as one instanced quad and billboarded in the vertex shader, so
there is **no per-frame CPU work for them at all**.

⚠️ **This replaced the earlier design entirely.** Frustum culling, per-node level-of-detail
and material caching were the March 2026 approach. Instancing made all three unnecessary.
The hub note still describes the old one — see [[(Report) Gaps & Questions]].

## Beyond the scene

Real-time username search with autocomplete and caching, language filters with saveable
filter sets, activity heatmaps, local-only "Share & Annotate" snapshots, keyboard navigation
of the whole HUD, and export to JSON / CSV / PNG / URL.

It also reads a portable **scene-graph format**, so a GitHub profile is not the only way to
fill it — drop a `.json` on the page or open `?scene=<url>`. This is the interchange with
GitPulse. See [[(Note) Scene Graph Interchange]].

## Where it runs

Static build on Vercel plus **one serverless function** that proxies GitHub with a token.
`main` is the production branch, so a push releases.

- Live: `https://github-3d-visualizer.vercel.app`
- Case study: `https://brunojaamaa.dev/projects/3d-github-visualizer`

Next: [[(Note) The Render Pipeline]] · [[(Note) Honest State]]
