import '../styles/StatsDisplay.css'

/**
 * StatsDisplay — the corner readout.
 *
 * Instrument text, not a status card: username, then either a terminal fill
 * bar or the measured node count. No spinner (the system forbids them), no
 * emoji, no colour beyond amber.
 *
 * @param {Object} props
 * @param {boolean} props.loading - Whether repos are being fetched
 * @param {string} props.error - Error message, if any
 * @param {number} props.repoCount - Number of loaded repositories
 * @param {string} props.username - Currently searched GitHub username
 * @param {number} [props.starCount] - Total stars across loaded repositories
 * @param {number} [props.renderMs] - Measured time to build the scene, in ms
 */
export default function StatsDisplay({
  loading,
  error,
  repoCount,
  username,
  starCount,
  renderMs
}) {
  if (!username) return null

  return (
    <div className="stats" role="status" aria-live="polite">
      <p className="stats-user sig-data">@{username}</p>

      {loading && (
        <p className="sig-bar">
          [████<span className="sig-bar-empty">░░░░</span>]
        </p>
      )}

      {!loading && error && (
        <p className="sig-say" data-tone="error">
          {error}
        </p>
      )}

      {!loading && !error && repoCount > 0 && (
        <p className="stats-line sig-data">
          <span className="sig-key">{repoCount.toLocaleString()}</span> repos
          {typeof starCount === 'number' && (
            <>
              {' · '}
              <span className="sig-key">{formatCount(starCount)}</span> stars
            </>
          )}
          {typeof renderMs === 'number' && (
            <>
              {' · '}
              {(renderMs / 1000).toFixed(1)}s
            </>
          )}
        </p>
      )}
    </div>
  )
}

/** 198342 -> "198k". Keeps the readout to a fixed width. */
function formatCount(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}
