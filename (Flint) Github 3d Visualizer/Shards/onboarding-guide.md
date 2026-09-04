---
id: 105c49e2-dc98-4b36-9cf6-fd3ae18944c0
title: "Onboarding guide"
type: note
project: "3D GitHub Visualizer"
tags:
  - "#note"
  - "#shard"
  - "#ld/living"
  - "#cluster/personal"
status: active
created: "2026-08-17"
updated: "2026-08-19"
---

# Shard — onboarding-guide

**A from-cold walkthrough for a person or agent who has never seen this project.**

## Read this first, and take it literally

> **"It builds" is not "it works."**

`npm run build` exited 0, transformed 404 modules, produced no console errors, and the app
rendered a near-blank white page for months. **Headless Chromium has no WebGL**, so every
automated check had been screenshotting an empty canvas and passing.

Do not trust a green check in this repo without knowing what it looked at.

## The path, in order

1. [[(Report) Project Summary]] — what it is, whether it works, what is risky.
2. [[(Note) What the Visualizer Is]] — the product and the three hard problems.
3. [[(Note) The Render Pipeline]] — one `InstancedMesh`, 3 draw calls, the label atlas.
4. [[(Note) Positioning and the Empty State]] — rank mapping and the seeded galaxy.
5. ⚠️ [[(Note) The GitHub Proxy]] — **read before touching anything under `api/`.**
6. [[(Note) Install Run and Test]] — get it running.
7. [[(Note) Honest State]] — what is not true about it.

## Then run it

```bash
cd /Users/brunojaamaa/Desktop/github-3d-visualizer
npm install && npm run dev      # :5173
```

You will see the ambient galaxy immediately, with no network call. Type a username to load a
real profile. ⚠️ Local dev is **unauthenticated** and shares the 60 requests/hour per-IP
limit — a few searches exhaust it.

```bash
npm run verify        # build + 11 guards
npm test              # 74 tests
npm run shots         # the check that actually looks at the thing
```

## The four things that surprise people

1. **The empty state is the product**, and it is deliberately **uncoloured** — language
   colour carries meaning and decoration must not borrow it.
2. **Axes are rank-mapped, not linearly mapped.** Stars and forks are power-law distributed;
   a linear map collapses the whole universe into one mass.
3. **The proxy is an allowlist.** Four endpoints. Everything else 403s and never reaches
   GitHub, because otherwise it is an open proxy authenticating with Bruno's token.
4. **Deployment routing has no test.** 13 proxy tests passed while production was down for
   every real path.

## Before writing any code

Read `masterplan.md` (**505** lines) — eleven sprints, every as-shipped delta, the findings
log, and a closing section on the pattern this repository teaches.
`masterplan > CLAUDE.md > memory`.
