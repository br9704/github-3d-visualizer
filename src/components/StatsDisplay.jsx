import { useTypedText } from '../hooks/useTypedText'
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
  // MOTION.md settle line: "> N repos · N stars · rendered in N.Ns" — real
  // numbers, measured. Typed once, so it lands as a readout rather than a
  // value that silently appears.
  const settleLine =
    !loading && !error && repoCount > 0
      ? [
          `${repoCount.toLocaleString()} repos`,
          typeof starCount === 'number' ? `${formatCount(starCount)} stars` : null,
          typeof renderMs === 'number' ? `${(renderMs / 1000).toFixed(1)}s` : null
        ]
          .filter(Boolean)
          .join(' · ')
      : ''
  const typed = useTypedText(settleLine, 24)

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
        <p className="stats-line sig-data">{typed}</p>
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
