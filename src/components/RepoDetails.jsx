import { useEffect, useRef } from 'react'

export default function RepoDetails({ repo, onClose }) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)

  // Focus trap + restore focus on close
  useEffect(() => {
    if (!repo) return

    // Store currently focused element to restore later
    previousFocusRef.current = document.activeElement

    // Focus the dialog
    const timer = setTimeout(() => {
      dialogRef.current?.focus()
    }, 50)

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Trap Tab within the dialog
      if (e.key === 'Tab') {
        const dialog = dialogRef.current
        if (!dialog) return

        const focusable = dialog.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
      // Restore focus to previous element
      previousFocusRef.current?.focus()
    }
  }, [repo, onClose])

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
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="repo-details-title"
        tabIndex={-1}
        style={{
          background: '#1a1a1a',
          color: '#fff',
          padding: '30px',
          borderRadius: '8px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          border: '2px solid #888888',
          position: 'relative',
          outline: 'none',
          animation: 'modalFadeIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="repo-details-title" style={{ margin: '0 0 15px 0', color: '#888888' }}>
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
          <div>⭐ Stars: <strong>{repo.stargazers_count?.toLocaleString()}</strong></div>
          <div>🍴 Forks: <strong>{repo.forks_count?.toLocaleString()}</strong></div>
          <div>🔤 Language: <strong>{repo.language || 'N/A'}</strong></div>
          <div>📅 Updated: <strong>{formatDate(repo.updated_at)}</strong></div>
          <div>🔔 Issues: <strong>{repo.open_issues_count?.toLocaleString()}</strong></div>
          <div>👁️ Watchers: <strong>{repo.watchers_count?.toLocaleString()}</strong></div>
        </div>

        {repo.readme && repo.readme !== 'No README found' && (
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
                border: '1px solid #888888',
                color: '#aaa',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
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
            background: '#888888',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            transition: 'background 0.2s ease'
          }}
        >
          View on GitHub →
        </a>

        <button
          onClick={onClose}
          aria-label="Close repository details"
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            color: '#888888',
            fontSize: '28px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'background 0.2s ease'
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
