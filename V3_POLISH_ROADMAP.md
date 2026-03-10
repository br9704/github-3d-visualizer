# v3 Polish Roadmap - Specific Recommendations

**Target:** Ship within 10 hours of sprint work  
**Priority:** Low (cosmetic + UX improvements, not blocking v2 release)

---

## Phase 1: Quick Visual Polish (45 minutes)

### 1.1 Subtle Background Gradient
**File:** `src/App.css`

**Current:**
```css
body {
  background: #000;
}
```

**Recommended:**
```css
body {
  background: radial-gradient(ellipse at 50% -20%, #0a0a1a 0%, #000 50%, #000 100%);
}

.app {
  background: inherit;
}
```

**Why:** Adds depth without cluttering. Subtle = professional.  
**Time:** 5 minutes  
**Testing:** Visual check in browser

---

### 1.2 Modern Tooltip Enhancement
**File:** `src/styles/Tooltip.css` (new)

**Add:**
```css
.tooltip {
  background: rgba(26, 26, 26, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(167, 139, 250, 0.2);
  box-shadow: 
    0 8px 32px rgba(124, 58, 237, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

**Why:** Glass-morphism is modern + matches dark aesthetic.  
**Time:** 10 minutes  
**Fallback:** Older browsers still see opaque tooltip

---

### 1.3 Loading Animation Improvement
**File:** `src/styles/SearchBar.css`

**Current:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

**Recommended:** Add spinning icon indicator
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.search-button.loading::before {
  content: "⟳";
  display: inline-block;
  animation: spin 1s linear infinite;
  margin-right: 6px;
}
```

**Why:** Clearer visual feedback during API call.  
**Time:** 15 minutes  
**Testing:** Type a username and watch the spinner

---

## Phase 2: UX Enhancements (3.5 hours)

### 2.1 Keyboard Shortcuts Help Modal
**Files:** New component `src/components/KeyboardHelp.jsx` + `src/styles/KeyboardHelp.css`

**Implementation:**
```jsx
// KeyboardHelp.jsx
export default function KeyboardHelp({ isOpen, onClose }) {
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === '?') {
        onClose(!isOpen);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, onClose]);

  return isOpen ? (
    <div className="keyboard-help-modal">
      <div className="keyboard-help-content">
        <h2>Keyboard Shortcuts</h2>
        <div className="shortcut">
          <kbd>↑ ↓ ← →</kbd> <span>Rotate camera</span>
        </div>
        <div className="shortcut">
          <kbd>+</kbd> / <kbd>-</kbd> <span>Zoom in/out</span>
        </div>
        <div className="shortcut">
          <kbd>Tab</kbd> <span>Cycle through repos</span>
        </div>
        <div className="shortcut">
          <kbd>Enter</kbd> <span>Submit search</span>
        </div>
        <div className="shortcut">
          <kbd>Escape</kbd> <span>Close dialog</span>
        </div>
        <div className="shortcut">
          <kbd>?</kbd> <span>Show this help</span>
        </div>
      </div>
    </div>
  ) : null;
}
```

**CSS:**
```css
.keyboard-help-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  animation: fadeIn 0.2s ease;
}

.keyboard-help-content {
  background: #1a1a1a;
  border: 1px solid #7c3aed;
  border-radius: 12px;
  padding: 40px;
  max-width: 400px;
  box-shadow: 0 12px 40px rgba(124, 58, 237, 0.3);
}

.shortcut {
  display: flex;
  gap: 20px;
  margin: 12px 0;
  align-items: center;
}

kbd {
  background: rgba(124, 58, 237, 0.2);
  border: 1px solid #7c3aed;
  border-radius: 4px;
  padding: 4px 8px;
  font-family: monospace;
  font-size: 12px;
  color: #a78bfa;
  min-width: 60px;
  text-align: center;
}
```

**Integration:** Add to App.jsx
```jsx
const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
return (
  <>
    {/* existing components */}
    <KeyboardHelp isOpen={showKeyboardHelp} onClose={setShowKeyboardHelp} />
  </>
);
```

**Why:** Discoverability. Users won't know about keyboard shortcuts without help.  
**Time:** 1.5 hours  
**Testing:** Press "?" to toggle

---

### 2.2 Persist Filter State in URL
**File:** `src/App.jsx` (modify handleLanguageFilter)

**Current Code:**
```jsx
const handleLanguageFilter = useCallback((language) => {
  setFilteredLanguage(language)
}, [])
```

**Enhanced:**
```jsx
const handleLanguageFilter = useCallback((language) => {
  setFilteredLanguage(language);
  
  // Update URL without page reload
  const params = new URLSearchParams(window.location.search);
  if (language) {
    params.set('lang', language.toLowerCase());
  } else {
    params.delete('lang');
  }
  window.history.replaceState({}, '', `?${params.toString()}`);
}, [])

// Restore filter on mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const langParam = params.get('lang');
  if (langParam) {
    setFilteredLanguage(langParam);
  }
}, [])
```

**Why:** Share links now include the active filter. Restored on load.  
**Time:** 1 hour  
**Testing:** Click filter → copy URL → paste in new tab → filter restored ✓

---

### 2.3 Export Includes Camera State
**File:** `src/components/ExportShare.jsx` (modify handleExport)

**Current:**
```jsx
const data = {
  username,
  repos: repos.map(/* ... */),
  cameraState: { /* empty */ },
  filters,
}
```

