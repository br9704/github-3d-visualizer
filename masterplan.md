# masterplan.md — 3D GITHUB VISUALIZER

**Source of truth for sequencing.** Rules live in `CLAUDE.md`; animation spec lives in `MOTION.md`; the measured audit lives in `RESEARCH-CONTEXT.md`. Precedence on conflict: masterplan (sequencing) > CLAUDE.md (rules) > ENGINEERPROMPT.md (kickoff).

Status keys, marked live as work happens — never batched:
`[ ]` not started · `[~]` in progress · `[x]` complete · `[⏭]` deferred (always with a one-line reason)

**Current sprint pointer:** S4

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

## S0 — Honesty pass `[x]`

Fast, and it stops the repo actively hurting a reader.

- [x] Delete **37** process markdown files (`TEST_REPORT_*`, `VERIFICATION_REPORT_*`, `SUBAGENT_COMPLETION_*`, `SPRINTS_*`, `AUDIT_*`, `REDESIGN_*`, `Improvements_*`, `README_v3`, `MASTER_PLAN.md`, `TASK.md`, `TESTING.md`, `DEBUGGING.md`, …). Keep `README.md`, `CHANGELOG.md`, and the four planning docs.
- [x] Add `LICENSE` — MIT, Bruno Jaamaa, 2026. Claimed at `README.md:304` with no file behind it.
- [x] Rewrite `README.md`: removed the `via.placeholder.com` hero; deleted the fabricated perf table ("100 repos | 60 FPS", "200 repos | 55–60 FPS"); deleted "60 FPS at 100+ repositories"; `[PLACEHOLDER — live URL]` / `[PLACEHOLDER — hero recording]` placed where those will land.
- [x] Rename **Collaboration → Share & Annotate (local)** in the README *and* in `CollaborationPanel.jsx` / `collaborationService.js`. The service's own header comment already said real-time collab would need a WebSocket backend.
- [x] `.gitignore` `.claude/settings.json`, `.mcp.json`, `.codex/`, `.cursor/`, `opencode.json`, `AGENTS.md`, `GEMINI.md` — agent wiring with absolute `/Users/brunojaamaa/…` paths must not ship in a public repo.
- [x] Add `name` / `description` / `repository` / `license` / `author` / `homepage` to `package.json`.

**Acceptance:** ✅ `rg` finds zero unbacked claims in `README.md`; build exit 0; screenshots **byte-identical** to baseline (`cmp` → IDENTICAL at both viewports), proving this sprint was docs-only.

**As-shipped delta:**
- **37 files deleted, not 38.** The plan's count came from `ls *.md` at 40, which included `README.md` and `CHANGELOG.md` (both kept) and the repo's own `CLAUDE.md` (overwritten by the planning `CLAUDE.md`, so it is a modification rather than a deletion). Tracked markdown went 40 → 7.
- Four further unbacked claims found and removed beyond the plan's list, all discovered by checking the code rather than the docs:
  - "**Arrow Keys — Rotate camera**" — no arrow-key handler exists in `Visualizer.jsx`, and `OrbitControls.listenToKeyEvents()` is never called, so arrow keys do nothing.
  - "**17+ language-specific colors**" — the map in `utils/colors.js` has exactly 17 entries. Now stated as 17.
  - "**WCAG AA Modals**" (plural) — only `RepoDetails.jsx` has a focus trap and `aria-modal`. `KeyboardHelpModal.jsx` has neither. Now names the one dialog.
  - "**Frustum Culling (+15-20 FPS)**" and "**Shadow maps disabled: saves ~16MB GPU memory**" — both invented figures. Techniques kept, numbers removed.
- README now states plainly that there are no tests and no deployment, and records the measured build output (731.75 kB / 197.00 kB gzip) instead of estimates.
- Commit `59a3995`.

**Deferred:** nothing.

---

## S1 — SIGNAL foundation `[x]`

The sprint that makes the page stop being white. Design system is **inherited, never invented** — palette and rules from `~/bruno-portfolio/CLAUDE.md` → "Redesign Design Decisions (2026-07 · SIGNAL)".

```
--bg #050505 · --surface #0b0a09 · --text-primary #f0ece4 · --text-secondary #98928a
--text-dim #55504a · --amber #ffb000 (THE one accent) · --steel #2c2925 · --hairline #1b1916
```

