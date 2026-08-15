# masterplan.md — 3D GITHUB VISUALIZER

**Source of truth for sequencing.** Rules live in `CLAUDE.md`; animation spec lives in `MOTION.md`; the measured audit lives in `RESEARCH-CONTEXT.md`. Precedence on conflict: masterplan (sequencing) > CLAUDE.md (rules) > ENGINEERPROMPT.md (kickoff).

Status keys, marked live as work happens — never batched:
`[ ]` not started · `[~]` in progress · `[x]` complete · `[⏭]` deferred (always with a one-line reason)

**Current sprint pointer:** Sprint D

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

## S4 — Ambient galaxy + entrance motion `[x]`

Implements `MOTION.md` § "The empty state IS the hero" and § "Search → universe". Motion here is product behaviour, not polish.

- [x] Seeded procedural generator → **88** placeholder spheres (`src/scene/ambientGalaxy.js`). No API call; works offline; never rate-limits.
- [x] Timeline as specced: 1px grid at 8%; spheres stream in 15ms apart, centre outward; drift at 0.03 rad/s.
- [x] Demo galaxy at 50% dim, **uncoloured** → 25% on first keystroke → dissolves over 400ms, staggered, on successful search.
- [x] Entrance: camera pulls back 15% over 600ms ease-out; real spheres stream in largest-first, 25ms apart, **growing at final coordinates**; stagger capped at 100.
- [x] `easeOutBack` replaced with `src/scene/easing.js` — ease-out and linear only.
- [x] Settle: typed HUD line `N repos · N stars · N.Ns` from **measured** values (`useTypedText`, 40ms/char, whole under reduced motion).

**Acceptance (MOTION.md checklist):** ✅ all nine checks automated in `scripts/motion-check.mjs` and green.

| Check | Result |
|---|---|
| Cold load renders a scene within 2s, no input | ✅ 17,831 bright samples |
| The cold-load scene is moving | ✅ signatures 900ms apart differ |
| 404 prints text | ✅ `user not found` |
| 404 leaves no dead loader | ✅ |
| Rate limit prints text | ✅ `rate limited — try again in 4m` |
| Rate limit reports the actual wait | ✅ |
| Reduced motion places instantly | ✅ 19,062 samples at 400ms |
| Reduced motion does not drift | ✅ frames 1.4s apart identical |
| Reduced motion keeps data readable | ✅ `100 repos · 1.2m stars · 0.6s` |

**As-shipped delta:**

- **The ambient galaxy is deliberately uncoloured.** Language colour carries meaning in this app; scenery must not borrow it. It uses `--text-secondary` at 50%.
- **Camera framing was wrong in two independent ways**, which is why the universe kept appearing as a small clump in a corner:
  1. Only `camera.position.z` was set while x/y stayed at 0, so the camera looked at a bounding-box centre it was not aligned with — an off-axis projection.
  2. `dist = max(fitHeight, fitWidth, size.z)` compared a **68-unit depth extent** against ~30-unit fit *distances*. Depth won every time, parking the camera more than twice as far back as framing required.
- **Portrait needed its own framing.** A shallow tilt collapses a disc into a stripe on a tall viewport, so portrait looks further down on to it (54° vs 24°) and deliberately crops the width — a galaxy running past the edges reads better than a small one floating in the middle.
- **Language filtering moved into the render loop.** Filtering the prop (as S2 left it) would tear the scene down and replay the entrance on every filter change. Now non-matching spheres shrink to 0.25 / 15% per MOTION.md, and are excluded from picking so hover cannot report a repository the filter excluded.
- **API errors now speak the terminal voice** — `user not found`, `rate limited — try again in 4m`.
- **Two findings from building the acceptance harness:**
  - A WebGL canvas **cannot be read back with `drawImage`** — without `preserveDrawingBuffer` the drawing buffer is cleared after compositing, so the first version of the checks measured zero every time. They compare page screenshots instead.
  - **`x-ratelimit-reset` is not a CORS-safelisted header.** A mock that omits `access-control-expose-headers` makes the "try again in 4m" path untestable *and silently wrong* — the message quietly degrades to "try again later". Real GitHub exposes it; the mock now does too.
- The mobile bottom sheet is auto-height on the empty state; a fixed 46vh sheet holding one collapsed module was just dead black space.
- Commit `df85740`.

**Deferred to S5 as planned:** instancing, click-to-camera-flight, heatmap cross-fade, tab-hidden render pause, and the measured p95 frame time.

---

## S5 — Instanced scene + interaction motion `[x]`

