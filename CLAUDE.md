# CLAUDE.md — AI Context for 3D GitHub Visualizer

This file provides context for AI assistants working on this codebase.

## What This Project Is

A React + Three.js web app that visualizes any GitHub user's repositories as interactive 3D spheres. No backend — purely client-side with GitHub REST API calls and localStorage persistence.

## Quick Orientation

- **Entry:** `src/main.jsx` → `src/App.jsx`
- **3D Scene:** `src/components/Visualizer.jsx` (animation loop, spheres, raycasting, hover/click)
- **Scene Setup:** `src/hooks/useThreeScene.js` (WebGL renderer, camera, lights — no render loop)
- **API:** `src/utils/githubApi.js` (fetch repos, READMEs, caching)
- **Positioning:** `src/utils/positioning.js` (maps repo metadata → 3D coordinates)
- **Colors:** `src/utils/colors.js` (language → hex color mapping)
- **State:** All in `App.jsx` via React hooks (no Redux/Zustand)

## Architecture Rules

1. **App.jsx owns all global state** — repos, filters, preferences, selected repo. Child components receive state via props.
2. **Visualizer.jsx owns the render loop** — `useThreeScene` only initializes scene/camera/renderer. The `useEffect` in Visualizer runs `requestAnimationFrame`.
3. **Services are stateless classes** — `userPreferences`, `collaborationService`, `dataExporter`, `filterSetsManager`, `heatmapGenerator` all operate on localStorage or pure data.
4. **No shared materials** — Each sphere gets its own cloned material (so opacity/emissive can vary independently per sphere). Materials are cached by color but cloned on assignment.
5. **Animation loop allocates nothing** — `Frustum` and `Matrix4` are pre-allocated in refs and reused every frame. Never `new` inside `animate()`.

## Key Conventions

- **Design system:** White/grey only. No blue, purple, or colored accents in UI. Accent color is `#888888`.
- **CSS:** Component-specific files in `src/styles/`. Global styles in `App.css`. CSS custom properties for theming.
- **JSDoc:** All exported functions should have JSDoc comments.
- **Theme:** `ThemeContext.jsx` provides `isDark`/`toggleTheme`. Dark = `#0f0f0f` bg, Light = `#f8f8f8` bg.
- **Accessibility:** Modals must have focus trap + `role="dialog"` + `aria-modal`. Use `aria-live` for dynamic content.
- **No console.log:** All console statements were removed in a cleanup pass.

## Build & Dev

```bash
npm run dev       # Vite dev server on localhost:5173
npm run build     # Production build → dist/
npm run preview   # Preview production build
```

Build output: ~731KB JS (197KB gzip), ~49KB CSS (8.7KB gzip). Zero errors.

## GitHub API Notes

- **Rate limit:** 60 requests/hour (unauthenticated)
- **Pagination:** Max 100 repos/page, capped at 3 pages (300 repos)
- **README batching:** 5 concurrent, 200ms between batches, 5s timeout per request
- **Caching:** localStorage with 30-minute TTL (`repos_{username}` key)
- **Error handling:** 404 → "user not found", 403/429 → rate limit message with reset time

## Three.js Specifics

- **Geometry:** `IcosahedronGeometry` with LOD detail (4/2/1 based on repo count)
- **Material:** `MeshPhongMaterial` with emissive glow, cloned per sphere
- **Camera:** `PerspectiveCamera` at FOV 75, auto-positioned based on bounding box
- **Controls:** `OrbitControls` from three-stdlib (auto-rotate, damping, zoom)
- **Shadows:** Disabled (saves ~16MB GPU memory)
- **Culling:** Manual frustum culling in animation loop + Three.js automatic
- **Entrance:** Spheres scale from 0 → baseSize with easeOutBack easing, staggered 20ms apart

## Performance-Sensitive Areas

1. **`Visualizer.jsx` animate()` function** — Runs 60x/sec. No allocations, no array creation, no closures.
2. **Hover detection** — Debounced at 50ms. Raycasts only against `visibleSpheresRef` (culled set).
3. **Sphere creation** — Geometry and material cached. LOD scales with repo count.

## Testing

No automated test framework. Manual testing checklist in various `TEST_REPORT_*.md` files.

## File Inventory (src/)

| File | Lines | Role |
|------|-------|------|
| `App.jsx` | ~280 | Root component, global state, search orchestration |
| `Visualizer.jsx` | ~400 | Three.js scene, animation, interaction |
| `useThreeScene.js` | ~120 | Scene/camera/renderer init + cleanup |
| `githubApi.js` | ~165 | GitHub API calls, caching, rate limit handling |
| `positioning.js` | ~70 | 3D coordinate calculation |
| `colors.js` | ~35 | Language color map |
| `userPreferences.js` | ~220 | Preferences CRUD (localStorage) |
| `collaborationService.js` | ~300 | Sharing, snapshots, comments |
| `dataExporter.js` | ~270 | JSON/CSV/screenshot export |
| `filterSetsManager.js` | ~260 | Filter set CRUD |
| `heatmapGenerator.js` | ~285 | Heatmap data generation |
| `ThemeContext.jsx` | ~25 | Dark/light theme context |
| Components (15) | ~30-150 each | UI panels and controls |

## Common Tasks

### Add a new language color
Edit `src/utils/colors.js`, add to `languageColors` object:
```js
yourlang: { color: 0xRRGGBB, name: 'YourLang' }
```

### Add a new panel/feature
1. Create component in `src/components/YourPanel.jsx`
2. Create styles in `src/styles/YourPanel.css`
3. Wire into `App.jsx` (state + render)
4. Follow grey design system — no colored accents

### Modify sphere appearance
Edit `Visualizer.jsx` — look for the `repos.forEach` in the sphere creation `useEffect`.

### Change positioning algorithm
Edit `src/utils/positioning.js` — the `calculatePositions()` function.
