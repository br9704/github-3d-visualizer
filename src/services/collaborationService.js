/**
 * CollaborationService — surfaced in the UI as "Share & Annotate (local)".
 * Enables sharing and annotation of GitHub 3D visualizations.
 *
 * This is NOT real-time collaboration. There is no server and no multi-user
 * sync: state travels in a URL param, annotations live in this browser's
 * localStorage. Public copy must say "Share & Annotate (local)", never
 * "Collaboration".
 *
 * Features (client-side / localStorage-based, no backend required):
 *  - Generate shareable URLs encoding username + filters + camera state
 *  - Save named "snapshots" (states) to localStorage
 *  - Add per-repo comments/annotations stored locally
 *  - Export collaboration state as portable JSON
 *  - Import shared collaboration state
 *
 * Architecture note:
 *  Real-time multi-user collab would need a WebSocket backend.
 *  This implementation uses URL params + localStorage for zero-backend sharing.
 *  The URL share link encodes enough state for another user to reproduce the view.
 *
 * @module collaborationService
 */

/** @constant {string} localStorage key for saved visualization snapshots */
const SNAPSHOTS_KEY = 'github3dviz-collab-snapshots'

/** @constant {string} localStorage key for repo annotations/comments */
const COMMENTS_KEY = 'github3dviz-collab-comments'

/** @constant {number} Max comments stored per repo */
const MAX_COMMENTS_PER_REPO = 50

/** @constant {number} Max saved snapshots */
const MAX_SNAPSHOTS = 20

/**
 * @typedef {Object} ShareableState
 * @property {string} username - GitHub username
 * @property {string|null} language - Active language filter
 * @property {number} minStars - Stars threshold
 * @property {string} colorScheme - Visualization color scheme
 * @property {string} [filterSetId] - Active filter set ID
 * @property {number} [page] - Current pagination page
 */

/**
 * @typedef {Object} VisualizationSnapshot
 * @property {string} id - Unique snapshot ID
 * @property {string} name - Human-readable name
 * @property {string} description - Optional description
 * @property {ShareableState} state - Captured visualization state
 * @property {string} shareUrl - Generated URL for this snapshot
 * @property {number} createdAt - Unix timestamp
 * @property {string} createdBy - Author label (local or pasted)
 */

/**
 * @typedef {Object} RepoComment
 * @property {string} id - Unique comment ID
 * @property {string} repoFullName - "{owner}/{repo}" identifier
 * @property {string} text - Comment text
 * @property {string} author - Local author label
 * @property {number} createdAt - Unix timestamp
 * @property {boolean} isPinned - Whether comment is pinned
 */

// ─── URL encoding helpers ──────────────────────────────────────────────────

/**
 * Encode a visualization state as a compact base64 URL parameter.
 * @param {ShareableState} state
 * @returns {string} base64-encoded state
 */
function encodeState(state) {
  try {
    const json = JSON.stringify(state)
    return btoa(encodeURIComponent(json))
  } catch {
    return ''
  }
}

/**
 * Decode a base64 URL parameter back to a state object.
 * @param {string} encoded
 * @returns {ShareableState|null}
 */
function decodeState(encoded) {
  try {
    const json = decodeURIComponent(atob(encoded))
    return JSON.parse(json)
  } catch {
    return null
  }
}

// ─── CollaborationService class ────────────────────────────────────────────

export class CollaborationService {
  /**
   * @param {Object} opts
   * @param {string} [opts.snapshotsKey]
   * @param {string} [opts.commentsKey]
   */
  constructor({
    snapshotsKey = SNAPSHOTS_KEY,
    commentsKey = COMMENTS_KEY
  } = {}) {
    this.snapshotsKey = snapshotsKey
    this.commentsKey = commentsKey
  }

  // ─── Share URL generation ──────────────────────────────────────────────────

  /**
   * Generate a shareable URL for the current visualization state.
   * Encodes all necessary state into URL search params.
   *
   * @param {ShareableState} state - Current visualization state
   * @returns {string} Full shareable URL
   */
  generateShareUrl(state) {
    const base = `${window.location.origin}${window.location.pathname}`
    const encoded = encodeState(state)
    if (!encoded) return base

    const params = new URLSearchParams()
    params.set('viz', encoded)
    return `${base}?${params.toString()}`
  }

