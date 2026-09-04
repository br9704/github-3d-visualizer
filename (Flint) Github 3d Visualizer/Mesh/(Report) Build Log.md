---
id: fc5650d6-11e4-4f65-b04c-684c5e188e3f
title: "Build Log"
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

# Build Log

**Built 2026-08-17 by `claude:subagent-github-3d-visualizer` under the standard vault brief**
(`Main/Shards/hq/_VAULT-BRIEF.md`), as part of the BRUNO HQ phase 2 build.

## What was done, in order

1. **Hazard check first.** `find … -flags +dataless` returned **0**. No file body was at risk
   of an indefinite hang.
2. **Read-only recon.** `git branch -a`, `status --short`, `log -30`, commit and unpushed
   counts, `du`, `find`. **No destructive git ran at any point.**
3. **`gh repo view br9704/github-3d-visualizer --json homepageUrl,…`** — read-only, and the
   one `gh` call the brief permits.
4. **Fetched the live case study** at `brunojaamaa.dev/projects/3d-github-visualizer` and
   diffed its claims against `docs/perf.json`, `docs/firstpaint.json` and `PROJECT.json`.
5. **Confirmed the stack from `package.json` rather than assuming it**, as the task required.
   Three.js **0.185.1** used directly, React **18.2**, Vite **5**, Vitest **2.1.9** pinned to
   the Vite 5 line, Playwright, jsdom, axios, terser. `three-stdlib` is **absent** — dropped
   in Sprint 3. Tagged `#stack/threejs`.
6. **Read the documents:** `README.md`, `PROJECT.json`, `masterplan.md` (headings),
   `package.json`, `.env.example` **for names only**.
7. **`flint init` → `flint sync` → `flint reference codebase`.**
8. **Wrote 35 notes** plus a root `CLAUDE.md`, across seven sections plus plumbing.
9. **Wrote and ran a verification script**, fixed what it found, re-ran to green.

## Assumptions made

| Assumption | Basis |
|---|---|
| The Vercel deployment is live and authenticated | The README, the WAF verification recorded at `017e944`, and the case study. **The deployment was not exercised** |
| `health: green` | Deployed, authenticated, rate-limited at the edge, 74 tests and 11 guards green, every published number traced to an artifact, and the repo discloses its own gaps rather than hiding them. The untested routing seam is real but named, disclosed and scheduled — it is a `health_note`, not an amber |
| `status: shipped` | Deployed, public, portfolio-linked. Ten of eleven sprints closed; the eleventh holds one owner-gated item |
| `#stack/threejs` | Three.js is the defining technology and the topic list on GitHub agrees |

## Deviations from the brief

| # | Deviation | Why |
|---|---|---|
| 1 | ⚠️ **The Flint is registered as `Github 3d Visualizer`, not the requested `GitHub 3D Visualizer`** | `flint init` rejects the requested name. Probed against the binary: `GitHub` is **rejected** (mixed case satisfies neither Title Case nor an all-caps acronym) and `3D` is **rejected** (uppercase letter after a digit does not satisfy "digit-led"). `Github Visualizer`, `GITHUB Visualizer` and `Github 3d Visualizer` are all accepted; the last is the closest to intent, so it was used. **Every note carries `project: "3D GitHub Visualizer"`**, the real name, and the registry name is flagged in [[(System) Flint Init]] and the root `CLAUDE.md` |
| 2 | **Section set reduced to seven**, dropping `40 Data & Integrations`, `70 Ops Deploy & Env`, `80 Testing & Quality` and `Z0 Archive` | The brief instructs dropping rather than padding. The only integration is the GitHub API and it has its own architecture note; ops and env are one page inside `30 Setup & Run`; testing is inseparable from the codebase map because the harnesses **are** the evidence; nothing is archived |
| 3 | **`flint resolve` does exist** in 0.6.0-dev.21, contrary to the brief's warning | `flint --help` lists it under *References*. Recorded as asked. Not needed |
| 4 | **`flint reference codebase <name> <path>` fulfils in one call**; `flint fulfill` was never needed | Confirms the prior agent's finding |
| 5 | **No `adr-writer` shard** | Optional in the brief. Decisions are already recorded in `masterplan.md` and the README's *Architecture* section with reasons; a second system would compete with the authority the repo declares |
| 6 | **The live case study was fetched over the web** | `~/bruno-portfolio` does not exist on this machine, so the hub's named source of truth (`lib/projects.ts`) could not be read locally. Read-only |

## Verification — programmatic

