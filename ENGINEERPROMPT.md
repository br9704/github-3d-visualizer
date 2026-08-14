# Engineer Prompt — 3D GITHUB VISUALIZER
# github.com/br9704/github-3d-visualizer · *"Any GitHub profile rendered as a 3D universe: 60fps on 100+ repos."*

> **Setup:** clone the repo into this folder (`git clone https://github.com/br9704/github-3d-visualizer.git .`) and paste this as the opening message of a fresh Claude Code session there.
> Read `RESEARCH-CONTEXT.md` in this folder first — measured audit of current state. No masterplan exists; you will write one.

---

## Where this actually stands (measured)

**It builds clean — and it renders a near-blank white page.** Both are true, and the second one is what matters.

Verified by building, serving, and opening it in a real browser at 1440×900: unstyled white background, browser-default typography, a single floating search card mid-page, a **stray "Preferences" panel floating detached in the lower-left**, and raw emoji (🌙 ❓ 🔍 ⚙️) as controls. No header, no branding, nothing 3D visible. The canvas exists but the scene only appears after a successful search — which, without a token, fails on GitHub's 60 req/hr shared limit. **A visitor sees a white page, then an error.** Console errors: none, which is why a build-level check missed all of this.

That inverts the priority order: **the token proxy and a designed landing/empty state come before bundle-splitting, tests, or a Three.js upgrade.** The empty state IS the product for most visitors.

Underneath, the code is real: `npm run build` → exit 0, 404 modules, 13.1s. 5,913 LOC across 41 files. React 18.2 + Vite 5 + Three.js 0.159. No TODOs, no stubs — the 15 components and 5 services all have real bodies.

**But there are four credibility problems, and they're all in the presentation layer, not the code:**

1. **No live URL.** A 3D visualizer nobody can look at has approximately zero portfolio value. This is the whole problem.
2. **The README hero image is a literal `via.placeholder.com` URL.** There is no screenshot of the thing.
3. **40 markdown files**, ~10 of them named `TEST_REPORT_*.md`, claiming comprehensive testing — against **zero tests**. No test files, no runner, no test script. If a reviewer opens this repo, that mismatch is the most damaging thing in it.
4. **Every commit is authored by "OpenClaw Bot" <bot@openclaw.com>**, and the visible history is dominated by ~12 consecutive cosmetic colour-swap commits. This is publicly visible on GitHub.

Plus two real technical blockers:
- **No GitHub token support.** `src/utils/githubApi.js` sends no `Authorization` header, so every visitor shares the 60 req/hr unauthenticated IP limit. A live demo would rate-limit almost immediately for anyone who tries it. **This is the true blocker for a usable deployment.**
- **731 kB single bundle** (197 kB gzip) — Three.js isn't code-split. Vite warns about it.
- **No LICENSE file** despite MIT claims in the docs.

One honesty issue in the copy: the README has a **"Collaboration"** section, but `src/services/collaborationService.js` is localStorage + URL-param state sharing — and its own header comment says so: *"Real-time multi-user collab would need a WebSocket backend."* Rename it. "Share & Annotate (local)" is accurate and still sounds good.

---

## Phase 1 — Verify and research

1. Clone, install, build, run. Confirm the audit above independently. **Look at it** — is the visualization actually beautiful at 100+ repos, or does it read as spheres in space? That judgment drives everything else.
2. Verify the "60fps on 100+ repos" claim in the portfolio copy. Profile it. If it's true, it's a great line and should be evidenced with a recording. If it isn't, the copy changes.
3. Research the token-proxy approach: a serverless function (Vercel `/api/github`) holding a PAT server-side so the public demo doesn't rate-limit. Confirm the current Vercel functions API, rate-limiting/caching strategy, and how to avoid the PAT leaking. Consider caching profile responses at the edge — most demo traffic will hit a handful of famous usernames.
4. Research Three.js code-splitting under Vite 5 to get the bundle down: dynamic import of the scene, manual chunks, and whether `three-stdlib` can be trimmed.
5. Check the actual current Three.js version story — 0.159 is old by Aug 2026. Assess upgrade cost vs benefit; don't upgrade for its own sake.

## Phase 2 — Questions (AskUserQuestion)

- **Deploy target** — Vercel (recommended: serverless functions for the token proxy come free) or something else?
- **Git history:** rewrite authorship away from "OpenClaw Bot" to Bruno? (Squash-rebase, force-push. It's his repo and his work; the bot authorship undercuts the whole piece. But it rewrites public history — his call.)
- Is a GitHub PAT available for the proxy, and what's the rate-limit/abuse budget for a public demo?
- The 40 markdown files — confirm deletion of the `TEST_REPORT_*` / `VERIFICATION_REPORT_*` / `SUBAGENT_COMPLETION_*` / `SPRINTS_*` set. Keeping README + CHANGELOG.
- Does this stay a standalone app, or does it become the `--export` target for gitpulse's Three.js scene export? (There's a natural product story there.)

## Phase 3 — Plan mode → write `masterplan.md`

No masterplan exists. Write one, sprint-structured with acceptance gates, matching the conventions in Bruno's other projects. Suggested spine — expand substantially:

