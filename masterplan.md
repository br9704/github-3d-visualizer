# masterplan.md — 3D GITHUB VISUALIZER

**Source of truth for sequencing.** Rules live in `CLAUDE.md`; animation spec lives in `MOTION.md`; the measured audit lives in `RESEARCH-CONTEXT.md`. Precedence on conflict: masterplan (sequencing) > CLAUDE.md (rules) > ENGINEERPROMPT.md (kickoff).

Status keys, marked live as work happens — never batched:
`[ ]` not started · `[~]` in progress · `[x]` complete · `[⏭]` deferred (always with a one-line reason)

**Current sprint pointer:** S0

---

## Why this plan is ordered the way it is

The repo builds clean (exit 0, 404 modules) and renders a near-blank white page. Independently reproduced 2026-08-14 at 1440×900 and 390×844 against `vite preview` in headless Chromium. Root causes found, which the original audit did not name:

1. `src/components/Visualizer.jsx` mounts the canvas `position: fixed; inset: 0; 100vw×100vh` with **no `z-index`**, so it paints over `Header`. The header is not missing — it is covered.
2. `useThreeScene.js` creates the renderer with `alpha: true`, so the page background shows through the canvas. `ThemeContext` defaults to `prefers-color-scheme`, which is *light* by default → `--bg-primary: #f8f9fa` → the white page.
3. **11 components each declare `position: fixed` independently** with no shared layout. The "stray Preferences panel" is not stray — `UserPreferencesPanel` is the only always-mounted panel, floating alone.
4. **14 of 15 components contain emoji**, used as controls and as data glyphs.

The failure is presentation and layering, not logic: 5,913 LOC, no TODOs, no stubs, no console errors.

**Owner-gated work is deferred to S11 by owner directive.** Anything needing Bruno — PAT, deploy, force-push — lands in one block at the very end. Every sprint before it completes autonomously.

**Decisions taken at kickoff (2026-08-14):**
- Three.js `0.159` → **`0.185.1`**, and **drop `three-stdlib`** (`OrbitControls` now ships as `three/addons/controls/OrbitControls.js`).
- Authorship rewrite covers **both** `OpenClaw Bot <bot@openclaw.com>` (39 commits) **and** `Claude Code <code@anthropic.com>` (9 commits) → `Bruno Jaamaa <jaamaabruno@gmail.com>`. 48 commits total, not the 30 the shallow-clone audit saw.
- Token proxy built and verified against a **mocked upstream only** — no PAT on the build machine.
- **Full gitpulse scene-graph import path** is in scope (S8).

---

## Standing gate harness

Run at **every** sprint close, not only at the end. No sprint closes on a green build.

1. `npm run build` → exit 0; chunk sizes recorded in the sprint's As-shipped delta.
2. `vite preview` + Playwright screenshot at **1440×900 and 390×844**; console errors captured; **and looked at**.
3. From S9: `npm test` (Vitest) + the Playwright visual suite.
4. `rg` guards: no emoji in `src/`; no `[data-theme='light']`; no `via.placeholder.com`; no token string in `dist/`.
5. `record_verification` to aethereum — pass/fail, with the screenshot path as evidence.

---

## S0 — Honesty pass `[~]`

Fast, and it stops the repo actively hurting a reader.

- [ ] Delete 38 process markdown files (`TEST_REPORT_*`, `VERIFICATION_REPORT_*`, `SUBAGENT_COMPLETION_*`, `SPRINTS_*`, `AUDIT_*`, `REDESIGN_*`, `Improvements_*`, `README_v3`, `MASTER_PLAN.md`, `TASK.md`, `TESTING.md`, `DEBUGGING.md`, …). Keep `README.md`, `CHANGELOG.md`, and the four planning docs.
- [ ] Add `LICENSE` — MIT, Bruno Jaamaa, 2026. Claimed at `README.md:304` today with no file behind it.
- [ ] Rewrite `README.md`: remove the `via.placeholder.com` hero (`:5`); delete the fabricated perf table (`:214-215`, "100 repos | 60 FPS"); delete "60 FPS at 100+ repositories" (`:60`); `[PLACEHOLDER — live URL]` / `[PLACEHOLDER — hero recording]` where those will land.
- [ ] Rename **Collaboration → Share & Annotate (local)** in the README *and* in `CollaborationPanel.jsx` / `collaborationService.js` user-facing strings. The service's own header comment already says real-time collab would need a WebSocket backend.
- [ ] `.gitignore` `.claude/settings.json`, `.codex/`, `AGENTS.md`, `GEMINI.md` — agent wiring with absolute `/Users/brunojaamaa/…` paths must not ship in a public repo.
- [ ] Add `name` / `description` / `repository` / `license` to `package.json`.

