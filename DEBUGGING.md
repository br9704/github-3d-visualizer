# 3D Visualizer Debugging Guide

## Common Issues & Solutions

### Issue: FPS = 0 (No Rendering)

**Root Causes:**
1. WebGL not supported on browser
2. Container has zero dimensions
3. Three.js scene initialization failed
4. Animation loop not started
5. React component not rendering

**Debugging Steps:**

1. **Check browser console** for `[THREE]` prefixed logs:
   ```
   [THREE] Checking WebGL support...
   [THREE] ✓ WebGL supported
   [THREE] ✓✓✓ Scene initialization COMPLETE
   [THREE] Scene is ready for rendering. Parent component should start animation loop.
   ```
   
2. **If you see WebGL error:**
   ```
   [THREE] WebGL is not supported on this browser
   ```
   Solution: Try a modern browser (Chrome 90+, Firefox 88+, Safari 15+, Edge 90+)

3. **If scene initialization stops mid-way:**
   - Check browser for any JavaScript errors
   - Verify container element is properly sized
   - Check GPU memory usage

4. **If you see "Scene is ready" but no VISUALIZER logs:**
   - The animation effect in VisualizerOptimized isn't running
   - Check if repos data is empty
   - Verify React component mounted

### Issue: Black Canvas (Geometry Not Visible)

**Root Causes:**
1. Camera positioned inside geometry
2. Lights insufficient
3. Material properties wrong
4. Geometry too small/large

**Debugging Steps:**

1. **Check camera position** - should be > 80 units away from center
2. **Verify lights** - you should see 3 lights in console logs:
   - Directional Light 1 (main)
   - Directional Light 2 (secondary)
   - Ambient Light
3. **Test with simple geometry** - replace icosahedron with cube
4. **Increase light intensity** in useThreeScene.js

### Issue: High CPU Usage / Poor Performance

**Optimization Checklist:**

1. **Check FPS counter** - target is 60 FPS
2. **Reduce repo count** - limit to 500 max
3. **Lower pixel ratio** in useThreeScene.js (currently capped at 2)
4. **Disable auto-rotate** in VisualizerOptimized.jsx if needed
5. **Check draw calls** - should be < 10 for >1000 repos

## Console Logging Prefixes

- `[THREE]` - WebGL scene initialization
- `[VISUALIZER]` - 3D component rendering and animation
- `[API]` - GitHub API calls
- `[FILTER]` - Repository filtering logic

## Development Tips

### Enable detailed logging:

```javascript
// Add to App.jsx temporarily
if (process.env.DEBUG) {
  window.DEBUG_MODE = true
  console.log = (...args) => console.log('[DEBUG]', ...args)
}
```

### Test WebGL directly:

```javascript
// In browser console
const canvas = document.createElement('canvas')
const gl = canvas.getContext('webgl')
console.log(gl ? 'WebGL OK' : 'WebGL NOT SUPPORTED')
```

### Inspect Three.js scene:

```javascript
// In browser console (requires scene to be in window scope)
window.SCENE_DEBUG = scene
console.log('Scene children:', window.SCENE_DEBUG.children)
```

## Performance Profiling

1. **Open Chrome DevTools** → Performance tab
2. **Record 5-10 seconds** of interaction
3. **Look for frame timing** - smooth should be consistent 16-17ms per frame
4. **Check GPU timeline** - less than frame time
5. **Identify bottlenecks:**
   - Orange: JavaScript
   - Purple: Rendering
   - Green: Composite/Paint

## Browser Compatibility

| Browser | Min Version | WebGL 2 | Notes |
|---------|-------------|---------|-------|
| Chrome  | 60          | Yes     | Best performance |
| Firefox | 55          | Yes     | Stable |
| Safari  | 15          | Partial | iOS limitations |
| Edge    | 79          | Yes     | Chromium-based |

## Common Error Messages

```
"WebGL is not supported on this browser"
→ Use modern browser

"Timeout (8s). Check your connection."
→ GitHub API unreachable or very slow network

"GitHub API rate limit exceeded"
→ Wait for reset time shown in error message

"Container has zero dimensions"
→ Ensure canvas-wrapper has CSS width/height
```

## Recovery Procedures

### If nothing renders after search:

1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard reload (Ctrl+Shift+R)
3. Check GitHub API key is valid
4. Verify network tab shows successful API calls
5. Inspect browser console for errors

### If animation loop stops:

1. Check if requestAnimationFrame still called
2. Verify renderer.render() is executing
3. Check for JavaScript errors in console
4. Refresh page to restart animation loop

### If HMR isn't updating:

1. Restart dev server: `npm run dev`
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Hard refresh browser: Ctrl+Shift+R
4. Check terminal for build errors

## Testing Checklist

After fixes, test:

- [ ] Page loads without errors
- [ ] Search bar visible and interactive
- [ ] Canvas renders (not black)
- [ ] FPS counter > 0 (should be 30-60)
- [ ] Search for "torvalds" returns results
- [ ] 3D spheres visible and rotating
- [ ] Can interact with camera (orbit, zoom)
- [ ] Repo click shows details
- [ ] Works on Chrome, Firefox
- [ ] No console errors or warnings
