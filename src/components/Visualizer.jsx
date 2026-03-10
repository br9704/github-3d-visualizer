import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'
import { useThreeScene } from '../hooks/useThreeScene'
import { getLanguageInfo } from '../utils/colors'
import '../styles/Tooltip.css'

export default function Visualizer({ repos, onRepoClick, detectedLanguages = [] }) {
  const containerRef = useRef(null)
  const { scene, camera, renderer } = useThreeScene(containerRef)

  const spheresRef = useRef([])
  const visibleSpheresRef = useRef([])
  const geometriesRef = useRef([])
  const materialsRef = useRef({})
  const sphereGroupRef = useRef(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const hoveredSphereRef = useRef(null)
  const lastMouseMoveRef = useRef(0)
  
  // Keyboard state
  const keyStateRef = useRef({})
  
  // Tooltip state
  const [tooltip, setTooltip] = useState(null)
  
  // Touch state
  const lastTouchDistanceRef = useRef(0)
  
  // Filtered language
  const [filteredLanguage, setFilteredLanguage] = useState(null)
  
  // Controls reference
  const controlsRef = useRef(null)

  // Debounce utility
  const debounce = (func, wait) => {
    let timeout
    return (...args) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }

  // Create sphere meshes from positioned repos
  useEffect(() => {
    if (!repos || !scene || repos.length === 0) return

    // CLEANUP: Remove and dispose previous spheres
    if (sphereGroupRef.current) {
      sphereGroupRef.current.children.forEach((sphere) => {
        sphere.geometry?.dispose()
      })
      scene.remove(sphereGroupRef.current)
    }
    sphereGroupRef.current = null
    geometriesRef.current.forEach((g) => g.dispose())
    geometriesRef.current = []
    spheresRef.current = []

    // Create group for all spheres
    const sphereGroup = new THREE.Group()
    sphereGroupRef.current = sphereGroup
    scene.add(sphereGroup)

    // Determine geometry detail level (LOD) based on repo count
    const detail = repos.length > 150 ? 1 : repos.length > 50 ? 2 : 4

    // Cache geometries by size to reduce duplication
    const geometriesBySize = {}

    repos.forEach((repoData, index) => {
      const { repo, position, size } = repoData
      const { color } = getLanguageInfo(repo.language)
      const colorHex = '0x' + color.toString(16).padStart(6, '0')

      // OPTIMIZATION: Reuse geometry for same size
      const sizeKey = size.toFixed(2)
      if (!geometriesBySize[sizeKey]) {
        geometriesBySize[sizeKey] = new THREE.IcosahedronGeometry(size, detail)
        geometriesRef.current.push(geometriesBySize[sizeKey])
      }
      const geometry = geometriesBySize[sizeKey]

      // CRITICAL OPTIMIZATION: Reuse material by color
      if (!materialsRef.current[colorHex]) {
        materialsRef.current[colorHex] = new THREE.MeshPhongMaterial({
          color: parseInt(colorHex),
          emissive: new THREE.Color(parseInt(colorHex)).multiplyScalar(0.3),
          shininess: 100,
          side: THREE.FrontSide,
          wireframe: false
        })
      }
      const material = materialsRef.current[colorHex]

      // Create mesh
      const sphere = new THREE.Mesh(geometry, material)
      sphere.position.set(position.x, position.y, position.z)
      sphere.userData = { repo, index }
      sphere.castShadow = false
      sphere.receiveShadow = false

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

  // Animation loop (SPRINT 9+: Viewport culling)
  useEffect(() => {
    if (!scene || !renderer || !camera || spheresRef.current.length === 0) return

    const startTime = Date.now()
    let animationFrameId

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const elapsed = (Date.now() - startTime) / 1000

      // Update controls
      if (controlsRef.current) {
        controlsRef.current.update()
      }

      // SPRINT 11: Viewport Culling - only render visible spheres
      const frustum = new THREE.Frustum()
      frustum.setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(
          camera.projectionMatrix,
          camera.matrixWorldInverse
        )
      )

      // Reset all sphere opacities
      spheresRef.current.forEach((sphere) => {
        sphere.material.opacity = 1
        sphere.visible = true
      })

      // Apply viewport culling and language filter
      visibleSpheresRef.current = spheresRef.current.filter((sphere) => {
        const inFrustum = frustum.containsPoint(sphere.position)
        const matchesLanguage = 
          !filteredLanguage || 
          sphere.userData.repo.language?.toLowerCase() === filteredLanguage.toLowerCase()
        
        sphere.visible = inFrustum && matchesLanguage
        
        // Fade non-matching languages
        if (filteredLanguage && !matchesLanguage) {
          sphere.material.opacity = 0.1
          sphere.visible = true
        }
        
        return inFrustum && matchesLanguage
      })

      // Animate visible spheres
      sphereGroupRef.current?.children.forEach((sphere, index) => {
        if (spheresRef.current.includes(sphere)) {
          sphereGroupRef.current.rotation.x += 0.00001
          sphereGroupRef.current.rotation.y += 0.00005

          sphere.rotation.x += 0.005
          sphere.rotation.y += 0.01

          const pulse = Math.sin(elapsed * 2 + index * 0.1) * 0.1 + 1
          const originalSize = repos[index]?.size || 1
          const scale = pulse * originalSize
          sphere.scale.set(scale, scale, scale)

          const fadeProgress = Math.min(elapsed / 1, 1)
          if (sphere.material.transparent === false) {
            sphere.material.transparent = true
          }
          if (sphere.material.opacity === undefined || sphere.material.opacity === 1) {
            sphere.material.opacity = fadeProgress
          }
        }
      })

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [scene, renderer, camera, repos, filteredLanguage])

  // SPRINT 9: Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      keyStateRef.current[e.key] = true

      // Enter: Submit search (handled by SearchBar)
      // Escape: Close modal (handled by RepoDetails)
      // Tab: Cycle through repos
      // Arrow keys: Controlled by OrbitControls
      // +/-: Zoom (controlled by OrbitControls)

      if (e.key === 'Tab' && spheresRef.current.length > 0) {
        e.preventDefault()
        // Cycle through repos
        const next = Math.floor(Math.random() * spheresRef.current.length)
        const sphere = spheresRef.current[next]
        onRepoClick(sphere.userData)
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

  // SPRINT 10: Hover Tooltips with debounce
  useEffect(() => {
    if (!containerRef.current) return

    const handleMouseMove = (event) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1

      const checkHover = debounce(() => {
        raycasterRef.current.setFromCamera(mouseRef.current, camera)
        const intersects = raycasterRef.current.intersectObjects(visibleSpheresRef.current.length > 0 ? visibleSpheresRef.current : spheresRef.current)

        // Reset previous hover
        if (hoveredSphereRef.current) {
          hoveredSphereRef.current.material.emissiveIntensity = 0.3
        }

        if (intersects.length > 0) {
          const sphere = intersects[0].object
          const repo = sphere.userData.repo
          sphere.material.emissiveIntensity = 0.8
          hoveredSphereRef.current = sphere
          document.body.style.cursor = 'pointer'

          // SPRINT 10: Show tooltip
          setTooltip({
            x: event.clientX + 20,
            y: event.clientY - 10,
            name: repo.name,
            stars: repo.stargazers_count
          })
        } else {
          hoveredSphereRef.current = null
          document.body.style.cursor = 'default'
          setTooltip(null)
        }
      }, 100)

      checkHover()
    }

    const handleMouseLeave = () => {
      if (hoveredSphereRef.current) {
        hoveredSphereRef.current.material.emissiveIntensity = 0.3
      }
      hoveredSphereRef.current = null
      document.body.style.cursor = 'default'
      setTooltip(null)
    }

    containerRef.current.addEventListener('mousemove', handleMouseMove)
    containerRef.current.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      containerRef.current?.removeEventListener('mousemove', handleMouseMove)
      containerRef.current?.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [camera])

  // Click handler
  useEffect(() => {
    if (!containerRef.current) return

    const handleClick = (event) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      const intersects = raycasterRef.current.intersectObjects(visibleSpheresRef.current.length > 0 ? visibleSpheresRef.current : spheresRef.current)

      if (intersects.length > 0) {
        const repoData = intersects[0].object.userData
        onRepoClick(repoData)
      }
    }

    containerRef.current.addEventListener('click', handleClick)
    return () => {
      containerRef.current?.removeEventListener('click', handleClick)
    }
  }, [camera, onRepoClick])

  // SPRINT 15: Touch Controls
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
        const intersects = raycasterRef.current.intersectObjects(visibleSpheresRef.current.length > 0 ? visibleSpheresRef.current : spheresRef.current)

        if (intersects.length > 0) {
          const repoData = intersects[0].object.userData
          onRepoClick(repoData)
        }
      }
    }

    containerRef.current.addEventListener('touchstart', handleTouchStart)
    containerRef.current.addEventListener('touchmove', handleTouchMove)
    containerRef.current.addEventListener('touchend', handleTouchEnd)

    return () => {
      containerRef.current?.removeEventListener('touchstart', handleTouchStart)
      containerRef.current?.removeEventListener('touchmove', handleTouchMove)
      containerRef.current?.removeEventListener('touchend', handleTouchEnd)
    }
  }, [camera, onRepoClick])

  // Function to update language filter
  const updateLanguageFilter = (language) => {
    setFilteredLanguage(language)
  }

  return (
    <>
      <div
        ref={containerRef}
        style={{
          width: '100vw',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          overflow: 'hidden'
        }}
      />
      
      {/* SPRINT 10: Tooltip */}
      {tooltip && (
        <div
          className="tooltip"
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 1000
          }}
        >
          <div className="tooltip-name">{tooltip.name}</div>
          <div className="tooltip-stars">⭐ {tooltip.stars} stars</div>
        </div>
      )}
    </>
  )
}
