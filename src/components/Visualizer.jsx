import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
// three ships OrbitControls itself; three-stdlib was a second copy of it.
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useThreeScene } from '../hooks/useThreeScene'
import { getLanguageInfo } from '../utils/colors'
import { generateAmbientGalaxy } from '../scene/ambientGalaxy'
import { easeOutCubic, easeOutQuad, clamp01 } from '../scene/easing'
import '../styles/Tooltip.css'

/**
 * Visualizer — the scene, and the motion state machine that drives it.
 *
 * Implements MOTION.md. The app's original failure was that nothing moved
 * until a search succeeded, and for most visitors nothing ever did. So the
 * scene now has something in it from the first frame:
 *
 *   ambient   seeded placeholder galaxy, dimmed, drifting. No API call.
 *   dimming   visitor started typing; the galaxy eases back to 25%
 *   dissolve  a search succeeded; placeholders scale to 0 over 400ms while
 *             the camera pulls back 15% — the space "opens" to receive data
 *   entering  real repositories GROW at their final coordinates, largest
 *             first, 25ms apart. They do not fly in.
 *   settled   ambient drift resumes
 *
 * prefers-reduced-motion collapses every one of these to instant placement
 * with no drift, and the scene stays fully readable.
 */

/* Timings — all from MOTION.md, in seconds. */
const AMBIENT_STAGGER = 0.015
const AMBIENT_GROW = 0.5
const AMBIENT_DRIFT = 0.03 // rad/s
const AMBIENT_DIM = 0.5
const AMBIENT_DIM_TYPING = 0.25
const DISSOLVE = 0.4
const CAMERA_PULLBACK = 0.6
const CAMERA_PULLBACK_FACTOR = 1.15
const ENTRANCE_STAGGER = 0.025
const ENTRANCE_GROW = 0.45
const ENTRANCE_STAGGER_CAP = 100
const IDLE_AFTER = 60 // seconds untouched before drift halves

// --text-secondary. Bright enough that 50% opacity still reads on #050505;
// --text-dim was correct as a token but disappeared once dimmed.
const AMBIENT_COLOR = 0x98928a

