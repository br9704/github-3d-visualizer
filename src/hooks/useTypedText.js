import { useEffect, useRef, useState } from 'react'

/**
 * Type a string out once, character by character.
 *
 * MOTION.md specifies 40ms/char and "types once" — retyping the same line on
 * every re-render would be a tic, not a reveal. The typed line is a real DOM
 * string throughout, so screen readers and copy/paste see the finished text
 * rather than a partial one.
 *
 * prefers-reduced-motion returns the full string immediately.
 *
 * @param {string} text
 * @param {number} [msPerChar]
 * @returns {string}
 */
export function useTypedText(text, msPerChar = 40) {
  const [shown, setShown] = useState(text)
  const typedRef = useRef(new Set())

  useEffect(() => {
    if (!text) {
      setShown('')
      return
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Once per distinct string. A line that has already been typed simply
    // appears — the spec says "types once".
    if (reduced || typedRef.current.has(text)) {
      setShown(text)
      return
    }

    typedRef.current.add(text)
    setShown('')

    let i = 0
    const id = setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, msPerChar)

    return () => clearInterval(id)
  }, [text, msPerChar])

  return shown
}