- [x] One `InstancedMesh`. Draw calls are now **constant in repository count**: 3 for the whole scene (nodes, wireframe shells, labels), verified at 150 repositories.
- [x] Hover → fixed HUD slot; ×1.15; ring around the node; **green only** for pushed-within-30-days.
- [x] Click → camera flight 500ms ease-out; scene dims to 30%; Esc reverses in 350ms.
- [x] Filter changes shrink non-matching nodes to 0.25 / 15% (landed in S4).
- [x] Idle >60s halves drift; **render loop pauses entirely when the tab is hidden**.
- [⏭] Heatmap cross-fade — the heatmaps are 2D DOM panels, not scene state, so a scene-level cross-fade does not apply to them. Their ramp was corrected in S2. Folded into S6 polish rather than faked here.

**Acceptance:** ✅ 12/12 automated checks (`npm run motion-check`), including the two added here:

| Check | Result |
|---|---|
| Draw calls constant, not one per repository | ✅ **3** for 150 repositories |
| Hiding the tab pauses the render loop | ✅ frame counter held at 126 across 1.2s hidden |
| Showing the tab resumes it | ✅ frames differ again |

**As-shipped delta:**

- **The clumping had a root cause, and it was the normalisation.** `positioning.js` mapped stars and forks with a **linear min-max**. Those are power-law distributed — one repo with 60,000 stars and ninety under fifty is the normal shape of a profile — so almost every repository landed on the same coordinate and the universe rendered as one overlapping mass with a couple of outliers stranded far off. Axes are now mapped by **rank**, which is distribution-free, plus a deterministic relaxation pass that separates anything still closer than the sum of its radii. Spans widened to 116 × 78 × 92.
- **The lens was wrong too.** A 75° FOV rendered spheres near the frame edge as visible ovals and let the nearest ones swamp everything behind. Now 45°, and framing fits the **near face** of the cloud rather than its centre plane.
- **Nodes read as instruments, not balls.** A hairline wireframe shell shows the facet structure, and each node carries a **billboarded monospace language code** (`JS`, `PY`, `RS`, `C++`). That is the design system's form of an icon — a mono glyph, not a pictogram, which the emoji guard would reject anyway. All codes live in one canvas atlas drawn as one instanced quad, billboarded in the vertex shader, so the entire label set is a single draw call with no per-frame CPU work.
  - Labels were invisible at first: sitting at the node centre, the sphere's own front face depth-tested them away. They are now pushed in front of the node in view space.
  - They also carry a dark outline, because warm-white type on a bright JavaScript-yellow node is unreadable without one.
- **Measurement had to be rethought twice:**
  1. A frame-*interval* figure is useless on fast hardware. On an M4 Pro both 100 and 250 repos reported an identical **4.2 ms** — that is the display refresh, not the app. The harness now also records time spent **inside** the render loop.
  2. Headless Chromium has no GPU, so its numbers are a **software-rasteriser floor** (~53–62 ms/frame). Both modes are recorded in `docs/perf.json`, and neither is quoted without saying which it is.

  **Result:** 0.2 ms of frame work at 250 repositories on an Apple M4 Pro, against a 16.7 ms 60fps budget — 1.2% of it. The README states that, with the hardware named, in place of the bare "60 FPS" assertion S0 deleted.
- Deleted `src/styles/Tooltip.css`; the cursor-chasing tooltip it styled no longer exists.
- Bundle: 806 kB → 817.34 kB raw (218.58 kB gzip), from the label shader and wireframe pass. S10 addresses the total.
- Commit `abb74a0`.

**Deferred:** heatmap cross-fade (see above, folded into S6).

---

## S6 — Visual proof `[x]`

For a visual project this is worth more than any feature.

- [x] Real screenshots at both viewports, at **deviceScaleFactor 2** so they are not soft on a retina display, committed to `docs/`.
- [x] A recording of the entrance sequence — `docs/hero.gif`, 60 frames, captured by driving the real app.
- [x] README hero replaced, plus a two-up of cold load vs loaded profile.

**Acceptance:** ✅ `via.placeholder.com` gone; hero is a GIF, which GitHub renders inline (it does not play webm, which is why this is not the video Playwright can record).

**As-shipped delta:**
- `scripts/capture.mjs` records the **whole story** — ambient galaxy, typing, dissolve, entrance, settle — rather than just the final state.
- **Two-pass ffmpeg palette.** A single global palette bands the warm-black ground badly, and banding is the one thing that would make the asset look cheap.
- **The captured profile is the deterministic fixture, not a real account.** A real username would put someone else's repository names in this project's README and make the asset impossible to reproduce once their profile changed.
- **New guard:** every local image the README references must exist. A README pointing at a missing screenshot is the same failure class as the placeholder hero it replaced.
- `docs/` is 2.7 MB total.
- Commit `dea0f4c`.

**Deferred:** the S2 cosmetic items (a metadata line in the body font, one wrapping radio label) are still open; they are cosmetic and did not warrant re-capturing the assets. Carried to S10's polish pass.

---

## S7 — Token proxy `/api/github` (mock-verified) `[x]`

