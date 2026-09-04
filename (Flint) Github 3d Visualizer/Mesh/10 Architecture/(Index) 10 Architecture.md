---
id: ac6bdba0-d93e-43c9-87b0-7eb771669617
title: "10 Architecture"
type: index
project: "3D GitHub Visualizer"
tags:
  - "#index"
  - "#project"
  - "#ld/living"
  - "#stack/threejs"
  - "#status/shipped"
  - "#cluster/personal"
status: shipped
source_path: "/Users/brunojaamaa/Desktop/github-3d-visualizer"
created: "2026-08-17"
updated: "2026-08-19"
---

# 10 Architecture

```mermaid
flowchart TD
    subgraph browser["Browser — one warm-black ground"]
        HUD["HUD layer · z-index 10+<br/>HudLayout owns every fixed position"]
        SCENE["Scene layer · z-index 0<br/>Visualizer + useThreeScene"]
    end

    subgraph eager["Eager · 85.07 kB gzip"]
        APP["App.jsx · state, search, filters"]
        HUD
    end

    subgraph deferred["Deferred · 139.94 kB gzip"]
        SCENE
        THREE["three 0.185.1<br/>InstancedMesh · OrbitControls"]
    end

    APP -->|"lazy(import)"| SCENE
    SCENE --> THREE
    APP --> POS["positioning.js<br/>rank-mapped axes + relaxation"]
    POS --> SCENE
    APP --> GRAPH["sceneGraph.js<br/>gitpulse interchange"]

    APP -->|"/api/github/*"| PROXY["api/github/[...path].js<br/>Vercel function"]
    PROXY -->|"allowlist · 4 endpoints<br/>PAT on the outbound fetch only"| GH["api.github.com"]
    PROXY -.->|"s-maxage=1800<br/>errors never cached"| EDGE["Edge cache"]

    FILE["Dropped .json / ?scene=url"] --> GRAPH
```

| Note | Covers |
|---|---|
| [[(Note) The Render Pipeline]] | one `InstancedMesh`, the label atlas, the HUD layering, the bundle split |
| [[(Note) The GitHub Proxy]] | ⚠️ the allowlist, the token, the edge cache and rate limit |
| [[(Note) Positioning and the Empty State]] | rank mapping, relaxation, and the seeded galaxy |

Up: [[(Map) Master Map]]
