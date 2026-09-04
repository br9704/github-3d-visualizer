---
id: 3e36e5ac-cb51-4c2a-80ae-0a97259efe5e
title: "Gaps & Questions"
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

# Gaps & Questions

**The repo is internally consistent and matches its public claim. The stale artefact is the
hub note** — and here the divergence is larger than for Collab Dashboard, because Sprint 5
replaced the entire rendering architecture the note describes.

## The chain, checked end to end

| Source | Agrees with the code |
|---|---|
| `README.md` | ✅ every number traced to an artifact in `docs/` |
| `PROJECT.json` · `CHANGELOG.md` · `masterplan.md` | ✅ |
| GitHub repo description + topics | ✅ names `threejs`, `webgl`, `instanced-rendering`, `vite` |
| **GitHub `homepageUrl`** | ✅ set to `https://brunojaamaa.dev/projects/3d-github-visualizer` |
| **The live case study on brunojaamaa.dev** | ✅ fetched 2026-08-17 and verified |
| **The hub note in BRUNO HQ** | ❌ **six material errors** |

### The GitHub website field

> The hub's `(Task) Portfolio Follow-ups` lists setting the GitHub "website" field as open
> work.

**Already done for this repo.** `gh repo view br9704/github-3d-visualizer --json
homepageUrl` returns `https://brunojaamaa.dev/projects/3d-github-visualizer`. No action
needed; the backlog item can be closed for this project.

### The live case study was checked, not assumed

Fetched on 2026-08-17. It reports:

- `"Any GitHub profile as a navigable 3D universe, in three draw calls a frame"` ✅
- `"3 draw calls for the whole scene — at 100 repositories and at 250"` ✅ `docs/perf.json`
- `"529 ms to the first drawn frame on a throttled 4G link (median of 9)"` ✅
- `"0.2 ms p95 frame work of a 16.7 ms budget, on an Apple M4 Pro"` ✅ — **and it names the
  hardware**, which is the honest form
- `"85.07 kB gzipped JavaScript blocking first paint, with Three.js deferred"` ✅
- stack: `react · three.js · webgl · javascript · vite · github-api · vercel · vitest` ✅
- status `"LIVE"` ✅

**The public claim matches the code.** The site quotes no fps figure and no bundle total that
the repo contradicts.

## The stack, confirmed rather than assumed

The task brief said *"likely Three.js — confirm rather than assume"*. Confirmed from
`package.json`:

| | |
|---|---|
| **Three.js 0.185.1**, used directly | no React Three Fiber, and `three-stdlib` was **dropped** in Sprint 3 |
| React **18.2** | not 19 |
| Vite **5** | not 7 |
| Vitest **2.1.9** | ⚠️ pinned to the Vite 5 line so `npm ci` resolves |
| Playwright 1.62, jsdom 29, axios, terser | |
| Backend | **one Vercel serverless function**, not a server |

Tagged `#stack/threejs`.

## Open items