The true blocker for a usable deployment: `githubApi.js` sends no `Authorization` header, so every visitor shares GitHub's 60 req/hr unauthenticated IP limit — tightened further in May 2025.

- [x] Vercel Node function at `api/github/[...path].js`. The PAT rides the **outbound** fetch only.
- [x] `Vercel-CDN-Cache-Control: s-maxage=1800, stale-while-revalidate=86400` + browser `max-age=60`. **Errors are never cached** (`no-store`).
- [⏭] Per-IP throttle via `@vercel/firewall`, **failing open** — the cache is the primary budget defence and a throttle outage should not take the demo down. **This was never true and is corrected in S11:** `@vercel/firewall` was never added to `dependencies`, so the dynamic import threw on every request and the `catch` chose the fail-open path 100% of the time. The rule ID it passed matched no rule either. Replaced with an edge-enforced WAF rule; the dead code is gone.
- [x] `vercel.json` — function config, immutable caching for hashed assets, baseline security headers.
- [x] Client switched to `/api/github/*`, including the autocomplete, which was still calling `api.github.com` directly.
- [x] `declare_contract` — `GET /api/github/*`, with **five behavioural properties**, not just a shape.

**Acceptance:** ✅ 13/13 tests against a mocked upstream; no token can reach the bundle; cache headers asserted.

**As-shipped delta:**

- **An allowlist, not a passthrough.** Four endpoint patterns are proxied; everything else returns 403 and never reaches GitHub. Without it, `/api/github/<anything>` would be an **open proxy authenticating with our token** — including `/user`, which would reveal whose token it is. Tested with a path-traversal attempt and non-GET methods.
- **One code path, not a production-only branch.** `vite.config.js` proxies `/api/github` to GitHub in dev *and* preview (unauthenticated), so the client always calls the same URL. The alternative — branching on `import.meta.env.DEV` — would mean the deployed path is the one nothing local ever exercises.
- **The no-token leak is proved, not asserted.** Built with `GITHUB_TOKEN` set to a sentinel and grepped `dist/` for both the value *and* the variable name. Neither appears; the function is not part of the client build.
- **Query parameters are bounded and allowlisted**, so `per_page=9999` clamps to 100 and an unknown `client_secret` is dropped rather than forwarded.
- `.env.example` documents that a **fine-grained "Public repositories (read-only)"** token suffices — no account scope.
- Harness fragility found and fixed: a slow first paint surfaced as a 30s `page.fill` timeout deep in a later check, reading like a product bug rather than a cold start. The checks now wait for mount and fail with a clear message.
- Commit `0f99dde`.

**Deferred to S11 (owner-gated):** creating the PAT, setting it in Vercel, adding the WAF rule in the dashboard, and confirming `x-vercel-cache: HIT` against production.

---

## S8 — gitpulse scene-graph import `[x]`

- [x] `declare_contract` **SceneGraph v1 [frozen]**, with five behavioural properties and two worked examples — a spec, not just a shape.
- [x] Import path: **drop a file anywhere on the page**, or `?scene=<url>` for a shareable link.
- [x] Validation with terminal-voice errors that list **every** problem at once.
- [x] Round trip made real: `dataExporter` gained the write side, so export → import is testable rather than theoretical.

**Acceptance:** ✅ 14 contract tests including a lossless round trip; browser checks confirm `?scene=` loads and a malformed graph is refused with `format must be "github-3d-visualizer/scene", got "something/else"`.

**As-shipped delta:**

- **Two contract decisions worth keeping:**
  1. **Layout is optional.** A producer that only knows about repositories should not have to invent 3D coordinates — omit `position`/`size` and this app computes them. A producer that *has* a layout can pin it.
  2. **Layout is all-or-nothing.** Honoured only if *every* node carries it. Half a layout would put some nodes at meaningful coordinates and the rest at the origin, which renders as a bug rather than as data.
- **A reader refuses an unknown `version`** rather than best-effort parsing it. Guessing produces a silently wrong picture, which is worse than refusing.
- **Imported nodes become ordinary repo objects**, so the detail panel, filters, exporters and heatmaps all work unchanged instead of needing a second code path.
- **A bug in my own harness, worth recording:** routing `**/example-scene.json` in Playwright *also* matched the page URL `/?scene=/example-scene.json`, because that string ends with the same characters. The glob served JSON in place of the app's HTML, nothing mounted, and the failure read like a product bug. Route matching is on `pathname` now.
- The aethereum pre-commit gate flagged the commit as touching a frozen contract. That is ordering noise on a first implementation — the contract was declared before the commit that creates its files — not a real violation.
- `docs/example-scene.json` ships as the reference file.
- Commit `7c478bf`.

**Deferred:** nothing.

---

## S9 — Tests + CI `[x]`

Closes the ten-test-reports-against-zero-tests gap — the most damaging thing in the repo today.