export default function Visualizer({
  repos,
  onRepoClick,
  filteredLanguage = null,
  isTyping = false,
  onSettled
}) {
  const containerRef = useRef(null)
  const { scene, camera, renderer, error: sceneError, ready } = useThreeScene(containerRef)

  const groupRef = useRef(null)
  const ambientGroupRef = useRef(null)
  const spheresRef = useRef([])
  const ambientRef = useRef([])
  const geometryRef = useRef(null)
  const ambientGeometryRef = useRef(null)
  const ambientMaterialRef = useRef(null)
  const controlsRef = useRef(null)

  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const hoveredRef = useRef(null)
  const frustumRef = useRef(new THREE.Frustum())
  const projMatrixRef = useRef(new THREE.Matrix4())

  const currentIndexRef = useRef(-1)
  const [hovered, setHovered] = useState(null)

  /** The motion state machine. Refs, not state — the render loop reads it. */
  const phaseRef = useRef('ambient')
  const phaseStartRef = useRef(0)
  const lastInputRef = useRef(0)
  const cameraDistRef = useRef(80)
  const reducedMotionRef = useRef(false)

  /** The active language filter, read by the render loop. A ref rather than a
      dep so changing the filter never tears down the loop or the scene. */
  const filterRef = useRef(filteredLanguage)
  filterRef.current = filteredLanguage

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

  /* ── Ambient galaxy ───────────────────────────────────────────────────
     Built once, as soon as the renderer exists. No API call, works offline,
     never rate-limits. */

  useEffect(() => {
    if (!scene || !ready) return

    const items = generateAmbientGalaxy()
    const geometry = new THREE.IcosahedronGeometry(1, 2)
    ambientGeometryRef.current = geometry

    // ONE shared material: the ambient spheres always fade together, so they
    // never need independent opacity. 72 spheres, 1 material.
    const material = new THREE.MeshPhongMaterial({
      color: AMBIENT_COLOR,
      emissive: new THREE.Color(AMBIENT_COLOR).multiplyScalar(0.25),
      shininess: 20,
      transparent: true,
      opacity: 0,
      depthWrite: false
    })
    ambientMaterialRef.current = material

    const group = new THREE.Group()
    ambientGroupRef.current = group
    scene.add(group)

    ambientRef.current = items.map((item, i) => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(item.position.x, item.position.y, item.position.z)
      mesh.scale.setScalar(reducedMotionRef.current ? item.size : 0)
      mesh.userData = { size: item.size, order: i }
      group.add(mesh)
      return mesh
    })

    // Frame it. A disc viewed straight down its own axis is a thin band —
    // the camera has to sit ABOVE the plane for it to read as a galaxy.
    if (camera && !spheresRef.current.length) {
      frameAmbient(camera)
    }

    phaseRef.current = 'ambient'
    phaseStartRef.current = performance.now() / 1000

    return () => {
      scene.remove(group)
      geometry.dispose()
      material.dispose()
      ambientRef.current = []
      ambientGroupRef.current = null
    }
  }, [scene, ready, camera])

  /* ── Real repositories ────────────────────────────────────────────────
     Positioned at final coordinates from frame one. Things GROW here; they
     do not fly. */

  useEffect(() => {
    if (!scene || !camera || !renderer) return

    // Tear down the previous universe.
    if (groupRef.current) {
      groupRef.current.children.forEach((m) => m.material?.dispose())
      scene.remove(groupRef.current)
      groupRef.current = null
    }
    geometryRef.current?.dispose()
    geometryRef.current = null
    spheresRef.current = []
    hoveredRef.current = null
    currentIndexRef.current = -1

    if (!repos || repos.length === 0) {
      // Back to the ambient galaxy — a failed or cleared search must not
      // leave a dead canvas.
      if (ambientGroupRef.current) {
        phaseRef.current = 'ambient'
        phaseStartRef.current = performance.now() / 1000
      }
      return
    }

    const group = new THREE.Group()
    groupRef.current = group
    scene.add(group)

    const detail = repos.length > 150 ? 1 : repos.length > 50 ? 2 : 4

    // One shared unit-radius geometry; per-mesh scale carries the size.
    const geometry = new THREE.IcosahedronGeometry(1, detail)
    geometryRef.current = geometry

    // Largest first — MOTION.md wants the big shapes to establish the form
    // before the detail arrives.
    const ordered = [...repos].sort((a, b) => b.size - a.size)

    spheresRef.current = ordered.map((data, order) => {
      const { repo, position, size } = data
      const { color } = getLanguageInfo(repo.language)

      const material = new THREE.MeshPhongMaterial({
        color,
        emissive: new THREE.Color(color).multiplyScalar(0.28),
        shininess: 90,
        transparent: true,
        opacity: 0
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(position.x, position.y, position.z)
      mesh.scale.setScalar(reducedMotionRef.current ? size : 0)
      mesh.userData = { repo, order, baseSize: size, hoverScale: 1, filterScale: 1 }
      group.add(mesh)
      return mesh
    })

    frameCamera(group, camera, renderer, controlsRef)

    phaseRef.current = reducedMotionRef.current ? 'settled' : 'dissolving'
    phaseStartRef.current = performance.now() / 1000

    if (reducedMotionRef.current) {
      spheresRef.current.forEach((m) => (m.material.opacity = 1))
      if (ambientMaterialRef.current) ambientMaterialRef.current.opacity = 0
      onSettled?.()
    }
  }, [repos, scene, camera, renderer, onSettled])

  /* ── The render loop ──────────────────────────────────────────────────── */

  useEffect(() => {
    if (!scene || !renderer || !camera) return

    let raf
    let lastFrame = performance.now() / 1000
    const frustum = frustumRef.current
    const projMatrix = projMatrixRef.current

    const animate = () => {
      raf = requestAnimationFrame(animate)

      const now = performance.now() / 1000
      const dt = Math.min(0.1, now - lastFrame)
      lastFrame = now
      const t = now - phaseStartRef.current
      const phase = phaseRef.current
      const reduced = reducedMotionRef.current

      controlsRef.current?.update()

      projMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      frustum.setFromProjectionMatrix(projMatrix)

      const ambientMat = ambientMaterialRef.current
      const ambientGroup = ambientGroupRef.current

      /* ── Ambient galaxy ── */
      if (ambientGroup && ambientMat) {
        if (phase === 'ambient' || phase === 'dimming') {
          const target = phase === 'dimming' ? AMBIENT_DIM_TYPING : AMBIENT_DIM

          if (reduced) {
            ambientMat.opacity = target
            ambientRef.current.forEach((m) => m.scale.setScalar(m.userData.size))
          } else {
            // Stream in, centre outward, 15ms apart.
            let allGrown = true
            ambientRef.current.forEach((mesh) => {
              const delay = mesh.userData.order * AMBIENT_STAGGER
              const p = clamp01((t - delay) / AMBIENT_GROW)
              if (p < 1) allGrown = false
              mesh.scale.setScalar(easeOutCubic(p) * mesh.userData.size)
            })
            // Opacity follows the whole group, not each sphere, so the
            // dimming transition stays uniform.
            const fade = clamp01(t / 0.4)
            ambientMat.opacity =
              ambientMat.opacity + (target * fade - ambientMat.opacity) * Math.min(1, dt * 6)
            if (allGrown) { /* settled into drift */ }
          }

          // Ambient drift, halved after a long idle.
          const idle = now - lastInputRef.current > IDLE_AFTER
          if (!reduced) {
            ambientGroup.rotation.y += AMBIENT_DRIFT * dt * (idle ? 0.5 : 1)
          }
        } else if (phase === 'dissolving') {
          // Every placeholder scales to 0 over 400ms, staggered.
          const p = clamp01(t / DISSOLVE)
          ambientRef.current.forEach((mesh) => {
            const delay = (mesh.userData.order / ambientRef.current.length) * 0.15
            const q = clamp01((t - delay) / DISSOLVE)
            mesh.scale.setScalar((1 - easeOutCubic(q)) * mesh.userData.size)
          })
          ambientMat.opacity = AMBIENT_DIM_TYPING * (1 - p)
        } else if (ambientMat.opacity !== 0) {
          ambientMat.opacity = 0
          ambientRef.current.forEach((m) => m.scale.setScalar(0))
        }
      }

      /* ── Camera pull-back: the space opens to receive the data ── */
      if (phase === 'dissolving' && !reduced) {
        const p = easeOutQuad(clamp01(t / CAMERA_PULLBACK))
        const target = cameraDistRef.current * CAMERA_PULLBACK_FACTOR
        const from = cameraDistRef.current
        const dist = from + (target - from) * p
        const ctrl = controlsRef.current
        if (ctrl) {
          const dir = camera.position.clone().sub(ctrl.target).normalize()
          camera.position.copy(ctrl.target).addScaledVector(dir, dist)
        }
        if (t >= Math.max(DISSOLVE, CAMERA_PULLBACK)) {
          phaseRef.current = 'entering'
          phaseStartRef.current = now
        }
      }

      /* ── Real repositories ── */
      const spheres = spheresRef.current
      if (spheres.length > 0 && (phase === 'entering' || phase === 'settled')) {
        const entering = phase === 'entering'
        let allIn = true

        for (let i = 0; i < spheres.length; i++) {
          const mesh = spheres[i]
          const base = mesh.userData.baseSize

          if (!frustum.containsPoint(mesh.position)) {
            mesh.visible = false
            continue
          }
          mesh.visible = true

          if (entering && !reduced) {
            // Stagger is capped: beyond 100 spheres the rest arrive on the
            // final beat rather than dragging the sequence out.
            const delay = Math.min(mesh.userData.order, ENTRANCE_STAGGER_CAP) * ENTRANCE_STAGGER
            const p = clamp01((t - delay) / ENTRANCE_GROW)
            if (p < 1) allIn = false
            // ease-out, no overshoot. The old easeOutBack popped past 1.0.
            mesh.scale.setScalar(easeOutCubic(p) * base)
            mesh.material.opacity = p
            continue
          }

          // Language filter. MOTION.md: filtered-out spheres SHRINK to 0.25
          // and 15% opacity — they never vanish, so the shape of the whole
          // universe stays legible. Applying it here rather than by filtering
          // the prop matters: filtering the prop would tear the scene down and
          // replay the entrance every time the filter changed.
          const lang = mesh.userData.repo.language
          const matches =
            !filterRef.current ||
            (lang && lang.toLowerCase() === filterRef.current.toLowerCase())

          const targetOpacity = matches ? 1 : 0.15
          const targetFilterScale = matches ? 1 : 0.25

          if (reduced) {
            mesh.material.opacity = targetOpacity
            mesh.scale.setScalar(base * targetFilterScale)
            continue
          }

          // 300ms to the filter target.
          mesh.userData.filterScale +=
            (targetFilterScale - mesh.userData.filterScale) * Math.min(1, dt * 8)
          mesh.material.opacity +=
            (targetOpacity - mesh.material.opacity) * Math.min(1, dt * 8)

          // Settled: hover response only. No breathing pulse — a scene that
          // never stops moving is a scene where hover reads as noise.
          const isHovered = hoveredRef.current === mesh && matches
          const target = isHovered ? 1.15 : 1
          mesh.userData.hoverScale +=
            (target - mesh.userData.hoverScale) * Math.min(1, dt * 12)
          mesh.scale.setScalar(
            base * mesh.userData.hoverScale * mesh.userData.filterScale
          )

          const emissive = isHovered ? 0.6 : 0.28
          mesh.material.emissive
            .copy(mesh.material.color)
            .multiplyScalar(emissive)
        }

        if (entering && (allIn || reduced)) {
          phaseRef.current = 'settled'
          phaseStartRef.current = now
          onSettled?.()
        }

        // Ambient drift of the real universe, halved after a long idle.
        if (!reduced && groupRef.current) {
          const idle = now - lastInputRef.current > IDLE_AFTER
          groupRef.current.rotation.y += AMBIENT_DRIFT * 0.35 * dt * (idle ? 0.5 : 1)
        }
      }

      renderer.render(scene, camera)
    }

    animate()
    return () => cancelAnimationFrame(raf)
  }, [scene, renderer, camera, onSettled])

  /* ── Typing dims the demo galaxy ──────────────────────────────────────── */

  useEffect(() => {
    if (!isTyping) return
    if (phaseRef.current === 'ambient') {
      phaseRef.current = 'dimming'
      // Keep the clock so spheres that are still growing carry on growing.
    }
  }, [isTyping])

  /* ── Interaction ──────────────────────────────────────────────────────── */

  const pick = useCallback(
    (clientX, clientY) => {
      if (!camera) return null
      mouseRef.current.x = (clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(clientY / window.innerHeight) * 2 + 1
      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      // Filtered-out spheres are still on screen at 25% — they must not be
      // pickable, or hover would report a repository the filter excluded.
      const f = filterRef.current
      const pickable = spheresRef.current.filter((m) => {
        if (!m.visible) return false
        if (!f) return true
        const lang = m.userData.repo.language
        return lang && lang.toLowerCase() === f.toLowerCase()
      })
      const hits = raycasterRef.current.intersectObjects(pickable)
      return hits.length > 0 ? hits[0].object : null
    },
    [camera]
  )

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
        const mesh = pick(e.clientX, e.clientY)
        hoveredRef.current = mesh
        document.body.style.cursor = mesh ? 'pointer' : 'default'
        setHovered(mesh ? mesh.userData.repo : null)
      }, 40)
    }

    const onLeave = () => {
      clearTimeout(moveTimer)
      hoveredRef.current = null
      document.body.style.cursor = 'default'
      setHovered(null)
    }

    const onClick = (e) => {
      noteInput()
      const mesh = pick(e.clientX, e.clientY)
      if (mesh) onRepoClick(mesh.userData)
    }

    let pinchStart = 0
    const onTouchStart = (e) => {
      noteInput()
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        pinchStart = Math.hypot(dx, dy)
      }
    }
    const onTouchMove = (e) => {
      noteInput()
      if (e.touches.length !== 2 || !controlsRef.current) return
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const d = Math.hypot(dx, dy)
      camera.position.multiplyScalar(1 - (d - pinchStart) * 0.001)
      pinchStart = d
    }
    const onTouchEnd = (e) => {
      if (e.touches.length !== 0) return
      const touch = e.changedTouches[0]
      const mesh = pick(touch.clientX, touch.clientY)
      if (mesh) onRepoClick(mesh.userData)
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

  /* ── Keyboard ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      lastInputRef.current = performance.now() / 1000

      const list = spheresRef.current
      if (e.key === 'Tab' && list.length > 0) {
        e.preventDefault()
        const step = e.shiftKey ? -1 : 1
        currentIndexRef.current =
          (currentIndexRef.current + step + list.length) % list.length
        onRepoClick(list[currentIndexRef.current].userData)
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

  /* ── Helpers ──────────────────────────────────────────────────────────── */

  /**
   * Frame the universe.
   *
   * The old code set only `camera.position.z` and left x/y at 0, then looked
   * at a bounding-box centre that is rarely the origin — an off-axis view
   * that projected the cluster into a corner. It also measured the bounding
   * box while every mesh was still scaled to 0, so the box bounded points
   * rather than spheres and the fit came out consistently too tight.
   */
  /**
   * Frame the ambient galaxy.
   *
   * The generator builds a thick disc in the x/z plane. Viewed from the
   * default camera — straight down -z — that projects to a thin horizontal
   * band about 13% of the viewport tall. Lifting the camera above the plane
   * and looking down at it is what makes it read as a galaxy.
   */
  function frameAmbient(cam) {
    const RADIUS = 34
    const THICKNESS = 8
    const portrait = cam.aspect < 1
    const fov = (cam.fov * Math.PI) / 180

    // On a tall viewport a shallow tilt collapses the disc into a thin band,
    // so look further down on to it — the projection becomes round rather
    // than a stripe.
    const tilt = portrait ? 0.95 : 0.42 // ~54deg portrait, ~24deg landscape

    // Frame by the PROJECTED extent, not the radius. Seen from 24 degrees
    // above, a disc of radius 34 is only ~14 units tall on screen; framing by
    // the radius left it filling a third of the viewport.
    const projectedHalfHeight = RADIUS * Math.sin(tilt) + THICKNESS / 2
    const fitH = projectedHalfHeight / (portrait ? 0.62 : 0.52) / Math.tan(fov / 2)
    // Portrait deliberately crops the galaxy's width. A galaxy running past
    // the edges reads better than a small one floating in the middle.
    const fitW = RADIUS / (portrait ? 1.4 : 0.6) / Math.tan(fov / 2) / cam.aspect
    const dist = Math.max(fitH, fitW)

    cam.position.set(0, Math.sin(tilt) * dist, Math.cos(tilt) * dist)
    cam.lookAt(0, 0, 0)
    cam.near = 0.1
    cam.far = dist * 8
    cam.updateProjectionMatrix()
    cameraDistRef.current = dist
  }

  function frameCamera(group, cam, rend, controls) {
    const box = new THREE.Box3()
    const v = new THREE.Vector3()

    group.children.forEach((mesh) => {
      const r = mesh.userData.baseSize || 1
      box.expandByPoint(v.copy(mesh.position).addScalar(r))
      box.expandByPoint(v.copy(mesh.position).subScalar(r))
    })

    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    const fov = (cam.fov * Math.PI) / 180
    const fitHeight = size.y / 2 / Math.tan(fov / 2)
    const fitWidth = size.x / 2 / Math.tan(fov / 2) / cam.aspect

    // Depth is NOT a fitting distance. The previous form was
    //   max(fitHeight, fitWidth, size.z) * 1.25
    // which compared a 68-unit depth extent against ~30-unit fit distances and
    // won every time, parking the camera more than twice as far back as the
    // framing needed and leaving the universe as a small clump in the middle.
    //
    // Fit the cluster's cross-section, then make sure the camera is clear of
    // its depth so the near spheres are not inside the near plane.
    const fit = Math.max(fitHeight, fitWidth) * 1.15
    const dist = Math.max(fit, size.z * 0.7)

    cameraDistRef.current = dist

    // Position RELATIVE to the centre, so the view is on-axis.
    cam.position.set(center.x, center.y, center.z + dist)
    cam.near = Math.max(0.1, dist / 500)
    cam.far = dist * 12
    cam.updateProjectionMatrix()

    controls.current?.dispose()
    const ctrl = new OrbitControls(cam, rend.domElement)
    ctrl.enableDamping = true
    ctrl.dampingFactor = 0.06
    ctrl.autoRotate = false // drift is driven by the render loop, per MOTION.md
    ctrl.target.copy(center)
    ctrl.update()
    controls.current = ctrl
  }

  /* ── Render ───────────────────────────────────────────────────────────── */

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
