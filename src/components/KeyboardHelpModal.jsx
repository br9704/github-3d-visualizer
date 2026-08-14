import { useEffect, useRef } from 'react'
import '../styles/KeyboardHelpModal.css'

/**
 * KeyboardHelpModal — the shortcut reference.
 *
 * Every row below is verified against a real handler: Tab cycling and +/- zoom
 * live in Visualizer.jsx, orbit/pan/wheel come from OrbitControls, and ? / Esc
 * are bound in App.jsx. Arrow keys are deliberately absent — nothing handles
 * them, and OrbitControls.listenToKeyEvents() is never called.
 */
const KEYBOARD_SHORTCUTS = [
  { key: '? or /', description: 'Show this dialog' },
  { key: 'Esc', description: 'Close the open dialog' },
  { key: 'Tab / Shift+Tab', description: 'Cycle through repositories' },
  { key: '+ / -', description: 'Zoom in and out' },
  { key: 'Left drag', description: 'Orbit the scene' },
  { key: 'Right drag', description: 'Pan the view' },
  { key: 'Wheel', description: 'Zoom in and out' },
  { key: 'Two-finger pinch', description: 'Zoom on touch devices' }
]

export default function KeyboardHelpModal({ isOpen, onClose }) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)

  // Focus management: trap Tab inside the dialog, restore focus on close.
  useEffect(() => {
    if (!isOpen) return

    previousFocusRef.current = document.activeElement
    dialogRef.current?.focus()

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable || focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="help-title">&lt;/keyboard&gt;</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="shortcuts-list">
            {KEYBOARD_SHORTCUTS.map((shortcut) => (
              <div key={shortcut.key} className="shortcut-item">
                <kbd className="shortcut-key">{shortcut.key}</kbd>
                <span className="shortcut-description">{shortcut.description}</span>
              </div>
            ))}
          </div>

          <div className="modal-tips">
            <h3>NOTES</h3>
            <ul>
              <li>Sphere size is proportional to the square root of star count</li>
              <li>Position encodes age on X, stars on Y, forks on Z</li>
              <li>Click a sphere to open its repository detail</li>
              <li>Filter by language to isolate part of the universe</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            close
          </button>
        </div>
      </div>
    </div>
  )
}
