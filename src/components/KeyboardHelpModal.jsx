import { useEffect } from 'react'
import '../styles/KeyboardHelpModal.css'

const KEYBOARD_SHORTCUTS = [
  { key: '?', description: 'Show this help dialog' },
  { key: 'Left Click + Drag', description: 'Rotate the 3D view' },
  { key: 'Right Click + Drag', description: 'Pan the view' },
  { key: 'Mouse Wheel', description: 'Zoom in/out' },
  { key: 'Touch (2 fingers)', description: 'Pinch to zoom' },
]

export default function KeyboardHelpModal({ isOpen, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="shortcuts-list">
            {KEYBOARD_SHORTCUTS.map((shortcut, idx) => (
              <div key={idx} className="shortcut-item">
                <kbd className="shortcut-key">{shortcut.key}</kbd>
                <span className="shortcut-description">{shortcut.description}</span>
              </div>
            ))}
          </div>

          <div className="modal-tips">
            <h3>💡 Tips</h3>
            <ul>
              <li>Click on any sphere to view repository details</li>
              <li>Use the search bar to visualize any GitHub user's repos</li>
              <li>Filter by programming language to focus your view</li>
              <li>Export or share your visualizations</li>
              <li>Sphere size represents repository stars</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}
