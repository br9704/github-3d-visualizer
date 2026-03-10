# Changelog

All notable changes to the GitHub 3D Visualizer are documented here.
Versioning follows [Semantic Versioning](https://semver.org/).

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
