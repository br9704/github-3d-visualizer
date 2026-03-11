import { createContext, useState, useEffect } from 'react'

/**
 * Theme context providing dark/light mode state and toggle function.
 * @type {React.Context<{isDark: boolean, toggleTheme: function}>}
 */
export const ThemeContext = createContext()

/**
 * ThemeProvider — wraps the app to provide dark/light theme state.
 * Persists preference to localStorage and sets `data-theme` attribute on `<html>`.
 * Defaults to system preference (`prefers-color-scheme: dark`).
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme-preference')
    if (saved) {
      return saved === 'dark'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    localStorage.setItem('theme-preference', isDark ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => setIsDark(!isDark)

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