- [x] New `src/styles/signal.css`: palette, reset, type scale, motion tokens, and a primitive vocabulary (`.sig-panel`, `.sig-btn`, `.sig-field`, `.sig-say`, `.sig-bar`, `.sig-data`). `DM Sans` + `JetBrains Mono` self-hosted via `@fontsource-variable` — no external font request.
- [x] **Delete the light theme entirely.** `src/contexts/ThemeContext.jsx` deleted, 12 `[data-theme="light"]` blocks stripped, theme toggle removed from `Header.jsx`. One theme, warm black.
- [x] **Fix the layering bug.** Canvas → `.scene` at `z-index: 0`; all chrome in a `.hud` stacking context above it.
- [x] `Header` → instrument bar: `</github universe>` label, status dot, corner micro-readout (`STANDBY` / `FETCHING` / `N NODES`), hairline rule.
- [x] **Strip every emoji**: 87 replaced across 14 components with monospace glyphs and bracket buttons.
- [x] Search / loading / error states in terminal voice: `> enter a username — try torvalds`, `> no public repositories`, terminal fill bars instead of spinners.
- [x] Global motion rules: ease-out or linear only, nothing over 600ms. `prefers-reduced-motion` → static everything.

**Acceptance:** ✅ screenshots at both sizes, in **both** the empty and populated states, show a styled, branded warm-black page with zero console errors. All 8 guards green.

**As-shipped delta:**

*Three bugs found by looking at the app in a browser, none of which a build could catch:*

1. **The canvas painted over the header.** `Visualizer` mounted it `position: fixed; inset: 0` with **no `z-index`**. The header was never missing — it was covered. This is the direct cause of "no header, no branding" in the audit.
2. **A WebGL failure showed nothing at all.** `useThreeScene` has always detected a missing WebGL context and set `initError` — and **nothing ever rendered it**. A visitor without WebGL got a silent empty page. `Visualizer` now prints it as text.
3. **Sphere size was applied twice.** `IcosahedronGeometry(size, detail)` built the geometry at radius `size`, *and* the mesh was scaled by `size` — so the rendered radius was **size²**. A 0.3 repo shrank to 0.09 (invisible); a 4.0 repo ballooned to 16 and swallowed the scene. Replaced with one shared **unit-radius** geometry plus per-mesh scale, which is also the form S5 needs for `InstancedMesh`. *Pulled forward from S5* — every screenshot gate from S2 on depends on the scene being legible.

*Why nobody had seen (2) and (3):*

**Headless Chromium has no WebGL at all** — `canvas.getContext('webgl2')` returns `null`. Every automated check ever run against this project was screenshotting an empty canvas and passing. `scripts/shots.mjs` now launches with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`. This is the single most important finding of the sprint: without it, every remaining gate would verify nothing.

*Verification harness built (reused by every later sprint, and by CI in S9):*
- `scripts/guards.mjs` (`npm run guards`) — 8 mechanical guards: no emoji, radius ≤2px, no light theme, no shadows, SIGNAL-palette-only hex, every `var(--x)` defined, README claims backed, no token literal.
- `scripts/shots.mjs` (`npm run shots`) — real browser at both viewports, **GitHub mocked from `tests/fixtures/github.mjs`**, so verification never touches the network or the 60 req/hr limit. Captures empty *and* populated states.

*Beyond the plan:*
- `KeyboardHelpModal` gained the focus trap and `aria-modal` it never had — so "focus-trapped dialogs" is now true of both dialogs, not one.
- The shortcut list was rewritten to match handlers that actually exist (the old list advertised arrow-key rotation, which nothing implements).
- `ColorLegend` deduped: several raw languages collapse to the display name "Other", which was rendering twice.
- `RepoDetails` moved from inline styles to a stylesheet; it was the last component with 8px radii.
- Measured: CSS 49.17 kB → 60.77 kB raw (8.69 → 11.69 kB gzip). It grew because SIGNAL adds two self-hosted variable fonts and a primitive layer; S2 removes the per-panel duplication that offsets it.
- Commit `c3fd230`.

**Deferred to S2:** panels still overlap and the search card still sits over the scene after a successful search — both are layout, which is exactly what `HudLayout` is for. Camera framing leaves the cluster high-left with dead space; that is scene work, deferred to S4.

---

## S2 — HUD architecture `[x]`

- [x] Replace the 11 independent `position: fixed` panels with one `HudLayout` owning four regions: **rail-left, rail-right, dock-bottom, search slot** (plus the header, which is its own fixed bar).
- [x] Dock `UserPreferencesPanel`, `FilterSetsManager`, `DataExportPanel`, `AdvancedHeatmaps`, `CollaborationPanel`, `ColorLegend`, `LanguageFilter`, `Pagination`, `ExportShare`, `StatsDisplay` into it. `RepoDetails` stays an overlay dialog (it becomes the S5 drawer).
- [x] Panels become collapsible instrument modules with `j/k/↵` nav (`Esc` already closes dialogs).
- [x] Real responsive behaviour at 390×844.

**Acceptance:** ✅ screenshots at both sizes in three states — empty, populated, and **every panel open**. Nothing overlaps, nothing floats detached, nothing off-screen at 390px.

**As-shipped delta:**

- **The search now has two states.** It was covering the universe it had just produced. Centred hero before a scene exists; docked under the header, compact, once repos are on screen.
- **Panel headers were clickable `<div>`s** — unreachable by keyboard entirely. They are `<button>`s now, so the browser's own focus order works and `j/k` has something real to move between.
- **New guard: "only HudLayout positions chrome."** The eleven-independent-`position:fixed` problem is now mechanically prevented, not just fixed once.

*Three defects that only appeared once the panels were expanded — which is why `scripts/shots.mjs` gained `--expand`:*

1. **Inverted token roles.** S1's colour map knew each colour's *text* role only, so `#fff` used as a **background** became `var(--text-primary)` → light cards with dark-on-light text inside dark panels. 43 declarations corrected, plus a new guard so a text token can never be a background again.
2. **Unbalanced CSS from S1.** The `var(--x, fallback)` rewrite stopped at the first `)`, leaving a stray paren on 12 declarations. Those were invalid and silently dropped by the browser — which is why the panels had no visible surface in the S1 screenshots.
3. **The heatmap ramp ran the wrong way.** `getIntensityColor` went light grey → near-black. On a warm-black ground that renders the *most active* repositories closest to invisible. Now an amber phosphor ramp, dark → bright.

