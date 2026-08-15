# Changelog

All notable changes to the GitHub 3D Visualizer are documented here.
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased] — 2026-08-14 → 2026-08-15

A measured audit found the app building cleanly and rendering a near-blank white
page. Eleven sprints followed; sequencing, acceptance criteria and as-shipped
deltas are in [`masterplan.md`](masterplan.md).

### Fixed — the blank page

- Canvas mounted `position: fixed` with no `z-index` and painted over the header.
  The header was never missing; it was covered.
- Renderer created with `alpha: true` while the theme defaulted to
  `prefers-color-scheme: light`, so the page background showed through as white.
- Sphere geometry was built at radius `size` *and* scaled by `size`, so rendered
  radius was `size²` — small repositories became invisible, large ones swallowed
  the scene.
- A missing WebGL context set an error state that nothing ever rendered, so a
  visitor without WebGL saw a silent empty page.

### Added

- **Ambient galaxy.** A seeded 88-node procedural field renders on cold load with
  no API call, so the empty state is never blank and can never rate-limit.
- **Entrance and interaction motion** per `MOTION.md`: dissolve, camera pullback,
  largest-first stagger, hover ring, click-to-camera-flight, idle slowdown, and a
  render loop that pauses entirely when the tab is hidden.
- **Instanced scene.** One `InstancedMesh` plus a billboarded label atlas — 3 draw
  calls for the whole scene, constant in repository count.
- **Token proxy** at `api/github/[...path].js` — a fine-grained PAT on the
  outbound fetch only, an allowlist of four endpoints, bounded query parameters,
  edge caching, and errors never cached. Verified against a mocked upstream.
- **Scene-graph interchange** (`github-3d-visualizer/scene` v1) — drop a file on
  the page or open `?scene=<url>`. Layout is optional but all-or-nothing.
- **74 tests** across five suites, plus GitHub Actions CI running the unit tests,
  11 mechanical guards, and a real browser against the built app.
- **Verification harnesses:** `guards`, `shots`, `motion-check`, `perf`,
  `firstpaint`, `histcmp`, `capture`.
- **Link preview and favicon.** `index.html` had shipped Vite's scaffold
  `/vite.svg`, which this repo never contained, and no OpenGraph tags at all.

### Changed

- **SIGNAL design system.** One warm-black ground; the light theme and its toggle
  were deleted outright. 87 emoji replaced across 14 components with monospace
  glyphs. Terminal-voice loading and error states, no spinners.
- **HUD architecture.** Eleven independently `position: fixed` panels replaced by
  one `HudLayout` owning four regions, with `j`/`k`/`↵` navigation and a bottom
  sheet at 390px.
- **Positioning by rank, not linear min-max.** Stars and forks are power-law
  distributed; a linear map collapsed nearly every repository onto one coordinate.
- **Three.js 0.159 → 0.185.1**, dropping `three-stdlib`. Verified by colour
  histogram rather than pixel diff, because the scene auto-orbits.
- **Bundle split.** Eager payload 223.81 → 85.04 kB gzip. Ships with a build-time
  `modulepreload` for the scene chunks, without which the split cost 944 ms to
  first frame on Fast 3G.
- **Documentation.** 37 process documents deleted, including ten test reports
  written against zero tests. `LICENSE` added — MIT had been claimed with no file
  behind it. "Collaboration" renamed "Share & Annotate (local)", which is what the
  service actually does.

### Removed

- Dark/light theme toggle (v3.x). One ground now.
- Fabricated performance claims: "60 FPS at 100+ repositories", a per-repo FPS
  table, "Frustum Culling (+15-20 FPS)", "saves ~16MB GPU memory", and
  arrow-key camera rotation, which no handler ever implemented.

---

## [v4.0.0] — 2026-03-11

### New Features (v4 Roadmap — Top 5 Improvements)

#### Feature 1: Custom Filter Sets (Priority 8.9)
- Save named filter combinations (language, stars, sort) to localStorage
- Load previously saved sets with one click
- Edit / rename / delete filter sets
- Export sets as JSON; import shared sets
- Built-in default sets: "Popular Repos", "Python Data Science", "Web Frontend"
- **Files:** `src/components/FilterSetsManager.jsx`, `src/services/filterSetsManager.js`, `src/styles/FilterSetsManager.css`

#### Feature 2: Data Export Formats (Priority 8.5)
- Export full repository data as JSON (full or minimal)
- Export as CSV with user-selectable columns
- Visualization snapshot capture (canvas screenshot)
- Metadata export with timestamp and filter state
- **Files:** `src/components/DataExportPanel.jsx`, `src/services/dataExporter.js`, `src/styles/DataExportPanel.css`

#### Feature 3: Advanced Heatmaps (Priority 8.1)
- Contribution intensity heatmap (stars + forks + issues → color grid)
- Language distribution bar chart with star averages
- Repository creation activity timeline
- Age vs Stars maturity scatter plot
- Cumulative growth trajectory SVG chart
- Five-tab view switcher; collapsible panel
- **Files:** `src/components/AdvancedHeatmaps.jsx`, `src/services/heatmapGenerator.js`, `src/styles/AdvancedHeatmaps.css`

#### Feature 4: User Preferences (Priority 7.8)
- Persistent settings stored in localStorage across sessions
- Filter defaults: min stars, exclude archived/forks, default sort
- Visualization settings: sphere scale, color scheme, labels, fog, particles
- Performance presets: quality (high/medium/low), max repo cap, anti-alias
- Layout defaults: which panels open on startup
- Export/import preferences as JSON; factory reset
- **Files:** `src/components/UserPreferencesPanel.jsx`, `src/services/userPreferences.js`, `src/styles/UserPreferencesPanel.css`

#### Feature 5: Collaboration Features (Priority 7.3)
- Share visualizations via encoded URL (base64 state param)
- Save named visualization snapshots with descriptions
- Load snapshots to restore username + filter state instantly
- Per-repository comments/annotations stored locally
- Pin important comments; timestamps; import/export collaboration data
- Auto-detect incoming share links on page load
- **Files:** `src/components/CollaborationPanel.jsx`, `src/services/collaborationService.js`, `src/styles/CollaborationPanel.css`

### App Integration
- All five features wired into `src/App.jsx`
- User preferences applied at search-time (minStars, excludeArchived, excludeForks, maxRepos)
- Share link detection on mount (auto-fills username from URL)
- Snapshot loading triggers search for shared username

---

## [v3.x] — 2026-03-10

### Sprint Work (Sprints 9-16)
- Dark/light theme toggle
- Keyboard navigation and shortcuts
- Animation system and OrbitControls
- Sphere creation, positioning, raycasting
- Language filter, pagination, export/share
- Full-screen search refinement
- Frontend expert redesign
- WebGL optimization and debugging

---

## [v1.0.0] — Initial Release

- Vite + Three.js setup
- Folder structure + component stubs
- Basic GitHub API integration
- 3D sphere visualization of repos
