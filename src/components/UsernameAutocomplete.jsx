import { useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import '../styles/Autocomplete.css'

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Simple in-memory cache for autocomplete results
const autocompleteCache = new Map()

export default function UsernameAutocomplete({ value, onChange, onSelect }) {
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
        const response = await axios.get(
          `https://api.github.com/search/users?q=${query}&per_page=5`
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
        console.warn('Autocomplete error:', error.message)
        setSuggestions([])
      }
    },
    []
  )

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value) {
        fetchSuggestions(value)
      } else {
        setSuggestions([])
        setIsOpen(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [value, fetchSuggestions])

  const handleSelect = (username) => {
    onSelect(username)
    setSuggestions([])
    setIsOpen(false)
  }

  return (
    <div className="autocomplete-container">
      {isOpen && suggestions.length > 0 && (
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