- **Sprint 0 — Honesty pass.** Delete ~38 of the 40 markdown files. Add LICENSE. Rename "Collaboration" → "Share & Annotate (local)". Remove every claim the code doesn't support. *Do this first: it's fast, and it stops the repo actively hurting.*
- **Sprint 1 — Token proxy + deploy.** Serverless `/api/github` holding the PAT, edge caching, then deploy. **Live URL is the deliverable.**
- **Sprint 2 — The visual proof.** Real screenshot replacing `via.placeholder.com`, plus a short screen recording. Put the live URL at the very top of the README. For a visual project this is worth more than any feature.
- **Sprint 3 — Tests + CI.** Start with the pure functions — `utils/positioning.js`, `utils/colors.js`, `services/heatmapGenerator.js` — cheap wins that close the 10-test-reports-zero-tests gap. Vitest + GH Actions badge.
- **Sprint 4 — Bundle + perf.** Code-split Three.js, get under the 500 kB warning, measure and evidence the 60fps claim.
- **Sprint 5 — History + polish.** Authorship rewrite if approved; portfolio case study unlocked with the live URL.

## Phase 4 — Build

Work the masterplan in order. **aethereum sync**: `share_intent` per sprint, `declare_contract` for the GitHub API response shape and the scene-graph format, `record_decision` on the history rewrite and deploy config, `ask_human` before force-pushing history or exposing a PAT, `record_verification` at gates. Mark tasks live.

## The bar

A URL a recruiter can click that renders *their own* GitHub profile as a 3D universe in a few seconds without rate-limiting — with a screenshot at the top of a README that only claims things the code does. Right now the code is the finished part; everything missing is presentation and deployment.

---

## Design language — DO NOT invent one, and do not ask Bruno to design

Bruno has a locked design system. Any UI you build or fix **inherits it**. Never ask him to make a design decision you can answer by reading this; never introduce a new palette, font, or motion language.

**Source of truth:** `~/bruno-portfolio/CLAUDE.md` → "Redesign Design Decisions (2026-07 · SIGNAL)". Read it before touching any visual surface.

**The system — "SIGNAL": a warm-black precision instrument.** Ryoji Ikeda data-minimalism × cassette-futurist hardware × subtle broadcast-CRT texture. It should *operate* like a beautiful old machine — directory listings, keyboard nav, instrument readouts — while staying clean and fast.

```
--bg:             #050505   warm black
--surface:        #0b0a09
--text-primary:   #f0ece4   warm white
--text-secondary: #98928a
--text-dim:       #55504a
--amber:          #ffb000   THE ONE ACCENT (phosphor)
--steel:          #2c2925   visible border
--hairline:       #1b1916   structural rules
```

**Rules, non-negotiable:**
- **Amber is used sparingly** — cursor, status dots, CTAs, focus brackets, key data. Everything else is grayscale on hairline steel.
- **No light theme.** No gradients. No shadows. No colour beyond amber.
- **Border-radius max 2px.** Effectively square.
- **Monospace for data, labels, readouts, ASCII.** Terminal/instrument voice throughout: `</section>` labels, `>` prompt prefixes, `[button →]` brackets, box-drawing `┌─┐│└┘`, loading bars `[████░░░] 72%`.
- **Motion:** ease-out or linear only. No bounce, no spring, nothing over 600ms. Scroll reveals are fade + 16px rise, 400ms, 60ms stagger.
- **No emoji in UI.** If the current code uses emoji as controls, replace them with monospace glyphs or labelled brackets.
- **A11y is a hard rule:** nothing flashes more than 3×/s, `prefers-reduced-motion` means static everything, body text is always real DOM.

If a surface currently looks unstyled or default-browser, that is a bug against this system — fix it by applying the system, not by inventing something new.

---

## MOTION.md is binding

This folder now contains `MOTION.md` — the full animation specification for this project (sequences, timings, per-surface rules, acceptance gates). Read it in Phase 1 alongside the other docs. Its acceptance checklist merges into the relevant sprint gates in the masterplan during Phase 3. Motion here is product behaviour, not polish — the spec is authored; do not invent a different animation language and do not ask Bruno to design one.

---

## Decisions locked + research corrections (Aug 2026)

- **Git history: FULL author rewrite, keeping the commit history.** Bruno's call. Use `git filter-repo` with a mailmap rewriting `OpenClaw Bot <bot@openclaw.com>` → `Bruno Jaamaa <jaamaabruno@gmail.com>` across all commits, then force-push. Hashes change; history shape stays. (Same treatment applies to collab-dashboard's "Subagent" commits.) `ask_human` for the final go before the force-push — it's irreversible.
- **Token proxy, verified specifics:** a **fine-grained PAT with only "Public repositories (read-only)"** access is sufficient (5,000 req/hr vs 60 unauthenticated — and GitHub tightened unauthenticated limits further in May 2025, so client-side unauth is even less viable than planned). Cache function responses at Vercel's CDN with `s-maxage` + `stale-while-revalidate` (cacheable because the PAT rides the *outbound* fetch — incoming requests carry no Authorization header; use `Vercel-CDN-Cache-Control` for a long edge TTL with a short browser TTL; verify with the `x-vercel-cache` header). **Per-IP throttling needs no KV store: Vercel WAF rate-limiting is available on all plans including Hobby** (1 rule per project, fixed-window, keyed on IP, 429 default). Caveat: WAF counters and cache are per-region. The CDN cache itself is the first line of PAT-budget defence — most demo traffic hits the same famous usernames.
