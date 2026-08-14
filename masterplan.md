# masterplan.md — 3D GITHUB VISUALIZER

**Source of truth for sequencing.** Rules live in `CLAUDE.md`; animation spec lives in `MOTION.md`; the measured audit lives in `RESEARCH-CONTEXT.md`. Precedence on conflict: masterplan (sequencing) > CLAUDE.md (rules) > ENGINEERPROMPT.md (kickoff).

Status keys, marked live as work happens — never batched:
`[ ]` not started · `[~]` in progress · `[x]` complete · `[⏭]` deferred (always with a one-line reason)

**Current sprint pointer:** S10

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
- [x] Per-IP throttle via `@vercel/firewall`, **failing open** — the cache is the primary budget defence and a throttle outage should not take the demo down.
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

1. **C++ and C# rendered grey as "Other".** `"C++".toLowerCase()` is `c++`, but the colour map's key is `cpp`, so both fell through to the fallback — and the node label came out as `C+`. *A grey sphere among grey spheres reads as data, not as a bug*, which is exactly why nobody had noticed. Fixed with an alias map (C++, C#, F#, Objective-C).
2. **`getIntensityColor(NaN)` returned `undefined`.** `Math.floor(NaN)` is `NaN` and survives both clamps, so `colors[NaN]` is undefined and a heatmap cell would render with `backgroundColor: undefined`.
3. **The easing suite asserts nothing overshoots `[0,1]`** — the assertion that would have caught `easeOutBack`, which the original entrance used and which the design system forbids.

**Two mistakes were mine, in the tests:** I asserted `pinned` and `timestamp` where the implementation has `isPinned` and `createdAt`. The implementation was right; the tests were corrected.

**A flaky gate is worse than no gate.** The cold-load check failed about one run in four, always on the first run after `vite preview` started — that run pays for module transform and SwiftShader context creation, so it measured the harness starting up rather than the app rendering. The harness now warms first; verified stable across three consecutive cold runs.

**New guard:** a CI badge must point at a workflow that **exists** and that actually runs `npm run build`, `npm run guards` and `npm test`. A badge for a workflow that only builds is the same class of overstatement as ten test reports against zero tests. Verified the guard fires by temporarily stubbing `npm test` out of the workflow.

**Noted, not fixed:** the aethereum pre-commit gate flags every edit to `tests/sceneGraph.test.mjs` as touching the frozen `SceneGraph v1` contract, because the contract's `files` glob lists its own spec file. Editing a test is not changing the contract; re-declaring to narrow the glob would itself be a change to a frozen contract, so it is left as advisory noise.

Commits `3ccba4e` and the warm-up fix.

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
