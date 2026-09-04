---
id: 809a0b14-2e5c-47a6-aaed-345aede44950
title: "The GitHub Proxy"
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
source_path: "/Users/brunojaamaa/Desktop/github-3d-visualizer/api/github/[...path].js"
created: "2026-08-17"
updated: "2026-08-19"
---

# The GitHub Proxy

⚠️ **This is the one part of the project that holds a credential.** Read this before
touching anything under `api/`.

**One Vercel serverless function**, `api/github/[...path].js` (**171** lines). It exists so a
public demo does not rate-limit: authenticated, `x-ratelimit-remaining` reads in the
**4,900s**; unauthenticated it is under **60**.

## The allowlist is the design

> **The proxy is an allowlist, not a passthrough.**

**Four endpoint patterns** are proxied. Everything else returns **403** and never reaches
GitHub.

Without that, `/api/github/<anything>` would be an **open proxy authenticating with our
token** — including `/user`, which would reveal whose token it is. That path is verified live:
`/api/github/user` returns 403 with a real token behind it.

Query parameters are bounded and allowlisted too:

- `per_page=9999` **clamps to 100**
- an unknown `client_secret` is **dropped**, not forwarded

## One code path, not a production-only branch

`vite.config.js` proxies the same `/api/github` route to GitHub **unauthenticated** in dev
and preview, so **the deployed path is the one local development exercises**. There is no
branch that only runs in production.

⚠️ The consequence for local work: `npm run dev` and `npm run preview` share the **60
requests/hour unauthenticated per-IP limit**, and a few searches can exhaust it.

## The secret

| | |
|---|---|
| Name | `GITHUB_TOKEN` |
| Declared in | `.env.example` — **names only, never opened** |
| Where it is used | on the **outbound fetch only**, inside the function |
| Where it is not | ⚠️ **none of the four client chunks.** Verified |
| Asserted by | **guard #10** — no token literal in the source |

**No credential was found in tracked source during this audit.**

## Caching and rate limiting

| | |
|---|---|
| Edge cache | `s-maxage=1800` — 30 minutes. **Errors are never cached** |
| Observed in production | `x-vercel-cache: HIT` |
| Edge rate limit | **100 requests / 60 seconds per IP**, denied for a minute past that |
| Cost of a throttled request | **zero function invocations** — it is denied at the edge |

The rate limit was added at `fc83929` (2026-08-15), which also **deleted a throttle that
never ran**. Verified by tripping it against production at `017e944`.

## The bug that is the reason for the one open task

⚠️ **The proxy has 13 unit tests. They did not catch the bug that took it down.**

The bug was a **routing** bug: the handler was never invoked for real paths. Every test
exercises the handler directly, so all thirteen passed while production returned nothing
useful. It was caught by **curling production**, and nothing in CI would catch a repeat
today.

Fixed at `4815255`, *"the routing bug that took the live proxy down, and the copy that said
we were not live"*. The README names a deployment-routing check as **Next**, and it is the
single most valuable thing left to build here. See [[(Note) Roadmap and Open Work]].

## Tests

`tests/proxy.test.mjs` (**277** lines, **13** tests) covers the allowlist, token handling,
the cache split and rate-limit passthrough. Nothing in the suite touches the network —
GitHub is mocked from `tests/fixtures/github.mjs`, so a run **can never be broken by the rate
limit**.
