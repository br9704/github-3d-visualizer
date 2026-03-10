import { useContext } from 'react'
import { ThemeContext } from '../contexts/ThemeContext'
import '../styles/Header.css'

export default function Header() {
  const { isDark, toggleTheme } = useContext(ThemeContext)

  return (
    <div className="header">
      <div className="header-left">
        <h1 className="header-title">GitHub 3D Visualizer</h1>
      </div>
      <div className="header-right">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        <button
          className="help-button"
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: '?' })
            window.dispatchEvent(event)
          }}
          title="Show keyboard shortcuts (? key)"
          aria-label="Show help"
        >
          ❓
        </button>
      </div>
    </div>
  )
}
