import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
// three ships OrbitControls itself; three-stdlib was a second copy of it.
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useThreeScene } from '../hooks/useThreeScene'
import { getLanguageInfo } from '../utils/colors'
import '../styles/Tooltip.css'

/**
 * easeOutBack easing for entrance animations
 * Overshoots slightly then settles — gives a satisfying "pop" feel
 */
function easeOutBack(t) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export default function Visualizer({ repos, onRepoClick, detectedLanguages = [] }) {
  const containerRef = useRef(null)
  const { scene, camera, renderer, error: sceneError } = useThreeScene(containerRef)

  const spheresRef = useRef([])
  const visibleSpheresRef = useRef([])
  const geometriesRef = useRef([])
  const sphereGroupRef = useRef(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const hoveredSphereRef = useRef(null)

  // Pre-allocate reusable objects for animation loop (avoid GC pressure)
  const frustumRef = useRef(new THREE.Frustum())
  const projScreenMatrixRef = useRef(new THREE.Matrix4())

  // Keyboard navigation state
  const keyStateRef = useRef({})
  const currentRepoIndexRef = useRef(-1)

  // Tooltip state
  const [tooltip, setTooltip] = useState(null)

  // Touch state
  const lastTouchDistanceRef = useRef(0)

  // Filtered language
  const [filteredLanguage, setFilteredLanguage] = useState(null)

  // Controls reference
  const controlsRef = useRef(null)

  // Entrance animation state
  const entranceStartRef = useRef(null)
  const entranceCompleteRef = useRef(false)
  const ENTRANCE_DURATION = 1.5 // seconds
  const ENTRANCE_STAGGER = 0.02 // seconds between each sphere

  // Hover animation state
  const hoverScaleRef = useRef({}) // { sphereIndex: currentScale }

  // Create the debounced hover check ONCE (not per mousemove)
  const debouncedHoverCheckRef = useRef(null)

  // Stable debounced hover handler
  const performHoverCheck = useCallback((event) => {
    if (!camera || !containerRef.current) return

    raycasterRef.current.setFromCamera(mouseRef.current, camera)
    const targets = visibleSpheresRef.current.length > 0
      ? visibleSpheresRef.current
      : spheresRef.current
    const intersects = raycasterRef.current.intersectObjects(targets)

    // Reset previous hover
    if (hoveredSphereRef.current) {
      hoveredSphereRef.current = null
    }

    if (intersects.length > 0) {
      const sphere = intersects[0].object
      const repo = sphere.userData.repo
      hoveredSphereRef.current = sphere
      document.body.style.cursor = 'pointer'

      // Smart tooltip positioning — flip if near edges
      const padding = 20
      const tooltipWidth = 260
      const tooltipHeight = 100
      let x = event.clientX + padding
      let y = event.clientY - 10

      if (x + tooltipWidth > window.innerWidth) {
        x = event.clientX - tooltipWidth - padding
      }
      if (y + tooltipHeight > window.innerHeight) {
        y = window.innerHeight - tooltipHeight - padding
      }
      if (y < padding) {
        y = padding
      }

      setTooltip({
        x,
        y,
        name: repo.name,
        stars: repo.stargazers_count,
        language: repo.language || 'Unknown',
        description: repo.description
          ? (repo.description.length > 80
            ? repo.description.slice(0, 80) + '…'
            : repo.description)
          : null
      })
    } else {
      document.body.style.cursor = 'default'
      setTooltip(null)
    }
  }, [camera])

  // Create sphere meshes from positioned repos
  useEffect(() => {
    if (!repos || !scene || repos.length === 0) return

    // CLEANUP: Remove and dispose previous spheres
    if (sphereGroupRef.current) {
      sphereGroupRef.current.children.forEach((sphere) => {
        // Materials are per-sphere (opacity and emissive vary independently),
        // so each one is disposed here. The geometry is SHARED by every sphere
        // and is disposed once, via geometriesRef below.
        sphere.material?.dispose()
      })
      scene.remove(sphereGroupRef.current)
    }
    sphereGroupRef.current = null
    geometriesRef.current.forEach((g) => g.dispose())
    geometriesRef.current = []
    spheresRef.current = []

    // Reset entrance animation
    entranceStartRef.current = null
    entranceCompleteRef.current = false
    hoverScaleRef.current = {}

    // Create group for all spheres
    const sphereGroup = new THREE.Group()
    sphereGroupRef.current = sphereGroup
    scene.add(sphereGroup)

    // Determine geometry detail level (LOD) based on repo count
    const detail = repos.length > 150 ? 1 : repos.length > 50 ? 2 : 4

    // ONE unit-radius geometry for every sphere.
    //
    // This previously built a geometry at radius `size` AND set the mesh scale
    // to `size`, so the rendered radius was size SQUARED: a 0.3 repo shrank to
    // 0.09 (invisible) while a 4.0 repo ballooned to 16 (a screen-filling blob
    // that swallowed its neighbours). Nobody had seen it because the scene only
    // renders after a successful search, and headless Chromium has no WebGL, so
    // every automated check of this project had been looking at an empty canvas.
    //
    // Unit geometry + per-mesh scale is also what S5 needs for InstancedMesh.
    const geometry = new THREE.IcosahedronGeometry(1, detail)
    geometriesRef.current.push(geometry)

    repos.forEach((repoData, index) => {
      const { repo, position, size } = repoData
      const { color } = getLanguageInfo(repo.language)

      // Each sphere gets its OWN material (so opacity/emissive can vary independently)
      const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: new THREE.Color(color).multiplyScalar(0.3),
        shininess: 100,
        side: THREE.FrontSide,
        wireframe: false,
        transparent: true,
        opacity: 0 // Start invisible for entrance animation
      })

      // Create mesh
      const sphere = new THREE.Mesh(geometry, material)
      sphere.position.set(position.x, position.y, position.z)
      sphere.userData = { repo, index, baseSize: size }
      sphere.castShadow = false
      sphere.receiveShadow = false

      // Start at scale 0 for entrance animation
      sphere.scale.set(0, 0, 0)

      sphereGroup.add(sphere)
      spheresRef.current.push(sphere)
    })

    // Apply language filter if set
    updateLanguageFilter(filteredLanguage)

    // Auto-position camera based on sphere spread
    if (spheresRef.current.length > 0) {
      const boundingBox = new THREE.Box3().setFromObject(sphereGroup)
      const size = boundingBox.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = camera.fov * (Math.PI / 180)
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))

      cameraZ = Math.max(cameraZ, 80)
      camera.position.z = cameraZ

      const center = boundingBox.getCenter(new THREE.Vector3())
      camera.lookAt(center)

      // Setup OrbitControls
      if (controlsRef.current) {
        controlsRef.current.dispose()
      }
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.autoRotate = true
      controls.autoRotateSpeed = 2
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.enableZoom = true
      controls.zoomSpeed = 1.2
      controls.target.copy(center)
      controls.update()
      controlsRef.current = controls

      return () => controls.dispose()
    }
  }, [repos, scene, renderer, camera, filteredLanguage])

  // Animation loop — optimized: no per-frame allocations
  useEffect(() => {
    if (!scene || !renderer || !camera || spheresRef.current.length === 0) return

    let animationFrameId
    const frustum = frustumRef.current
    const projScreenMatrix = projScreenMatrixRef.current

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const now = performance.now() / 1000

      // Initialize entrance timer on first frame
      if (entranceStartRef.current === null) {
        entranceStartRef.current = now
      }
      const entranceElapsed = now - entranceStartRef.current

      // Update controls
      if (controlsRef.current) {
        controlsRef.current.update()
      }

      // Viewport Culling — reuse pre-allocated objects
      projScreenMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      )
      frustum.setFromProjectionMatrix(projScreenMatrix)

      // Process each sphere
      visibleSpheresRef.current = []

      spheresRef.current.forEach((sphere, i) => {
        const inFrustum = frustum.containsPoint(sphere.position)
        const matchesLanguage =
          !filteredLanguage ||
          sphere.userData.repo.language?.toLowerCase() === filteredLanguage.toLowerCase()

        // Visibility
        sphere.visible = true // keep visible for fade effects
        if (!inFrustum) {
          sphere.visible = false
          return
        }

        // Language filter: fade non-matching
        if (filteredLanguage && !matchesLanguage) {
          sphere.material.opacity = 0.08
          return
        }

        // Track visible spheres for raycasting
        visibleSpheresRef.current.push(sphere)

        const baseSize = sphere.userData.baseSize || 1

        // --- Entrance animation ---
        if (!entranceCompleteRef.current) {
          const sphereDelay = i * ENTRANCE_STAGGER
          const sphereProgress = Math.max(0, Math.min(1,
            (entranceElapsed - sphereDelay) / 0.6
          ))
          const easedProgress = easeOutBack(sphereProgress)

          sphere.material.opacity = sphereProgress
          const entranceScale = easedProgress * baseSize
          sphere.scale.set(entranceScale, entranceScale, entranceScale)

          // Check if all spheres have finished entrance
          if (entranceElapsed > ENTRANCE_DURATION + spheresRef.current.length * ENTRANCE_STAGGER) {
            entranceCompleteRef.current = true
          }
          return // Skip idle animation during entrance
        }

        // --- Idle animation (post-entrance) ---
        sphere.material.opacity = 1.0

        // Gentle self-rotation
        sphere.rotation.x += 0.003
        sphere.rotation.y += 0.006

        // Subtle breathing pulse
        const pulse = Math.sin(now * 1.5 + i * 0.15) * 0.05 + 1

        // Hover scale — smooth lerp toward target
        const isHovered = hoveredSphereRef.current === sphere
        const targetHoverScale = isHovered ? 1.25 : 1.0
        const currentHoverScale = hoverScaleRef.current[i] || 1.0
        const newHoverScale = currentHoverScale + (targetHoverScale - currentHoverScale) * 0.12
        hoverScaleRef.current[i] = newHoverScale

        // Emissive glow on hover (smooth lerp)
        const targetEmissive = isHovered ? 0.8 : 0.3
        const currentEmissive = sphere.material.emissive.r / (sphere.material.color.r || 1)
        const newEmissive = currentEmissive + (targetEmissive - currentEmissive) * 0.1
        sphere.material.emissive.copy(sphere.material.color).multiplyScalar(newEmissive)

        const finalScale = baseSize * pulse * newHoverScale
        sphere.scale.set(finalScale, finalScale, finalScale)
      })

      // Slow group rotation
      if (sphereGroupRef.current) {
        sphereGroupRef.current.rotation.y += 0.00003
      }

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [scene, renderer, camera, repos, filteredLanguage])

  // Keyboard Navigation — sequential Tab cycling
  useEffect(() => {
    const handleKeyDown = (e) => {
      keyStateRef.current[e.key] = true

      if (e.key === 'Tab' && spheresRef.current.length > 0) {
        e.preventDefault()
        // Sequential cycling (not random)
        if (e.shiftKey) {
          currentRepoIndexRef.current =
            (currentRepoIndexRef.current - 1 + spheresRef.current.length) % spheresRef.current.length
        } else {
          currentRepoIndexRef.current =
            (currentRepoIndexRef.current + 1) % spheresRef.current.length
        }
        const sphere = spheresRef.current[currentRepoIndexRef.current]
        if (sphere) {
          onRepoClick(sphere.userData)
        }
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        if (controlsRef.current) {
          controlsRef.current.object.zoom *= 1.1
          controlsRef.current.object.updateProjectionMatrix()
        }
      }

      if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        if (controlsRef.current) {
          controlsRef.current.object.zoom /= 1.1
          controlsRef.current.object.updateProjectionMatrix()
        }
      }

      if (e.key === 'Escape') {
        keyStateRef.current['Escape'] = true
      }
    }

    const handleKeyUp = (e) => {
      keyStateRef.current[e.key] = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [onRepoClick])

  // Hover Tooltips — debounce is created ONCE, not per mousemove
  useEffect(() => {
    if (!containerRef.current) return

    let debounceTimeout = null

    const handleMouseMove = (event) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1

      // Proper debounce: clear previous timeout, set new one
      clearTimeout(debounceTimeout)
      debounceTimeout = setTimeout(() => performHoverCheck(event), 50)
    }

    const handleMouseLeave = () => {
      clearTimeout(debounceTimeout)
      hoveredSphereRef.current = null
      document.body.style.cursor = 'default'
      setTooltip(null)
    }

    const el = containerRef.current
    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      clearTimeout(debounceTimeout)
      el?.removeEventListener('mousemove', handleMouseMove)
      el?.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [performHoverCheck])

  // Click handler
  useEffect(() => {
    if (!containerRef.current) return

    const handleClick = (event) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      const targets = visibleSpheresRef.current.length > 0
        ? visibleSpheresRef.current
        : spheresRef.current
      const intersects = raycasterRef.current.intersectObjects(targets)

      if (intersects.length > 0) {
        const repoData = intersects[0].object.userData
        onRepoClick(repoData)
      }
    }

    const el = containerRef.current
    el.addEventListener('click', handleClick)
    return () => {
      el?.removeEventListener('click', handleClick)
    }
  }, [camera, onRepoClick])

  // Touch Controls
  useEffect(() => {
    if (!containerRef.current) return

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastTouchDistanceRef.current = Math.sqrt(dx * dx + dy * dy)
      }
    }

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && controlsRef.current) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const delta = distance - lastTouchDistanceRef.current

        const zoomDelta = delta * 0.01
        controlsRef.current.object.zoom += zoomDelta
        controlsRef.current.object.updateProjectionMatrix()
        lastTouchDistanceRef.current = distance
      }
    }

    const handleTouchEnd = (e) => {
      if (e.touches.length === 0) {
        const touch = e.changedTouches[0]
        mouseRef.current.x = (touch.clientX / window.innerWidth) * 2 - 1
        mouseRef.current.y = -(touch.clientY / window.innerHeight) * 2 + 1

        raycasterRef.current.setFromCamera(mouseRef.current, camera)
        const targets = visibleSpheresRef.current.length > 0
          ? visibleSpheresRef.current
          : spheresRef.current
        const intersects = raycasterRef.current.intersectObjects(targets)

        if (intersects.length > 0) {
          const repoData = intersects[0].object.userData
          onRepoClick(repoData)
        }
      }
    }

    const el = containerRef.current
    el.addEventListener('touchstart', handleTouchStart)
    el.addEventListener('touchmove', handleTouchMove)
    el.addEventListener('touchend', handleTouchEnd)

    return () => {
      el?.removeEventListener('touchstart', handleTouchStart)
      el?.removeEventListener('touchmove', handleTouchMove)
      el?.removeEventListener('touchend', handleTouchEnd)
    }
  }, [camera, onRepoClick])

  // Function to update language filter
  const updateLanguageFilter = (language) => {
    setFilteredLanguage(language)
  }

  return (
    <>
      {/* The scene sits at z-index 0 (see App.css .scene). It used to be
          position:fixed with no z-index, which painted it over the header and
          made the whole app read as a blank page. */}
      <div
        ref={containerRef}
        className="scene"
        role="application"
        aria-label="3D GitHub repository visualization. Use Tab to cycle through repositories, +/- to zoom, mouse to orbit."
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

      {/* Enhanced Tooltip */}
      {tooltip && (
        <div
          className="tooltip"
          role="tooltip"
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 1000
          }}
        >
          <div className="tooltip-name">{tooltip.name}</div>
          {tooltip.language && (
            <div className="tooltip-language">{tooltip.language}</div>
          )}
          {tooltip.description && (
            <div className="tooltip-desc">{tooltip.description}</div>
          )}
          <div className="tooltip-stars">{tooltip.stars.toLocaleString()} stars</div>
        </div>
      )}
    </>
  )
}