- [x] **74 tests** across five files (Vitest). Two environments chosen **per file**, not globally: the proxy and the scene-graph contract run in node, so a test cannot quietly start depending on a browser global the serverless function will never have; the `localStorage` services opt into jsdom with a pragma.
- [x] Playwright acceptance in CI — the MOTION.md list plus screenshots at both viewports in empty, populated and all-panels-open states, uploaded as artifacts.
- [x] GitHub Actions workflow with a badge, **and a guard that keeps the badge honest**.

**Acceptance:** ✅ 74/74 tests; 10/10 guards; 15/15 browser checks, stable across three consecutive cold runs.

| Suite | Tests | Covers |
|---|---|---|
| `tests/proxy.test.mjs` | 13 | allowlist, token handling, cache split, rate-limit passthrough |
| `tests/sceneGraph.test.mjs` | 14 | the gitpulse contract, lossless round trip |
| `tests/positioning.test.mjs` | 10 | axis spread on power-law data, separation, determinism |
| `tests/scene.test.mjs` | 22 | language colours and codes, easing, seeded galaxy, liveness |
| `tests/dom/services.test.mjs` | 15 | annotations, snapshots, preferences under jsdom |

**As-shipped delta:**

**Three real bugs the tests found, none of which was visible on screen:**

1. **C++ and C# rendered grey as "Other".** `"C++".toLowerCase()` is `c++`, but the colour map's key is `cpp`, so both fell through to the fallback — and the node label came out as `C+`. *A grey sphere among grey spheres reads as data, not as a bug*, which is exactly why nobody had noticed. Fixed with an alias map. *(Corrected during Sprint D: this originally read "(C++, C#, F#, Objective-C)". Only C++ and C# are actually fixed — `'f#': 'fsharp'` and `'objective-c': 'objectivec'` alias to keys that exist in neither `languageColors` nor `languageCodes`, so those two still fall through to grey. The README only ever claimed C++ and C#, so no public copy was wrong.)*
2. **`getIntensityColor(NaN)` returned `undefined`.** `Math.floor(NaN)` is `NaN` and survives both clamps, so `colors[NaN]` is undefined and a heatmap cell would render with `backgroundColor: undefined`.
3. **The easing suite asserts nothing overshoots `[0,1]`** — the assertion that would have caught `easeOutBack`, which the original entrance used and which the design system forbids.

**Two mistakes were mine, in the tests:** I asserted `pinned` and `timestamp` where the implementation has `isPinned` and `createdAt`. The implementation was right; the tests were corrected.

**A flaky gate is worse than no gate.** The cold-load check failed about one run in four, always on the first run after `vite preview` started — that run pays for module transform and SwiftShader context creation, so it measured the harness starting up rather than the app rendering. The harness now warms first; verified stable across three consecutive cold runs.

**New guard:** a CI badge must point at a workflow that **exists** and that actually runs `npm run build`, `npm run guards` and `npm test`. A badge for a workflow that only builds is the same class of overstatement as ten test reports against zero tests. Verified the guard fires by temporarily stubbing `npm test` out of the workflow.

**Noted, not fixed:** the aethereum pre-commit gate flags every edit to `tests/sceneGraph.test.mjs` as touching the frozen `SceneGraph v1` contract, because the contract's `files` glob lists its own spec file. Editing a test is not changing the contract; re-declaring to narrow the glob would itself be a change to a frozen contract, so it is left as advisory noise.

Commits `3ccba4e` and the warm-up fix.

---

## S10 — Bundle + perf `[x]`

- [x] Dynamic `import()` of the scene module + `manualChunks` isolating `three`. At kickoff: one 731.75 kB chunk (197.00 kB gzip), over Vite's 500 kB warning. By the time this sprint ran, S3's Three upgrade and S8's scene-graph code had taken that single chunk to **834.06 kB (223.81 kB gzip)**.
- [x] Target: initial chunk under the warning threshold, 3D engine loaded after first paint. **Blocking payload is now 270.74 kB raw / 85.07 kB gzip.**
- [x] Build-time `modulepreload` for the scene chunks, without which the split is a net regression on any real connection (see below).
- [x] Profile a synthetic 100+ repo fixture. Record p95 frame time and the honest hardware it ran on.
- [x] **The "60fps on 100+ repos" line is either evidenced by this measurement or deleted from all copy.** — deleted in S0, replaced in S5 with measured frame work on named hardware. Re-verified, not re-litigated.
- [x] New harness `scripts/firstpaint.mjs` (`npm run firstpaint`) — time to first drawn frame on a throttled link.
- [x] Polish items S2 and S6 deferred into "S10's polish pass".

**Acceptance (restated — see delta):** ✅ blocking payload under 500 kB with `three` out of the static graph, mechanically guarded; ✅ first-frame time measured on three link profiles and no worse than the single-bundle build; ✅ 74/74 tests, 11/11 guards, 15/15 MOTION checks; ✅ screenshots at both viewports captured **and looked at**.

