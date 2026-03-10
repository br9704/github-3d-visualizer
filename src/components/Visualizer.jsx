import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'
import { useThreeScene } from '../hooks/useThreeScene'
import { getLanguageInfo } from '../utils/colors'

export default function Visualizer({ repos, onRepoClick }) {
  const containerRef = useRef(null)
  const { scene, camera, renderer } = useThreeScene(containerRef)

  const spheresRef = useRef([])
  const geometriesRef = useRef([])
  const materialsRef = useRef({})
  const sphereGroupRef = useRef(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const hoveredSphereRef = useRef(null)
  const lastMouseMoveRef = useRef(0)

  // Create sphere meshes from positioned repos
  useEffect(() => {
    if (!repos || !scene || repos.length === 0) return

    // CLEANUP: Remove and dispose previous spheres
    if (sphereGroupRef.current) {
      sphereGroupRef.current.children.forEach((sphere) => {
        sphere.geometry.dispose()
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
    // detail=1: 12 vertices, detail=2: 42 vertices, detail=4: 162 vertices
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

      // Attach metadata for raycasting
      sphere.userData = { repo, index }

      // Shadows disabled by default (can enable for dramatic effect)
      sphere.castShadow = false
      sphere.receiveShadow = false

      sphereGroup.add(sphere)
      spheresRef.current.push(sphere)
    })

    // Auto-position camera based on sphere spread
    if (spheresRef.current.length > 0) {
      const boundingBox = new THREE.Box3().setFromObject(sphereGroup)
      const size = boundingBox.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = camera.fov * (Math.PI / 180) // Convert to radians
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))

      cameraZ = Math.max(cameraZ, 80) // Minimum camera distance
      camera.position.z = cameraZ

      const center = boundingBox.getCenter(new THREE.Vector3())
      camera.lookAt(center)

      // Setup OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.autoRotate = true
      controls.autoRotateSpeed = 2
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.enableZoom = true
      controls.zoomSpeed = 1.2
      controls.target.copy(center)
      controls.update()

      // Cleanup controls
      return () => controls.dispose()
    }

    // Animation loop for spheres
    const startTime = Date.now()
    const animationFrames = []

    const animateSpheres = () => {
      const frameId = requestAnimationFrame(animateSpheres)
      animationFrames.push(frameId)

      const elapsed = (Date.now() - startTime) / 1000

      sphereGroupRef.current?.children.forEach((sphere, index) => {
        // Group rotation
        sphereGroupRef.current.rotation.x += 0.00001
        sphereGroupRef.current.rotation.y += 0.00005

        // Individual sphere rotation
        sphere.rotation.x += 0.005
        sphere.rotation.y += 0.01

        // Pulse animation
        const pulse = Math.sin(elapsed * 2 + index * 0.1) * 0.1 + 1
        const originalSize = repos[index].size
        sphere.scale.set(
          pulse * (originalSize / (originalSize || 1)),
          pulse * (originalSize / (originalSize || 1)),
          pulse * (originalSize / (originalSize || 1))
        )

        // Fade-in on load
        const fadeProgress = Math.min(elapsed / 1, 1)
        if (sphere.material.transparent === false) {
          sphere.material.transparent = true
        }
        sphere.material.opacity = fadeProgress
      })

      renderer.render(scene, camera)
    }

    animateSpheres()

    return () => {
      animationFrames.forEach((id) => cancelAnimationFrame(id))
    }
  }, [repos, scene, renderer, camera])

  // Handle mouse hover for highlighting
  useEffect(() => {
    if (!containerRef.current) return

    const handleMouseMove = (event) => {
      const now = Date.now()
      // Debounce hover detection (100ms)
      if (now - lastMouseMoveRef.current < 100) return
      lastMouseMoveRef.current = now

      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      const intersects = raycasterRef.current.intersectObjects(
        spheresRef.current
      )

      // Reset previous hover
      if (hoveredSphereRef.current) {
        hoveredSphereRef.current.material.emissiveIntensity = 0.3
      }

      if (intersects.length > 0) {
        const sphere = intersects[0].object
        sphere.material.emissiveIntensity = 0.8
        hoveredSphereRef.current = sphere
        document.body.style.cursor = 'pointer'
      } else {
        hoveredSphereRef.current = null
        document.body.style.cursor = 'default'
      }
    }

    containerRef.current.addEventListener('mousemove', handleMouseMove)
    return () => {
      containerRef.current?.removeEventListener('mousemove', handleMouseMove)
    }
  }, [camera])

  // Handle click for selecting sphere
  useEffect(() => {
    if (!containerRef.current) return

    const handleClick = (event) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, camera)
      const intersects = raycasterRef.current.intersectObjects(
        spheresRef.current
      )

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

  return (
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
  )
}