| # | Gap | Where I looked | Severity |
|---|---|---|---|
| 1 | ⚠️ **Hub note records `path: none — clone from GitHub if needed`.** The repo is on the Desktop at `/Users/brunojaamaa/Desktop/github-3d-visualizer`, 157 MB, clean, 0 unpushed | hub note frontmatter | **high** — the hub's cluster table also lists this as GitHub-only |
| 2 | ⚠️ **Hub note records `status: dormant`** and tags `#no-local-repo` and `#status/dormant`. It is deployed, public and linked from the portfolio. Correct value is `shipped` | hub note frontmatter + tags | **high** |
| 3 | ⚠️ **Hub note headlines "60 fps on 100+ repos"** and repeats it as a metric and in the performance table. **This project deliberately stopped quoting fps**: on fast hardware the frame interval is pinned by the display, so an fps figure measures the monitor. 100 and 250 repos both reported an identical 4.2 ms before the harness changed. The published figure is **0.2 ms p95 frame work** | hub note vs `docs/perf.json`, README *Frame work* | **high** — public-facing accuracy risk |
| 4 | ⚠️ **Hub note's entire performance section describes an architecture that no longer exists.** It credits frustum culling (**+15–20 fps**), level-of-detail scaling by repo count, material/geometry instance caching, pre-allocated `Frustum`/`Matrix4` objects, and `OrbitControls` **from `three-stdlib`**. Sprint 5 replaced the field with **one `InstancedMesh`** — there is no per-node mesh left to cull or simplify — and Sprint 3 **dropped `three-stdlib`** at `82c8a7f` | hub note vs `src/scene/instancedField.js`, `package.json` | **high** — an agent following it would optimise code that is gone |
| 5 | ⚠️ **Hub note claims "~197 KB gzipped".** Actual: **85.07 kB gzip eager** (blocking first paint) and **225.01 kB gzip total**. Neither is 197. **Total went up**, not down, mostly from the 0.159 → 0.185.1 upgrade; the win is entirely on the critical path | hub note vs README *Bundle* | **medium** |
| 6 | ⚠️ **Hub note says size scales "logarithmically with star count".** The code and the README both say **square root** | hub note vs `src/utils/positioning.js` | **medium** |
| 7 | ⚠️ **Hub note claims WCAG AA**, "focus trapping and restoration on every modal", "screen-reader live-region updates", "pinch-zoom and swipe-rotate on touch". Keyboard navigation **is** real and documented in `KeyboardHelpModal.jsx`, but **no guard or test in this repository asserts a WCAG level**, and the README's limitations state a visitor without WebGL gets a printed message rather than the data. Treat the claim as **unbacked** | hub note vs `scripts/guards.mjs`, `tests/` | **medium** |
| 8 | Hub note frontmatter reads `year: "2025"`. `PROJECT.json` says `2026`; first commit is 2026-03-11 | hub note vs `PROJECT.json` | low |
| 9 | Hub note says "17+ language mappings". The count was not verified file-by-file in this audit, but ⚠️ **three of the aliases are inert** — `F#`, `Objective-C` and `Shell` map to keys with no colour defined | `src/utils/colors.js`, README limitations | low |
| 10 | ⚠️ **Deployment routing is covered by no test.** 13 proxy unit tests all passed while the live proxy was down for every real path, because the handler was never invoked. Only curling production caught it | `tests/proxy.test.mjs`, `.github/workflows/ci.yml` | **high** — this is the repo's own top open item |
| 11 | **Frame times come from one machine**, an Apple M4 Pro. `MOTION.md` asked for integrated graphics and that measurement has never been taken | `docs/perf.json`, `MOTION.md` | medium — disclosed |
| 12 | **48 of 72 commits are bot-authored** (`OpenClaw Bot`, `Claude Code`). Owner-gated, S11, the only item left in that block | `git log` | medium — disclosed in README |
| 13 | `~/bruno-portfolio` **does not exist on this machine**, so the hub's named public source of truth (`lib/projects.ts`) could not be diffed locally. Verified against the **live page** instead | `ls ~/bruno-portfolio` | medium — affects all three projects |

## What the hub note gets *right*

Worth recording, because it is not all wrong:

- The **3-axis positioning model** as the core design decision ✅
- **Three.js directly, not React Three Fiber**, with the observation that Bruno's later 3D
  work goes the other way ✅
- **GitPulse "exports scenes to this"** ✅ — and it is real, in
  `src/scene/sceneGraph.js`, added in Sprint 8 as gitpulse interchange
- 30-minute cache TTL ✅ — `s-maxage=1800` at the edge

## Questions only Bruno can answer

1. **Rewrite the commit authorship, or state the bot authorship permanently?** 48 of 72
   commits. It is a force-push over public history. The README already states it, which is a
   defensible resting place — and it is the opposite call from Collab Dashboard, where the
   rewrite was done. Consistency across the portfolio may matter more than either answer.
2. **Define colours for `F#`, `Objective-C` and `Shell`, or remove them from the alias
   table?** Leaving an alias that maps to nothing is the same failure mode as the C++/`cpp`
   bug that hid for months.
3. **Is the deployment-routing check worth building?** The README says Next. It is the only
   gap that has already cost production.

## What could not be checked

- **The live deployment was not exercised.** Its state comes from the repo's README, the
  commit record of the WAF verification at `017e944`, and the case study.
- **`.env*` was not opened.** `GITHUB_TOKEN` is recorded as a name only. **No credential was
  found in tracked source**, and guard #10 asserts none can be.
- **The 17+ language mapping count was not verified exhaustively** — only the three inert
  aliases the README names.
