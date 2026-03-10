import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'
import { useThreeScene } from '../hooks/useThreeScene'
import { getLanguageInfo } from '../utils/colors'
import { applyAdvancedFilters } from '../utils/filterRepos'
import '../styles/Tooltip.css'
import '../styles/Visualizer.css'
import '../styles/PerformanceStats.css'

/**
 * VisualizerOptimized Component
 * 
 * Manages 3D visualization of GitHub repositories using Three.js.
 * 
 * Responsibilities:
 *   - Create and manage InstancedMesh for efficient rendering
 *   - Run the animation/render loop
 *   - Handle mouse interactions (raycasting)
 *   - Apply filters to repository visibility
 *   - Monitor performance (FPS)
 * 
 * CRITICAL: This component owns the render loop. The useThreeScene hook only
 * initializes the scene/camera/renderer, but this component calls renderer.render()
 */
export default function VisualizerOptimized({
  repos,
  onRepoClick,
  detectedLanguages = [],
  advancedFilters = {}
}) {
  const containerRef = useRef(null)
  const { scene, camera, renderer, error: sceneError } = useThreeScene(containerRef)

  // Three.js object references
  const sphereGroupRef = useRef(null)
  const instancedMeshesRef = useRef({})
  const repoDataRef = useRef({})
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())

  // Performance monitoring
  const [stats, setStats] = useState({ fps: 0, drawCalls: 0, renderActive: false })
  const fpsCounterRef = useRef({ count: 0, lastTime: Date.now() })
  const renderLoopRef = useRef(null)

  // Filter and animation state
  const [filteredRepos, setFilteredRepos] = useState([])
  const controlsRef = useRef(null)
  const animationStartTimeRef = useRef(null)

  // Apply advanced filters
  useEffect(() => {
    console.log('[VISUALIZER] Filter effect triggered', { 
      reposCount: repos?.length || 0,
      hasAdvancedFilters: !!(advancedFilters?.languages?.length || advancedFilters?.frameworks?.length || advancedFilters?.authorTypes?.length)
    })

    if (!repos || repos.length === 0) {
      console.log('[VISUALIZER] No repos - clearing filtered list')
      setFilteredRepos([])
      return
    }

    if (advancedFilters && (advancedFilters.languages?.length || advancedFilters.frameworks?.length || advancedFilters.authorTypes?.length)) {
      console.log('[VISUALIZER] Applying advanced filters...')
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
      const newFiltered = Array.from(filteredIndices)
      console.log(`[VISUALIZER] Filtered: ${newFiltered.length}/${repos.length} repos match filters`)
      setFilteredRepos(newFiltered)
    } else {
      console.log('[VISUALIZER] No filters applied - showing all repos')
      setFilteredRepos(repos.map((_, idx) => idx))
    }
  }, [advancedFilters, repos])

  // Create optimized scene with InstancedMesh
  useEffect(() => {
    console.log('[VISUALIZER] Scene setup effect triggered', { 
      hasScene: !!scene, 
      reposCount: repos?.length || 0
    })

    if (!scene) {
      console.warn('[VISUALIZER] Scene not ready - skipping mesh creation')
      return
    }

    if (!repos || repos.length === 0) {
      console.log('[VISUALIZER] No repos yet - clearing scene geometry')
      if (sphereGroupRef.current) {
        scene.remove(sphereGroupRef.current)
        sphereGroupRef.current = null
      }
      instancedMeshesRef.current = {}
      repoDataRef.current = {}
      return
    }

    console.log(`[VISUALIZER] Creating InstancedMesh for ${repos.length} repos...`)

    try {
      // Clear previous meshes
      if (sphereGroupRef.current) {
        console.log('[VISUALIZER] Disposing previous geometry...')
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
      console.log('[VISUALIZER] Sphere group added to scene')

      // Group repos by color for batching (InstancedMesh optimization)
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

      console.log(`[VISUALIZER] Grouped repos by color: ${Object.keys(reposByColor).length} color batches`)

      // Create InstancedMesh for each color group
      let totalInstances = 0
      Object.entries(reposByColor).forEach(([colorHex, reposInColor]) => {
        const geometry = new THREE.IcosahedronGeometry(1, 2)
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

      console.log(`[VISUALIZER] ✓ Created ${totalInstances} instances across ${Object.keys(instancedMeshesRef.current).length} meshes`)

      // Auto-position camera to frame all content
      if (repos.length > 0) {
        console.log('[VISUALIZER] Auto-positioning camera...')
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
          console.log('[VISUALIZER] Disposing previous OrbitControls...')
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
        console.log('[VISUALIZER] ✓ OrbitControls configured')
      }

      console.log('[VISUALIZER] ✓✓✓ Scene geometry setup COMPLETE')
    } catch (error) {
      console.error('[VISUALIZER] Error during mesh creation:', error)
    }

    return () => {
      console.log('[VISUALIZER] Cleaning up meshes...')
      Object.values(instancedMeshesRef.current).forEach(mesh => {
        mesh.geometry?.dispose()
        mesh.material?.dispose()
      })
    }
  }, [repos, scene, camera, renderer])

  // Animation/Render loop - CRITICAL FUNCTION
  useEffect(() => {
    console.log('[VISUALIZER] Animation effect triggered', { 
      hasScene: !!scene, 
      hasRenderer: !!renderer,
      hasCamera: !!camera,
      reposCount: repos?.length || 0,
      sceneError
    })

    // Check if we have required Three.js components
    if (!scene || !renderer || !camera) {
      console.warn('[VISUALIZER] Cannot start render loop - missing Three.js components', {
        scene: !!scene,
        renderer: !!renderer,
        camera: !!camera
      })
      
      setStats(prev => ({ ...prev, renderActive: false }))
      return
    }

    if (sceneError) {
      console.error('[VISUALIZER] Scene initialization error detected:', sceneError)
      setStats(prev => ({ ...prev, renderActive: false }))
      return
    }

    console.log('[VISUALIZER] Starting render loop...')
    animationStartTimeRef.current = Date.now()
    let animationFrameId
    let frameCount = 0

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      frameCount++

      try {
        // Calculate elapsed time since animation started
        const elapsed = (Date.now() - animationStartTimeRef.current) / 1000

        // Update controls if available
        if (controlsRef.current) {
          controlsRef.current.update()
        }

        // Only animate spheres if we have repos
        if (repos.length > 0 && sphereGroupRef.current) {
          const matrix = new THREE.Matrix4()
          const position = new THREE.Vector3()
          const scale = new THREE.Vector3()
          const quaternion = new THREE.Quaternion()

          Object.entries(instancedMeshesRef.current).forEach(([colorHex, instancedMesh]) => {
            // Rotate the group slightly
            instancedMesh.rotation.x += 0.00001
            instancedMesh.rotation.y += 0.00005

            // Update each instance
            for (let i = 0; i < instancedMesh.count; i++) {
              instancedMesh.getMatrixAt(i, matrix)
              matrix.decompose(position, quaternion, scale)

              // Pulse animation based on elapsed time
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
                // Hide by near-zero scale (more efficient than removing)
                scale.set(0.001, 0.001, 0.001)
                matrix.compose(position, quaternion, scale)
                instancedMesh.setMatrixAt(i, matrix)
              }
            }
            instancedMesh.instanceMatrix.needsUpdate = true
          })
        }

        // Render the scene
        renderer.render(scene, camera)

        // Calculate FPS
        const now = Date.now()
        if (now - fpsCounterRef.current.lastTime >= 1000) {
          const fps = Math.round(fpsCounterRef.current.count)
          setStats({
            fps,
            drawCalls: Object.keys(instancedMeshesRef.current).length,
            renderActive: true
          })
          
          if (fpsCounterRef.current.count === 0) {
            console.warn('[VISUALIZER] FPS is 0 - renderer may not be updating')
          }
          
          fpsCounterRef.current.count = 0
          fpsCounterRef.current.lastTime = now
        } else {
          fpsCounterRef.current.count++
        }
      } catch (error) {
        console.error('[VISUALIZER] Error in animation loop:', error)
        cancelAnimationFrame(animationFrameId)
      }
    }

    // Start animation loop
    animate()
    console.log('[VISUALIZER] ✓ Render loop started')

    // Cleanup
    return () => {
      console.log('[VISUALIZER] Stopping render loop...')
      cancelAnimationFrame(animationFrameId)
      setStats(prev => ({ ...prev, renderActive: false }))
    }
  }, [scene, renderer, camera, repos, filteredRepos, sceneError])

  // Click handler (raycasting with InstancedMesh)
  useEffect(() => {
    console.log('[VISUALIZER] Setting up click handler...')
    
    if (!containerRef.current) {
      console.warn('[VISUALIZER] Container ref not available for click handler')
      return
    }

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
          console.log('[VISUALIZER] Repo clicked:', repo.name)
          onRepoClick({ repo })
        }
      }
    }

    containerRef.current.addEventListener('click', handleClick)
    console.log('[VISUALIZER] ✓ Click handler attached')
    
    return () => {
      containerRef.current?.removeEventListener('click', handleClick)
      console.log('[VISUALIZER] Click handler removed')
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
          
          {sceneError && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(255, 0, 0, 0.8)',
              color: 'white',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center',
              maxWidth: '80%',
              zIndex: 1000
            }}>
              <h3>⚠️ Rendering Error</h3>
              <p>{sceneError}</p>
            </div>
          )}
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
        <div className="stat-item">
          <span className="stat-label">Status:</span>
          <span className="stat-value">{stats.renderActive ? '🟢' : '🔴'}</span>
        </div>
      </div>
    </>
  )
}
