export default function StatsDisplay({ loading, error, repoCount, username }) {
  if (!username) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '100px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid #7c3aed',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#fff',
        zIndex: 50,
        minWidth: '180px'
      }}
    >
      <p style={{ margin: '0 0 10px 0', color: '#7c3aed', fontWeight: 'bold' }}>
        {username}
      </p>
      {loading && <p style={{ margin: '5px 0' }}>⏳ Loading repositories...</p>}
      {error && <p style={{ margin: '5px 0', color: '#ff6b6b' }}>❌ {error}</p>}
      {repoCount > 0 && !loading && (
        <p style={{ margin: '5px 0', color: '#4ade80' }}>✅ {repoCount} repositories</p>
      )}
    </div>
  )
}
