# 3D GitHub Visualizer

Any GitHub profile rendered as a 3D universe. Each repository becomes an icosahedron sphere — sized by stars, coloured by language, positioned by age, star count and fork activity.

**Live demo:** `[PLACEHOLDER — live URL]`

`[PLACEHOLDER — hero recording of the entrance sequence]`

> **Status:** not yet deployed. The app currently calls the GitHub REST API directly from the browser with no token, so it shares the 60 req/hour unauthenticated per-IP limit. A server-side token proxy lands before deployment — see [Roadmap](#roadmap).

---

## Features

Everything listed here is implemented in `src/`. Nothing is listed that the code does not do.

### Core visualisation
- **3D sphere rendering** — each repo is a `THREE.IcosahedronGeometry` mesh in WebGL space
- **Dynamic sizing** — `size = clamp(√stars / 10, 0.3, 4)` (`src/utils/positioning.js`)
- **Language colours** — 17 language-specific colours, grey fallback for the rest (`src/utils/colors.js`)
- **3-axis positioning** — X = repo age, Y = stars, Z = fork count (`src/utils/positioning.js`)
- **Auto-rotation** — orbital camera with damping via `OrbitControls`

### Interaction
- **Click to explore** — repository detail panel with a README preview (first 500 characters)
- **Hover tooltips** — name, language, truncated description, star count
- **Keyboard** — `Tab` / `Shift+Tab` cycle repos, `+` / `-` zoom, `?` or `/` opens help, `Escape` closes
- **Touch** — pinch to zoom, drag to orbit, tap to select
- **Entrance animation** — spheres scale in with a staggered cascade

### Search and filtering
- **GitHub username search** — up to 300 repos (3 pages of 100)
- **Username autocomplete** — top 5 matches from GitHub's user search API, cached in memory for 5 minutes
- **Language filter** — isolate repos by language
- **Custom filter sets** — save, load, import and export named filter combinations
- **Preference filters** — minimum stars, exclude archived, exclude forks

### Data and export
- **JSON export** — full or minimal repository data
- **CSV export** — selectable columns
- **Canvas screenshot** — PNG of the current view
- **Shareable URLs** — base64-encoded view state in a URL parameter
- **Named snapshots** — save and restore view states to `localStorage`

### Analytics
- **Heatmaps** — activity, contribution, language distribution, maturity and growth views
- **Stats display** — repo count with loading feedback
- **Colour legend** — language-to-colour reference

### Share & Annotate (local)
Local-only. There is no server and no real-time sync — state is shared by copying a URL, and annotations live in this browser's `localStorage`.

- **Repo annotations** — timestamped comments on any repository, stored locally
- **Snapshot sharing** — encode a view state into a shareable link
- **Import / export** — portable JSON of your local annotations and snapshots

### UX and accessibility
- **Dark / light theme** — system preference detection plus a manual toggle
- **Responsive breakpoints** — desktop, tablet and mobile
- **Focus-trapped repository dialog** — `aria-modal`, focus restoration on close (`src/components/RepoDetails.jsx`)
- **Screen reader support** — `aria-live` region for load state, skip link, ARIA roles
- **Loading phases** — three-stage progress (fetching repos → loading READMEs → building scene)
- **Keyboard help** — press `?`

### Performance techniques
Implemented; not yet independently profiled. See [Roadmap](#roadmap) — a measured frame-time figure replaces this section once it exists.

- **Frustum culling** — off-screen spheres are skipped in the render loop
- **LOD scaling** — geometry detail `4` under 50 repos, `2` from 50–150, `1` above 150
- **Geometry caching** — one geometry per distinct sphere size
- **Pre-allocated `Frustum` and `Matrix4`** — reused every frame instead of allocated per frame
- **Shadow maps disabled** — nothing in the scene casts or receives shadows
- **Debounced raycasting** — 50 ms debounce on hover detection
- **localStorage response cache** — 30-minute TTL

---

## Tech stack

| Layer | Technology | Version |
|---|---|---|
| UI framework | React | 18.2 |
| Build tool | Vite | 5.0 (builds as 5.4.21) |
| 3D engine | Three.js | 0.159 |
| Camera controls | three-stdlib (`OrbitControls`) | 2.36 |
| HTTP client | Axios | 1.6 |
| Styling | CSS custom properties | — |
| Persistence | `localStorage` | — |
| API | GitHub REST API v3 | — |

---

## Quick start

Requires Node.js 18+.

```bash
git clone https://github.com/br9704/github-3d-visualizer.git
cd github-3d-visualizer
npm install
npm run dev
```

Open <http://localhost:5173>.

```bash
npm run build      # production build to dist/
npm run preview    # serve the production build locally
```

**Note on rate limits:** unauthenticated GitHub API requests are limited to 60 per hour per IP address, shared across everyone behind that IP. A few searches can exhaust it. This is the problem the token proxy on the roadmap solves.

---

## Project structure

```
src/
├── main.jsx                          # React entry point
├── App.jsx                           # Root component, global state
├── App.css                           # Global styles, CSS custom properties
│
├── components/
│   ├── Visualizer.jsx                # Three.js scene, render loop, interaction
│   ├── SearchBar.jsx                 # Username search input
│   ├── UsernameAutocomplete.jsx      # GitHub user suggestions
│   ├── RepoDetails.jsx               # Repository dialog (focus-trapped)
│   ├── ColorLegend.jsx               # Language colour reference
│   ├── StatsDisplay.jsx              # Load state and repo count
│   ├── LanguageFilter.jsx            # Language filter
│   ├── Header.jsx                    # Title bar and theme toggle
│   ├── KeyboardHelpModal.jsx         # Shortcut reference
│   ├── Pagination.jsx                # Load more repositories
│   ├── ExportShare.jsx               # Quick export and share controls
│   ├── FilterSetsManager.jsx         # Save and load filter combinations
│   ├── DataExportPanel.jsx           # JSON / CSV / screenshot export
│   ├── AdvancedHeatmaps.jsx          # Heatmap panels
│   ├── UserPreferencesPanel.jsx      # Settings panel
│   └── CollaborationPanel.jsx        # Share & annotate (local) panel
│
├── hooks/
│   └── useThreeScene.js              # Scene, camera and renderer lifecycle
│
├── services/
│   ├── userPreferences.js            # Persistent settings
│   ├── collaborationService.js       # Local sharing, snapshots, comments
│   ├── dataExporter.js               # JSON / CSV / screenshot logic
│   ├── filterSetsManager.js          # Filter set CRUD
│   └── heatmapGenerator.js           # Heatmap data generation
│
├── contexts/
│   └── ThemeContext.jsx              # Theme provider
│
├── utils/
│   ├── githubApi.js                  # GitHub REST calls and caching
│   ├── positioning.js                # 3D coordinate calculation
│   └── colors.js                     # Language → colour mapping
│
└── styles/                           # Per-component CSS
```

---

## Controls

| Input | Action |
|---|---|
| Left click + drag | Orbit |
| Scroll wheel | Zoom |
| Right click + drag | Pan |
| Click a sphere | Open repository details |
| Hover a sphere | Show tooltip |
| `Tab` / `Shift+Tab` | Cycle through repositories |
| `+` / `-` | Zoom |
| `?` or `/` | Keyboard help |
| `Escape` | Close dialog |

---

## Measured build output

From `npm run build` on 2026-08-14 (Vite 5.4.21, 404 modules, terser):

| Asset | Raw | Gzip |
|---|---|---|
| `dist/assets/index-*.js` | 731.75 kB | 197.00 kB |
| `dist/assets/index-*.css` | 49.17 kB | 8.69 kB |
| `dist/index.html` | 0.47 kB | 0.30 kB |

Vite warns that the JS chunk exceeds its 500 kB threshold — Three.js is not code-split yet. See [Roadmap](#roadmap).

---

## Roadmap

Tracked in [`masterplan.md`](masterplan.md).

- Designed landing and empty state — today the app renders nothing until a search succeeds
- Server-side GitHub token proxy, so the public demo is not limited to 60 req/hour
- Deployment, and a live URL at the top of this file
- Real screenshots and a recording of the entrance sequence
- A test suite and CI — **there are currently no tests in this repository**
- Three.js code-splitting to get the initial chunk under 500 kB
- A measured frame-time figure at 100+ repositories

---

## Example profiles to try

- `torvalds` — Linux creator
- `gvanrossum` — Python creator
- `octocat` — GitHub's example account
- `facebook` — large organisation

---

## Contributing

1. Fork and branch: `git checkout -b feat/my-feature`
2. Develop: `npm run dev`
3. Verify the build: `npm run build`
4. Open a pull request

Commit prefixes: `feat:` `fix:` `perf:` `a11y:` `ux:` `docs:` `chore:`

---

## License

[MIT](LICENSE) © 2026 Bruno Jaamaa

---

## Author

Bruno Jaamaa — Bachelor of Design in Computing and UX Design, University of Melbourne.
