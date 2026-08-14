import { useEffect, useRef } from 'react'
import '../styles/RepoDetails.css'

/**
 * RepoDetails — the repository readout.
 *
 * Focus management: focus trap, focus restoration on close, Escape to dismiss,
 * `aria-modal`. This is the dialog the README points at when it claims focus
 * management — the claim is true here, and true in KeyboardHelpModal.
 *
 * MOTION.md (S5): this becomes a right-hand drawer that slides in over 280ms
 * while the camera flies to the selected sphere. Today it is a centred dialog.
 *
 * @param {Object} props
 * @param {Object} props.repo - GitHub repository object
 * @param {function(): void} props.onClose - Called when the dialog should close
 */
export default function RepoDetails({ repo, onClose }) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!repo) return

    previousFocusRef.current = document.activeElement
    const timer = setTimeout(() => dialogRef.current?.focus(), 50)

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable || focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
      previousFocusRef.current?.focus()
    }
  }, [repo, onClose])

  if (!repo) return null

  const formatDate = (s) =>
    new Date(s).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })

  const stats = [
    ['stars', repo.stargazers_count],
    ['forks', repo.forks_count],
    ['issues', repo.open_issues_count],
    ['watchers', repo.watchers_count]
  ]

  const hasReadme = repo.readme && repo.readme !== 'No README found'

  return (
    <div className="rd-overlay" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="rd-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="repo-details-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rd-head">
          <h2 id="repo-details-title" className="rd-title">
            {repo.name}
          </h2>
          <button
            className="rd-close"
            onClick={onClose}
            aria-label="Close repository details"
          >
            ✕
          </button>
        </div>

        <div className="rd-body">
          <p className="rd-desc">
            {repo.description || 'no description'}
          </p>

          <dl className="rd-stats">
            {stats.map(([label, value]) => (
              <div key={label} className="rd-stat">
                <dt className="sig-micro">{label.toUpperCase()}</dt>
                <dd className="sig-data rd-stat-value">
                  {typeof value === 'number' ? value.toLocaleString() : '—'}
                </dd>
              </div>
            ))}
            <div className="rd-stat">
              <dt className="sig-micro">LANGUAGE</dt>
              <dd className="sig-data rd-stat-value">{repo.language || '—'}</dd>
            </div>
            <div className="rd-stat">
              <dt className="sig-micro">UPDATED</dt>
              <dd className="sig-data rd-stat-value">
                {formatDate(repo.updated_at)}
              </dd>
            </div>
          </dl>

          {hasReadme && (
            <div className="rd-readme">
              <p className="sig-micro">README &mdash; FIRST 500 CHARS</p>
              <pre className="rd-readme-body">{repo.readme}</pre>
            </div>
          )}
        </div>

        <div className="rd-foot">
          <a
            className="rd-link"
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            open on github &rarr;
          </a>
        </div>
      </div>
    </div>
  )
}