**Acceptance:** `rg` finds zero unbacked claims in `README.md`; build exit 0; screenshots identical to baseline (proves this sprint was docs-only).

**As-shipped delta:** _pending_
**Deferred:** _pending_

---

## S1 — SIGNAL foundation `[ ]`

The sprint that makes the page stop being white. Design system is **inherited, never invented** — palette and rules from `~/bruno-portfolio/CLAUDE.md` → "Redesign Design Decisions (2026-07 · SIGNAL)".

```
--bg #050505 · --surface #0b0a09 · --text-primary #f0ece4 · --text-secondary #98928a
--text-dim #55504a · --amber #ffb000 (THE one accent) · --steel #2c2925 · --hairline #1b1916
```

- [ ] New `src/styles/signal.css`: palette, reset, type scale. `DM Sans` + `JetBrains Mono` self-hosted via `@fontsource-variable` — no external font request.
- [ ] **Delete the light theme entirely.** Remove `[data-theme='light']` from `App.css`, delete `src/contexts/ThemeContext.jsx`, remove the theme toggle from `Header.jsx`. One theme, warm black.
- [ ] **Fix the layering bug.** Canvas → `z-index: 0`; a `.hud` stacking context above it.
- [ ] `Header` → instrument bar: `</github universe>` label, mono, hairline rule, corner micro-readout.
- [ ] **Strip every emoji** across all 14 components → mono glyphs and bracket buttons (`[visualize →]`, `>`, `┌─┐`, `[████░░░]`).
- [ ] Search / loading / error states in terminal voice: `> enter a username — try torvalds`, `> user not found`, `> rate limited — try again in 4m`.
- [ ] Global motion rules: ease-out or linear only, nothing over 600ms, no bounce, no spring. `prefers-reduced-motion` → static.

**Acceptance:** screenshots at both sizes show a styled, branded warm-black page. `rg` emoji in `src/` → 0. `rg` `border-radius` > 2px → 0. No `[data-theme='light']` anywhere. No gradients, no shadows, no colour beyond amber.

---

## S2 — HUD architecture `[ ]`

- [ ] Replace the 11 independent `position: fixed` panels with one `HudLayout` owning fixed regions: top bar, left rail, right drawer, bottom readout.
- [ ] Dock `UserPreferencesPanel`, `FilterSetsManager`, `DataExportPanel`, `AdvancedHeatmaps`, `CollaborationPanel`, `ColorLegend`, `LanguageFilter`, `Pagination`, `ExportShare`, `RepoDetails` into it.
- [ ] Panels become collapsible instrument modules with `j/k/↵/esc` keyboard nav — the portfolio's directory-listing idiom.
- [ ] Real responsive behaviour at 390×844. Today the panels overlap and fall off-screen.

**Acceptance:** screenshots at both sizes with every panel open and closed. Nothing overlaps, nothing floats detached, nothing off-screen at 390px.

---

## S3 — Three.js 0.185 + drop three-stdlib `[ ]`

Deliberately before new scene code, so the ambient galaxy is written once against the final API. `record_decision` with the measured before/after.

- [ ] `three@0.185.1`; remove `three-stdlib`; `OrbitControls` from `three/addons/controls/OrbitControls.js`.
- [ ] Audit colour management — `outputColorSpace` and `THREE.Color` handling changed since 0.159 — and `MeshPhongMaterial` behaviour.

**Acceptance:** build exit 0; screenshot diff of a **seeded fixture scene** before vs after shows no visual regression; bundle size recorded.

---

