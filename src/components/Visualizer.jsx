import { useEffect, useRef } from 'react'
import { useThreeScene } from '../hooks/useThreeScene'

export default function Visualizer({ repos, onRepoClick }) {
  const containerRef = useRef(null)
  const { scene, camera, renderer } = useThreeScene(containerRef)

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
