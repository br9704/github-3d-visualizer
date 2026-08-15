# CLAUDE.md — 3D GITHUB VISUALIZER
# Any GitHub profile rendered as a 3D universe.

Read this at the start of every session. `masterplan.md` (created in Phase 3 of `ENGINEERPROMPT.md`) is the source of truth for sequencing. `RESEARCH-CONTEXT.md` is the measured audit — read it before trusting the README, which currently overstates the project.

---

## Owner

| | |
|---|---|
| Name | Bruno Jaamaa · jaamaabruno@gmail.com · GitHub `br9704` |
| Repo | github.com/br9704/github-3d-visualizer |
| Live URL | **https://github-3d-visualizer.vercel.app** — deployed 2026-08-15, PAT live, 5,000 req/hr. |

## What this is

A Vite + React + Three.js SPA. A GitHub user's repos become icosahedron spheres — size ∝ √stars, colour by language, positioned by age/stars/forks. Orbit camera, click-to-detail with README preview, language filters, saved filter sets, JSON/CSV/screenshot export, shareable base64 URLs, heatmap modes. **One theme, warm black (SIGNAL)** — the light theme and its toggle were deleted in S1.

## The audit this project started from (Aug 2026 — kept as the record)

> This section is history, not current state. It is preserved because it is the evidence for the rule below. For where the project stands now, see **Current state** at the bottom of this file.

`npm run build` → exit 0, 404 modules, 13.1s. 5,913 LOC / 41 files. No TODOs, no stubs. Console errors: none.

**And it rendered a near-blank white page.** Unstyled white background, browser-default typography, a floating search card, a **stray "Preferences" panel floating detached in the lower-left**, raw emoji (🌙 ❓ 🔍 ⚙️) as controls. No header, no branding, nothing 3D. The scene appeared only after a successful search — which without a token failed on GitHub's 60 req/hr shared limit.

**A visitor saw a white page, then an error.** A build-level check missed all of this, which is exactly why the rule below exists.

Three more gates were later found measuring something other than the product: the MOTION.md 2 s check ran on unthrottled localhost where no build can fail it; the browser suite once ran end-to-end against **a different application** that held its hardcoded port; and the token proxy's 13 passing mock tests could not see that `[...path]` resolved as a single dynamic segment in production, leaving the proxy dead for every real two-segment path. **Mock-verified is not runtime-verified, and a green gate is not evidence until you know what it measured.**

## The rule this project exists to teach

> **"It builds" is not "it works." Every visual change is verified by opening it in a browser and looking at it.**

No sprint in this repo closes on a green build alone. Screenshot the result at 1440×900 and at 390×844, and look.

## Locked decisions (do not relitigate)

- **The empty state IS the product.** Most visitors will never type a username. Design the landing and empty state before touching bundle size, tests, or a Three.js upgrade.
- **The token proxy is mandatory before deploy.** A serverless `/api/github` holds a PAT server-side (5,000 req/hr instead of 60) with edge caching, since most demo traffic hits a handful of famous usernames. Deploying without it is pointless. **The PAT must never reach the client bundle.**
- **Deploy target: Vercel** — serverless functions for the proxy come free in the same project.
- **Claim only what the code does.** The README's "Collaboration" section is localStorage + URL-param state sharing; `src/services/collaborationService.js` says so in its own header comment. Rename it "Share & Annotate (local)".
- **Docs are not process artifacts.** 40 markdown files, ~10 named `TEST_REPORT_*.md`, claim comprehensive testing against **zero tests**. Keep README + CHANGELOG; delete the rest. Never commit an agent-process report to this repo again.
- **No LICENSE currently exists** despite MIT claims in the docs. Add one.

## Known issues

> Resolved items are kept with their resolution, so the list stays a record rather than a to-do that loses its history.

