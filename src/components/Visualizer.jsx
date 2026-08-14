import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
// three ships OrbitControls itself; three-stdlib was a second copy of it.
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useThreeScene } from '../hooks/useThreeScene'
import { getLanguageInfo, getLanguageCode, getAllLanguageCodes } from '../utils/colors'
import { generateAmbientGalaxy } from '../scene/ambientGalaxy'
import {
  InstancedField,
  WireField,
  LabelField,
  HoverRing,
  isAlive
} from '../scene/instancedField'
import { easeOutCubic, easeOutQuad, clamp01 } from '../scene/easing'

/**
 * Visualizer — the scene, and the motion state machine that drives it.
 *
 * Implements MOTION.md. The app's original failure was that nothing moved
 * until a search succeeded, and for most visitors nothing ever did. So the
 * scene has something in it from the first frame:
 *
 *   ambient   seeded placeholder galaxy, dimmed, drifting. No API call.
 *   dimming   visitor started typing; the galaxy eases back to 25%
 *   dissolve  a search succeeded; placeholders scale to 0 over 400ms while
 *             the camera pulls back 15% — the space "opens" to receive data
 *   entering  real repositories GROW at their final coordinates, largest
 *             first, 25ms apart. They do not fly in.
 *   settled   ambient drift resumes
 *
 * Both galaxies are single InstancedMesh draw calls: 100 repositories used to
 * mean 100 draw calls and 100 cloned materials.
 *
 * prefers-reduced-motion collapses every phase to instant placement with no
 * drift, and the scene stays fully readable.
 */

/* Timings — all from MOTION.md, in seconds. */
const AMBIENT_STAGGER = 0.015
const AMBIENT_GROW = 0.5
const AMBIENT_DRIFT = 0.03 // rad/s
const AMBIENT_FADE = 0.5
const AMBIENT_FADE_TYPING = 0.25
const DISSOLVE = 0.4
const CAMERA_PULLBACK = 0.6
const CAMERA_PULLBACK_FACTOR = 1.15
const ENTRANCE_STAGGER = 0.025
const ENTRANCE_GROW = 0.45
const ENTRANCE_STAGGER_CAP = 100
const FLY_TO = 0.5 // click -> camera flight
const FLY_BACK = 0.35 // Esc reverses
const SELECTED_DIM = 0.3 // scene drifts behind the detail panel at 30%
const HOVER_SCALE = 1.15
const IDLE_AFTER = 60

const AMBIENT_COLOR = 0x98928a // scenery, never data

