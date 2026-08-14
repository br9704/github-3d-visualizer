import { useState } from 'react'
import '../styles/ExportShare.css'

export default function ExportShare({ repos, username, filters }) {
  const [shareUrl, setShareUrl] = useState('')
  const [showShareModal, setShowShareModal] = useState(false)

  const handleExport = () => {
    const data = {
      username,
      repos: repos.map((r) => ({
        name: r.repo.name,
        stars: r.repo.stargazers_count,
        language: r.repo.language,
        position: r.position,
        size: r.size,
        url: r.repo.html_url
      })),
      cameraState: {
        // Can add camera position/zoom here
      },
      filters,
      exportedAt: new Date().toISOString()
    }

    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `github-3d-viz-${username}-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleShare = () => {
    const baseUrl = window.location.origin
    const params = new URLSearchParams({
      user: username,
      lang: filters?.language || 'all'
    })
    const fullUrl = `${baseUrl}?${params.toString()}`
    setShareUrl(fullUrl)
    setShowShareModal(true)

    // Copy to clipboard
    navigator.clipboard.writeText(fullUrl).catch(() => {
    })
  }

  return (
    <>
      <div className="export-share-buttons">
        <button className="export-button" onClick={handleExport} title="Export repos as JSON">
          export
        </button>
        <button className="share-button" onClick={handleShare} title="Generate shareable URL">
          share
        </button>
      </div>

      {showShareModal && (
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Share Visualization</h3>
            <p>Link copied to clipboard!</p>
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="share-url-input"
              onClick={(e) => e.target.select()}
            />
            <p className="share-hint">Click to select, then paste anywhere</p>
            <button
              className="modal-close-button"
              onClick={() => setShowShareModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
