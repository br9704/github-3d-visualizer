# 🌐 3D GitHub Visualizer

An interactive WebGL application that transforms any GitHub user's repositories into a dynamic 3D space. Each repo becomes a sphere — sized by stars, colored by language, and positioned by age, popularity, and fork activity.

![Screenshot placeholder](https://via.placeholder.com/1200x600/1a1a1a/888888?text=3D+GitHub+Visualizer)

> Search a username, watch repos materialize as glowing spheres, orbit the scene, and click to explore details.

---

## ✨ Features

### Core Visualization
- **3D Sphere Rendering** — Each repo is an icosahedron sphere in WebGL space
- **Dynamic Sizing** — Sphere size ∝ √stars (logarithmic scaling)
- **Language Colors** — 17+ language-specific colors (JS yellow, Python blue, etc.)
- **3-Axis Positioning** — X = repo age, Y = stars, Z = fork activity
- **Auto-Rotation** — Smooth orbital camera with damping

### Interaction
- **Click to Explore** — Open repo details modal with README preview
- **Hover Tooltips** — Name, language, description, and star count
- **Keyboard Navigation** — Arrow keys rotate, +/- zoom, Tab cycles repos, ? for help
- **Touch Controls** — Pinch zoom, swipe rotate, tap to select (mobile-ready)
- **Entrance Animation** — Spheres pop in with easeOutBack easing, staggered cascade

### Search & Filtering
- **GitHub Username Search** — Real-time API integration
- **Username Autocomplete** — Cached GitHub user suggestions
- **Language Filter** — Dropdown to isolate repos by language
- **Custom Filter Sets** — Save, load, import/export named filter combinations
- **Preference Filters** — Minimum stars, exclude archived/forks

### Data & Export
- **JSON Export** — Full or minimal repository data
- **CSV Export** — Selectable columns
- **Canvas Screenshot** — Capture current visualization
- **Shareable URLs** — Base64-encoded state in URL params
- **Named Snapshots** — Save and restore visualization states

### Analytics
- **Advanced Heatmaps** — Activity, contribution, language distribution, maturity, growth
- **Stats Display** — Live repo count with loading feedback
- **Color Legend** — Language-to-color reference

### Collaboration
- **Repo Annotations** — Add comments to any repository (pinned, timestamped)
- **Snapshot Sharing** — Share visualization states with others
- **Import/Export** — Portable collaboration data as JSON

### UX & Accessibility
- **Dark/Light Theme** — System preference detection + manual toggle
- **Responsive Design** — Desktop, tablet, mobile, small screen breakpoints
- **WCAG AA Modals** — Focus trap, focus restoration, `aria-modal`
- **Screen Reader Support** — `aria-live` regions, skip link, semantic ARIA roles
- **Loading Phases** — 3-stage progress feedback (fetching → READMEs → building)
- **Keyboard Help Modal** — Press `?` to see all shortcuts

### Performance
- **60 FPS** at 100+ repositories on modern hardware
- **Frustum Culling** — Only render visible spheres (+15-20 FPS)
- **LOD Scaling** — Geometry detail adapts to repo count
- **Zero GC Pressure** — Pre-allocated objects in animation loop
- **Material/Geometry Caching** — Shared by color and size
- **Debounced Raycasting** — 50ms throttle on hover detection

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | React | 18.2 |
| Build Tool | Vite | 5.0 |
| 3D Engine | Three.js | 0.159 |
| Camera Controls | three-stdlib (OrbitControls) | 2.36 |
| HTTP Client | Axios | 1.6 |
| Styling | CSS (custom properties + card system) | — |
| Persistence | localStorage | — |
| API | GitHub REST API v3 | — |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm

### Install & Run
```bash
git clone <repo-url> github-3d-viz
cd github-3d-viz
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
```bash
npm run build
npm run preview    # Preview the production build locally
```

---

## 📁 Project Structure

```
src/
├── main.jsx                        # React entry point
├── App.jsx                         # Root component + global state
├── App.css                         # Global styles + CSS custom properties
│
├── components/
│   ├── Visualizer.jsx              # Three.js 3D scene + animation loop
│   ├── SearchBar.jsx               # Username search input
│   ├── UsernameAutocomplete.jsx    # GitHub user suggestions
│   ├── RepoDetails.jsx            # Repository info modal (focus-trapped)
│   ├── ColorLegend.jsx            # Language color reference panel
│   ├── StatsDisplay.jsx           # Loading state + repo count
│   ├── LanguageFilter.jsx         # Language dropdown filter
│   ├── Header.jsx                 # App title + theme toggle
│   ├── KeyboardHelpModal.jsx      # Keyboard shortcuts reference
│   ├── Pagination.jsx             # Load more repositories
│   ├── ExportShare.jsx            # Quick export/share controls
│   ├── FilterSetsManager.jsx      # Save/load filter combinations
│   ├── DataExportPanel.jsx        # Full export panel (JSON/CSV/screenshot)
│   ├── AdvancedHeatmaps.jsx       # Heatmap chart panels
│   ├── UserPreferencesPanel.jsx   # User settings panel
│   └── CollaborationPanel.jsx     # Sharing & annotation panel
│
├── hooks/
│   └── useThreeScene.js            # Three.js scene/camera/renderer lifecycle
│
├── services/
│   ├── userPreferences.js          # Persistent user settings (localStorage)
│   ├── collaborationService.js     # Sharing, snapshots, repo comments
│   ├── dataExporter.js             # JSON/CSV/screenshot export logic
│   ├── filterSetsManager.js        # Filter set CRUD operations
│   └── heatmapGenerator.js         # Heatmap data generation
│
├── contexts/
│   └── ThemeContext.jsx             # Dark/light theme provider
│
├── utils/
│   ├── githubApi.js                # GitHub REST API calls + caching
│   ├── positioning.js              # 3D coordinate calculation algorithm
│   └── colors.js                   # Language → color mapping (17+ languages)
│
└── styles/                         # Component-specific CSS files
    ├── Header.css
    ├── SearchBar.css
    ├── Autocomplete.css
    ├── Tooltip.css
    ├── LanguageFilter.css
    ├── KeyboardHelpModal.css
    ├── Pagination.css
    ├── ExportShare.css
    ├── FilterSetsManager.css
    ├── DataExportPanel.css
    ├── AdvancedHeatmaps.css
    ├── UserPreferencesPanel.css
    └── CollaborationPanel.css
```

---

## 🎨 Design System

### Color Palette

The UI uses a strict **white/grey** palette — no colored accents.

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| Background | `#f8f8f8` | `#0f0f0f` |
| Card Surface | `#ffffff` | `rgba(26,26,26,0.95)` |
| Border | `#e5e7eb` | `rgba(255,255,255,0.1)` |
| Text Primary | `#333333` | `#ffffff` |
| Text Secondary | `#6b7280` | `#b0b0b0` |
| Accent | `#888888` | `#888888` |

### Spacing
`4px → 8px → 12px → 16px → 24px → 32px` scale used throughout.

### Card System
All UI panels use `.control-card` styling: `border: 1px solid #e5e7eb`, `padding: 16px`, `border-radius: 8px`, subtle shadow.

---

## 🎮 Controls

| Input | Action |
|-------|--------|
| Left Click + Drag | Rotate view |
| Scroll Wheel | Zoom in/out |
| Right Click + Drag | Pan camera |
| Click Sphere | Open repository details |
| Hover Sphere | Show tooltip |
| `Tab` / `Shift+Tab` | Cycle through repos sequentially |
| `+` / `-` | Zoom via keyboard |
| Arrow Keys | Rotate camera |
| `?` or `/` | Open keyboard help |
| `Escape` | Close modal |

---

## 📈 Performance

| Metric | Value |
|--------|-------|
| Target FPS | 60 (modern hardware) |
| 100 repos | 60 FPS |
| 200 repos | 55–60 FPS |
| JS Bundle | ~731 KB raw / ~197 KB gzip |
| CSS Bundle | ~49 KB raw / ~8.7 KB gzip |
| API Rate Limit | 60 req/hour (unauthenticated GitHub) |

### Optimization Techniques
- **Frustum culling**: Skip off-screen spheres entirely
- **LOD scaling**: `detail=4` (<50 repos), `detail=2` (50-150), `detail=1` (150+)
- **Material caching**: One material per unique color, cloned per sphere for independent opacity
- **Geometry caching**: Shared geometries for same-size spheres
- **Pre-allocated objects**: `Frustum` and `Matrix4` reused every frame (zero GC)
- **Shadow maps disabled**: Saves ~16MB GPU memory
- **Debounced raycasting**: 50ms throttle on hover detection
- **localStorage caching**: 30-minute TTL on API responses

---

## 🚀 Deployment

### Vercel
```bash
npm install -g vercel
vercel deploy
```

### Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

### GitHub Pages
```bash
npm run build
# Push dist/ contents to gh-pages branch
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make changes and test: `npm run dev`
4. Build and verify: `npm run build`
5. Commit with a descriptive message: `git commit -m "feat: add my feature"`
6. Push and open a Pull Request

### Commit Convention
- `feat:` — New feature
- `fix:` — Bug fix
- `perf:` — Performance improvement
- `a11y:` — Accessibility improvement
- `ux:` — UX enhancement
- `docs:` — Documentation
- `chore:` — Maintenance

### Code Style
- React functional components with hooks
- JSDoc on all exported functions
- CSS in dedicated files under `src/styles/`
- No colored accents in UI — grey palette only

---

## 📝 Example Users to Try

- `torvalds` — Linux creator (100+ repos, diverse languages)
- `gvanrossum` — Python creator
- `facebook` — Large org (500+ repos)
- `octocat` — GitHub's test user (small example)

---

## 📄 License

MIT

---

## 👤 Author

Built by Bruno Jaamaa — Software Engineering & UX Design, University of Melbourne.
