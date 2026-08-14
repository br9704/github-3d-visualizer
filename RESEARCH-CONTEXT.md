# RESEARCH-CONTEXT.md — 3D GITHUB VISUALIZER
# Measured audit + external research. Read before the engineer prompt's Phase 1.

**Audited:** August 2026, from a clean clone of `github.com/br9704/github-3d-visualizer`.

---

## 0. RUNTIME VERDICT — read this first

An earlier pass of this audit only checked that it **builds**. It does, cleanly. That was misleading — it says nothing about what a visitor sees.

Test performed: `npm run build` → `vite preview` → real browser at 1440×900, screenshot after load.

**What actually renders is a near-blank white page.** Specifically:

| Observed | Severity |
|---|---|
| Page is **unstyled white** with browser-default typography. No header bar, no branding, no background treatment, nothing that reads as a designed product. | **Blocker for a portfolio piece.** |
| A single floating search card sits mid-page; a **stray "Preferences" panel floats detached in the lower-left**, overlapping nothing and belonging to nothing. | High |
| Controls are **raw emoji** — 🌙 ❓ 🔍 ⚙️ — with no styling or grouping. | High |
| Nothing 3D is visible on load. The canvas exists but the scene only appears after a successful search — which, without a token, **fails on the 60 req/hr shared limit** (see §3). | **Blocker.** First-time visitors see a white page, then an error. |
| Console errors: none. | — |

**So the honest state is: the empty state IS the product for most visitors, and the empty state is unstyled.** This is the opposite of the portfolio claim ("Any GitHub profile rendered as a 3D universe") — a visitor who doesn't type anything, or who types anything at all while the IP is rate-limited, never sees a universe.

**This changes the priority order.** The token proxy and a designed landing/empty state now come *before* bundle-splitting or tests. The first ten seconds are the whole pitch, and right now they're blank.

---

## 1. Measured state

| Check | Command | Result |
|---|---|---|
| Install | `npm install --no-audit --no-fund` | clean, 105 packages, ~4s |
| Build | `npm run build` | **exit 0**, 404 modules, 13.1s |
| Tests | — | **no `test` script exists** |
| Lint / typecheck | — | **neither script exists** |

Only `dev`, `build`, `preview` are defined in `package.json`.

**Bundle warning from the build:**
```
dist/assets/index-BI3o4rl5.js   731.75 kB │ gzip: 197.00 kB
(!) Some chunks are larger than 500 kB after minification.
```
Three.js is not code-split.

**Size:** 5,913 LOC / 41 src files. **Stack:** React 18.2, Vite 5.0 (built as 5.4.21), Three.js 0.159, three-stdlib 2.36 (OrbitControls), axios 1.6, terser 5.46. **Plain JS + JSX — no TypeScript.**

**Completeness:** genuinely implemented, not stubbed. No TODO/FIXME in `src/` (the "placeholder" grep hits are HTML input attributes). All 15 components and 5 services have real bodies.

---

## 2. The credibility problems (all presentation, not code)

1. **No live URL.** A 3D visualizer nobody can look at has ~zero portfolio value. This is the dominant problem.
2. **README hero image is a literal `via.placeholder.com` URL.** No screenshot of the product exists anywhere.
3. **40 markdown files**, ~10 named `TEST_REPORT_*.md`, claiming comprehensive testing — against **zero tests, no runner, no test script.** If a reviewer opens the repo, this mismatch is the most damaging thing in it.
4. **Every commit authored by "OpenClaw Bot" `<bot@openclaw.com>`.** Last commit 2026-03-11. Of the 30 visible commits (shallow clone), roughly 12 consecutive ones are cosmetic colour swaps (`fix: replace blue/purple with white/grey`). Reads as agent-generated rework rather than feature development — and the bot authorship is publicly visible on GitHub.
5. **No LICENSE file** despite MIT claims in the docs.

**Copy honesty issue:** the README has a **"Collaboration"** section, but `src/services/collaborationService.js` is localStorage + URL-param state sharing — and its own header comment says so verbatim: *"Real-time multi-user collab would need a WebSocket backend."* Rename to "Share & Annotate (local)" — accurate and still appealing.

---

## 3. The real technical blocker: rate limiting

`src/utils/githubApi.js` sends **no `Authorization` header**. Every visitor therefore shares the **60 requests/hour unauthenticated GitHub limit, keyed by IP**. A public demo would rate-limit almost immediately for anyone who tries it.

This is the one thing that must be fixed before deployment is meaningful. The fix is a small serverless function (`/api/github` on Vercel) holding a PAT server-side:
- Authenticated GitHub API limit is **5,000 req/hour** — 83× headroom
- The PAT never reaches the client
- Add edge caching on profile responses: most demo traffic will hit a handful of famous usernames, so cache hits will dominate and the effective limit becomes near-irrelevant
- Consider a per-IP throttle on the proxy so one visitor can't burn the quota

---

## 4. Deployment notes

Nearly trivial otherwise — it's a static SPA with no backend today.
- No `vercel.json` / `netlify.toml` / CI exists, but **Vite defaults (`dist/`, `npm run build`) work on Vercel with zero config**
- Adding the token proxy is the reason to prefer **Vercel** specifically: serverless functions come free in the same project
- README deploy steps (lines ~232–248) are generic boilerplate, never verified

---

## 5. External research

**Three.js version.** Pinned at 0.159, which is old by Aug 2026. Assess upgrade cost against benefit before doing it — for a working visualizer there may be no reason. If upgrading, `three-stdlib` must move in lockstep, and OrbitControls import paths have historically shifted between releases.

**Bundle splitting under Vite 5.** The 731 kB single chunk is fixable with a dynamic `import()` of the scene module plus `build.rollupOptions.output.manualChunks` to isolate `three` and `three-stdlib`. Target: initial chunk under the 500 kB warning threshold, with the 3D engine loaded after first paint. This directly improves the demo's first impression, which for this project is the whole game.

**The "60fps on 100+ repos" claim** (used in portfolio copy) is unverified. It is measurable — profile it with a real 100+ repo account. If true, evidence it with a recording; if not, the copy changes. See the portfolio copy audit prompt.

---

## 6. The three highest-leverage gaps

1. **Deploy it with a token proxy, and put the URL at the top of the README.** Then a real screenshot/GIF replacing `via.placeholder.com`. Without a live URL and a visual, nothing else about this project matters.
2. **Delete ~38 of the 40 markdown files and rewrite the README honestly.** Keep README + CHANGELOG. Drop every `TEST_REPORT_*`, `VERIFICATION_REPORT_*`, `SUBAGENT_COMPLETION_*`, `SPRINTS_*`, `Improvements_*_v3.md`. Rename "Collaboration". Right now the docs advertise *process* and claim a test suite that does not exist.
3. **Add real tests and fix authorship.** Even ~15 Vitest tests over the pure functions (`utils/positioning.js`, `utils/colors.js`, `services/heatmapGenerator.js`) plus a CI badge closes the credibility gap cheaply. Separately, squash-rebase the history under Bruno's identity — "OpenClaw Bot" on every commit undercuts the entire piece. *(Owner decision: rewrites public history.)*
