import { createContext, useContext, useEffect, useRef, useState } from 'react'
import '../styles/HudLayout.css'

/**
 * HudLayout — one component owns every fixed position in the app.
 *
 * Before this, eleven components each declared their own `position: fixed`
 * with hardcoded offsets and no knowledge of each other. The result was the
 * detached "Preferences" panel floating alone in the lower-left, panels
 * overlapping the scene and each other, and controls falling off the bottom of
 * a 390px viewport. Layout was an emergent property of eleven independent
 * guesses.
 *
 * Now there are four regions — rail-left, rail-right, dock-bottom and the
 * search slot — and panels are *placed into* them. A panel's own stylesheet
 * still owns its content; `HudLayout.css` neutralises its positioning.
 *
 * Keyboard model matches the portfolio's directory listings:
 *   j / ↓   next module      k / ↑   previous module
 *   ↵       toggle open      Esc     close the open module
 */

const HudContext = createContext(null)

/** Registers a module with the rail so j/k can reach it. */
export function useHudModule(id) {
  const ctx = useContext(HudContext)
  return {
    focused: ctx?.focusedId === id,
    register: ctx?.register,
    unregister: ctx?.unregister
  }
}

export default function HudLayout({
  compact = false,
  search,
  railLeft,
  railRight,
  dockBottom,
  drawer,
  children
}) {
  const rootRef = useRef(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)

  /**
   * Rail modules are discovered from the DOM rather than from a registry.
   * The five feature panels are pre-existing components with their own
   * markup; asking each to register itself would mean editing all five for a
   * layout concern that is not theirs.
   */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const modules = () =>
      Array.from(root.querySelectorAll('[data-hud-module] [data-hud-head]'))

    const handleKeyDown = (e) => {
      // Never hijack typing.
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const list = modules()
      if (list.length === 0) return

      const move = (delta) => {
        e.preventDefault()
        setFocusedIndex((i) => {
          const next = (i + delta + list.length) % list.length
          list[next]?.focus()
          return next
        })
      }

      if (e.key === 'j' || e.key === 'ArrowDown') return move(1)
      if (e.key === 'k' || e.key === 'ArrowUp') return move(-1)

      if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault()
        list[focusedIndex]?.click()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedIndex])

  return (
    <HudContext.Provider value={{ focusedId: null }}>
      <div className="hud" ref={rootRef} data-compact={compact}>
        {children}

        {search && <div className="hud-search" data-docked={compact}>{search}</div>}

        {railLeft && (
          <section className="hud-rail hud-rail--left" aria-label="Controls">
            {railLeft}
          </section>
        )}

        {railRight && (
          <section className="hud-rail hud-rail--right" aria-label="Legend and filters">
            {railRight}
          </section>
        )}

        {dockBottom && <div className="hud-dock">{dockBottom}</div>}

        {drawer}

        {compact && (
          <p className="hud-keyhint sig-micro" aria-hidden="true">
            J/K MOVE &nbsp; ↵ OPEN &nbsp; ESC CLOSE &nbsp; ? HELP
          </p>
        )}
      </div>
    </HudContext.Provider>
  )
}
