---
id: bf60c2e8-8819-442a-9773-d4450130a9e9
title: "20 Codebase Map"
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

# 20 Codebase Map

**50 JavaScript files, ~7,600 lines**, plus **17 CSS files, ~4,400 lines**.

| Note | Covers |
|---|---|
| [[(Note) Source Map]] | `src/` — components, scene, services, utils, styles — and `api/` |
| [[(Note) Scripts and Harnesses]] | `scripts/` and `tests/` — where every published number comes from |

## The top-level shape

```
src/            React 18 app — components · scene · services · hooks · utils · styles
api/github/     one Vercel serverless function, the allowlist proxy
scripts/        7 measurement and guard harnesses (Playwright)
tests/          5 suites, 74 tests (Vitest + jsdom)
docs/           the artifacts every published number points at
shots/          12 committed browser screenshots
public/         favicon, apple-touch-icon, og.png
```

Every file in the repo is listed in [[(Index) Complete File Inventory]].

Up: [[(Map) Master Map]]
