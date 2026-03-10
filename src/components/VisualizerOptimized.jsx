import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'
import { useThreeScene } from '../hooks/useThreeScene'
import { getLanguageInfo } from '../utils/colors'
import { applyAdvancedFilters } from '../utils/filterRepos'
import '../styles/Tooltip.css'
import '../styles/Visualizer.css'
import '../styles/PerformanceStats.css'

export default function VisualizerOptimized({
  repos,
  onRepoClick,
  detectedLanguages = [],
  advancedFilters = {}
}) {
  const containerRef = useRef(null)
  const { scene, camera, renderer } = useThreeScene(containerRef)

  const sphereGroupRef = useRef(null)
  const instancedMeshesRef = useRef({})
  const repoDataRef = useRef({})
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const hoveredIdRef = useRef(null)

  // Performance monitoring
  const [stats, setStats] = useState({ fps: 0, drawCalls: 0 })
  const fpsCounterRef = useRef({ count: 0, lastTime: Date.now() })

  // Filter and animation state
  const [filteredRepos, setFilteredRepos] = useState([])
  const controlsRef = useRef(null)

  // Apply advanced filters
  useEffect(() => {
    if (!repos || repos.length === 0) {
      setFilteredRepos([])
      return
    }

    if (advancedFilters && (advancedFilters.languages?.length || advancedFilters.frameworks?.length || advancedFilters.authorTypes?.length)) {
      const reposData = repos.map(r => r.repo)
      const filtered = applyAdvancedFilters(reposData, advancedFilters)
      const filteredIndices = new Set()
      
      filtered.forEach(filteredRepo => {
        repos.forEach((r, idx) => {
          if (r.repo && r.repo.id === filteredRepo.id) {
            filteredIndices.add(idx)
          }
        })
      })
      setFilteredRepos(Array.from(filteredIndices))
    } else {
      setFilteredRepos(repos.map((_, idx) => idx))
    }
  }, [advancedFilters, repos])

  // Create optimized scene with InstancedMesh
  useEffect(() => {
    if (!repos || repos.length === 0 || !scene) return

    // Clear previous meshes
    if (sphereGroupRef.current) {
      sphereGroupRef.current.traverse(child => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
      scene.remove(sphereGroupRef.current)
    }
    sphereGroupRef.current = null
    instancedMeshesRef.current = {}
    repoDataRef.current = {}

    // Create sphere group
    const sphereGroup = new THREE.Group()
    sphereGroupRef.current = sphereGroup
    scene.add(sphereGroup)

    // Group repos by color for batching (InstancedMesh)
    const reposByColor = {}
    repos.forEach((repoData, index) => {
      const { repo, position, size } = repoData
      const { color } = getLanguageInfo(repo.language)
      const colorHex = '0x' + color.toString(16).padStart(6, '0')

      if (!reposByColor[colorHex]) {
        reposByColor[colorHex] = []
      }
      reposByColor[colorHex].push({ repoData, index, size })
    })

    // Create InstancedMesh for each color group
    let totalInstances = 0
    Object.entries(reposByColor).forEach(([colorHex, reposInColor]) => {
      const geometry = new THREE.IcosahedronGeometry(1, 2) // Base geometry, scale via matrix
      const material = new THREE.MeshPhongMaterial({
        color: parseInt(colorHex),
        emissive: new THREE.Color(parseInt(colorHex)).multiplyScalar(0.3),
        shininess: 100,
        side: THREE.FrontSide
      })

      const instanceCount = reposInColor.length
      const instancedMesh = new THREE.InstancedMesh(geometry, material, instanceCount)

      // Set up instance matrices
      const matrix = new THREE.Matrix4()
      const scale = new THREE.Vector3()

      reposInColor.forEach((item, i) => {
        const { repoData, size } = item
        const { position } = repoData

        scale.set(size, size, size)
        matrix.compose(new THREE.Vector3(position.x, position.y, position.z), new THREE.Quaternion(), scale)
        instancedMesh.setMatrixAt(i, matrix)

        // Store repo data for raycasting
        repoDataRef.current[`${colorHex}_${i}`] = repoData.repo
      })

      instancedMesh.instanceMatrix.needsUpdate = true
      instancedMesh.userData.colorHex = colorHex
      instancedMesh.userData.baseGeometry = geometry
      sphereGroup.add(instancedMesh)
      instancedMeshesRef.current[colorHex] = instancedMesh

      totalInstances += instanceCount
    })

    // Auto-position camera
    if (repos.length > 0) {
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
    }

    return () => {
      Object.values(instancedMeshesRef.current).forEach(mesh => {
        mesh.geometry?.dispose()
        mesh.material?.dispose()
      })
    }
  }, [repos, scene, renderer, camera])

  // Animation loop with performance monitoring
  useEffect(() => {
    if (!scene || !renderer || !camera || repos.length === 0) return

    const startTime = Date.now()
    let animationFrameId
    let frameCount = 0

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      frameCount++
      const elapsed = (Date.now() - startTime) / 1000

      // Update controls
      if (controlsRef.current) {
        controlsRef.current.update()
      }

      // Animate instances
      const matrix = new THREE.Matrix4()
      const position = new THREE.Vector3()
      const scale = new THREE.Vector3()
      const quaternion = new THREE.Quaternion()

      Object.entries(instancedMeshesRef.current).forEach(([colorHex, instancedMesh]) => {
        instancedMesh.rotation.x += 0.00001
        instancedMesh.rotation.y += 0.00005

        // Update each instance
        for (let i = 0; i < instancedMesh.count; i++) {
          instancedMesh.getMatrixAt(i, matrix)
          matrix.decompose(position, quaternion, scale)

          // Pulse animation
          const pulse = Math.sin(elapsed * 2 + i * 0.1) * 0.1 + 1
          const originalSize = repos[i]?.size || 1
          const newScale = pulse * originalSize

          // Update scale
          scale.set(newScale, newScale, newScale)
          matrix.compose(position, quaternion, scale)
          instancedMesh.setMatrixAt(i, matrix)

          // Update visibility based on filters
          const isVisible = filteredRepos.includes(i)
          if (!isVisible) {
            scale.set(0.001, 0.001, 0.001) // Hide by near-zero scale
            matrix.compose(position, quaternion, scale)
            instancedMesh.setMatrixAt(i, matrix)
          }
        }
        instancedMesh.instanceMatrix.needsUpdate = true
      })

      // Calculate FPS
      const now = Date.now()
      if (now - fpsCounterRef.current.lastTime >= 1000) {
        const fps = Math.round(fpsCounterRef.current.count)
        setStats({
          fps,
          drawCalls: Object.keys(instancedMeshesRef.current).length
        })
        fpsCounterRef.current.count = 0
        fpsCounterRef.current.lastTime = now
      } else {
        fpsCounterRef.current.count++
      }

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [scene, renderer, camera, repos, filteredRepos])

  // Click handler (raycasting with InstancedMesh)
  useEffect(() => {
    if (!containerRef.current) return

    const handleClick = (event) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, camera)

      const meshes = Object.values(instancedMeshesRef.current)
      const intersects = raycasterRef.current.intersectObjects(meshes)

      if (intersects.length > 0) {
        const intersection = intersects[0]
        const instanceIndex = intersection.instanceId
        const repoKey = `${intersection.object.userData.colorHex}_${instanceIndex}`
        const repo = repoDataRef.current[repoKey]

        if (repo) {
          onRepoClick({ repo })
        }
      }
    }

    containerRef.current.addEventListener('click', handleClick)
    return () => {
      containerRef.current?.removeEventListener('click', handleClick)
    }
  }, [camera, onRepoClick])

  return (
    <>
      <div className="canvas-wrapper">
        <div className="canvas-container">
          <div
            ref={containerRef}
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
              overflow: 'hidden'
            }}
          />
        </div>
      </div>

      {/* Performance Stats */}
      <div className="performance-stats">
        <div className="stat-item">
          <span className="stat-label">FPS:</span>
          <span className="stat-value">{stats.fps}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Draw Calls:</span>
          <span className="stat-value">{stats.drawCalls}</span>
        </div>
      </div>
    </>
  )
}
