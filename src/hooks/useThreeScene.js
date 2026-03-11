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
      const canvas = document.createElement('canvas')
      const webglContext = canvas.getContext('webgl') || canvas.getContext('webgl2')
      
      if (!webglContext) {
        const errorMsg = 'WebGL is not supported on this browser. Please use a modern browser (Chrome, Firefox, Safari, Edge).'
        console.error('[THREE] ' + errorMsg)
        initErrorRef.current = errorMsg
        return
      }

      // STEP 2: Create scene
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x000000) // Black background
      sceneRef.current = scene

      // STEP 3: Get container dimensions and validate
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      
      if (width === 0 || height === 0) {
      }

      // STEP 4: Create camera
      const camera = new THREE.PerspectiveCamera(
        75,         // FOV
        width / height, // Aspect ratio
        0.1,        // Near plane
        10000       // Far plane
      )
      camera.position.z = 80
      cameraRef.current = camera

      // STEP 5: Create WebGL renderer
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
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      rendererRef.current = renderer

      // STEP 6: Append renderer to DOM
      containerRef.current.appendChild(renderer.domElement)

      // STEP 7: Add lights
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(10, 15, 10)
      directionalLight.castShadow = true
      directionalLight.shadow.mapSize.width = 2048
      directionalLight.shadow.mapSize.height = 2048
      scene.add(directionalLight)

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4)
      directionalLight2.position.set(-10, -10, 5)
      scene.add(directionalLight2)

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
      scene.add(ambientLight)

      // STEP 8: Handle window resize
      const handleResize = () => {
        const w = containerRef.current?.clientWidth || window.innerWidth
        const h = containerRef.current?.clientHeight || window.innerHeight
        
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

      // STEP 9: Log completion

      // CLEANUP
      return () => {
        window.removeEventListener('resize', debouncedResize)
        clearTimeout(resizeTimeout)
        
        if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(renderer.domElement)
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
