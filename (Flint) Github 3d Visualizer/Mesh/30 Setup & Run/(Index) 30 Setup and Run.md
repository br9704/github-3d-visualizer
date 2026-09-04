---
id: f91c3aa7-6474-4baf-a207-ce444359a929
title: "30 Setup and Run"
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

# 30 Setup & Run

**Node 18+. Two commands and no `.env` to run locally.**

```bash
git clone https://github.com/br9704/github-3d-visualizer.git
cd github-3d-visualizer && npm install && npm run dev
```

| Note | Covers |
|---|---|
| [[(Note) Install Run and Test]] | the eleven npm scripts and what each one measures |
| [[(Note) Deploy and Environment]] | Vercel, `GITHUB_TOKEN`, and the untested routing seam |

⚠️ Local dev proxies GitHub **unauthenticated**, so you share the **60 requests/hour**
per-IP limit and a few searches can exhaust it.

Up: [[(Map) Master Map]]
