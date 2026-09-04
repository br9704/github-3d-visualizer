---
id: cfae8e7a-5e26-4501-a52d-e93feec73260
title: "Install Run and Test"
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
source_path: "/Users/brunojaamaa/Desktop/github-3d-visualizer/package.json"
created: "2026-08-17"
updated: "2026-08-19"
---

# Install Run and Test

**Requires Node.js 18+.**

## The eleven scripts

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server on `:5173` |
| `npm run build` | production build to `dist/` |
| `npm run preview` | serve the production build |
| `npm test` | **74** unit tests, Vitest |
| `npm run guards` | **11** design-system and honesty checks |
| `npm run verify` | `build` then `guards` — the combined gate |
| `npm run shots` | real browser, both viewports, GitHub mocked → `shots/` |
| `npm run motion-check` | the **15** `MOTION.md` acceptance checks |
| `npm run perf` | frame-time measurement → `docs/perf.json` |
| `npm run firstpaint` | throttled time to first drawn frame → `docs/firstpaint.json` |
| `npm run capture` | re-record the hero |
| `npm run histcmp` | histogram comparison |

## What a green run looks like

```console
$ npm test
 Test Files  5 passed (5)
      Tests  74 passed (74)

$ npm run guards
PASS — all guards green
note: blocking JS 270.74 kB of the 500 kB budget (2 chunk(s))

$ npm run motion-check
PASS — 15/15 MOTION.md checks green
```

## ⚠️ Do not trust a green build alone

This is the project's own lesson and it is worth repeating at the point of use:

> `npm run build` exited 0, transformed 404 modules, produced no console errors, and the app
> rendered a **near-blank white page** for months.

`npm run verify` combines build and guards for that reason. `npm run shots` is the check that
actually looks at the thing. Sprints here closed **against a screenshot**, not a green build.

## Local development and the rate limit

⚠️ `npm run dev` and `npm run preview` proxy `/api/github` straight to GitHub **without** a
token, so local development shares the **60 requests/hour** unauthenticated per-IP limit. A
few searches can exhaust it.

That is deliberate: `vite.config.js` routes the same path the deployed function routes, so
**the deployed path is the one local development exercises**. There is no production-only
branch.

The deployed build routes the same path through the serverless function, which authenticates
(~**4,900** remaining) and caches at the edge for **30 minutes**.

## Test dependencies

`vitest` **2.1.9** — ⚠️ pinned to the Vite 5 line at `cf8c91b`, *"so `npm ci` resolves at
all"*. Do not bump it without checking the Vite major. `jsdom` 29, `playwright` 1.62,
`wait-on` 9, `terser` 5.46.