  /**
   * Parse a shared URL and extract the encoded state.
   * Call this on page load to detect an incoming share link.
   *
   * @param {string} [url] - URL to parse (defaults to current window URL)
   * @returns {ShareableState|null} Decoded state, or null if not a share link
   */
  parseShareUrl(url) {
    try {
      const target = url || window.location.href
      const params = new URLSearchParams(new URL(target).search)
      const encoded = params.get('viz')
      if (!encoded) return null
      return decodeState(encoded)
    } catch {
      return null
    }
  }

  /**
   * Copy a share URL to the clipboard.
   * @param {ShareableState} state
   * @returns {Promise<{ success: boolean, url: string }>}
   */
  async copyShareUrl(state) {
    const url = this.generateShareUrl(state)
    try {
      await navigator.clipboard.writeText(url)
      return { success: true, url }
    } catch {
      // Fallback: return URL even if clipboard fails
      return { success: false, url }
    }
  }

  // ─── Snapshots ─────────────────────────────────────────────────────────────

  /**
   * Save a named snapshot of the current visualization state.
   * @param {string} name - Display name for the snapshot
   * @param {string} description - Optional description
   * @param {ShareableState} state - Current state to snapshot
   * @returns {{ success: boolean, snapshot?: VisualizationSnapshot, message: string }}
   */
  saveSnapshot(name, description, state) {
    if (!name?.trim()) {
      return { success: false, message: 'Snapshot name is required' }
    }

    try {
      const snapshots = this._loadSnapshots()

      if (snapshots.length >= MAX_SNAPSHOTS) {
        return {
          success: false,
          message: `Maximum ${MAX_SNAPSHOTS} snapshots reached. Delete one first.`
        }
      }

      const snapshot = {
        id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim(),
        description: description?.trim() || '',
        state,
        shareUrl: this.generateShareUrl(state),
        createdAt: Date.now(),
        createdBy: 'You'
      }

      snapshots.unshift(snapshot) // newest first
      this._saveSnapshots(snapshots)

      return { success: true, snapshot, message: `Snapshot "${name}" saved!` }
    } catch (err) {
      return { success: false, message: `Failed to save snapshot: ${err.message}` }
    }
  }

  /**
   * Load all saved snapshots.
   * @returns {VisualizationSnapshot[]}
   */
  loadSnapshots() {
    return this._loadSnapshots()
  }

  /**
   * Delete a snapshot by ID.
   * @param {string} id
   * @returns {boolean} True if deleted
   */
  deleteSnapshot(id) {
    try {
      const snapshots = this._loadSnapshots().filter(s => s.id !== id)
      this._saveSnapshots(snapshots)
      return true
    } catch {
      return false
    }
  }

  // ─── Comments / Annotations ────────────────────────────────────────────────

  /**
   * Add a comment to a specific repository.
   * @param {string} repoFullName - "{owner}/{repo}"
   * @param {string} text - Comment content
   * @param {string} [author] - Optional author label
   * @returns {{ success: boolean, comment?: RepoComment, message: string }}
   */
  addComment(repoFullName, text, author = 'You') {
    if (!text?.trim()) {
      return { success: false, message: 'Comment cannot be empty' }
    }
    if (!repoFullName) {
      return { success: false, message: 'Repository name is required' }
    }

    try {
      const allComments = this._loadComments()
      const repoComments = allComments[repoFullName] || []

      if (repoComments.length >= MAX_COMMENTS_PER_REPO) {
        return {
          success: false,
          message: `Max ${MAX_COMMENTS_PER_REPO} comments per repo reached`
        }
      }

      const comment = {
        id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        repoFullName,
        text: text.trim(),
        author,
        createdAt: Date.now(),
        isPinned: false
      }

      allComments[repoFullName] = [comment, ...repoComments]
      this._saveComments(allComments)

      return { success: true, comment, message: 'Comment added!' }
    } catch (err) {
      return { success: false, message: `Failed to add comment: ${err.message}` }
    }
  }

