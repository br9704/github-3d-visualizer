/**
 * CollaborationPanel Component — "Share & Annotate (local)" in the UI.
 * Three-tab panel for sharing, snapshotting, and annotating visualizations.
 *
 * NOT real-time collaboration. Everything here is localStorage plus URL params;
 * there is no server and no multi-user sync. See collaborationService.js.
 *
 * Tabs:
 *  - Share  → generate & copy shareable URL, see current state summary
 *  - Snapshots → save/load/delete named visualization states
 *  - Comments → add/view/pin/delete repo annotations (requires selected repo)
 *
 * @param {Object}  props
 * @param {string}  props.username           - Current GitHub username searched
 * @param {string}  props.currentLanguage    - Active language filter (or null)
 * @param {number}  props.currentMinStars    - Active stars filter
 * @param {string}  props.currentColorScheme - Active color scheme
 * @param {Object}  props.selectedRepo       - Currently selected repo (for comments)
 * @param {Function} props.onLoadSnapshot    - Called with ShareableState when user loads a snapshot
 */

import { useState, useCallback, useMemo } from 'react'
import { collaborationService } from '../services/collaborationService'
import '../styles/CollaborationPanel.css'

/**
 * Format a Unix timestamp as a readable relative date.
 * @param {number} ts - Unix timestamp (ms)
 * @returns {string}
 */
function formatDate(ts) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}

