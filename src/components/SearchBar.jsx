import { useState } from 'react'
import UsernameAutocomplete from './UsernameAutocomplete'
import { useTypedText } from '../hooks/useTypedText'
import '../styles/SearchBar.css'

/**
 * SearchBar — the one control a visitor has to find.
 *
 * Machine voice throughout: `>` prompt prefixes, bracket buttons, and a
 * terminal fill bar instead of a spinner. No emoji.
 *
 * @param {Object} props
 * @param {function(string): void} props.onSearch - Called with the username
 * @param {boolean} props.loading - Whether a search is in progress
 * @param {string} props.loadingPhase - Human-readable phase of the current fetch
 * @param {string} props.error - Error message to display, if any
 * @param {boolean} [props.compact] - Docked under the header once a scene exists
 * @param {function(): void} [props.onFirstKeystroke] - Fired once, when the
 *   visitor first types. MOTION.md dims the ambient galaxy on this signal.
 */
export default function SearchBar({
  onSearch,
  loading,
  loadingPhase,
  error,
  compact = false,
  onFirstKeystroke
}) {
  const [username, setUsername] = useState('')
  const [localError, setLocalError] = useState('')
  const [typed, setTyped] = useState(false)

  const noteKeystroke = () => {
    if (!typed) {
      setTyped(true)
      onFirstKeystroke?.()
    }
  }

  const handleChange = (next) => {
    noteKeystroke()
    setUsername(next)
  }

  const handleSearch = () => {
    setLocalError('')
    if (!username.trim()) {
      setLocalError('enter a github username')
      return
    }
    onSearch(username.trim())
  }

  const handleAutocompleteSelect = (selected) => {
    setUsername(selected)
    onSearch(selected)
  }

  const message = error || localError

  // MOTION.md: the hint types once, 40ms/char. Reduced motion shows it whole.
  const hint = useTypedText(
    !loading && !message && !compact ? 'enter a username — try torvalds' : '',
    40
  )

  return (
    <div className="search" data-compact={compact}>
      <div className="search-row">
        <span className="search-prompt" aria-hidden="true">
          &gt;
        </span>

        <div className="search-input-wrap">
          <input
            type="text"
            value={username}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="github username"
            disabled={loading}
            className="sig-field search-input"
            aria-label="GitHub username"
            autoComplete="off"
            spellCheck="false"
          />
          <UsernameAutocomplete
            value={username}
            onChange={handleChange}
            onSelect={handleAutocompleteSelect}
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="sig-btn search-go"
          data-variant="primary"
          aria-label={loading ? 'Loading repositories' : 'Visualise repositories'}
        >
          {loading ? 'working' : 'visualise →'}
        </button>
      </div>

      <div className="search-status">
        {loading && (
          <p className="sig-say" role="status" aria-live="polite">
            {loadingPhase || 'fetching'}
          </p>
        )}

        {!loading && message && (
          <p className="sig-say" data-tone="error" role="alert">
            {message}
          </p>
        )}

        {!loading && !message && !compact && (
          <p className="sig-say search-hint">{hint}</p>
        )}
      </div>
    </div>
  )
}
