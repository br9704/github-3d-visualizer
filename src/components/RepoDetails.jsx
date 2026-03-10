export default function RepoDetails({ repo, onClose }) {
  if (!repo) return null

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a1a',
          color: '#fff',
          padding: '30px',
          borderRadius: '8px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          border: '2px solid #7c3aed',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 15px 0', color: '#7c3aed' }}>
          {repo.name}
        </h2>
        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#aaa' }}>
          {repo.description || 'No description available'}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
            margin: '20px 0',
            fontSize: '14px'
          }}
        >
          <div>⭐ Stars: <strong>{repo.stargazers_count}</strong></div>
          <div>🍴 Forks: <strong>{repo.forks_count}</strong></div>
          <div>🔤 Language: <strong>{repo.language || 'N/A'}</strong></div>
          <div>📅 Updated: <strong>{formatDate(repo.updated_at)}</strong></div>
          <div>🔔 Issues: <strong>{repo.open_issues_count}</strong></div>
          <div>👁️ Watchers: <strong>{repo.watchers_count}</strong></div>
        </div>

        {repo.readme && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>README Preview</h3>
            <pre
              style={{
                background: '#000',
                padding: '15px',
                borderRadius: '4px',
                fontSize: '11px',
                maxHeight: '200px',
                overflow: 'auto',
                border: '1px solid #7c3aed',
                color: '#aaa'
              }}
            >
              {repo.readme}
            </pre>
          </div>
        )}

        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            marginTop: '20px',
            padding: '12px 24px',
            background: '#7c3aed',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          View on GitHub →
        </a>

        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            color: '#7c3aed',
            fontSize: '28px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