export default function CollaborationPanel({
  username,
  currentLanguage,
  currentMinStars = 0,
  currentColorScheme = 'language',
  selectedRepo,
  onLoadSnapshot
}) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('share')
  const [message, setMessage] = useState(null)

  // Snapshot form
  const [snapName, setSnapName] = useState('')
  const [snapDesc, setSnapDesc] = useState('')
  const [snapshots, setSnapshots] = useState(() => collaborationService.loadSnapshots())

  // Comment form
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState(() =>
    selectedRepo
      ? collaborationService.getComments(`${username}/${selectedRepo.name}`)
      : []
  )

  /** Show a timed toast message */
  const showMessage = useCallback((text, type = 'success') => {
    setMessage({ text, type })
    const t = setTimeout(() => setMessage(null), 3500)
    return () => clearTimeout(t)
  }, [])

  // ─── Current shareable state ───────────────────────────────────────────────

  /** Build the state object from current props */
  const currentState = useMemo(() => ({
    username: username || '',
    language: currentLanguage || null,
    minStars: currentMinStars,
    colorScheme: currentColorScheme
  }), [username, currentLanguage, currentMinStars, currentColorScheme])

  const shareUrl = useMemo(() =>
    username ? collaborationService.generateShareUrl(currentState) : '',
    [username, currentState]
  )

  // ─── Share handlers ────────────────────────────────────────────────────────

  const handleCopyUrl = useCallback(async () => {
    if (!username) {
      showMessage('Search for a user first!', 'error')
      return
    }
    const result = await collaborationService.copyShareUrl(currentState)
    if (result.success) {
      showMessage('link copied')
    } else {
      // Clipboard may be blocked — show the URL instead
      showMessage(`Copy this URL: ${result.url}`, 'info')
    }
  }, [username, currentState, showMessage])

  // ─── Snapshot handlers ─────────────────────────────────────────────────────

  const handleSaveSnapshot = useCallback(() => {
    if (!username) {
      showMessage('Search for a user first!', 'error')
      return
    }
    if (!snapName.trim()) {
      showMessage('Enter a snapshot name', 'error')
      return
    }
    const result = collaborationService.saveSnapshot(snapName, snapDesc, currentState)
    if (result.success) {
      setSnapshots(collaborationService.loadSnapshots())
      setSnapName('')
      setSnapDesc('')
      showMessage(result.message)
    } else {
      showMessage(result.message, 'error')
    }
  }, [username, snapName, snapDesc, currentState, showMessage])

  const handleLoadSnapshot = useCallback((snapshot) => {
    if (onLoadSnapshot) {
      onLoadSnapshot(snapshot.state)
      showMessage(`Loaded: ${snapshot.name}`)
    }
  }, [onLoadSnapshot, showMessage])

  const handleDeleteSnapshot = useCallback((id) => {
    if (collaborationService.deleteSnapshot(id)) {
      setSnapshots(collaborationService.loadSnapshots())
      showMessage('Snapshot deleted')
    }
  }, [showMessage])

  const handleExportSnapshots = useCallback(() => {
    try {
      const json = collaborationService.exportAll()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `github3dviz-collab-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      showMessage('local share data exported')
    } catch {
      showMessage('Export failed', 'error')
    }
  }, [showMessage])

  // ─── Comment handlers ──────────────────────────────────────────────────────

  const repoFullName = selectedRepo
    ? `${username}/${selectedRepo.name}`
    : null

  const refreshComments = useCallback(() => {
    if (repoFullName) {
      setComments(collaborationService.getComments(repoFullName))
    }
  }, [repoFullName])

  const handleAddComment = useCallback(() => {
    if (!repoFullName) {
      showMessage('Select a repo to comment on', 'error')
      return
    }
    if (!commentText.trim()) {
      showMessage('Comment cannot be empty', 'error')
      return
    }
    const result = collaborationService.addComment(repoFullName, commentText)
    if (result.success) {
      setCommentText('')
      refreshComments()
      showMessage('note added')
    } else {
      showMessage(result.message, 'error')
    }
  }, [repoFullName, commentText, refreshComments, showMessage])

  const handleDeleteComment = useCallback((commentId) => {
    if (collaborationService.deleteComment(repoFullName, commentId)) {
      refreshComments()
      showMessage('Comment deleted')
    }
  }, [repoFullName, refreshComments, showMessage])

  const handlePinComment = useCallback((commentId) => {
    if (collaborationService.togglePinComment(repoFullName, commentId)) {
      refreshComments()
    }
  }, [repoFullName, refreshComments])

  // Reload comments when selected repo changes
  useMemo(() => {
    if (repoFullName) {
      setComments(collaborationService.getComments(repoFullName))
    }
  }, [repoFullName])

  // ─── Tab: Share ────────────────────────────────────────────────────────────

  const renderShareTab = () => (
    <div className="share-section">
      <h4>Current View</h4>
      <div className="share-state-info">
        {[
          ['User', username || '—'],
          ['Language', currentLanguage || 'All'],
          ['Min Stars', currentMinStars],
          ['Color Scheme', currentColorScheme]
        ].map(([label, val]) => (
          <div key={label} className="state-row">
            <span className="state-label">{label}</span>
            <span className="state-value">{val}</span>
          </div>
        ))}
      </div>

      <h4>Shareable Link</h4>
      <div className="share-url-row">
        <input
          type="text"
          className="share-url-input"
          readOnly
          value={shareUrl || (username ? 'Generating…' : 'Search for a user first')}
        />
        <button
          className="collab-btn collab-btn-primary"
          onClick={handleCopyUrl}
          disabled={!username}
        >
          copy
        </button>
      </div>

      <p style={{ fontSize: 11, color: '#b0b0b0', margin: '4px 0 0', lineHeight: 1.4 }}>
        This link encodes the current username, filters, and color scheme.
        Anyone opening it will see the same view.
      </p>
    </div>
  )

  // ─── Tab: Snapshots ────────────────────────────────────────────────────────

  const renderSnapshotsTab = () => (
    <div className="snapshots-section">
      {/* Save form */}
      <div className="snapshots-form">
        <input
          type="text"
          placeholder="Snapshot name…"
          value={snapName}
          onChange={e => setSnapName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSaveSnapshot()}
        />
        <textarea
          placeholder="Description (optional)"
          value={snapDesc}
          onChange={e => setSnapDesc(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="collab-btn collab-btn-primary"
            onClick={handleSaveSnapshot}
            style={{ flex: 1 }}
          >
            save snapshot →
          </button>
          {snapshots.length > 0 && (
            <button
              className="collab-btn collab-btn-secondary"
              onClick={handleExportSnapshots}
            >
              export all →
            </button>
          )}
        </div>
      </div>

      {/* Snapshot list */}
      {snapshots.length === 0 ? (
        <div className="collab-empty">
          <span className="empty-icon">·</span>
          No snapshots saved yet. Save the current view to recall it later.
        </div>
      ) : (
        <div className="snapshot-list">
          {snapshots.map(snap => (
            <div key={snap.id} className="snapshot-card">
              <div className="snapshot-card-header">
                <div className="snapshot-name">{snap.name}</div>
                <span style={{ fontSize: 10, color: '#b0b0b0' }}>
                  {formatDate(snap.createdAt)}
                </span>
              </div>
              {snap.description && (
                <div className="snapshot-desc">{snap.description}</div>
              )}
              <div className="snapshot-meta">
                User: {snap.state?.username || '—'} ·
                Lang: {snap.state?.language || 'All'} ·
                Stars ≥ {snap.state?.minStars || 0}
              </div>
              <div className="snapshot-actions">
                <button
                  className="collab-btn collab-btn-primary"
                  onClick={() => handleLoadSnapshot(snap)}
                >
                  ▸ Load
                </button>
                <button
                  className="collab-btn collab-btn-secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(snap.shareUrl).catch(() => {})
                    showMessage('snapshot link copied')
                  }}
                >
                  copy link
                </button>
                <button
                  className="collab-btn collab-btn-danger"
                  onClick={() => handleDeleteSnapshot(snap.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ─── Tab: Comments ─────────────────────────────────────────────────────────

  const renderCommentsTab = () => (
    <div className="comments-section">
      {!selectedRepo ? (
        <div className="no-repo-selected">
          <div style={{ fontSize: 28, marginBottom: 8 }}>·</div>
          Click a repository sphere to select it, then add comments here.
        </div>
      ) : (
        <>
          <div className="comments-repo-info">
            Commenting on: <span className="repo-name">{repoFullName}</span>
          </div>

          <div className="comment-form">
            <textarea
              className="comment-input"
              placeholder="Add a note or annotation about this repo…"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
            />
            <button
              className="collab-btn collab-btn-primary"
              onClick={handleAddComment}
            >
              add note →
            </button>
          </div>

          {comments.length === 0 ? (
            <div className="no-comments">No comments yet. Be the first!</div>
          ) : (
            <div className="comment-list">
              {comments.map(comment => (
                <div
                  key={comment.id}
                  className={`comment-card ${comment.isPinned ? 'pinned' : ''}`}
                >
                  <div className="comment-card-header">
                    <span className="comment-author">
                      {comment.author}
                      {comment.isPinned && (
                        <span className="pinned-badge">pinned</span>
                      )}
                    </span>
                    <span className="comment-date">{formatDate(comment.createdAt)}</span>
                  </div>
                  <div className="comment-text">{comment.text}</div>
                  <div className="comment-actions">
                    <button
                      className="collab-btn-icon"
                      onClick={() => handlePinComment(comment.id)}
                      title={comment.isPinned ? 'Unpin' : 'Pin'}
                    >
                      {comment.isPinned ? 'unpin' : 'pin'}
                    </button>
                    <button
                      className="collab-btn-icon"
                      onClick={() => handleDeleteComment(comment.id)}
                      title="Delete comment"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )

  // ─── Main render ──────────────────────────────────────────────────────────

  const totalComments = collaborationService.getTotalCommentCount()

  return (
    <div className="collaboration-panel" data-hud-module>
      {/* Collapsible header */}
      <button type="button" className="collab-header" data-hud-head aria-expanded={expanded} onClick={() => setExpanded(prev => !prev)}>
        <div className="collab-header-left">
          <span className="collab-header-title">share &amp; annotate (local)</span>
          <div className="collab-header-badges">
            {snapshots.length > 0 && (
              <span className="collab-badge">{snapshots.length} snapshots</span>
            )}
            {totalComments > 0 && (
              <span className="collab-badge">{totalComments} notes</span>
            )}
          </div>
        </div>
        <span className="collab-toggle">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <>
          {/* Tab bar */}
          <div className="collab-tabs">
            {[
              { id: 'share', label: 'share' },
              { id: 'snapshots', label: 'snapshots' },
              { id: 'comments', label: 'notes' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`collab-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="collab-content">
            {/* Toast message */}
            {message && (
              <div className={`collab-message ${message.type}`}>
                {message.text}
              </div>
            )}

            {activeTab === 'share'     && renderShareTab()}
            {activeTab === 'snapshots' && renderSnapshotsTab()}
            {activeTab === 'comments'  && renderCommentsTab()}
          </div>
        </>
      )}
    </div>
  )
}