export default function Visualizer({
  repos,
  onRepoClick,
  filteredLanguage = null,
  selectedRepo = null,
  isTyping = false,
  onSettled,
  onFrameStats
}) {
  const containerRef = useRef(null)
  const { scene, camera, renderer, error: sceneError, ready } = useThreeScene(containerRef)

  const fieldRef = useRef(null)
  const wireRef = useRef(null)
  const labelRef = useRef(null)
  const ambientFieldRef = useRef(null)
  const ambientDataRef = useRef([])
  const dataRef = useRef([])
  const ringRef = useRef(null)
  const controlsRef = useRef(null)

  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const hoveredRef = useRef(-1)
  const currentIndexRef = useRef(-1)
  const [hovered, setHovered] = useState(null)

  const phaseRef = useRef('ambient')
  const phaseStartRef = useRef(0)
  const lastInputRef = useRef(0)
  const cameraDistRef = useRef(80)
  const reducedMotionRef = useRef(false)
  const filterRef = useRef(filteredLanguage)
  filterRef.current = filteredLanguage

  /** Camera flight, driven by clicking a sphere. */
  const flightRef = useRef(null)
  const homeRef = useRef(null)
  const selectedRef = useRef(null)

  /** Rolling frame times, so the perf claim can be measured, not asserted.
      `frameTimes` is the interval between frames — capped by vsync, so on fast
      hardware it measures the display, not the workload. `workTimes` is the
      time actually spent inside the render loop, which is the number that
      says whether this app could sustain a frame rate. */
  const frameTimesRef = useRef([])
  const workTimesRef = useRef([])

  /* ── Reduced motion ──────────────────────────────────────────────────── */

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      reducedMotionRef.current = mq.matches
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  /* ── Ambient galaxy ──────────────────────────────────────────────────── */

  useEffect(() => {
    if (!scene || !ready) return

    const items = generateAmbientGalaxy()
    const field = new InstancedField(items.length, 2)
    ambientFieldRef.current = field
    ambientDataRef.current = items

    items.forEach((_, i) => field.setBaseColor(i, AMBIENT_COLOR))
    scene.add(field.mesh)

    if (camera) frameAmbient(camera)

    phaseRef.current = 'ambient'
    phaseStartRef.current = performance.now() / 1000

    return () => {
      scene.remove(field.mesh)
      field.dispose()
      ambientFieldRef.current = null
      ambientDataRef.current = []
    }
  }, [scene, ready, camera])

  /* ── Hover ring ──────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!scene || !ready) return
    const ring = new HoverRing()
    ringRef.current = ring
    scene.add(ring.mesh)
    return () => {
      scene.remove(ring.mesh)
      ring.dispose()
      ringRef.current = null
    }
  }, [scene, ready])

  /* ── Real repositories ───────────────────────────────────────────────── */

  useEffect(() => {
    if (!scene || !camera || !renderer) return

    if (fieldRef.current) {
      scene.remove(fieldRef.current.mesh)
      fieldRef.current.dispose()
      fieldRef.current = null
    }
    if (wireRef.current) {
      scene.remove(wireRef.current.segments)
      wireRef.current.dispose()
      wireRef.current = null
    }
    if (labelRef.current) {
      scene.remove(labelRef.current.mesh)
      labelRef.current.dispose()
      labelRef.current = null
    }
    dataRef.current = []
    hoveredRef.current = -1
    currentIndexRef.current = -1
    setHovered(null)

    if (!repos || repos.length === 0) {
      phaseRef.current = 'ambient'
      phaseStartRef.current = performance.now() / 1000
      if (camera) frameAmbient(camera)
      return
    }

    const detail = repos.length > 150 ? 1 : repos.length > 50 ? 2 : 3

    // Largest first — the big shapes establish the form before the detail
    // arrives.
    const ordered = [...repos].sort((a, b) => b.size - a.size)
    const field = new InstancedField(ordered.length, detail)
    fieldRef.current = field

    const now = Date.now()
    dataRef.current = ordered.map((d, i) => {
      const { color } = getLanguageInfo(d.repo.language)
      field.setBaseColor(i, color)
      field.setTransform(i, d.position, reducedMotionRef.current ? d.size : 0.0001)
      field.setFade(i, reducedMotionRef.current ? 1 : 0)
      return {
        repo: d.repo,
        position: new THREE.Vector3(d.position.x, d.position.y, d.position.z),
        baseSize: d.size,
        order: i,
        hoverScale: 1,
        filterScale: 1,
        fade: reducedMotionRef.current ? 1 : 0,
        alive: isAlive(d.repo, now),
        code: getLanguageCode(d.repo.language)
      }
    })
    field.commit()
    scene.add(field.mesh)

    // Hairline facet shell — this is what makes a node read as a constructed
    // instrument rather than a shaded ball.
    const wire = new WireField(ordered.length, Math.min(detail, 2))
    wire.rebuild(dataRef.current.map((d) => ({ position: d.position, size: d.baseSize })))
    wire.setOpacity(0)
    wireRef.current = wire
    scene.add(wire.segments)

    // Billboarded monospace language codes — the "icon" on each node.
    const labels = new LabelField(getAllLanguageCodes(), ordered.length)
    dataRef.current.forEach((d, i) => {
      labels.set(i, d.position, getLanguageCode(d.repo.language), d.baseSize * 0.9, 0, d.baseSize)
    })
    labels.commit()
    labelRef.current = labels
    scene.add(labels.mesh)

    frameCamera(camera, renderer)

    phaseRef.current = reducedMotionRef.current ? 'settled' : 'dissolving'
    phaseStartRef.current = performance.now() / 1000

    if (reducedMotionRef.current) onSettled?.()
  }, [repos, scene, camera, renderer, onSettled])

  /* ── Click → camera flight ───────────────────────────────────────────── */

  useEffect(() => {
    selectedRef.current = selectedRepo
    const ctrl = controlsRef.current
    if (!ctrl || !camera) return

    if (selectedRepo) {
      const entry = dataRef.current.find((d) => d.repo === selectedRepo)
      if (!entry) return

      homeRef.current = {
        position: camera.position.clone(),
        target: ctrl.target.clone()
      }

      // Frame the sphere from where the camera already is, so the move reads
      // as approaching rather than snapping to a canned angle.
      const dir = camera.position.clone().sub(entry.position).normalize()
      const stand = Math.max(entry.baseSize * 6, cameraDistRef.current * 0.28)

      flightRef.current = {
        t: 0,
        duration: reducedMotionRef.current ? 0 : FLY_TO,
        fromPos: camera.position.clone(),
        toPos: entry.position.clone().addScaledVector(dir, stand),
        fromTarget: ctrl.target.clone(),
        toTarget: entry.position.clone()
      }
    } else if (homeRef.current) {
      flightRef.current = {
        t: 0,
        duration: reducedMotionRef.current ? 0 : FLY_BACK,
        fromPos: camera.position.clone(),
        toPos: homeRef.current.position.clone(),
        fromTarget: ctrl.target.clone(),
        toTarget: homeRef.current.target.clone()
      }
      homeRef.current = null
    }
  }, [selectedRepo, camera])

  /* ── The render loop ─────────────────────────────────────────────────── */

  useEffect(() => {
    if (!scene || !renderer || !camera) return

    let raf = null
    let lastFrame = performance.now() / 1000
    let running = true

    const animate = () => {
      if (!running) return
      raf = requestAnimationFrame(animate)

      const workStart = performance.now()
      const now = workStart / 1000
      const dt = Math.min(0.1, now - lastFrame)
      lastFrame = now

      // Rolling window of frame intervals, so "60fps at 100+ repos" is a
      // measurement rather than a claim.
      const times = frameTimesRef.current
      times.push(dt * 1000)
      if (times.length > 240) times.shift()

      const t = now - phaseStartRef.current
      const phase = phaseRef.current
      const reduced = reducedMotionRef.current
      const idle = now - lastInputRef.current > IDLE_AFTER
      const driftScale = reduced ? 0 : idle ? 0.5 : 1

      /* Camera flight */
      const flight = flightRef.current
      const ctrl = controlsRef.current
      if (flight && ctrl) {
        flight.t += dt
        const p =
          flight.duration === 0 ? 1 : easeOutQuad(clamp01(flight.t / flight.duration))
        camera.position.lerpVectors(flight.fromPos, flight.toPos, p)
        ctrl.target.lerpVectors(flight.fromTarget, flight.toTarget, p)
        if (p >= 1) flightRef.current = null
      }

      ctrl?.update()

      /* Ambient galaxy */
      const af = ambientFieldRef.current
      if (af) {
        const items = ambientDataRef.current
        if (phase === 'ambient' || phase === 'dimming') {
          const targetFade = phase === 'dimming' ? AMBIENT_FADE_TYPING : AMBIENT_FADE
          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            const p = reduced ? 1 : clamp01((t - i * AMBIENT_STAGGER) / AMBIENT_GROW)
            af.setTransform(i, item.position, Math.max(0.0001, easeOutCubic(p) * item.size))
            af.setFade(i, targetFade * p)
          }
          af.mesh.rotation.y += AMBIENT_DRIFT * dt * driftScale
          af.commit()
          af.mesh.visible = true
        } else if (phase === 'dissolving') {
          for (let i = 0; i < items.length; i++) {
            const delay = (i / items.length) * 0.15
            const q = clamp01((t - delay) / DISSOLVE)
            af.setTransform(i, items[i].position, Math.max(0.0001, (1 - easeOutCubic(q)) * items[i].size))
            af.setFade(i, AMBIENT_FADE_TYPING * (1 - q))
          }
          af.commit()
        } else if (af.mesh.visible) {
          af.mesh.visible = false
        }
      }

      /* Camera pull-back: the space opens to receive the data */
      if (phase === 'dissolving' && !reduced && ctrl && !flight) {
        const p = easeOutQuad(clamp01(t / CAMERA_PULLBACK))
        const from = cameraDistRef.current
        const to = from * CAMERA_PULLBACK_FACTOR
        const dir = camera.position.clone().sub(ctrl.target).normalize()
        camera.position.copy(ctrl.target).addScaledVector(dir, from + (to - from) * p)
        if (t >= Math.max(DISSOLVE, CAMERA_PULLBACK)) {
          phaseRef.current = 'entering'
          phaseStartRef.current = now
        }
      }

      /* Real repositories */
      const field = fieldRef.current
      const data = dataRef.current
      if (field && data.length > 0 && (phase === 'entering' || phase === 'settled')) {
        const entering = phase === 'entering'
        const filter = filterRef.current
        const dimAll = selectedRef.current ? SELECTED_DIM : 1
        let allIn = true

        for (let i = 0; i < data.length; i++) {
          const d = data[i]

          if (entering && !reduced) {
            const delay = Math.min(d.order, ENTRANCE_STAGGER_CAP) * ENTRANCE_STAGGER
            const p = clamp01((t - delay) / ENTRANCE_GROW)
            if (p < 1) allIn = false
            // ease-out, no overshoot. easeOutBack popped past 1.0.
            field.setTransform(i, d.position, Math.max(0.0001, easeOutCubic(p) * d.baseSize))
            field.setFade(i, p)
            d.fade = p
            labelRef.current?.set(
              i,
              d.position,
              d.code,
              easeOutCubic(p) * d.baseSize * 0.85,
              p * 0.9,
              easeOutCubic(p) * d.baseSize
            )
            continue
          }

          // Language filter. MOTION.md: filtered-out spheres SHRINK to 0.25
          // and 15% — they never vanish, so the shape of the universe stays
          // legible.
          const lang = d.repo.language
          const matches = !filter || (lang && lang.toLowerCase() === filter.toLowerCase())
          const targetFilterScale = matches ? 1 : 0.25
          const targetFade = (matches ? 1 : 0.15) * dimAll

          const isHovered = hoveredRef.current === i && matches
          const targetHover = isHovered ? HOVER_SCALE : 1

          if (reduced) {
            d.filterScale = targetFilterScale
            d.fade = targetFade
            d.hoverScale = targetHover
          } else {
            // ~300ms to the filter target, ~120ms to the hover target
            d.filterScale += (targetFilterScale - d.filterScale) * Math.min(1, dt * 8)
            d.fade += (targetFade - d.fade) * Math.min(1, dt * 8)
            d.hoverScale += (targetHover - d.hoverScale) * Math.min(1, dt * 16)
          }

          field.setTransform(
            i,
            d.position,
            Math.max(0.0001, d.baseSize * d.hoverScale * d.filterScale)
          )
          field.setFade(i, d.fade, isHovered ? 1 : 0)
        }

        field.commit()

        // Labels ride the same transforms as the nodes they sit on, and fade
        // out once a node is too small on screen for the text to be legible.
        const labels = labelRef.current
        if (labels) {
          for (let i = 0; i < data.length; i++) {
            const d = data[i]
            const s = d.baseSize * d.hoverScale * d.filterScale
            // Apparent size in world units per screen pixel: below ~14px the
            // code turns to mush, so it fades rather than crowding the frame.
            const distance = camera.position.distanceTo(d.position)
            const legible = clamp01((s / distance) * 62 - 0.22)
            labels.set(i, d.position, d.code, s * 1.05, d.fade * legible, s)
          }
          labels.commit()
          labels.mesh.rotation.y = field.mesh.rotation.y
        }

        const wire = wireRef.current
        if (wire) {
          wire.segments.rotation.y = field.mesh.rotation.y
          wire.setOpacity(0.16 * (selectedRef.current ? SELECTED_DIM : 1))
        }

        field.mesh.rotation.y += AMBIENT_DRIFT * 0.35 * dt * driftScale

        if (entering) {
          labelRef.current?.commit()
          wireRef.current?.setOpacity(0.16 * clamp01(t / 0.8))
        }

        if (entering && (allIn || reduced)) {
          phaseRef.current = 'settled'
          phaseStartRef.current = now
          onSettled?.()
        }
      }

      /* Hover ring */
      const ring = ringRef.current
      if (ring) {
        const i = hoveredRef.current
        if (field && i >= 0 && data[i]) {
          const d = data[i]
          // The field rotates as a group; the ring lives in world space.
          field.mesh.updateMatrixWorld()
          const worldPos = d.position.clone().applyMatrix4(field.mesh.matrixWorld)
          ring.show(worldPos, d.baseSize * d.hoverScale * d.filterScale, camera, d.alive)
          ring.fade(dt, 1)
        } else {
          ring.fade(dt, 0)
        }
      }

      renderer.render(scene, camera)

      // Two numbers that prove claims rather than asserting them: the draw
      // call count (instancing) and a monotonic frame counter (which is how
      // the tab-hidden pause is verified — a counter that stops advancing).
      window.__vizDrawCalls = renderer.info.render.calls
      window.__vizFrames = (window.__vizFrames || 0) + 1

      const work = workTimesRef.current
      work.push(performance.now() - workStart)
      if (work.length > 240) work.shift()
    }

    /* Tab hidden: stop rendering entirely. The loop used to run forever in a
       background tab, burning a core for a scene nobody could see. */
    const onVisibility = () => {
      if (document.hidden) {
        running = false
        if (raf) cancelAnimationFrame(raf)
        raf = null
      } else if (!running) {
        running = true
        lastFrame = performance.now() / 1000
        animate()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    animate()

    return () => {
      running = false
      document.removeEventListener('visibilitychange', onVisibility)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [scene, renderer, camera, onSettled])

  /* ── Frame stats ─────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!onFrameStats) return
    const id = setInterval(() => {
      const times = [...frameTimesRef.current].sort((a, b) => a - b)
      const work = [...workTimesRef.current].sort((a, b) => a - b)
      if (times.length < 30) return
      const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))]
      onFrameStats({
        samples: times.length,
        median: q(times, 0.5),
        p95: q(times, 0.95),
        worst: times[times.length - 1],
        workMedian: work.length ? q(work, 0.5) : null,
        workP95: work.length ? q(work, 0.95) : null
      })
    }, 1000)
    return () => clearInterval(id)
  }, [onFrameStats])

  /* ── Typing dims the demo galaxy ─────────────────────────────────────── */

  useEffect(() => {
    if (isTyping && phaseRef.current === 'ambient') phaseRef.current = 'dimming'
  }, [isTyping])

  /* ── Picking ─────────────────────────────────────────────────────────── */

  const pick = useCallback(
    (clientX, clientY) => {
      const field = fieldRef.current
      if (!camera || !field) return -1
      mouseRef.current.x = (clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(clientY / window.innerHeight) * 2 + 1
      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      const hits = raycasterRef.current.intersectObject(field.mesh)
      if (hits.length === 0) return -1

      const i = hits[0].instanceId
      const d = dataRef.current[i]
      if (!d) return -1

      // Filtered-out spheres are still on screen at 25%. They must not be
      // pickable, or hover would report a repository the filter excluded.
      const f = filterRef.current
      if (f) {
        const lang = d.repo.language
        if (!lang || lang.toLowerCase() !== f.toLowerCase()) return -1
      }
      return i
    },
    [camera]
  )

  /* ── Interaction ─────────────────────────────────────────────────────── */

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let moveTimer = null
    const noteInput = () => {
      lastInputRef.current = performance.now() / 1000
    }

    const onMove = (e) => {
      noteInput()
      clearTimeout(moveTimer)
      moveTimer = setTimeout(() => {
        const i = pick(e.clientX, e.clientY)
        hoveredRef.current = i
        document.body.style.cursor = i >= 0 ? 'pointer' : 'default'
        setHovered(i >= 0 ? dataRef.current[i].repo : null)
      }, 40)
    }

    const onLeave = () => {
      clearTimeout(moveTimer)
      hoveredRef.current = -1
      document.body.style.cursor = 'default'
      setHovered(null)
    }

    const onClick = (e) => {
      noteInput()
      const i = pick(e.clientX, e.clientY)
      if (i >= 0) onRepoClick({ repo: dataRef.current[i].repo })
    }

    let pinchStart = 0
    const onTouchStart = (e) => {
      noteInput()
      if (e.touches.length === 2) {
        pinchStart = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
      }
    }
    const onTouchMove = (e) => {
      noteInput()
      if (e.touches.length !== 2 || !camera) return
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      camera.position.multiplyScalar(1 - (d - pinchStart) * 0.001)
      pinchStart = d
    }
    const onTouchEnd = (e) => {
      if (e.touches.length !== 0) return
      const touch = e.changedTouches[0]
      const i = pick(touch.clientX, touch.clientY)
      if (i >= 0) onRepoClick({ repo: dataRef.current[i].repo })
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    el.addEventListener('click', onClick)
    el.addEventListener('touchstart', onTouchStart)
    el.addEventListener('touchmove', onTouchMove)
    el.addEventListener('touchend', onTouchEnd)
    window.addEventListener('pointerdown', noteInput)
    window.addEventListener('wheel', noteInput, { passive: true })

    return () => {
      clearTimeout(moveTimer)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('click', onClick)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('pointerdown', noteInput)
      window.removeEventListener('wheel', noteInput)
    }
  }, [pick, onRepoClick, camera])

  /* ── Keyboard ────────────────────────────────────────────────────────── */

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      lastInputRef.current = performance.now() / 1000

      const data = dataRef.current
      if (e.key === 'Tab' && data.length > 0) {
        e.preventDefault()
        const step = e.shiftKey ? -1 : 1
        currentIndexRef.current = (currentIndexRef.current + step + data.length) % data.length
        onRepoClick({ repo: data[currentIndexRef.current].repo })
      }
      if ((e.key === '+' || e.key === '=') && camera) {
        e.preventDefault()
        camera.position.multiplyScalar(0.9)
      }
      if ((e.key === '-' || e.key === '_') && camera) {
        e.preventDefault()
        camera.position.multiplyScalar(1.1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onRepoClick, camera])

  /* ── Camera framing ──────────────────────────────────────────────────── */

  /**
   * Frame the ambient galaxy.
   *
   * The generator builds a thick disc. Viewed straight down its own axis that
   * projects to a thin band, so the camera sits above the plane and looks
   * down at it.
   */
  function frameAmbient(cam) {
    const RADIUS = 34
    const THICKNESS = 8
    const portrait = cam.aspect < 1
    const fov = (cam.fov * Math.PI) / 180

    // A shallow tilt collapses the disc into a stripe on a tall viewport, so
    // portrait looks further down on to it.
    const tilt = portrait ? 0.95 : 0.42

    const projectedHalfHeight = RADIUS * Math.sin(tilt) + THICKNESS / 2
    const fitH = projectedHalfHeight / (portrait ? 0.62 : 0.52) / Math.tan(fov / 2)
    // Portrait deliberately crops width: a galaxy running past the edges reads
    // better than a small one floating in the middle.
    const fitW = RADIUS / (portrait ? 1.4 : 0.6) / Math.tan(fov / 2) / cam.aspect
    const dist = Math.max(fitH, fitW)

    cam.position.set(0, Math.sin(tilt) * dist, Math.cos(tilt) * dist)
    cam.lookAt(0, 0, 0)
    cam.near = 0.1
    cam.far = dist * 8
    cam.updateProjectionMatrix()
    cameraDistRef.current = dist
    if (controlsRef.current) controlsRef.current.target.set(0, 0, 0)
  }

  /**
   * Frame the universe.
   *
   * Two bugs lived here. The old code set only `camera.position.z` and left
   * x/y at 0, then looked at a bounding-box centre it was not aligned with —
   * an off-axis projection that pushed the cluster into a corner. And it used
   *   dist = max(fitHeight, fitWidth, size.z)
   * which compares a DEPTH extent against fit DISTANCES; depth won every time
   * and parked the camera twice as far back as framing needed.
   */
  function frameCamera(cam, rend) {
    const box = new THREE.Box3()
    const v = new THREE.Vector3()

    for (const d of dataRef.current) {
      box.expandByPoint(v.copy(d.position).addScalar(d.baseSize))
      box.expandByPoint(v.copy(d.position).subScalar(d.baseSize))
    }

    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    const fov = (cam.fov * Math.PI) / 180
    const halfTan = Math.tan(fov / 2)

    // Frame the NEAR face of the cloud, not its centre plane. Framing the
    // centre leaves the nearest spheres far closer to the camera than the fit
    // assumed, so they balloon and spill past the edges — which is exactly
    // what a depth-unaware fit produced here.
    const pad = 1.06
    const fitHeight = (size.y * pad) / 2 / halfTan
    const fitWidth = (size.x * pad) / 2 / halfTan / cam.aspect
    const dist = size.z / 2 + Math.max(fitHeight, fitWidth)

    cameraDistRef.current = dist

    cam.position.set(center.x, center.y, center.z + dist)
    cam.near = Math.max(0.1, dist / 500)
    cam.far = dist * 12
    cam.updateProjectionMatrix()

    controlsRef.current?.dispose()
    const ctrl = new OrbitControls(cam, rend.domElement)
    ctrl.enableDamping = true
    ctrl.dampingFactor = 0.06
    ctrl.autoRotate = false // drift is driven by the render loop, per MOTION.md
    ctrl.target.copy(center)
    ctrl.update()
    controlsRef.current = ctrl
  }

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <>
      {/* The scene sits at z-index 0 (see App.css .scene). It used to be
          position:fixed with no z-index, which painted it over the header and
          made the whole app read as a blank page. */}
      <div
        ref={containerRef}
        className="scene"
        role="application"
        aria-label="3D GitHub repository visualization. Tab cycles repositories, +/- zooms, drag to orbit."
        tabIndex={0}
      />

      {/* useThreeScene has always detected missing WebGL and set this error,
          but nothing ever rendered it — a visitor without WebGL saw a silent
          empty page. Errors are text in this system, never choreography. */}
      {sceneError && (
        <div className="scene-error" role="alert">
          <p className="sig-say" data-tone="error">
            {sceneError}
          </p>
        </div>
      )}

      {/* Hover readout. A fixed slot, never a tooltip chasing the cursor in
          3D — that jitters. */}
      {hovered && (
        <div className="hover-slot" role="status">
          <span className="hover-name">{hovered.name}</span>
          <span className="hover-meta">
            {hovered.language || 'other'}
            {' · '}
            <span className="sig-key">
              {(hovered.stargazers_count || 0).toLocaleString()}
            </span>{' '}
            stars
          </span>
        </div>
      )}
    </>
  )
}
