---
id: a01b06b7-fd6d-436d-a3a1-8a31f3439d6c
title: "Flint Init — 3D GitHub Visualizer"
type: system
project: "3D GitHub Visualizer"
tags:
  - "#note"
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

# Flint Init — 3D GitHub Visualizer

**This vault documents one repository: a WebGL app that renders any GitHub profile as a
navigable 3D universe in three draw calls a frame.** The project is **shipped and public**
— deployed on Vercel with an authenticated serverless proxy, and a live case study on
brunojaamaa.dev.

## What this workspace is

| | |
|---|---|
| Codebase | `/Users/brunojaamaa/Desktop/github-3d-visualizer` |
| Vault | `/Users/brunojaamaa/Desktop/github-3d-visualizer/(Flint) Github 3d Visualizer` |
| Repo | `https://github.com/br9704/github-3d-visualizer` |
| Live app | `https://github-3d-visualizer.vercel.app` |
| Case study | `https://brunojaamaa.dev/projects/3d-github-visualizer` |
| Branch | `main` — and `main` is the **production branch**, so a push releases |
| Cluster | `personal` |

⚠️ **Registered Flint name is `Github 3d Visualizer`, not `GitHub 3D Visualizer`.** The CLI
rejects both `GitHub` and `3D`. The name in every note, and in `project:` frontmatter, is
the real one: **3D GitHub Visualizer**.

## The stack, confirmed rather than assumed

Read from `package.json` on 2026-08-17.

| | |
|---|---|
| Rendering | **Three.js 0.185.1**, used **directly** — no React Three Fiber, no `three-stdlib` |
| UI | **React 18.2** |
| Build | **Vite 5** with `terser` |
| Backend | **one Vercel serverless function** — `api/github/[...path].js` |
| HTTP | `axios` |
| Test | **Vitest 2.1**, `jsdom`, **Playwright 1.62** for the browser harnesses |
| Fonts | `@fontsource-variable/dm-sans`, `@fontsource-variable/jetbrains-mono` |

Primary stack tag: `#stack/threejs`.

## Where a fact actually lives

1. **`masterplan.md`** in the repo — **505 lines**, eleven sprints, every as-shipped delta
   and every deferral with its reason. Highest authority.
2. **`README.md`** (**263**) and **`CHANGELOG.md`** (**149**) — every number traced to an
   artifact in `docs/`.
3. **`CLAUDE.md`** (**106**) — the working rules.
4. **This vault** — the distilled state. A map, not a substitute.

`masterplan > CLAUDE.md > memory`.

## The session-start path

[[(Map) Master Map]] → the section `(Index)` you need → the note.

One file only? [[(Report) Project Summary]].

## What lives where

| Folder | Holds |
|---|---|
| `Mesh/00 Overview` | what it is, and its honest state |
| `Mesh/10 Architecture` | the render pipeline, the proxy allowlist, the scene-graph format |
| `Mesh/20 Codebase Map` | src, api, scripts, tests |
| `Mesh/30 Setup & Run` | the eleven npm scripts and what each measures |
| `Mesh/50 Decisions` | the calls that shaped it |
| `Mesh/60 Roadmap, Tasks & Ideas` | the one owner-gated item and the untested seam |
| `Mesh/90 Reference` | the scene-graph contract, controls, git history |
| `Sources/` `Media/` `Exports/` `Shards/` | plumbing |

## Which shards apply

[[codebase-map-refresh]] · [[changelog-from-git]] · [[onboarding-guide]] · [[vault-audit]]

All four live in `Shards/` at the vault root.

## Reaching the codebase reference

```bash
flint reference list      # Github 3d Visualizer → ~/Desktop/github-3d-visualizer
```

`flint reference codebase <name> <path>` adds **and** fulfils in one call in 0.6.0-dev.21.

## The rules

1. **Read-only outside this vault.** No destructive git — `log`, `show`, `status`, `branch`,
   `diff` only.
2. **Never invent facts.** Unknown goes in [[(Report) Gaps & Questions]].
3. **Never copy secrets.** ⚠️ This project has one: `GITHUB_TOKEN`. **The name only.**
   `.env*` is never opened, and guard #10 asserts no token literal exists in the source.
4. **Repo wins over note**, including over the hub note, which is stale.
5. **Tag list items must be quoted** — `- "#note"`.
6. **Log every operation** via `Shards/tools/obsidianlog.mjs` at the hub.

## The rule this repository exists to teach

> **"It builds" is not "it works."**

`npm run build` exited 0, transformed 404 modules, produced no console errors, and the app
rendered a near-blank white page. For months. Keep that in view before trusting any green
check here.