**As-shipped delta:**

**The stated acceptance — "build emits no chunk-size warning" — is not reachable honestly, and was replaced rather than quietly satisfied.** Vite's warning fires per chunk at 500 kB. Tree-shaken `three` is 545.56 kB, against 750.94 kB for the library's own full minified build (`three.module.min.js` 365,552 B + `three.core.min.js` 385,386 B, the first importing the second) — so 27% is already being shaken out, and what remains is `WebGLRenderer` and the shader library, which this app needs. The only ways to silence the warning were to raise `chunkSizeWarningLimit`, which mutes a real regression detector, or to shatter `three` into arbitrary sub-chunks, which helps nothing. Both are dishonest ways to turn a checkbox green.

What the sprint body actually asked for — "initial chunk under the warning threshold, 3D engine loaded after first paint" — *is* reachable, and is now a mechanical gate: **guard #11, "initial JS payload under budget, with three deferred."** The warning still prints on every build, deliberately, so a genuine regression still announces itself.

**The split, shipped alone, would have been a regression — and every gate in this repo would have passed it.** A dynamic import is not requested until the chunk containing the import statement has downloaded, parsed and run, so `three` queued *behind* the two smallest chunks instead of travelling beside them. Measured with the new harness, 5 samples per profile, cold context, cache disabled, time to first drawn frame:

| Link | One chunk | Split, no preload | Split + preload |
|---|---|---|---|
| localhost | 139 ms | 178 ms | 250 ms |
| 4G — 9 Mbit/s, 40 ms RTT | 438 ms | 527 ms | **529 ms** |
| Fast 3G — 1.6 Mbit/s, 563 ms RTT | 2549 ms | **3493 ms** | **2665 ms** |

The split cost **944 ms of the hero moment on Fast 3G**. `preloadSceneChunks()` in `vite.config.js` advertises the scene chunks in the HTML so the browser opens all three connections at once; that recovers it to within run-to-run noise of the single-bundle baseline. The localhost column is the noisiest (single-sample outliers of 1.2–1.8 s across runs) and is the one profile where preloading plausibly costs something real — parse work front-loaded on a link where bandwidth was never the constraint. No visitor is on localhost; it is in the table because it is the profile every previous gate used.

**The MOTION.md 2 s gate has been passing since S4 on a check that could not fail.** `motion-check.mjs` loads over unthrottled localhost, where every build arrives in milliseconds. Worse, it hardcodes port 4173 and starts no server of its own: on this machine 4173 was held by a different project, and the suite ran end-to-end against **another application**, with the bright-pixel heuristic scoring that application's page as a rendered scene and passing the first check. So every green "cold load renders a scene within 2s" recorded in S4, S5 and S9 was measured on a link no visitor has, and at least one was measured against the wrong app. `firstpaint.mjs` owns its own server on an OS-assigned free port and throttles; it gates on 4G, because on Fast 3G **both** the split and the single-bundle build miss 2 s — that is pre-existing and not the split's doing.

**Total JS went up, and the win is critical-path only.** 796.74 → 835.72 kB raw, 212.10 → 225.01 kB gzip, mostly S3's Three upgrade. What improved is what a visitor waits on before the HUD paints: **eager gzip 223.81 → 85.07 kB, a 62% cut.** Any copy implying the app got smaller would be unbacked.

*Found while closing, none of it on the sprint list:*

- **The favicon has never worked.** `index.html` shipped Vite's scaffold `<link rel="icon" href="/vite.svg">` and this repo has no `public/` directory — the file does not exist anywhere. It does not even 404: the SPA fallback answers `/vite.svg` with `200 text/html`, so no monitor would ever flag it. Fixed with a real mark, plus the `meta description` / OpenGraph / Twitter-card block the app had none of — for a product whose headline feature is a shareable URL, a pasted link previewed as a bare domain. `og:image` is deliberately relative and `og:url` deliberately absent; **both must become absolute at S11, once a domain exists.**
- **Blue and indigo were still in the app, through S1's entire colour purge and every gate since.** Guard #5 only inspected hex literals, so `rgba(59, 130, 246, 0.12)` (a blue info panel), `rgba(99, 102, 241, 1)` (an indigo hover on the preferences primary button), two slate-grey text colours and a literal white label were invisible to it. The guard now parses `rgb()`/`rgba()` triples against the same palette; the six black scrims it then surfaced were moved from `rgba(0,0,0,…)` to the real ground `rgba(5,5,5,…)` rather than granted an exception.
- Both guards were verified to *fail* before being trusted: budget lowered to 200 kB fails; a stray static `import * as THREE from 'three'` in `App.jsx` fails with "three is statically imported by the entry" at 816.25 kB blocking.
- `perf.mjs` stamped `measuredAt` at the top of the file, so re-running one mode silently re-dated the other — the file could claim a GPU figure was measured on a day no GPU run happened. The date now belongs to the mode.
- The S2/S6 cosmetic deferrals are closed: panel metadata was falling through to the body sans because `HudLayout.css` only reached `h3/h4/h5/label`, fixed at the two panel roots; and the export size no longer wraps mid-number at the 296px rail.

