import { useEffect, useRef } from 'react'

export default function RepoDetails({ repo, onClose }) {
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)

  useEffect(() => {
    // Focus close button on mount
    if (closeButtonRef.current) {
      closeButtonRef.current.focus()
    }

    // Focus trap: keep Tab within modal
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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
      role="dialog"
      aria-modal="true"
      aria-labelledby="repo-details-title"
    >
      <div
        ref={modalRef}
        style={{
          background: '#1a1a1a',
          color: '#fff',
          padding: '30px',
          borderRadius: '8px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          border: '2px solid #888888',
          position: 'relative'
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
                border: '1px solid #888888',
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
            background: '#888888',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          View on GitHub →
        </a>

        <button
          ref={closeButtonRef}
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
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
