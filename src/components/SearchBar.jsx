import { useState } from 'react'
import UsernameAutocomplete from './UsernameAutocomplete'
import '../styles/SearchBar.css'

export default function SearchBar({ onSearch, loading, error }) {
  const [username, setUsername] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSearch = async () => {
    setLocalError('')
    if (!username.trim()) {
      setLocalError('Please enter a GitHub username')
      return
    }
    onSearch(username)
  }

  const handleAutocompleteSelect = (selectedUsername) => {
    setUsername(selectedUsername)
    // Auto-search after selection
    setTimeout(() => onSearch(selectedUsername), 100)
  }

  return (
    <div className="search-bar-container">
      <div className="search-bar-wrapper">
        <div className="search-input-wrapper">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter GitHub username (e.g., torvalds)..."
            disabled={loading}
            className="search-input"
          />
          <UsernameAutocomplete
            value={username}
            onChange={setUsername}
            onSelect={handleAutocompleteSelect}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className={`search-button ${loading ? 'loading' : ''}`}
        >
          {loading ? '⏳ Searching...' : '🔍 Visualize'}
        </button>
      </div>
      {(error || localError) && (
        <p className="search-error">
          ❌ {error || localError}
        </p>
      )}
      <p className="search-hint">
        💡 Tip: Try "torvalds", "octocat", or any GitHub username
      </p>
    </div>
  )
}