**Deferred:** a fresh **headed** (GPU) perf run — the headed browser closed mid-run three times on this machine and the harness could not complete. `docs/perf.json` keeps S5's GPU figures, now explicitly stamped `measuredAt: 2026-08-14`, alongside today's software-rasteriser run. S10 changed module loading, not the render loop, so steady-state frame work cannot have moved; but the figure is dated honestly rather than presented as current.

Commit: see below.

---

## Sprint D — Documentation `[~]`

Runs after the engineering sprints and before the owner-gated block, so the README describes a finished artefact rather than a moving one. Driven by `DOCS-ENGINEERPROMPT.md` (not committed — it is process, and this file is the record).

- [~] Rewrite `README.md` to the documentation-pass structure: hook and visual above the fold, badges that resolve, prose instead of a feature inventory, a Mermaid architecture diagram, a "How it was built" section, evidence tables, limitations, status.
- [~] `PROJECT.json` at the repo root — the machine-readable card the portfolio consumes. Every `metrics[].source` must point at a file that exists; `honest` is required and non-empty.
- [~] Backfill `CHANGELOG.md`, which stops at v4.0.0 (2026-03-11) and has no entry for S0–S10 at all — it still advertises the dark/light theme toggle deleted in S1.
- [~] Repo hygiene: `LICENSE` matches `package.json`; `.gitignore` covers process artefacts; the GitHub description and topics stop claiming TypeScript and Tailwind, neither of which this project uses.
- [~] Push. All of S0–S10 is local-only: `origin/main` is still `5d54521 v5.0`, so the public repo shows the pre-audit README, the 40 process markdown files and the `via.placeholder.com` hero.

**Acceptance:** ✅ every number in the README traces to a committed artefact; ✅ every image resolves (200 from `raw.githubusercontent.com`); ✅ `PROJECT.json` validates and every `source` path exists; ✅ repo description and topics no longer claim TypeScript or Tailwind.

**Owner decisions taken (2026-08-15):** finish S10 before this sprint; push and fix the repo metadata; hold nothing back from the measured numbers. The "nothing owner-gated is done" answer was overtaken mid-sprint — see below.

**As-shipped delta:**

- **The sprint was overtaken by its own subject.** The README was written, committed and pushed stating "Not deployed yet… this file does not pretend there is one" — and the project was deployed roughly twenty minutes later. For that window the repository publicly asserted something false, which is precisely the failure the honesty rules exist to prevent, arriving from the one direction they did not anticipate: the claim was true when written and the world moved. **A documentation pass that runs before the owner-gated block has to be re-verified after it, not merely written carefully.**
- **`PROJECT.json` carried a contradiction for one commit:** `status: "live"` with an `honest` field still opening "Not deployed, so the token proxy has never made an authenticated request to real GitHub". Both halves had been correct at different times. `ownerGated` likewise still listed the PAT and the deploy. The file now separates `ownerGated` from `ownerGatedDone` so a completed gate is recorded rather than silently dropped.
- **Production immediately exposed a bug thirteen passing tests could not.** Vercel resolved `api/github/[...path].js` as a *single* dynamic segment rather than a catch-all, so exactly one path segment reached the function. `/api/github/user` and `/api/github/users` returned 403 — the allowlist working correctly — while `/api/github/users/torvalds` returned 404 with `x-vercel-error: NOT_FOUND` and never reached the handler at all. Every endpoint the app actually calls is two segments or more, so **the proxy was 100% dead for real traffic while a single-segment probe looked healthy**. S7's tests exercise the handler; the handler was never invoked. Fixed with a `rewrites` block in `vercel.json` — which existed only in the deploying session's scratchpad copy and had to be brought back into the repo, or the next deploy from `main` would have reintroduced it.
- **The CI badge went red the first time it ever ran.** CI had never executed on `main` — every prior sprint verified locally — so the badge the README shipped was untested. First contact failed in 14s: `npm ci` refused because `package-lock.json` pinned `esbuild@0.21.5` for Vite 5.4.21 while `package.json` asked for `vitest ^4.1.10`, whose Vite 6/7 line needs `esbuild ^0.28`. `node_modules` held a tree the lockfile never described, and `npm install --package-lock-only` reported no change, so this was a dependency decision rather than a refresh. Resolved by pinning `vitest` to `^2.1.9`, which keeps Vite on 5.4.21, and regenerating the lockfile from scratch. **`npm ci` had never once been run in this project before CI ran it.**
- **Re-measuring moved the entry chunk 129.80 → 129.92 kB**, so the blocking payload is 270.74 kB / 85.07 kB gzip rather than 270.62 / 85.04. The cause is worth naming precisely, because it was initially misattributed to the Vitest pin: the pin holds Vite at 5.4.21 and changes no output. The extra 0.12 kB is the autocomplete-dismissal fix — real source added to the entry chunk. A dependency change that alters nothing and a source change that alters 0.12 kB are easy to confuse when both land in one session, and only rebuilding tells them apart. Five documents cited the old figures and all five were corrected; the honesty rule is exact match, not approximate.
- The README's feature inventory (~60 bullets) was replaced by four paragraphs of prose per the documentation-pass structure, and a Mermaid architecture diagram drawn from what exists rather than what was planned.

