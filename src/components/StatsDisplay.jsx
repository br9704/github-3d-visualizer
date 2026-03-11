/**
 * StatsDisplay — fixed-position panel showing current search status.
 * Displays username, loading spinner, error messages, or repo count.
 * Uses aria-live="polite" for screen reader announcements.
 *
 * @param {Object} props
 * @param {boolean} props.loading - Whether repos are being fetched
 * @param {string} props.error - Error message (if any)
 * @param {number} props.repoCount - Number of loaded repositories
 * @param {string} props.username - Currently searched GitHub username
 */
export default function StatsDisplay({ loading, error, repoCount, username }) {
  if (!username) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '100px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid #888888',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#fff',
        zIndex: 50,
        minWidth: '180px',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.3s ease'
      }}
    >
      <p style={{ margin: '0 0 10px 0', color: '#888888', fontWeight: 'bold' }}>
        {username}
      </p>
      {loading && (
        <p style={{
          margin: '5px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              flexShrink: 0
            }}
          />
          Loading repositories…
        </p>
      )}
      {error && <p style={{ margin: '5px 0', color: '#ff6b6b' }}>❌ {error}</p>}
      {repoCount > 0 && !loading && (
        <p style={{ margin: '5px 0', color: '#4ade80' }}>
          ✅ {repoCount.toLocaleString()} repositories
        </p>
      )}
    </div>
  )
}
