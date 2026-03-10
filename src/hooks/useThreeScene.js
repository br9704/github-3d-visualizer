import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * useThreeScene Hook
 * 
 * Manages Three.js scene, camera, and renderer initialization.
 * Responsibilities:
 *   - Validate WebGL support
 *   - Create and configure Three.js components
 *   - Handle window resize
 *   - Provide scene/camera/renderer refs for VisualizerOptimized to use
 * 
 * CRITICAL: This hook initializes the scene BUT does NOT run the animation loop.
 * The parent component (VisualizerOptimized) is responsible for the render loop.
 */
export function useThreeScene(containerRef) {
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const initErrorRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) {
      console.error('[THREE] Container ref is null - cannot initialize scene')
      return
    }

    try {
      // STEP 1: Validate WebGL support
      console.log('[THREE] Checking WebGL support...')
      const canvas = document.createElement('canvas')
      const webglContext = canvas.getContext('webgl') || canvas.getContext('webgl2')
      
      if (!webglContext) {
        const errorMsg = 'WebGL is not supported on this browser. Please use a modern browser (Chrome, Firefox, Safari, Edge).'
        console.error('[THREE] ' + errorMsg)
        initErrorRef.current = errorMsg
        return
      }
      console.log('[THREE] ✓ WebGL supported')

      // STEP 2: Create scene
      console.log('[THREE] Creating Three.js scene...')
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x000000) // Black background
      sceneRef.current = scene
      console.log('[THREE] ✓ Scene created')

      // STEP 3: Get container dimensions and validate
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      console.log(`[THREE] Container dimensions: ${width}x${height}`)
      
      if (width === 0 || height === 0) {
        console.warn('[THREE] Container has zero dimensions! Scene may not render.')
      }

      // STEP 4: Create camera
      console.log('[THREE] Creating perspective camera...')
      const camera = new THREE.PerspectiveCamera(
        75,         // FOV
        width / height, // Aspect ratio
        0.1,        // Near plane
        10000       // Far plane
      )
      camera.position.z = 80
      cameraRef.current = camera
      console.log('[THREE] ✓ Camera created at position', camera.position)

      // STEP 5: Create WebGL renderer
      console.log('[THREE] Creating WebGL renderer...')
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        precision: 'highp',
        powerPreference: 'high-performance'
      })
      
      // Check if renderer was created successfully
      if (!renderer.domElement) {
        throw new Error('Failed to create WebGL renderer - domElement is null')
      }
      
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Cap at 2 for performance
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFShadowShadowMap
      rendererRef.current = renderer
      console.log('[THREE] ✓ Renderer created')

      // STEP 6: Append renderer to DOM
      console.log('[THREE] Appending renderer DOM element to container...')
      containerRef.current.appendChild(renderer.domElement)
      console.log('[THREE] ✓ Renderer DOM appended')

      // STEP 7: Add lights
      console.log('[THREE] Adding lights to scene...')
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(10, 15, 10)
      directionalLight.castShadow = true
      directionalLight.shadow.mapSize.width = 2048
      directionalLight.shadow.mapSize.height = 2048
      scene.add(directionalLight)
      console.log('[THREE] ✓ Directional light 1 added')

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4)
      directionalLight2.position.set(-10, -10, 5)
      scene.add(directionalLight2)
      console.log('[THREE] ✓ Directional light 2 added')

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
      scene.add(ambientLight)
      console.log('[THREE] ✓ Ambient light added')

      // STEP 8: Handle window resize
      const handleResize = () => {
        const w = containerRef.current?.clientWidth || window.innerWidth
        const h = containerRef.current?.clientHeight || window.innerHeight
        console.log(`[THREE] Resizing renderer to ${w}x${h}`)
        
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }

      let resizeTimeout
      const debouncedResize = () => {
        clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(handleResize, 200)
      }

      window.addEventListener('resize', debouncedResize)
      console.log('[THREE] ✓ Resize handler registered')

      // STEP 9: Log completion
      console.log('[THREE] ✓✓✓ Scene initialization COMPLETE')
      console.log('[THREE] Scene is ready for rendering. Parent component should start animation loop.')

      // CLEANUP
      return () => {
        console.log('[THREE] Cleaning up Three.js resources...')
        window.removeEventListener('resize', debouncedResize)
        clearTimeout(resizeTimeout)
        
        if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(renderer.domElement)
          console.log('[THREE] ✓ Renderer DOM removed')
        }
        
        // Dispose of resources
        scene.children.forEach(child => {
          if (child.geometry) child.geometry.dispose()
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
        
        renderer.dispose()
        console.log('[THREE] ✓ Resources disposed')
      }
    } catch (error) {
      const errorMsg = `Three.js initialization failed: ${error.message}`
      console.error('[THREE] ' + errorMsg)
      initErrorRef.current = error.message
    }
  }, [containerRef])

  return {
    scene: sceneRef.current,
    camera: cameraRef.current,
    renderer: rendererRef.current,
    error: initErrorRef.current
  }
}