**Deferred:** verifying that the Mermaid diagram renders on GitHub's own markdown pipeline — it is committed and syntactically valid, but has not been eyeballed on the rendered page. Given this project's history of gates that measure the wrong thing, that is worth an actual look rather than an assumption.

---

## S11 — Owner-gated block `[~]`

Everything requiring Bruno, deliberately collected at the very end so nothing before it blocks.

- [x] `ask_human`: create a fine-grained PAT with **"Public repositories (read-only)" only** — sufficient for 5,000 req/hr — and add it as a Vercel env var. Never in the repo, never in chat. **Done 2026-08-15**, verified in production: `x-ratelimit-remaining: 4991`, so the demo is authenticated rather than on the shared 60/hr limit. Token absent from all four client chunks.
- [x] Deploy to Vercel. Verify the live URL renders; confirm edge caching via the `x-vercel-cache` header. **Done 2026-08-15** — https://github-3d-visualizer.vercel.app. `x-vercel-cache: HIT` observed, `cdn-cache-control: public, s-maxage=1800, stale-while-revalidate=86400`, and the allowlist verified live (`/api/github/user` → 403 *with a real token behind it*).
- [x] Add the WAF rate-limit rule. **Done 2026-08-15** — rule `github-proxy` (`rule_github_proxy_NLZkDO`), active in the published config: path starts with `/api/github`, 100 requests per 60 s keyed by IP, fixed window, deny for 1 m. Created with `vercel firewall rules add` and `vercel firewall publish`, then confirmed against `/v1/security/firewall/config/active` rather than the CLI's success message.

  **Adding it exposed that the throttle S7 claimed to have shipped had never run once.** The handler called `checkRateLimit('github-proxy')` behind `await import('@vercel/firewall')` inside a `try/catch` that returned `false` on failure — and `@vercel/firewall` was never in `dependencies`. So the import threw on every single request and the catch took the fail-open path every time. The rule ID was wrong too: real rules are `rule_github_proxy_NLZkDO`, not `github-proxy`. Two independent reasons it could not work, in code that reads exactly like a working throttle, and 13 proxy tests that never touched it.

  The dead path is deleted rather than repaired. Enforcing at the edge is strictly better anyway: a throttled request is rejected *before* the function is invoked, so abuse costs no compute rather than merely no GitHub quota. **Limit chosen at 100/60s per IP** because one search costs about 25 requests (user + repos + up to 20 READMEs + autocomplete), so this allows roughly four searches a minute per visitor while bounding a single abusive IP.
- [x] README: live URL at the very top; re-verify the S6 hero against production.
- [x] **`index.html`: add `og:url`, and make `og:image` / `twitter:image` absolute.** **Done 2026-08-15**, once the domain existed.
- [x] **Link the Vercel project to `github.com/br9704/github-3d-visualizer`.** Not in the original plan, and it turned out to matter: the first deploy was a CLI upload from a scratchpad copy, so the repo and production diverged immediately — `vercel.json`'s `rewrites` block existed only in the deployed copy, and a deploy from `main` would have reintroduced the routing bug. **Done 2026-08-15** via `vercel git connect`; the project API now reports `link: {type: github, org: br9704, repo: github-3d-visualizer, productionBranch: main}`, so a push to `main` releases.
- [ ] `record_decision`, then `ask_human` for the final go → `git filter-repo` with a mailmap rewriting **both** bot identities to Bruno across all 48 commits → force-push. Irreversible: hashes change, history shape stays.
- [ ] CHANGELOG entry; close the masterplan; update the Current-state line in `CLAUDE.md`.

**Acceptance:** a recruiter-clickable URL renders a moving universe within 2s cold; `git log --format='%an'` shows only Bruno Jaamaa.

**Partial delta (2026-08-15), recorded now because the deploy happened mid-Sprint-D rather than after it:**