- Radios and checkboxes lost the browser's blue; tab rows wrap instead of scrolling earlier tabs out of sight; count badges are hairline rather than filled chips.
- Commit `65af116`.

**Deferred:** two cosmetic items inside panel bodies — a metadata line still renders in the body font, and one radio label wraps awkwardly at 296px. Neither affects layout integrity; folded into S6 polish. Scene framing (cluster sits high-left with dead space) is scene work, deferred to S4 as planned.

---

## S3 — Three.js 0.185 + drop three-stdlib `[x]`

Deliberately before new scene code, so the ambient galaxy is written once against the final API.

- [x] `three@0.185.1`; removed `three-stdlib` (7 packages); `OrbitControls` now from `three/addons/controls/OrbitControls.js`.
- [x] Colour management audited: no change. Both 0.159 and 0.185 are post-r152 (`ColorManagement` on, `outputColorSpace` sRGB) and post-r155 (physical light units), so no migration was required.

**Acceptance:** ✅ build exit 0; **no visual regression, proven not eyeballed**; bundle size recorded.

**As-shipped delta:**

- **The comparison method had to be invented.** The scene auto-orbits, so a pixel diff between two runs is meaningless. `scripts/histcmp.mjs` compares the **colour histogram of the scene region** instead — rotation-tolerant, and exactly the signal that would move if colour management or lighting semantics had changed:

  | Measure | Before (0.159) | After (0.185) |
  |---|---|---|
  | Lit pixels in scene region | 81,052 | 81,136 (+0.1%) |
  | Histogram total-variation distance | — | **0.0015** (threshold 0.06) |

- **Bundle got bigger, and that is recorded rather than glossed:**

  | Asset | Before | After | Delta |
  |---|---|---|---|
  | JS raw | 730.94 kB | 796.74 kB | **+65.80 kB** |
  | JS gzip | 196.34 kB | 212.10 kB | +15.76 kB |

  three 0.185 is simply a larger library than 0.159, and removing `three-stdlib` does not offset it (only `OrbitControls` was being pulled from it, and it tree-shook well). **S10 pays this back** by code-splitting `three` out of the initial chunk.

- **README resynced with S1/S2.** Four claims had drifted out of true and were corrected: the dark/light theme toggle (deleted in S1), "focus-trapped repository dialog" (both dialogs now), "one geometry per distinct sphere size" (one shared unit geometry now), and a structure listing that still showed the deleted `ThemeContext.jsx`.
- Commit `82c8a7f`.

**Deferred:** nothing.

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
