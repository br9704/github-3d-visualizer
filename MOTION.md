# MOTION.md — 3D GITHUB VISUALIZER
# Animation spec. Read with `CLAUDE.md` and `RESEARCH-CONTEXT.md`; binding.

> This app's current failure is that **nothing moves until a search succeeds** — and for most visitors nothing ever does. The motion plan therefore starts with the empty state, not the galaxy. The first ten seconds are the product.

---

## Inherited system

Monochrome UI chrome, green only for live/positive. Ease-out/linear, ≤600ms for UI; the 3D scene itself may use longer continuous motion (orbits, drift) because it is ambient, not transitional. Terminal loaders and `>` machine-speech for all waiting states. No spinners. No emoji controls (replace 🌙 ❓ 🔍 ⚙️ with monospace glyphs/bracket buttons). **A11y:** reduced-motion = static scene (no drift, no auto-orbit), instant transitions, all data readable as text.

---

## The empty state IS the hero (fixes the blank page)

On load, before any search, render a **procedural ambient galaxy** — 60–80 placeholder spheres from a seeded generator (no API call, works offline, never rate-limits):

```
0–400ms    Background fades from black. A 1px grid plane fades to 8% opacity.
400ms      Placeholder spheres stream in over ~1.2s — each scales 0→size with
           ease-out, 15ms apart, from the centre outward.
1.6s+      The galaxy drifts: slow auto-orbit, 0.03 rad/s. Ambient, endless.
Overlay    `</github universe>` label, then the search field, then a typed line:
           `> enter a username — try torvalds` (40ms/char, types once).
```

The demo galaxy is dimmed to 50% and unlabeled — clearly scenery, not data. On first keystroke in the search field it eases to 25%; on successful search it dissolves (all spheres scale to 0 over 400ms, staggered) as the real data enters. **A visitor who types nothing still sees a living 3D object, styled, branded, moving.** That alone deletes the blank-page problem.

## Search → universe (the transition)

```
SUBMIT     Field locks, button becomes [██░░░░░░░] with real fetch progress if the
           proxy exposes it, else indeterminate fill-and-hold at 90%.
           Beneath: `> fetching @torvalds... 34 repos` — live counters from the proxy.
FAIL       Loader empties right-to-left 200ms, error prints instantly:
           `> user not found` / `> rate limited — try again in 4m`. No shake. Errors
           are text, not choreography.
SUCCESS    Demo galaxy dissolves (400ms) WHILE the camera pulls back 15% (600ms
           ease-out) — the space "opens" to receive the data.
ENTRANCE   Real repo spheres stream in largest-first, 25ms apart, each scaling
           0→final with ease-out and overshooting by nothing. Position them at
           final coordinates from frame one — things GROW here, they do not fly.
           100 repos ≈ 2.5s total. Cap staggering at 100; instantiate the rest
           at once on the final beat.
SETTLE     Auto-orbit resumes at ambient speed. A HUD line types:
           `> 61 repos · 198k stars · rendered in 1.4s` — real numbers, measured.
```

## Interaction motion

- **Hover** (raycast hit): sphere scales ×1.15 over 120ms; a 1px ring appears around it; its name renders in a fixed HUD slot (never a floating tooltip chasing the cursor in 3D — it jitters). Green ring only if the repo pushed within 30 days: one colour, one meaning — alive.
- **Click → detail:** camera flies to a framing position over 500ms ease-out (never linear — linear camera moves read as robotic). The detail panel slides in from the right, 280ms. Scene keeps drifting behind at 30% dim. Esc reverses both in 350ms.
- **Filter changes:** filtered-out spheres scale to 0.25 and 15% opacity over 300ms — they shrink, they do not vanish; the shape of the whole universe stays legible. Count line updates by count-up.
- **Heatmap modes:** colour/intensity cross-fades over 400ms linear, uniform across all spheres in one pass. Never per-sphere staggered — mode changes are global state, not arrivals.
- **Idle:** after 60s untouched, drift slows to half. Any input restores. Battery politeness on laptops; pause the render loop entirely when the tab is hidden.

## Performance discipline (this is where the 60fps claim gets earned or cut)

- One geometry, instanced meshes or merged buffers — never 100 draw calls for 100 spheres.
- All entrance/hover scaling on the GPU via per-instance attributes where possible.
- `stats.js` in dev builds; record p95 frame time at 100+ repos on integrated graphics. **The portfolio's "60fps on 100+ repos" claim is either evidenced by this measurement or removed by the copy audit.** The HUD's "rendered in Ns" line keeps the honesty visible.

## Acceptance

- [ ] Cold load with no input: styled, branded, moving scene within 2s — screenshot-worthy at every moment after
- [ ] Search failure paths (404, rate-limit) recorded — instant text, no dead loader
- [ ] 100-repo entrance completes ≤3s and never drops below 50fps on integrated graphics (measured, logged)
- [ ] Hover/click/filter/Esc each recorded; camera never moves linearly
- [ ] Tab hidden = render loop paused (verify CPU in dev tools)
- [ ] `prefers-reduced-motion`: no drift, no entrance cascade (instant placement), everything still readable
- [ ] The README hero is a recording of the entrance sequence, not a static render