- **The deploy found a bug the whole S7 test suite was structurally incapable of finding.** Vercel resolved `api/github/[...path].js` as a **single** dynamic segment, not a catch-all. `/api/github/user` and `/api/github/users` returned 403 — reaching the handler, allowlist working — while `/api/github/users/torvalds` returned 404 `x-vercel-error: NOT_FOUND` without ever reaching it. Every endpoint the app actually calls has two segments or more, so the proxy was **dead for 100% of real traffic while a one-segment probe looked healthy**. The 403-vs-404 split is the entire diagnosis: the handler code was never at fault. Fixed with a `rewrites` block in `vercel.json`.
- **`x-ratelimit-remaining` went from 55 to 4991** once the PAT was set — the difference between the shared unauthenticated limit and an authenticated one, visible in a response header and in no test.

---

## Findings log

Expanded in place as work happens — never deleted, never rewritten.

- **2026-08-14** — Baseline reproduced. `vite preview` + headless Chromium, 1440×900 and 390×844. Zero console errors, near-white page, floating search card, detached Preferences panel lower-left, emoji controls. Matches `RESEARCH-CONTEXT.md` §0 exactly.
- **2026-08-14** — Root cause of "no header": the `Visualizer` canvas is `position: fixed` full-viewport with no `z-index` and paints over `Header`. Not a missing component.
- **2026-08-14** — Root cause of "white": renderer `alpha: true` + `ThemeContext` defaulting to `prefers-color-scheme: light` → `--bg-primary: #f8f9fa` shows through the canvas.
- **2026-08-14** — 48 commits, not 30: 39 `OpenClaw Bot`, 9 `Claude Code`. The audit's count came from a shallow clone.
- **2026-08-14** — `three@0.185.1` is current; `three-stdlib@2.36.1` is already latest and becomes removable once `three/addons` is used directly.
- **2026-08-15** — `motion-check.mjs` hardcodes port 4173 and starts no server. With another project holding that port, the whole MOTION suite ran against a different application and the first check *passed*. A gate that can false-pass is worse than no gate. `firstpaint.mjs` owns its server on an OS-assigned port; `motion-check.mjs` still needs the same treatment.
- **2026-08-15** — Splitting a large dependency into its own chunk is not free: without a `modulepreload` hint the browser will not request it until the importing chunk has downloaded and executed. Measured cost here was 944 ms to first frame on Fast 3G. Any future split needs the same before/after measurement.
- **2026-08-15** — Tree-shaken `three` is 545.56 kB against 750.94 kB for the library's own full minified build. There is no honest route under Vite's 500 kB per-chunk warning while `WebGLRenderer` ships.
- **2026-08-15** — The favicon has never resolved: `index.html` referenced Vite's scaffold `/vite.svg`, which this repo has never contained. The SPA fallback answers it `200 text/html`, so it fails silently rather than 404ing.
- **2026-08-15** — A design-system guard that inspects only hex literals does not enforce the palette. Blue (`rgba(59,130,246,…)`) and indigo (`rgba(99,102,241,1)`) survived S1's colour purge and eight sprints of gates inside `rgba()`.
- **2026-08-15** — Three entries in `languageAliases` (`f#`, `objective-c`, `shell`) point at keys that exist in neither `languageColors` nor `languageCodes`, so they are inert: those languages still render grey. Left as-is and recorded rather than fixed during a documentation sprint; adding the three colours would change the README's verified "17 language-specific colours" to 20.
- **2026-08-15** — `[...path]` resolved as a **single** dynamic segment on Vercel, not a catch-all. The proxy was dead for every real two-segment path while `/api/github/user` returned a healthy-looking 403. Thirteen passing tests could not see it: they exercise the handler, and the handler was never invoked.
- **2026-08-15** — The CI badge had never run on `main`. Every sprint through S10 verified locally, so `npm ci` was executed for the first time by CI itself, and failed instantly on a lockfile that had never described the installed tree.

### The pattern this repository actually teaches

Four separate times, a **green gate measured something other than the product**:

1. Headless Chromium has no WebGL, so every automated check screenshotted an empty canvas and passed (S1).
2. `motion-check.mjs` hardcoded a port and started no server, so the MOTION suite ran end-to-end against **a different application** and scored its page as a rendered scene (S10).
3. The same suite's binding "2 s cold load" bar ran on unthrottled localhost, where no build can fail it (S10).
4. Thirteen proxy tests passed against a handler production never invoked (S11).
5. The per-IP throttle S7 recorded as shipped had never executed: its dependency was never installed, so every call threw and every `catch` chose fail-open (S11).

The fifth is the sharpest: there was no gate at all, and the code's own shape — a named function, a try/catch, a considered comment about failing open — was doing the work a gate should have done. Nobody checks a throttle that looks that deliberate.

None of these was a flaky test or a bad assertion. In every case the assertion was correct and the *subject* was wrong. The lesson is not "write more tests" — this repository had ten test reports and zero tests, then 74 tests and four blind gates. It is: **a passing gate is not evidence until you can say what it measured.** Ask what the check would look like if the thing it watches were completely absent. If the answer is "the same", it is not a gate.
