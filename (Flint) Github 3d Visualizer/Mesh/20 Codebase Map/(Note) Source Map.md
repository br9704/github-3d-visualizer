---
id: 7541bde1-bbd5-489d-8070-e0f1f92a048a
title: "Source Map"
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
source_path: "/Users/brunojaamaa/Desktop/github-3d-visualizer/src"
created: "2026-08-17"
updated: "2026-08-19"
---

# Source Map

## The five biggest source files

| File | Lines | Does |
|---|---|---|
| `src/components/Visualizer.jsx` | **821** | scene lifecycle — camera, renderer, interaction, the render loop |
| `src/App.jsx` | **502** | state, search, filters, and the `lazy(import)` boundary that defers Three.js |
| `src/components/CollaborationPanel.jsx` | **474** | ⚠️ "Share & Annotate" — **local-only**, no server, `localStorage` |
| `src/components/UserPreferencesPanel.jsx` | **455** | preferences, persisted locally |
| `src/services/collaborationService.js` | **436** | the annotation and snapshot model |

## `src/components/` — 18 components

`AdvancedHeatmaps` · `CollaborationPanel` · `ColorLegend` · `DataExportPanel` ·
`ExportShare` · `FilterSetsManager` · `Header` · `HudLayout` · `KeyboardHelpModal` ·
`LanguageFilter` · `Pagination` · `RepoDetails` · `SceneImport` · `SearchBar` ·
`StatsDisplay` · `UserPreferencesPanel` · `UsernameAutocomplete` · `Visualizer`

⚠️ **`HudLayout` owns every fixed position.** Guard #6 asserts nothing else positions chrome.
Before Sprint 2, eleven components each declared `position: fixed` independently.

## `src/scene/` — 4 files, the WebGL layer

| File | Lines | Role |
|---|---|---|
| `instancedField.js` | **377** | the one `InstancedMesh` and the label atlas. **3 draw calls** |
| `sceneGraph.js` | **206** | the portable interchange format — gitpulse in, gitpulse out |
| `ambientGalaxy.js` | — | the seeded 88-node cold-load scene |
| `easing.js` | — | the motion curves `MOTION.md` gates |

## `src/services/` — 5 files, all client-side state

`collaborationService.js` (**436**) · `userPreferences.js` (**323**) ·
`heatmapGenerator.js` (**292**) · `dataExporter.js` (**288**) · `filterSetsManager.js`
(**263**)

⚠️ **None of these talks to a server.** Everything persists to `localStorage`. "Share"
means a copied URL.

## `src/utils/` — 3 files

| File | Lines | Role |
|---|---|---|
| `githubApi.js` | **219** | the client side of the proxy call, with caching and debounce |
| `positioning.js` | **184** | rank-mapped axes and the deterministic relaxation pass |
| `colors.js` | — | the language colour map. ⚠️ three aliases are inert |

## `src/hooks/` — 2 files

`useThreeScene.js` — the React binding for the scene. `useTypedText.js`.

## `src/styles/` — 17 CSS files, ~4,400 lines

Largest: `CollaborationPanel.css` **550** · `signal.css` **539** ·
`FilterSetsManager.css` **524** · `DataExportPanel.css` **474** ·
`AdvancedHeatmaps.css` **449** · `UserPreferencesPanel.css` **390** ·
`HudLayout.css` **373**.

`signal.css` is the design system. Guards #3, #4 and #5 police it: no light theme,
palette-only colours in **hex and `rgb()`**, every `var(--x)` defined.

## `api/github/[...path].js` — 171 lines

The whole backend. One Vercel serverless function, an allowlist over four GitHub endpoints,
the token used on the outbound fetch only. ⚠️ Read [[(Note) The GitHub Proxy]] before
touching it.

## Cross-folder dependencies

- `App.jsx` defers `Visualizer.jsx` with `lazy(import)` — **that boundary is the bundle
  split**. Moving an import across it changes the eager payload and trips guard #11.
- `positioning.js` is consumed by both `App.jsx` and `sceneGraph.js`, because a scene graph
  without layout must be positioned the same way a profile is.
- `vite.config.js` proxies `/api/github` to GitHub unauthenticated in dev, so `api/` and the
  dev server share **one** contract.
