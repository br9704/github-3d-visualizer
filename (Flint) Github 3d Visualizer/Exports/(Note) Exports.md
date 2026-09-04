---
id: 4f66d884-7abc-4fb2-a1ed-1647d385db7b
title: "Exports"
type: note
project: "3D GitHub Visualizer"
tags:
  - "#note"
  - "#project"
  - "#ld/living"
  - "#status/shipped"
  - "#cluster/personal"
status: shipped
source_path: "/Users/brunojaamaa/Desktop/github-3d-visualizer/(Flint) Github 3d Visualizer/Exports"
created: "2026-08-17"
updated: "2026-08-19"
---

# Exports

**`Exports/` holds anything destined to leave this vault.** A note tagged `#export` has an
audience beyond Bruno and his agents.

## What belongs here

| Kind | Example for this project |
|---|---|
| Portfolio copy | text for `brunojaamaa.dev/projects/3d-github-visualizer` |
| Interview material | the "it builds is not it works" story, and the three harnesses that were measuring nothing |
| README fragments | anything that must stay in sync with the repo's `README.md` |

## The rule that makes this safe

**Every exported number must point at an artifact.** This repository already works that way:
every figure in its README names `docs/perf.json`, `docs/firstpaint.json`, a guard, or a test
file.

⚠️ Two specific claims must never be exported, because the repo has retired them on purpose:

- **any frames-per-second figure.** On fast hardware the frame interval is pinned by the
  display, so fps measures the monitor. The publishable number is **0.2 ms p95 frame work of
  a 16.7 ms budget, on an Apple M4 Pro** — and the hardware must be named with it.
- **any "total bundle got smaller" claim.** Total JS went **up**, 223.81 → 225.01 kB gzip.
  The win is on the critical path only: **223.81 → 85.07 kB** eager.

Both survive today in the hub note. Do not let either reach the public copy again.

## Currently

**Empty.**

Up: [[(Map) Master Map]]
