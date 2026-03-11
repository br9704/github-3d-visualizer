import { useState } from 'react'
import UsernameAutocomplete from './UsernameAutocomplete'
import '../styles/SearchBar.css'

export default function SearchBar({ onSearch, loading, loadingPhase, error }) {
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
            aria-label="GitHub username search"
            aria-describedby="search-hint"
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
          aria-label={loading ? `Loading: ${loadingPhase}` : 'Visualize GitHub repositories'}
        >
          {loading ? (
            <span className="loading-content">
              <span className="spinner" aria-hidden="true"></span>
              <span className="loading-text">{loadingPhase}</span>
            </span>
          ) : (
            '🔍 Visualize'
          )}
        </button>
      </div>
      {(error || localError) && (
        <p className="search-error" role="alert">
          ❌ {error || localError}
        </p>
      )}
      <p className="search-hint" id="search-hint">
        💡 Tip: Try "torvalds", "octocat", or any GitHub username
      </p>
    </div>
  )
}