## S4 — Ambient galaxy + entrance motion `[ ]`

Implements `MOTION.md` § "The empty state IS the hero" and § "Search → universe". Motion here is product behaviour, not polish.

- [ ] Seeded procedural generator → 60–80 placeholder spheres. No API call; works offline; never rate-limits.
- [ ] Timeline as specced: 0–400ms background fade + 1px grid to 8%; 400ms spheres stream in over ~1.2s, 15ms apart, centre outward; 1.6s+ drift at 0.03 rad/s.
- [ ] Demo galaxy at 50% dim, unlabeled → 25% on first keystroke → dissolves over 400ms, staggered, on successful search.
- [ ] Entrance: camera pulls back 15% over 600ms ease-out; real spheres stream in largest-first, 25ms apart, **growing at final coordinates — they do not fly**; stagger capped at 100, remainder instantiated on the final beat.
- [ ] Replace `easeOutBack` (`Visualizer.jsx:12`) — the system forbids bounce and `MOTION.md` says "overshooting by nothing".
- [ ] Settle: typed HUD line `> N repos · N stars · rendered in N.Ns` from **measured** values only.

**Acceptance (MOTION.md checklist):** cold load with no input is styled, branded and moving within 2s, screenshot-worthy at every moment after; 404 and rate-limit paths recorded as instant text with no dead loader; `prefers-reduced-motion` → instant placement, no drift, everything still readable.

---

## S5 — Instanced scene + interaction motion `[ ]`

- [ ] One geometry, `InstancedMesh` or merged buffers. Today: one `Mesh` + one **cloned** `MeshPhongMaterial` per repo — 100 draw calls and 100 materials for 100 repos.
- [ ] Hover → fixed HUD slot, killing the cursor-chasing tooltip (`Visualizer.jsx:539-559`, which jitters in 3D). ×1.15 over 120ms; 1px ring; green ring **only** for pushed-within-30-days — one colour, one meaning.
- [ ] Click → camera flight 500ms ease-out (never linear); detail panel slides in 280ms; scene drifts behind at 30% dim; Esc reverses both in 350ms.
- [ ] Filter changes: non-matching spheres shrink to 0.25 / 15% opacity over 300ms — they never vanish. Count line counts up.
- [ ] Heatmap modes cross-fade 400ms linear, uniform in one pass — never per-sphere staggered.
- [ ] Idle >60s halves drift; any input restores. **Render loop pauses entirely when the tab is hidden** — today it never stops.

**Acceptance:** hover / click / filter / Esc each recorded; camera never moves linearly; CPU verified at ~0 with the tab hidden; p95 frame time at 100+ repos measured and written into the As-shipped delta.

---

## S6 — Visual proof `[ ]`

For a visual project this is worth more than any feature.

- [ ] Real screenshots at both viewports, committed to `docs/`.
- [ ] A recording of the entrance sequence — `MOTION.md` requires the README hero to be the recording, not a static render.
- [ ] README hero replaced.

**Acceptance:** `via.placeholder.com` gone from the repo; hero renders in GitHub's markdown viewer.

---

## S7 — Token proxy `/api/github` (mock-verified) `[ ]`

The true blocker for a usable deployment: `githubApi.js` sends no `Authorization` header, so every visitor shares GitHub's 60 req/hr unauthenticated IP limit — tightened further in May 2025.

- [ ] Vercel Node function. The PAT rides the **outbound** fetch only; incoming requests carry no `Authorization`, which is what keeps responses cacheable.
- [ ] `Vercel-CDN-Cache-Control` long edge TTL + short browser `Cache-Control` + `stale-while-revalidate`. The CDN cache is the first line of PAT-budget defence — most demo traffic hits the same handful of famous usernames.
- [ ] Per-IP throttle via `@vercel/firewall` `checkRateLimit`. Vercel WAF rate-limiting is available on all plans including Hobby (1 rule/project, fixed window, keyed on IP, 429). Caveat: WAF counters and cache are per-region.
- [ ] `vercel.json` — SPA rewrites + function config.
- [ ] `src/utils/githubApi.js` switches to `/api/github/*` with a documented dev fallback.
- [ ] `declare_contract` for the GitHub API response shape.