  /**
   * Load all comments for a specific repository.
   * @param {string} repoFullName - "{owner}/{repo}"
   * @returns {RepoComment[]} Sorted by createdAt descending
   */
  getComments(repoFullName) {
    const all = this._loadComments()
    return (all[repoFullName] || []).sort((a, b) => {
      // Pinned first, then newest
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return b.createdAt - a.createdAt
    })
  }

  /**
   * Get total comment count across all repos.
   * @returns {number}
   */
  getTotalCommentCount() {
    const all = this._loadComments()
    return Object.values(all).reduce((sum, list) => sum + list.length, 0)
  }

  /**
   * Delete a comment by ID.
   * @param {string} repoFullName
   * @param {string} commentId
   * @returns {boolean}
   */
  deleteComment(repoFullName, commentId) {
    try {
      const all = this._loadComments()
      if (!all[repoFullName]) return false
      all[repoFullName] = all[repoFullName].filter(c => c.id !== commentId)
      if (all[repoFullName].length === 0) delete all[repoFullName]
      this._saveComments(all)
      return true
    } catch {
      return false
    }
  }

  /**
   * Toggle the pinned state of a comment.
   * @param {string} repoFullName
   * @param {string} commentId
   * @returns {boolean}
   */
  togglePinComment(repoFullName, commentId) {
    try {
      const all = this._loadComments()
      if (!all[repoFullName]) return false
      all[repoFullName] = all[repoFullName].map(c =>
        c.id === commentId ? { ...c, isPinned: !c.isPinned } : c
      )
      this._saveComments(all)
      return true
    } catch {
      return false
    }
  }

  // ─── Import / Export ───────────────────────────────────────────────────────

  /**
   * Export all collaboration data (snapshots + comments) as JSON.
   * @returns {string} Serialized JSON
   */
  exportAll() {
    return JSON.stringify({
      snapshots: this._loadSnapshots(),
      comments: this._loadComments(),
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    }, null, 2)
  }

  /**
   * Import collaboration data from a JSON string.
   * Merges with existing data (does not replace).
   *
   * @param {string} jsonString
   * @returns {{ success: boolean, message: string, stats?: Object }}
   */
  importAll(jsonString) {
    try {
      const data = JSON.parse(jsonString)

      let snapshotsAdded = 0
      let commentsAdded = 0

      // Merge snapshots
      if (Array.isArray(data.snapshots)) {
        const existing = this._loadSnapshots()
        const existingIds = new Set(existing.map(s => s.id))
        const newSnaps = data.snapshots.filter(s => !existingIds.has(s.id))
        this._saveSnapshots([...newSnaps, ...existing])
        snapshotsAdded = newSnaps.length
      }

      // Merge comments
      if (data.comments && typeof data.comments === 'object') {
        const existing = this._loadComments()
        Object.entries(data.comments).forEach(([repo, comments]) => {
          const existingIds = new Set((existing[repo] || []).map(c => c.id))
          const newComments = comments.filter(c => !existingIds.has(c.id))
          existing[repo] = [...newComments, ...(existing[repo] || [])]
          commentsAdded += newComments.length
        })
        this._saveComments(existing)
      }

      return {
        success: true,
        message: `Imported ${snapshotsAdded} snapshots and ${commentsAdded} comments`,
        stats: { snapshotsAdded, commentsAdded }
      }
    } catch (err) {
      return { success: false, message: `Import failed: ${err.message}` }
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /** @private */
  _loadSnapshots() {
    try {
      const raw = localStorage.getItem(this.snapshotsKey)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  /** @private */
  _saveSnapshots(snapshots) {
    localStorage.setItem(this.snapshotsKey, JSON.stringify(snapshots))
  }

  /** @private */
  _loadComments() {
    try {
      const raw = localStorage.getItem(this.commentsKey)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  /** @private */
  _saveComments(comments) {
    localStorage.setItem(this.commentsKey, JSON.stringify(comments))
  }
}

/** Singleton instance */
export const collaborationService = new CollaborationService()
