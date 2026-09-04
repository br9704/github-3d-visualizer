---
id: d161476d-9fd1-4ea5-917a-6519d259d587
title: "Folder Audit"
type: report
project: "3D GitHub Visualizer"
tags:
  - "#report"
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

# Folder Audit

**Read-only walk of `/Users/brunojaamaa/Desktop/github-3d-visualizer`, 2026-08-17.** **0
dataless iCloud files**, so every file body listed was safe to read.

Repo total **157 MB**, of which **142 MB is `node_modules`** and **1.3 MB is `dist/`**.
Tracked content is roughly **13 MB**, most of it `docs/hero.gif` and `shots/`.

## Root — `/`

**23 files · 11 markdown, config, licence, lockfile.** Last modified 2026-08-14 to 2026-08-16.

| File | What it is |
|---|---|
| `masterplan.md` | **505 lines.** Eleven sprints, a standing gate harness, a findings log, and a closing section on *the pattern this repository actually teaches* |
| `README.md` | **263 lines.** Every number traced to an artifact in `docs/` |
| `CHANGELOG.md` | 149 lines |
| `DOCS-ENGINEERPROMPT.md` | 145 lines. The documentation brief |
| `ENGINEERPROMPT.md` | 113 lines. The original brief |
| `CLAUDE.md` | 106 lines |
| `RESEARCH-CONTEXT.md` | 101 lines. The audit that found the blank page |
| `MOTION.md` | 71 lines. Binding, gated by 15 browser checks |
| `AGENTS.md` · `GEMINI.md` | 33 each. ⚠️ Aethereum agent boilerplate, **shared across Bruno's repos**, not project documentation |
| `PROJECT.json` | the structured portfolio record |
| `package.json` | Node 18+, eleven scripts |
| `index.html` · `vite.config.js` · `vitest.config.js` · `vercel.json` | build and deploy config |
| `.env.example` | ⚠️ names only — `GITHUB_TOKEN` |
| `LICENSE` | MIT |

**Category:** coding. **Verdict:** clean.

## `src/` — 444 KB, 53 files

| Subfolder | Files | Holds |
|---|---|---|
| `components/` | **18** | largest `Visualizer.jsx` **821**, `CollaborationPanel.jsx` **474**, `UserPreferencesPanel.jsx` **455** |
| `styles/` | **18** | ~4,400 lines CSS. `signal.css` **539** is the design system |
| `services/` | 5 | ⚠️ all client-side, all `localStorage`. No server |
| `scene/` | 4 | `instancedField.js` **377** · `sceneGraph.js` **206** · `ambientGalaxy.js` · `easing.js` |
| `utils/` | 3 | `githubApi.js` **219** · `positioning.js` **184** · `colors.js` |
| `hooks/` | 2 | `useThreeScene.js` · `useTypedText.js` |
| root | 3 | `App.jsx` **502** · `main.jsx` · `App.css` |

Full breakdown in [[(Note) Source Map]].

## `api/github/` — 1 file, 8 KB

`[...path].js`, **171** lines. **The entire backend.** A Vercel serverless function that
proxies GitHub behind a four-endpoint allowlist with `GITHUB_TOKEN` on the outbound fetch
only. ⚠️ Read [[(Note) The GitHub Proxy]] before touching it.

## `scripts/` — 68 KB, 7 files

The measurement and guard harnesses. `motion-check.mjs` **376** · `guards.mjs` **346** ·
`firstpaint.mjs` **238** · `perf.mjs` **174** · `capture.mjs` **169** · `shots.mjs` **158** ·
`histcmp.mjs`. See [[(Note) Scripts and Harnesses]].

## `tests/` — 48 KB, 6 files across 3 folders

**74 tests, 5 suites.** `proxy` 13 · `sceneGraph` 14 · `scene` 22 · `dom/services` 15 ·
`positioning` 10. `tests/fixtures/github.mjs` mocks GitHub, so **no test touches the
network**.

## `docs/` — 2.7 MB, 8 files

⚠️ **This folder is the evidence base.** `perf.json` and `firstpaint.json` are what every
performance claim in the README points at. Also `example-scene.json`, `hero.gif`, and four
screenshots (`empty-desktop`, `empty-mobile`, `scene-desktop`, `scene-mobile`).

**Cross-folder dependency:** guard #7 asserts every README image exists here.

## `shots/` — 1.8 MB, 13 files

Committed browser screenshots at both viewports, including four motion states
(`motion-404`, `motion-cold-2s`, `motion-ratelimit`, `motion-reduced`), two scene-import
states, and `gh-mermaid.png`. **Sprints closed against a screenshot rather than a green
build**, and these are that evidence.

## `public/` — 256 KB, 4 files

`favicon.svg` · `apple-touch-icon.png` · `icon-512.png` · `og.png`.

## `.github/workflows/` — 1 file

`ci.yml` — the 74 tests and 11 guards. ⚠️ Does **not** run `shots`, `motion-check`, `perf`
or `firstpaint`; those need a GPU-backed browser.

## Agent tooling and machine-local — `.claude/` `.codex/` `.cursor/` `.vscode/` `.vercel/`

**10 files across five folders.** Aethereum coordination config plus the Vercel project link.
⚠️ **Untracked at `723f4bd`**, *"untrack machine-local and agent config"*. They exist on disk
only. `.claude/RESUME.md` (23 lines) is an agent handoff note, not project documentation.

## Duplicate, dead and abandoned

**None found.** Specifically checked:

- **0** `TODO`, `FIXME`, `HACK` or `XXX` markers in any source or CSS file
- **0** superseded documents. **37** process reports including ten test reports were deleted
  in S0 and do not survive on disk
- **0** stale branches
- ⚠️ **One dead code path was deleted rather than left**: a throttle that never ran, removed
  at `fc83929` when the real per-IP rate limit landed

Three **live** defects exist and are disclosed rather than hidden: the inert `F#`,
`Objective-C` and `Shell` colour aliases. See [[(Note) Roadmap and Open Work]].

The stale artefact in this project's chain is **outside the repo** — the hub note. See
[[(Report) Gaps & Questions]].

## Excluded from this audit, with reasons

| Path | Reason |
|---|---|
| `node_modules/` (**142 MB**) | dependency install tree |
| `dist/` (**1.3 MB**) | Vite build output, regenerable |
| `.git/` internals | git plumbing. Read-only `log`/`branch`/`status` used instead |
| `.env*` | ⚠️ **never opened.** `GITHUB_TOKEN` recorded from `.env.example` as a name only |
| `.DS_Store` | Finder metadata |

Every other file appears in [[(Index) Complete File Inventory]].