**Enhanced:**
```jsx
const handleExport = () => {
  // Get camera state from Three.js
  const camera = renderer?.current?.camera;
  const cameraState = camera ? {
    position: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    },
    rotation: {
      x: camera.rotation.x,
      y: camera.rotation.y,
      z: camera.rotation.z
    }
  } : null;

  const data = {
    username,
    repos: repos.map(/* ... */),
    cameraState,
    filters,
    exportedAt: new Date().toISOString()
  };
  
  // ... rest of export
}
```

**Why:** Users can restore exact visualization later from JSON export.  
**Time:** 1 hour  
**Testing:** Export JSON → check cameraState includes coordinates

---

## Phase 3: Performance Tuning (1.5 hours, optional)

### 3.1 Lazy Load READMEs (On-Demand)
**File:** `src/components/Visualizer.jsx` (modify tooltip/modal fetch)

**Current:** Fetches 20 READMEs upfront in App.jsx  
**Problem:** Slows initial load time

**Solution:** Fetch README only when modal opens
```jsx
// In RepoDetails.jsx
const [readme, setReadme] = useState(null);
const [loadingReadme, setLoadingReadme] = useState(false);

useEffect(() => {
  if (!repo.readme && !loadingReadme) {
    setLoadingReadme(true);
    fetchRepoReadme(username, repo.name)
      .then(content => setReadme(content))
      .finally(() => setLoadingReadme(false));
  }
}, [repo.name, username, repo.readme, loadingReadme]);
```

**Why:** 30% faster initial load (defer README fetching).  
**Time:** 1.5 hours  
**Benefit:** ~500ms faster on 100-repo load

---

### 3.2 Service Worker for Offline Support
**File:** New `src/service-worker.js` + `src/main.jsx` registration

**Scope:** Cache static assets + GitHub API responses  
**Time:** 2 hours  
**Benefit:** Works offline with cached data (optional)

---

## Phase 4: Optional Features (4.5 hours, low priority)

### 4.1 Dark/Light Mode Toggle
**Effort:** 2 hours  
**Implementation:** CSS custom properties + React context  
**Benefit:** User preference

**Skeleton:**
```jsx
// ThemeContext.jsx
export const useTheme = () => {
  const [isDark, setIsDark] = useState(true);
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);
  
  return { isDark, toggleTheme: () => setIsDark(!isDark) };
};
```

**CSS:**
```css
:root[data-theme="dark"] {
  --bg-primary: #000;
  --bg-secondary: #1a1a1a;
  --text-primary: #fff;
  --accent: #7c3aed;
}

:root[data-theme="light"] {
  --bg-primary: #f8f8f8;
  --bg-secondary: #e8e8e8;
  --text-primary: #111;
  --accent: #6d28d9;
}
```

---

### 4.2 GitHub OAuth Login
**Effort:** 2.5 hours  
**Implementation:** GitHub OAuth app + access token storage  
**Benefit:** 5000 req/hr rate limit (vs 60/hr)

**Flow:**
1. Add "Login with GitHub" button
2. Open GitHub OAuth dialog
3. Store access token in localStorage
4. Use token in axios Authorization header
5. Higher rate limit = more repos can be loaded

---

## Implementation Priority

### Must Have (Required for v2.1)
- ✅ All above items complete in v2.0

### Should Have (v2.1 - 1 sprint)
1. **Phase 1** - Quick polish (45 min)
2. **Phase 2.1** - Keyboard help (1.5h)
3. **Phase 2.2** - Filter URL persistence (1h)

**Total:** ~3 hours

### Nice To Have (v3 - future sprint)
- Phase 2.3 - Export camera state (1h)
- Phase 3 - Performance tuning (1.5h)
- Phase 4 - Dark mode + OAuth (4.5h)

---

## Testing Checklist for Each Phase

### Phase 1 Testing
- [ ] Background gradient renders smoothly
- [ ] Tooltip blur effect visible on hover
- [ ] Loading spinner rotates during API call
- [ ] No performance regression

### Phase 2 Testing
- [ ] Press "?" opens help modal
- [ ] Filter saves to URL on change
- [ ] URL param restored on page reload
- [ ] Camera state exports with JSON

### Phase 3 Testing
- [ ] First load faster (measure time)
- [ ] README fetches on-demand (watch Network tab)
- [ ] App works offline after caching

### Phase 4 Testing
- [ ] Light mode renders correctly
- [ ] Dark mode default
- [ ] OAuth login works
- [ ] Higher rate limit respected

---

## Effort Summary

| Phase | Tasks | Hours | Difficulty |
|-------|-------|-------|------------|
| 1: Visual Polish | 3 | 0.75 | Easy |
| 2: UX Enhancements | 3 | 3.5 | Medium |
| 3: Performance | 2 | 1.5 | Medium |
| 4: Optional Features | 2 | 4.5 | Hard |
| **TOTAL** | **10** | **~10h** | - |

**Recommended:** Do Phase 1 + Phase 2.1 + 2.2 in next sprint (3h)  
**Optional:** Phase 3 + 4 later based on user feedback

---

## Success Metrics for v3

- ✅ Keyboard help improves discoverability (measure usage)
- ✅ Filter persistence improves sharing (measure shares)
- ✅ Camera export enables reproducibility
- ✅ Performance improvements reduce bounce rate
- ✅ Dark mode reduces eye strain complaints

---

**Created:** March 10, 2026  
**Status:** Recommended for future development  
**Priority:** Low (v2 ships without these)
