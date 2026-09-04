---
id: fc5650d6-11e4-4f65-b04c-684c5e188e3e
title: "Git History"
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
source_path: "/Users/brunojaamaa/Desktop/github-3d-visualizer/.git"
created: "2026-08-17"
updated: "2026-08-19"
---

# Git History

**72 commits on `main`.** Working tree clean, **0** unpushed, last commit **2026-08-15**.

⚠️ **`main` is the production branch.** A push releases. There is no staging branch and no
other local branch.

## Branches

| Branch | Note |
|---|---|
| `main` | current, tracks `origin/main`, **and deploys** |
| `origin/main` | in sync |

Unlike Collab Dashboard, there is **no backup branch** here, because the authorship rewrite
was never performed.

## Two eras

**March 2026 — the original build.** Ended at `5d54521`, *"v5.0 - Production ready: 30+
features, white/grey design system, full documentation"*. ⚠️ That claim was false: the app
rendered a near-blank white page, and the ten test reports claiming comprehensive coverage
had **zero tests** behind them.

**August 2026 — the rescue.** Twenty-four commits over two days.

| Commit | Date | |
|---|---|---|
| `59a3995` | 08-14 | honesty pass — delete **37** process reports, add LICENSE, rewrite README |
| `c3fd230` | 08-14 | apply the SIGNAL system, and fix three bugs that made the app unviewable |
| `65af116` | 08-14 | one layout owns every fixed position |
| `82c8a7f` | 08-14 | three 0.159 → 0.185.1, **drop `three-stdlib`** |
| `df85740` | 08-14 | **the empty state is now the product** |
| `abb74a0` | 08-14 | **one draw call**, instrument nodes, and a layout that does not clump |
| `dea0f4c` | 08-14 | real screenshots and a recorded hero, replacing the placeholder |
| `0f99dde` | 08-14 | server-side GitHub proxy, so a public demo does not rate-limit |
| `7c478bf` | 08-14 | scene-graph interchange — read and write the **gitpulse** format |
| `3ccba4e` | 08-14 | **74 tests and CI**, closing the ten-reports-against-zero-tests gap |
| `154aeae` | 08-14 | warm the harness before the first timed check |
| `d79d453` | 08-15 | split three out of the critical path, and pay the download cost back |
| `2476de8` | 08-15 | README, PROJECT.json and CHANGELOG that trace every number to an artifact |
| `4815255` | 08-15 | ⚠️ **the routing bug that took the live proxy down**, and the copy that said we were not live |
| `cf8c91b` | 08-15 | pin vitest to the Vite 5 line so `npm ci` resolves at all |
| `5b875b4` | 08-15 | reconcile every claim with production, and name the pattern |
| `45de8e0` | 08-15 | connect the Vercel project to this repository |
| `fc83929` | 08-15 | add the per-IP rate limit, and **delete the throttle that never ran** |
| `017e944` | 08-15 | record the WAF verification, **tripped against production** |
| `723f4bd` | 08-15 | untrack machine-local and agent config |
| `7d9055c` | 08-15 | docs: link the case study on brunojaamaa.dev |

## ⚠️ Authorship

**48 of the 72 commits are attributed to `OpenClaw Bot` and `Claude Code`.** The README
states this in its limitations table rather than hiding it. Rewriting is a force-push over
public history and is the single remaining owner-gated item, tracked as S11.

## Regenerating this

`Shards/changelog-from-git.md` rebuilds this note. Read-only git only.
