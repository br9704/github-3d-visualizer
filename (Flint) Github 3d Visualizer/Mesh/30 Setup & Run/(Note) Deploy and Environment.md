---
id: d4b4e76c-388e-43e4-acf3-cec7727fcac3
title: "Deploy and Environment"
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
source_path: "/Users/brunojaamaa/Desktop/github-3d-visualizer/vercel.json"
created: "2026-08-17"
updated: "2026-08-19"
---

# Deploy and Environment

**Vercel, with `main` as the production branch.** A push to `main` releases.

That was wired at `45de8e0`, *"connect the Vercel project to this repository"*, and the
reason is stated in the README: **the repo can no longer quietly disagree with production
about a file the proxy depends on.**

## Environment variable names

> Names only. `.env*` is never opened. No value appears anywhere in this vault.

| Name | Where | Notes |
|---|---|---|
| `GITHUB_TOKEN` | the Vercel function, server-side only | ⚠️ Used on the **outbound fetch only**. It appears in **none** of the four client chunks, and **guard #10** asserts no token literal exists in the source |

Local development needs **no** environment file. It proxies GitHub unauthenticated.

## The topology

| Piece | Where |
|---|---|
| Static build | Vercel, from `dist/` |
| Proxy | one Vercel serverless function, `api/github/[...path].js` |
| Edge cache | `s-maxage=1800`. Errors never cached. `x-vercel-cache: HIT` observed in production |
| Edge rate limit | **100 requests / 60 s per IP**, denied for a minute past that. A throttled request costs **no function invocation** |

`vercel.json` and `.vercel/project.json` hold the link. `.vercel/` is machine-local and was
untracked at `723f4bd`.

## Verified against production, not assumed

`017e944` records a WAF verification **tripped against production**. The README lists what
was checked live:

- `x-ratelimit-remaining` reads in the **4,900s** rather than under 60
- `x-vercel-cache: HIT` observed
- ⚠️ `/api/github/user` returns **403** with a real token behind it — the allowlist holds
- the token appears in **none** of the four client chunks

## ⚠️ The untested seam

**Deployment routing is covered by no test, and it is the seam that has already failed.**

The proxy has **13** unit tests. The bug that took the live proxy down for every real path
was that **the handler was never invoked** — a routing bug, not a handler bug. All thirteen
tests passed throughout. Only curling production caught it, at `4815255`.

> Nothing in CI would catch a repeat today.

The README names a deployment-routing check as **Next**. It is the highest-value open item in
the project. See [[(Note) Roadmap and Open Work]].

## CI

`.github/workflows/ci.yml` runs the 74 tests and the 11 guards. ⚠️ It does **not** run
`shots`, `motion-check`, `perf` or `firstpaint` — those need a GPU-backed browser and are run
by hand.
