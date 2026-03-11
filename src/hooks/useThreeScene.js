import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * useThreeScene Hook
 *
 * Manages Three.js scene, camera, and renderer initialization.
 * Responsibilities:
 *   - Validate WebGL support
 *   - Create and configure Three.js components
 *   - Handle window resize
 *   - Provide scene/camera/renderer refs for Visualizer to use
 *
 * CRITICAL: This hook initializes the scene BUT does NOT run the animation loop.
 * The parent component (Visualizer) is responsible for the render loop.
 */
export function useThreeScene(containerRef) {
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const [initError, setInitError] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    try {
      // STEP 1: Validate WebGL support
      const canvas = document.createElement('canvas')
      const webglContext = canvas.getContext('webgl2') || canvas.getContext('webgl')

      if (!webglContext) {
        setInitError('WebGL is not supported on this browser. Please use a modern browser (Chrome, Firefox, Safari, Edge).')
        return
      }

      // STEP 2: Create scene
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x000000)
      sceneRef.current = scene

      // STEP 3: Get container dimensions with fallback
      const width = containerRef.current.clientWidth || window.innerWidth
      const height = containerRef.current.clientHeight || window.innerHeight

      // STEP 4: Create camera
      const camera = new THREE.PerspectiveCamera(
        75,                    // FOV
        width / height || 1,   // Aspect ratio (guard division by zero)
        0.1,                   // Near plane
        10000                  // Far plane
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

      if (!renderer.domElement) {
        throw new Error('Failed to create WebGL renderer')
      }

      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      // Disable shadow maps — not used (all castShadow/receiveShadow are false)
      renderer.shadowMap.enabled = false
      rendererRef.current = renderer

      // STEP 6: Append renderer to DOM
      containerRef.current.appendChild(renderer.domElement)

      // STEP 7: Add lights
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(10, 15, 10)
      scene.add(directionalLight)

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4)
      directionalLight2.position.set(-10, -10, 5)
      scene.add(directionalLight2)

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
      scene.add(ambientLight)

      setReady(true)

      // STEP 8: Handle window resize with debounce
      let resizeTimeout
      const handleResize = () => {
        clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(() => {
          const w = containerRef.current?.clientWidth || window.innerWidth
          const h = containerRef.current?.clientHeight || window.innerHeight

          if (w > 0 && h > 0) {
            camera.aspect = w / h
            camera.updateProjectionMatrix()
            renderer.setSize(w, h)
          }
        }, 150)
      }

      window.addEventListener('resize', handleResize)

      // CLEANUP
      return () => {
        window.removeEventListener('resize', handleResize)
        clearTimeout(resizeTimeout)

        if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(renderer.domElement)
        }

        // Dispose of scene children
        scene.traverse((child) => {
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
        sceneRef.current = null
        cameraRef.current = null
        rendererRef.current = null
      }
    } catch (error) {
      setInitError(`Three.js initialization failed: ${error.message}`)
    }
  }, [containerRef])

  return {
    scene: sceneRef.current,
    camera: cameraRef.current,
    renderer: rendererRef.current,
    error: initError,
    ready
  }
}
