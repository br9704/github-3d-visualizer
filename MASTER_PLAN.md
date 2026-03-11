# 3D GitHub Visualizer — Master Plan

**Project:** Interactive 3D visualization of GitHub repositories using WebGL  
**Author:** Bruno Jaamaa  
**Status:** v5 — Production Ready ✅  
**Started:** March 2026  

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                     App.jsx                         │
│  Global state: repos, filters, prefs, selected      │
│  Orchestrates search → fetch → position → render    │
├──────────┬──────────┬───────────┬───────────────────┤
│ Search   │ 3D Scene │ Panels    │ Services          │
│ Layer    │ Layer    │ Layer     │ Layer             │
├──────────┼──────────┼───────────┼───────────────────┤
│SearchBar │Visualizer│ColorLegend│userPreferences    │
│Username  │useThree  │RepoDetail │collaborationSvc   │
│Autocompl │Scene     │LangFilter │dataExporter       │
│          │(Three.js)│StatsDisp  │filterSetsManager   │
│          │          │Header     │heatmapGenerator   │
│          │          │Heatmaps   │                   │
│          │          │FilterSets │                   │
│          │          │DataExport │                   │
│          │          │UserPrefs  │                   │
│          │          │CollabPanel│                   │
│          │          │ExportShare│                   │
│          │          │Pagination │                   │
│          │          │KbdHelp   │                   │
└──────────┴──────────┴───────────┴───────────────────┘
```

### Data Flow

1. User enters GitHub username → `SearchBar`
2. `fetchUserRepos()` calls GitHub REST API (paginated, max 300)
3. `fetchRepoReadmeBatch()` fetches READMEs (batched, max 5 concurrent)
4. Preference filters applied (minStars, excludeArchived, excludeForks)
5. `calculatePositions()` maps repos to 3D coordinates (age/stars/forks → X/Y/Z)
6. `Visualizer` creates Three.js spheres via `useThreeScene` hook
7. Entrance animation plays (staggered easeOutBack pop)
8. User interacts: orbit, zoom, click, hover, filter, export

### Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 |
| Build Tool | Vite 5 |
| 3D Engine | Three.js 0.159 |
| Camera Controls | OrbitControls (three-stdlib) |
| HTTP Client | Axios |
| State | React hooks (useState, useCallback, useRef) |
| Theming | CSS custom properties + ThemeContext |
| Persistence | localStorage (prefs, cache, snapshots) |

---

## Sprint History

### v1 — Foundation (Sprints 1–8)

| Sprint | Deliverable | Status |
|--------|------------|--------|
| 1 | Vite + Three.js setup | ✅ |
| 2 | Folder structure + component stubs | ✅ |
| 3 | GitHub API integration + README fetching | ✅ |
| 4 | 3D positioning algorithm (age/stars/forks → X/Y/Z) | ✅ |
| 5 | Three.js scene + lighting setup | ✅ |
| 6 | Sphere creation + positioning + raycasting | ✅ |
| 7 | Animation system (auto-rotate, pulse) | ✅ |
| 8 | Camera controls (OrbitControls, damping) | ✅ |

**Milestone:** Basic 3D repo visualization working end-to-end.

### v2 — Interaction & Performance (Sprints 9–16)

| Sprint | Deliverable | Status |
|--------|------------|--------|
| 9 | Keyboard navigation (arrows, +/-, Tab, Escape) | ✅ |
| 10 | Hover tooltips with repo metadata | ✅ |
| 11 | Viewport frustum culling (+15-20 FPS) | ✅ |
| 12 | Language filter dropdown | ✅ |
| 13 | GitHub username autocomplete (cached) | ✅ |
| 14 | Material optimization + LOD (50x faster material creation) | ✅ |
| 15 | Mobile optimization + touch controls (pinch zoom, swipe) | ✅ |
| 16 | Export JSON + shareable URLs + pagination (up to 500 repos) | ✅ |

**Milestone:** Production-ready with keyboard/mobile support, 60 FPS at 100+ repos.

### v3 — Analytics & Advanced Filtering

| Feature | Deliverable | Status |
|---------|------------|--------|
| Advanced Filtering | Multi-dimension filters (language, framework, author type), AND/OR logic | ✅ |
| InstancedMesh | Batch rendering (95% draw call reduction), +35% FPS | ✅ |
| Analytics Dashboard | Summary stats, language breakdown, top repos, growth trends | ✅ |

**Note:** v3 components (AdvancedFilterPanel, AnalyticsDashboard, VisualizerOptimized) were later cleaned up in v4. Core features were absorbed into the main Visualizer.

### v3.5 — UI Redesign

| Feature | Deliverable | Status |
|---------|------------|--------|
| Visual Hierarchy | Header, canvas framing, 4-section control layout | ✅ |
| Card-Based Design | Uniform `.control-card` styling with borders/shadows | ✅ |
| White/Grey Palette | All blue/purple accents replaced with grey (#888888) | ✅ |
| Dark/Light Theme | ThemeContext with localStorage persistence | ✅ |
| Responsive Layout | 4 breakpoints: desktop, tablet, mobile, small | ✅ |
| Keyboard Help Modal | `?` key opens shortcuts reference | ✅ |

### v4 — Power Features

| # | Feature | Deliverable | Status |
|---|---------|------------|--------|
| 1 | Custom Filter Sets | Save/load named filter combos, built-in defaults, JSON export/import | ✅ |
| 2 | Data Export Formats | JSON (full/minimal), CSV with column selection, canvas screenshot | ✅ |
| 3 | Advanced Heatmaps | 5 chart types: activity, contribution, language, maturity, growth | ✅ |
| 4 | User Preferences | Persistent settings: filters, visualization, performance, layout | ✅ |
| 5 | Collaboration | Share via encoded URL, named snapshots, per-repo annotations | ✅ |

### v5 — Polish & Quality

| # | Improvement | Deliverable | Status |
|---|-------------|------------|--------|
| 1 | Animation Loop Perf | Fixed GC pressure, material mutation, debounce bugs | ✅ |
| 2 | Loading UX | Animated spinner with 3-phase progress feedback | ✅ |
| 3 | Accessibility | ARIA roles, focus trap, sequential Tab nav, skip link | ✅ |
| 4 | StatsDisplay Polish | Loading spinner, `aria-live`, backdrop blur | ✅ |
| 5 | useThreeScene Hardening | Shadow map disabled (-16MB GPU), proper cleanup, edge guards | ✅ |
| — | Sphere Animations | easeOutBack entrance, staggered cascade, hover glow/scale | ✅ |
| — | Enhanced Tooltips | Name, language, description, stars; edge-aware positioning | ✅ |

---

## Current Feature Set (v5)

### Core Visualization
1. 3D sphere rendering (one per repo, icosahedron geometry)
2. Dynamic sizing (sphere size ∝ √stars)
3. Language-based color coding (17+ languages)
4. 3-axis positioning (age → X, stars → Y, forks → Z)
5. Auto-rotation with OrbitControls

### Interaction
6. Click sphere → repo details modal with README preview
7. Hover tooltips (name, language, description, stars)
8. Keyboard navigation (arrows, +/-, Tab cycling, Escape, ?)
9. Touch controls (pinch zoom, swipe rotate, tap select)

### Filtering & Search
10. GitHub username search with autocomplete (cached)
11. Language filter dropdown
12. Custom filter sets (save/load/import/export)
13. Preference-based filtering (minStars, excludeArchived, excludeForks)

### Data & Export
14. JSON export (full/minimal)
15. CSV export with column selection
16. Canvas screenshot capture
17. Shareable URL (base64-encoded state)
18. Named visualization snapshots

### Analytics
19. Advanced heatmaps (5 chart types)
20. Stats display (repo count, loading state)
21. Color legend (language → color mapping)

### Collaboration
22. Per-repo comments/annotations (pinned, timestamped)
23. Snapshot sharing and restoration
24. Import/export collaboration data

### UX & Accessibility
25. Dark/light theme toggle (system preference + manual)
26. Responsive design (4 breakpoints)
27. WCAG AA focus management (modal focus trap)
28. Skip link, sr-only announcements, ARIA roles
29. Loading phases with progress feedback
30. Keyboard help modal

### Performance
31. Frustum culling (+15-20 FPS)
32. LOD scaling (geometry detail adapts to repo count)
33. Material caching by color
34. Geometry caching by size
35. Raycasting debounce (50ms)
36. Pre-allocated objects in animation loop (zero GC pressure)
37. Shadow maps disabled (saves ~16MB GPU)
38. Pagination (100 per page, max 500)

---

## What's Done vs Remaining

### ✅ Complete
- All 5 sprint phases (v1→v5) shipped
- 38+ features implemented
- White/grey design system applied throughout
- Accessibility audit passed (ARIA, focus trap, keyboard nav)
- Performance optimized (60 FPS at 100 repos, 55+ at 200)
- Mobile support (touch controls, responsive UI)
- Build clean: 0 errors, ~197KB gzip JS, ~8.7KB gzip CSS

### 🔮 Future Possibilities (Not Planned)
- GitHub OAuth for higher rate limits (currently 60 req/hour)
- Real-time collaboration via WebSocket backend
- Chart.js/D3.js integration for richer analytics
- Full InstancedMesh for 300+ repos (current approach handles 200 well)
- Camera position in share URLs
- Animation presets (fly-by, spiral entry)
- BVH-tree raycasting optimization
- Deployment to Vercel/Netlify with CI/CD

---

## File Structure

```
github-3d-viz/
├── index.html                  # Entry HTML
├── vite.config.js              # Vite configuration
├── package.json                # Dependencies & scripts
├── src/
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Root component + global state
│   ├── App.css                 # Global styles + CSS variables
│   ├── components/
│   │   ├── Visualizer.jsx      # Three.js 3D scene + animation loop
│   │   ├── SearchBar.jsx       # Username input + search trigger
│   │   ├── UsernameAutocomplete.jsx  # GitHub user autocomplete
│   │   ├── RepoDetails.jsx     # Repo info modal (focus-trapped)
│   │   ├── ColorLegend.jsx     # Language color reference
│   │   ├── StatsDisplay.jsx    # Loading state + repo count
│   │   ├── LanguageFilter.jsx  # Language dropdown filter
│   │   ├── Header.jsx          # App title + theme toggle
│   │   ├── KeyboardHelpModal.jsx  # Keyboard shortcuts reference
│   │   ├── Pagination.jsx      # Load more repos
│   │   ├── ExportShare.jsx     # Quick export/share (v2)
│   │   ├── FilterSetsManager.jsx  # Save/load filter combos (v4)
│   │   ├── DataExportPanel.jsx # Full export panel (v4)
│   │   ├── AdvancedHeatmaps.jsx  # Heatmap charts (v4)
│   │   ├── UserPreferencesPanel.jsx  # Settings panel (v4)
│   │   └── CollaborationPanel.jsx  # Sharing & annotations (v4)
│   ├── hooks/
│   │   └── useThreeScene.js    # Three.js scene/camera/renderer lifecycle
│   ├── services/
│   │   ├── userPreferences.js  # Persistent user settings (localStorage)
│   │   ├── collaborationService.js  # Sharing, snapshots, comments
│   │   ├── dataExporter.js     # JSON/CSV/screenshot export
│   │   ├── filterSetsManager.js  # Filter set CRUD
│   │   └── heatmapGenerator.js # Heatmap data generation
│   ├── contexts/
│   │   └── ThemeContext.jsx     # Dark/light theme provider
│   ├── utils/
│   │   ├── githubApi.js        # GitHub REST API calls
│   │   ├── positioning.js      # 3D coordinate calculation
│   │   └── colors.js           # Language → color mapping
│   ├── styles/
│   │   ├── Header.css
│   │   ├── SearchBar.css
│   │   ├── Autocomplete.css
│   │   ├── Tooltip.css
│   │   ├── LanguageFilter.css
│   │   ├── KeyboardHelpModal.css
│   │   ├── Pagination.css
│   │   ├── ExportShare.css
│   │   ├── FilterSetsManager.css
│   │   ├── DataExportPanel.css
│   │   ├── AdvancedHeatmaps.css
│   │   ├── UserPreferencesPanel.css
│   │   └── CollaborationPanel.css
│   └── data/                   # (reserved for static data)
└── dist/                       # Production build output
```

---

## Design System

### Color Palette
| Token | Light | Dark |
|-------|-------|------|
| Background | `#f8f8f8` | `#0f0f0f` |
| Card/Surface | `#ffffff` | `rgba(26,26,26,0.95)` |
| Border | `#e5e7eb` | `rgba(255,255,255,0.1)` |
| Text Primary | `#333333` | `#ffffff` |
| Text Secondary | `#6b7280` | `#b0b0b0` |
| Accent | `#888888` | `#888888` |

### Spacing Scale
`4px → 8px → 12px → 16px → 24px → 32px`

### Typography
- Title: Bold, larger
- Body: 14px default
- Labels: 12px, secondary color

### Principles
- No colored accents — grey only
- Card-based panels with border + subtle shadow
- Smooth transitions (0.3s ease)
- Responsive: 4 breakpoints (1024px, 768px, 480px, <480px)

---

*Last updated: March 11, 2026*
