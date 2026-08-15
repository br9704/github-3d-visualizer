import { useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import { GITHUB_API } from '../utils/githubApi'
import '../styles/Autocomplete.css'

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Simple in-memory cache for autocomplete results
const autocompleteCache = new Map()

/**
 * @param {boolean} [props.dismissed] - Set once the visitor has submitted, or
 *   pressed Escape. Without it the 300ms debounce below simply refetches and
 *   reopens the list over the scene the search just produced — the same defect
 *   S2 fixed when the search card was covering the universe it had rendered.
 *   Cleared on the next keystroke, so typing again re-arms the suggestions.
 */
export default function UsernameAutocomplete({
  value,
  onChange,
  onSelect,
  dismissed = false
}) {
  const [suggestions, setSuggestions] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  const fetchSuggestions = useCallback(
    async (query) => {
      if (!query || query.length < 2) {
        setSuggestions([])
        return
      }

      // Check cache first
      const now = Date.now()
      if (autocompleteCache.has(query)) {
        const cached = autocompleteCache.get(query)
        if (now - cached.timestamp < CACHE_TTL) {
          setSuggestions(cached.data)
          setIsOpen(true)
          return
        }
      }

      try {
        // Through the proxy, like every other GitHub call. The user-search
        // endpoint has its own stricter limit (10/min unauthenticated), which
        // is exactly the kind of thing the proxy's token and edge cache exist
        // to absorb.
        const response = await axios.get(
          `${GITHUB_API}/search/users?q=${encodeURIComponent(query)}&per_page=5`
        )

        const users = response.data.items.slice(0, 5).map((user) => ({
          login: user.login,
          avatar_url: user.avatar_url,
          html_url: user.html_url
        }))

        // Cache results
        autocompleteCache.set(query, {
          data: users,
          timestamp: now
        })

        setSuggestions(users)
        setIsOpen(true)
      } catch (error) {
        setSuggestions([])
      }
    },
    []
  )

  // Debounce search input (300ms)
  useEffect(() => {
    if (dismissed) {
      setIsOpen(false)
      return
    }

    const timer = setTimeout(() => {
      if (value) {
        fetchSuggestions(value)
      } else {
        setSuggestions([])
        setIsOpen(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [value, dismissed, fetchSuggestions])

  const handleSelect = (username) => {
    onSelect(username)
    setSuggestions([])
    setIsOpen(false)
  }

  return (
    <div className="autocomplete-container">
      {/* `dismissed` is checked here as well as in the effect: fetchSuggestions
          is async, so an in-flight request can resolve and setIsOpen(true)
          after the visitor has already submitted. */}
      {!dismissed && isOpen && suggestions.length > 0 && (
        <div className="autocomplete-dropdown">
          {suggestions.map((user) => (
            <div
              key={user.login}
              className="autocomplete-option"
              onClick={() => handleSelect(user.login)}
            >
              <img
                src={user.avatar_url}
                alt={user.login}
                className="avatar"
              />
              <span className="username">{user.login}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
