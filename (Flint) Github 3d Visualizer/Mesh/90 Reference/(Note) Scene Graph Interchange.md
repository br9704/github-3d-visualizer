---
id: a5570e20-872d-4fa4-9b3e-aa9f674104c3
title: "Scene Graph Interchange"
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
source_path: "/Users/brunojaamaa/Desktop/github-3d-visualizer/src/scene/sceneGraph.js"
created: "2026-08-17"
updated: "2026-08-19"
---

# Scene Graph Interchange

**A GitHub profile is not the only way to fill this app.** It reads a portable scene-graph
format — drop a `.json` file anywhere on the page, or open `?scene=<url>`.

Added in **Sprint 8**, explicitly as **gitpulse interchange**. This is the one real
cross-project link in the personal cluster, and it exists in code rather than only in a note.

## The format

```jsonc
{
  "format": "github-3d-visualizer/scene",
  "version": 1,
  "subject": { "login": "torvalds" },
  "nodes": [
    {
      "id": "torvalds/linux",   // required, unique
      "label": "linux",         // required
      "language": "C",
      "stars": 190000,
      "forks": 55000,
      "createdAt": "2011-09-04T22:19:36Z",
      "position": { "x": 12.4, "y": -3.1, "z": 8.8 },  // optional
      "size": 3.2                                      // optional
    }
  ]
}
```

Reference file: `docs/example-scene.json`.

## Two contract rules worth knowing

**A reader refuses an unknown `version` rather than guessing**, and **reports every
validation problem at once** rather than one at a time. The second one is a usability
decision: a producer fixing a file should not have to run it fifteen times.

⚠️ **Layout is optional but all-or-nothing.** `position` and `size` are honoured only if
*every* node carries them. Half a layout would put some nodes at meaningful coordinates and
the rest at the origin, **which renders as a bug rather than as data**.

Omit them and `src/utils/positioning.js` computes them with the same rank mapping and
relaxation a real profile gets — which is why the positioning pass has to be deterministic.

## Tested

`tests/sceneGraph.test.mjs` — **14** tests covering the interchange contract and a **lossless
round trip**. `src/scene/sceneGraph.js` is **206** lines. `SceneImport.jsx` is the UI.

## Controls

| Input | Action |
|---|---|
| Left click + drag | Orbit |
| Scroll wheel | Zoom |
| Right click + drag | Pan |
| Click a sphere | Open repository details |
| `Tab` / `Shift+Tab` | Cycle through repositories |
| `+` / `-` | Zoom |
| `j` / `k` | Move between control modules |
| `↵` | Open the focused module |
| `?` or `/` | Keyboard help |
| `Escape` | Close dialog |

⚠️ The hub note claims **WCAG AA** compliance. Keyboard navigation is real and thorough, and
`KeyboardHelpModal.jsx` documents it. But **no guard or test in this repository asserts a
WCAG level**, and the README's own limitations note that a visitor without WebGL gets a
printed message rather than the data. Treat the claim as unbacked — see
[[(Report) Gaps & Questions]].

## Other reference documents in the repo

| File | Lines | Holds |
|---|---|---|
| `masterplan.md` | **505** | eleven sprints, every as-shipped delta, the findings log |
| `README.md` | 263 | every number traced to an artifact |
| `CHANGELOG.md` | 149 | the release record |
| `DOCS-ENGINEERPROMPT.md` | 145 | the documentation brief |
| `ENGINEERPROMPT.md` | 113 | the original brief |
| `CLAUDE.md` | 106 | the working rules |
| `RESEARCH-CONTEXT.md` | 101 | the audit that found the blank page |
| `MOTION.md` | 71 | the motion contract, gated by 15 browser checks |
| `AGENTS.md` · `GEMINI.md` | 33 each | ⚠️ Aethereum agent boilerplate, shared across repos |