**Acceptance:** mocked end-to-end test passes for success / 404 / 403-rate-limited; `grep` over `dist/` proves no token string can reach the client bundle; cache headers asserted in test.

---

## S8 — gitpulse scene-graph import `[ ]`

- [ ] `declare_contract` the scene-graph JSON as a **frozen** interface — this is gitpulse's `--export` target.
- [ ] Import path: drop a scene JSON, or `?scene=<url>`, as an alternative to a GitHub username.
- [ ] Schema validation with a terminal-voice error on mismatch.
- [ ] Round-trip fixture: export from this app → import → identical scene.

**Acceptance:** fixture round-trips; malformed input produces `> invalid scene graph — expected v1`, not a crash.

---

## S9 — Tests + CI `[ ]`

Closes the ten-test-reports-against-zero-tests gap — the most damaging thing in the repo today.

- [ ] Vitest over the pure functions first: `utils/positioning.js`, `utils/colors.js`, `services/heatmapGenerator.js`, `services/dataExporter.js`, `services/collaborationService.js`, the proxy handler, the scene-graph validator.
- [ ] Playwright smoke + visual regression on the empty state at both viewports.
- [ ] GitHub Actions workflow; README badge that reflects the **real** job.

**Acceptance:** all tests pass locally; the workflow file is valid; the badge points at a workflow that exists.

---

## S10 — Bundle + perf `[ ]`

- [ ] Dynamic `import()` of the scene module + `manualChunks` isolating `three`. Today: one 731.75 kB chunk (197.00 kB gzip), over Vite's 500 kB warning.
- [ ] Target: initial chunk under the warning threshold, 3D engine loaded after first paint.
- [ ] Profile a synthetic 100+ repo fixture. Record p95 frame time and the honest hardware it ran on.
- [ ] **The "60fps on 100+ repos" line is either evidenced by this measurement or deleted from all copy.**

**Acceptance:** build emits no chunk-size warning; measured numbers committed; README perf claims match the committed measurement exactly, or are gone.

---

## S11 — Owner-gated block `[ ]`

Everything requiring Bruno, deliberately collected at the very end so nothing before it blocks.

- [ ] `ask_human`: create a fine-grained PAT with **"Public repositories (read-only)" only** — sufficient for 5,000 req/hr — and add it as a Vercel env var. Never in the repo, never in chat.
- [ ] Deploy to Vercel. Verify the live URL renders; confirm edge caching via the `x-vercel-cache` header.
- [ ] Add the WAF rate-limit rule in the dashboard.
- [ ] README: live URL at the very top; re-verify the S6 hero against production.
- [ ] `record_decision`, then `ask_human` for the final go → `git filter-repo` with a mailmap rewriting **both** bot identities to Bruno across all 48 commits → force-push. Irreversible: hashes change, history shape stays.
- [ ] CHANGELOG entry; close the masterplan; update the Current-state line in `CLAUDE.md`.

**Acceptance:** a recruiter-clickable URL renders a moving universe within 2s cold; `git log --format='%an'` shows only Bruno Jaamaa.

---

## Findings log

Expanded in place as work happens — never deleted, never rewritten.

- **2026-08-14** — Baseline reproduced. `vite preview` + headless Chromium, 1440×900 and 390×844. Zero console errors, near-white page, floating search card, detached Preferences panel lower-left, emoji controls. Matches `RESEARCH-CONTEXT.md` §0 exactly.
- **2026-08-14** — Root cause of "no header": the `Visualizer` canvas is `position: fixed` full-viewport with no `z-index` and paints over `Header`. Not a missing component.
- **2026-08-14** — Root cause of "white": renderer `alpha: true` + `ThemeContext` defaulting to `prefers-color-scheme: light` → `--bg-primary: #f8f9fa` shows through the canvas.
- **2026-08-14** — 48 commits, not 30: 39 `OpenClaw Bot`, 9 `Claude Code`. The audit's count came from a shallow clone.
- **2026-08-14** — `three@0.185.1` is current; `three-stdlib@2.36.1` is already latest and becomes removable once `three/addons` is used directly.