- ~~731 kB single bundle, Three.js not code-split~~ — **resolved S10.** Eager payload is 270.74 kB raw / 85.07 kB gzip. Vite still warns about the 545.56 kB `three` chunk on purpose; guard #11 gates the blocking graph instead. Do not raise `chunkSizeWarningLimit`.
- ~~Three.js pinned at 0.159~~ — **resolved S3.** Now 0.185.1, `three-stdlib` dropped.
- ~~README hero is a `via.placeholder.com` URL~~ — **resolved S6.** `docs/hero.gif`, recorded from the running app against a deterministic fixture.
- ~~"60fps on 100+ repos" unverified~~ — **resolved S0/S5.** Claim deleted, replaced with measured frame work on named hardware in `docs/perf.json`.
- **Still open (the last one) — commit authorship.** 48 commits by `OpenClaw Bot <bot@openclaw.com>` and `Claude Code <code@anthropic.com>`, publicly visible. Rewriting is an `ask_human` decision; it force-pushes public history. S11.
- ~~Not deployed; proxy verified only against a mock~~ — **resolved 2026-08-15.** Live at https://github-3d-visualizer.vercel.app with the PAT set — `x-ratelimit-remaining` reads in the 4,900s rather than under 60, which is the authenticated ceiling and the only thing that number needs to prove (it decrements per request, so quoting an exact value dates instantly). Edge caching observed (`x-vercel-cache: HIT`), and the allowlist holding live (`/api/github/user` → 403). Production immediately exposed a bug 13 passing mock tests could not: `[...path]` resolved as a **single** dynamic segment, so the proxy was dead for every real two-segment path. Fixed with a `rewrites` block in `vercel.json`.
- ~~The deployment is not linked to the repo~~ — **resolved 2026-08-15.** `vercel git connect`; the project reports `link: {type: github, org: br9704, repo: github-3d-visualizer, productionBranch: main}`. A push to `main` now releases. Worth remembering how the gap arose: `vercel link` links a *directory* to a project and is not the same thing as connecting the *project* to a repo — the first had been done and looked like the second.
- **Still open — Fast 3G misses the 2 s bar** (2665 ms to first frame). So does the unsplit build; it is the cost of shipping a WebGL renderer, not a regression.
- **Still open — perf measured on one machine.** Apple M4 Pro only. `MOTION.md` asked for integrated graphics and that has never been run.
- **Still open — `f#`, `objective-c` and `shell` aliases are inert**, mapping to keys with no colour defined, so those languages render grey.
- **Still open — the 390×844 layout compresses the node cluster into a narrow band** with dead space above it, and the dock buttons render over the nodes. Reported as owner-accepted on 2026-08-15; recorded here rather than closed, because every gate passes on it (15/15 motion, zero console errors, clean `shots.mjs`) and a future session will otherwise re-find it as a bug.

---

## Aethereum sync — required workflow (canonical block, identical across every project)

This project coordinates through Aethereum. Account config lives at `~/.aethereum/config.json` and this machine is already logged in.

- **First session:** run `aethereum init` in the repo root and create/join this project's room.
- **`share_intent`** — one line at the start of every sprint, before any code. Marking a task complete without having shared intent for its sprint is a workflow violation.
- **`declare_contract`** — for every interface other code consumes. Here: the GitHub API response shape and the scene-graph format (which is also gitpulse's `--export` target).
- **`record_decision`** — at every architectural fork or irreversible choice, with the *why*. Here especially: the authorship rewrite and the proxy/caching design.
- **`ask_human`** — whenever the decision is Bruno's: spending money, publishing, deleting, rewriting git history, naming, or anything with an external side effect. Do not guess and do not block — keep working other tasks until answered.
- **`record_verification`** — at every sprint gate, pass/fail with evidence. For this repo, evidence means a screenshot.

## Masterplan discipline (canonical block)

The masterplan is the **single source of truth for sequencing**. This file is the source of truth for *rules*. Precedence on conflict: masterplan (sequencing) > CLAUDE.md (rules) > ENGINEERPROMPT.md (kickoff).

- Status keys, used live in the file as work happens: `[ ]` not started · `[~]` in progress · `[x]` complete · `[⏭]` deferred (always with a one-line reason).
- **Never delete or rewrite masterplan content.** Expand it in place — add sub-tasks, file paths, edge cases, findings. Deepen, don't replace.
- Mark tasks as you go, never batched at the end of a session.
- A sprint closes only when its acceptance criteria pass. Then: fill the **As-shipped delta** and **Deferred** notes, move the Current-sprint pointer, and update the Current-state line at the bottom of this file.
- Never skip a sprint. Never partially complete one and move on.
- Stop and report at every sprint close before starting the next.

## Honesty rules (canonical block)

- Never state a number in a README, the site, or any public copy that a committed artifact cannot back.
- Verified counts only — never restate a figure from memory.
- If a claim and the code disagree, that is a bug in one of them. Fix it or flag it; never leave it ambiguous.
- `[PLACEHOLDER — description]` for anything unknown. Never invent content.

---

## Current state

> Update at every sprint close.

**Current state (2026-08-15, Sprint D closed, S11 partial):** S0–S10 complete, Sprint D closed, S11 part-done. **Live at https://github-3d-visualizer.vercel.app** with the PAT set (`x-ratelimit-remaining` in the 4,900s — authenticated, not the shared 60), edge caching observed (`x-vercel-cache: HIT`), the allowlist holding live (`/api/github/user` → 403 with a real token behind it), and a real search verified end to end. Cold load renders a seeded 88-node galaxy with no API call; a loaded profile draws in 3 calls. 74 tests, 11 guards, 15 browser checks. Eager payload 270.74 kB / 85.07 kB gzip; first frame 529 ms on 4G. README, `PROJECT.json` and `CHANGELOG.md` each trace every number to a committed artefact.

**Still open, owner-gated (S11):** commit authorship — 48 bot commits, a force-push over public history. Everything else in S11 is done: deploy, PAT, absolute OG URLs, Git integration (`main` = production branch), and the WAF per-IP rate limit.

## MOTION.md (binding)

`MOTION.md` in this folder is the animation specification — sequences, timings, per-surface rules, acceptance gates. It has the same authority as this file. When you author `masterplan.md` in Phase 3, fold its acceptance checklist into the relevant sprint gates and reference it from the plan.