Script asserts: **0** broken wikilinks · **0** orphan notes · all frontmatter parses · every
`tags:` item quoted · `status:` and `health:` from their closed sets · every `id:` a
lowercase UUID used once · **every repo directory** documented in the inventory or audit, or
excluded with a reason.

Flint's own kernel scaffold (`Mesh/Main/`, `Mesh/Metadata/`, `Shards/Flint/`, `Shards/Orbh/`)
is excluded — it ships with the CLI and this vault did not author it.

### Results

```
notes (authored):   36   (35 notes + CLAUDE.md)
wikilinks checked:  130
repo dirs scanned:  24
errors:             0
warnings:           0
```

**Re-verified 2026-08-17** on a second pass under the same brief. The first pass left the
four shard files reachable only as inline code spans in [[(System) Flint Init]], which is
**four orphan notes** under a strict reading of the brief's "0 orphans". They are now
wikilinked from the *Which shards apply* section. Nothing else changed, and the re-run is
green at **0** errors and **0** warnings.

## Vault tree

```
(Flint) Github 3d Visualizer/
├── CLAUDE.md
├── Mesh/
│   ├── (System) Flint Init.md
│   ├── (Map) Master Map.md
│   ├── (Report) Project Summary.md
│   ├── (Report) Folder Audit.md
│   ├── (Report) Gaps & Questions.md
│   ├── (Report) Build Log.md
│   ├── (Index) Complete File Inventory.md
│   ├── (Guide) BRUNO HQ.md
│   ├── 00 Overview/            (Index) + 2 notes
│   ├── 10 Architecture/        (Index) + 3 notes
│   ├── 20 Codebase Map/        (Index) + 2 notes
│   ├── 30 Setup & Run/         (Index) + 2 notes
│   ├── 50 Decisions/           (Index) + 1 note
│   ├── 60 Roadmap, Tasks & Ideas/ (Index) + 1 note
│   └── 90 Reference/           (Index) + 2 notes
├── Sources/(Index) Sources.md
├── Media/(Index) Media.md
├── Exports/(Note) Exports.md
└── Shards/
    ├── codebase-map-refresh.md
    ├── changelog-from-git.md
    ├── onboarding-guide.md
    └── vault-audit.md
```

## The finding that matters

The brief asked whether the public claim matches the code. **It does.** The README,
`PROJECT.json`, `CHANGELOG.md`, the GitHub description and topics, the GitHub `homepageUrl`
and the live case study all agree with the repository and with each other. The site quotes
**3 draw calls**, **529 ms**, **0.2 ms p95 with the hardware named**, and **85.07 kB
gzipped** — every one traceable to an artifact in `docs/`.

**The stale artefact is the hub note**, and here the gap is larger than for Collab Dashboard:
Sprint 5 replaced the entire rendering architecture the note describes. It still credits
frustum culling, per-node level-of-detail, material caching and `three-stdlib` for a scene
that is now **one `InstancedMesh`** with none of those techniques in it. An agent following
that note would try to optimise code that no longer exists.

Six corrections, itemised in [[(Report) Gaps & Questions]].

---

## Late correction — shards were orphaned

The verification script's orphan check initially flagged all four files in `Shards/`, because
`(System) Flint Init` listed them as plain code spans rather than links.

**They were made real wikilinks rather than exempted from the check.** Exempting them would
have made the assertion weaker for no benefit; linking them makes the shards reachable by
navigation, which is what a reader actually needs. All three vaults in this batch were
changed the same way, so the check means the same thing across them.

Re-verified to **0 errors, 0 warnings**.


---

## Late correction — wikilinks were wrapped in backticks

⚠️ **Every wikilink in this vault was written as `` `[[(Type) Name]]` `` — inline code, not
a link.** Obsidian does not resolve a wikilink inside backticks, so the vault rendered with
**almost no working links at all**: a link check found **4** live links across the whole
vault, and every note except the Master Map was unreachable.

The house convention in the brief is *"Links are Obsidian wikilinks carrying the full
filename including the `(Type)` prefix, never aliased"*. Backticking them silently defeats
that.

**All backtick-wrapped wikilinks were unwrapped** (fenced code blocks left untouched). This
affected **all three vaults built in this batch**, so it was a convention error rather than a
one-off slip. Re-verified afterwards:

```
notes: 35
tag items: 197
links checked: 128
orphans (unreachable from Master Map): 0
errors: 0
```

**0 broken links · 0 orphans · 0 frontmatter errors.**
