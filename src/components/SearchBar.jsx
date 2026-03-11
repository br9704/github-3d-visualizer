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
            aria-label="GitHub username"
            autoComplete="off"
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
          aria-label={loading ? 'Loading repositories' : 'Visualize repositories'}
        >
          {loading ? (
            <span className="search-button-loading">
              <span className="spinner" aria-hidden="true" />
              <span>{loadingPhase || 'Loading…'}</span>
            </span>
          ) : (
            '🔍 Visualize'
          )}
        </button>
      </div>

      {/* Loading progress indicator */}
      {loading && loadingPhase && (
        <div className="loading-progress" role="status" aria-live="polite">
          <div className="loading-bar">
            <div className="loading-bar-fill" />
          </div>
          <span className="loading-phase-text">{loadingPhase}</span>
        </div>
      )}

      {(error || localError) && (
        <p className="search-error" role="alert">
          ❌ {error || localError}
        </p>
      )}
      {!loading && !error && !localError && (
        <p className="search-hint">
          💡 Tip: Try "torvalds", "octocat", or any GitHub username
        </p>
      )}
    </div>
  )
}
