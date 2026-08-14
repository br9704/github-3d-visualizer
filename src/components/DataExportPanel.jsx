/**
 * DataExportPanel Component
 * UI for exporting visualization data in multiple formats
 * - JSON export (full or minimal)
 * - CSV export with customizable columns
 * - Visualization snapshot capture
 * - Metadata export
 */

import { useState, useRef } from 'react'
import { dataExporter } from '../services/dataExporter'
import '../styles/DataExportPanel.css'

export default function DataExportPanel({ repos, username }) {
  const [expanded, setExpanded] = useState(false)
  const [exportFormat, setExportFormat] = useState('json')
  const [jsonFormat, setJsonFormat] = useState('full')
  const [csvColumns, setCsvColumns] = useState([
    'name',
    'language',
    'stars',
    'forks',
    'issues',
    'url',
    'description'
  ])
  const [message, setMessage] = useState(null)
  const [showCustomColumns, setShowCustomColumns] = useState(false)
  const canvasRef = useRef(null)

  // All available CSV columns
  const allColumns = [
    { value: 'name', label: 'Repository Name' },
    { value: 'language', label: 'Language' },
    { value: 'stars', label: 'Stars' },
    { value: 'forks', label: 'Forks' },
    { value: 'issues', label: 'Open Issues' },
    { value: 'watchers', label: 'Watchers' },
    { value: 'url', label: 'URL' },
    { value: 'description', label: 'Description' },
    { value: 'created', label: 'Created Date' },
    { value: 'updated', label: 'Updated Date' },
    { value: 'topics', label: 'Topics' }
  ]

  if (!repos || repos.length === 0) {
    return null
  }

  /**
   * Handle JSON export
   */
  const handleExportJSON = () => {
    try {
      const json = dataExporter.exportAsJSON(repos, jsonFormat)
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `${username}-repos-${timestamp}.json`
      dataExporter.downloadFile(json, filename, 'application/json')
      showSuccess(`Exported ${repos.length} repos as JSON`)
    } catch (error) {
      showError('Export failed: ' + error.message)
    }
  }

  /**
   * Handle CSV export
   */
  const handleExportCSV = () => {
    try {
      const csv = dataExporter.exportAsCSV(repos, csvColumns)
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `${username}-repos-${timestamp}.csv`
      dataExporter.downloadFile(csv, filename, 'text/csv;charset=utf-8;')
      showSuccess(`Exported ${repos.length} repos as CSV`)
    } catch (error) {
      showError('Export failed: ' + error.message)
    }
  }

  /**
   * Handle snapshot capture
   */
  const handleExportSnapshot = () => {
    try {
      // Find the canvas element in the page
      const canvas = document.querySelector('canvas')
      if (!canvas) {
        throw new Error('Visualization not found')
      }

      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `${username}-visualization-${timestamp}`
      dataExporter.exportSnapshot(canvas, filename, 'png')
      showSuccess('Visualization snapshot exported')
    } catch (error) {
      showError('Snapshot failed: ' + error.message)
    }
  }

  /**
   * Handle metadata export
   */
  const handleExportMetadata = () => {
    try {
      const metadata = dataExporter.generateMetadata(repos, username)
      const json = JSON.stringify(metadata, null, 2)
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `${username}-metadata-${timestamp}.json`
      dataExporter.downloadFile(json, filename, 'application/json')
      showSuccess('Metadata exported')
    } catch (error) {
      showError('Export failed: ' + error.message)
    }
  }

  /**
   * Handle CSV column toggle
   */
  const toggleColumn = (column) => {
    setCsvColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    )
  }

  /**
   * Show temporary message
   */
  const showMessage = (text, type = 'info') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const showSuccess = (text) => showMessage(text, 'success')
  const showError = (text) => showMessage(text, 'error')

  // Calculate export file sizes
  const jsonSize = dataExporter.estimateExportSize(repos, 'json')
  const csvSize = dataExporter.estimateExportSize(repos, 'csv')

  return (
    <div className="data-export-panel" data-hud-module>
      <button
        type="button"
        className="export-header"
        data-hud-head
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="export-title export-header-title">
          <span className="icon">↓</span>
          <span>export</span>
        </div>
        <span className="toggle">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="export-content">
          {/* Message Display */}
          {message && (
            <div className={`message message-${message.type}`}>
              {message.text}
            </div>
          )}

          {/* Export Format Tabs */}
          <div className="export-tabs">
            <button
              className={`tab ${exportFormat === 'json' ? 'active' : ''}`}
              onClick={() => setExportFormat('json')}
            >
              json
            </button>
            <button
              className={`tab ${exportFormat === 'csv' ? 'active' : ''}`}
              onClick={() => setExportFormat('csv')}
            >
              csv
            </button>
            <button
              className={`tab ${exportFormat === 'snapshot' ? 'active' : ''}`}
              onClick={() => setExportFormat('snapshot')}
            >
              snapshot
            </button>
            <button
              className={`tab ${exportFormat === 'metadata' ? 'active' : ''}`}
              onClick={() => setExportFormat('metadata')}
            >
              metadata
            </button>
          </div>

          {/* JSON Export */}
          {exportFormat === 'json' && (
            <div className="export-section">
              <h4>Export as JSON</h4>
              <div className="format-options">
                <label className="option">
                  <input
                    type="radio"
                    value="full"
                    checked={jsonFormat === 'full'}
                    onChange={e => setJsonFormat(e.target.value)}
                  />
                  <span>Full (all fields)</span>
                  <span className="size">~{dataExporter.formatFileSize(jsonSize)}</span>
                </label>
                <label className="option">
                  <input
                    type="radio"
                    value="minimal"
                    checked={jsonFormat === 'minimal'}
                    onChange={e => setJsonFormat(e.target.value)}
                  />
                  <span>Minimal (essential only)</span>
                </label>
              </div>
              <button className="export-btn" onClick={handleExportJSON}>
                export json →
              </button>
            </div>
          )}

          {/* CSV Export */}
          {exportFormat === 'csv' && (
            <div className="export-section">
              <h4>Export as CSV</h4>
              <div className="csv-options">
                <button
                  className="toggle-columns-btn"
                  onClick={() => setShowCustomColumns(!showCustomColumns)}
                >
                  {showCustomColumns ? '▾' : '▸'} Customize Columns
                </button>
                {showCustomColumns && (
                  <div className="column-selector">
                    {allColumns.map(col => (
                      <label key={col.value} className="column-option">
                        <input
                          type="checkbox"
                          checked={csvColumns.includes(col.value)}
                          onChange={() => toggleColumn(col.value)}
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="export-info">
                <span>Columns: {csvColumns.length}</span>
                <span>~{dataExporter.formatFileSize(csvSize)}</span>
              </div>
              <button className="export-btn" onClick={handleExportCSV}>
                export csv →
              </button>
            </div>
          )}

          {/* Snapshot Export */}
          {exportFormat === 'snapshot' && (
            <div className="export-section">
              <h4>Export Visualization Snapshot</h4>
              <div className="snapshot-info">
                <p>Capture current 3D visualization as PNG image</p>
                <p className="tip">note: rotate and zoom before exportings</p>
              </div>
              <button className="export-btn" onClick={handleExportSnapshot}>
                capture snapshot →
              </button>
            </div>
          )}

          {/* Metadata Export */}
          {exportFormat === 'metadata' && (
            <div className="export-section">
              <h4>Export Metadata & Statistics</h4>
              <div className="metadata-preview">
                <div className="stat-item">
                  <span className="label">Total Repos:</span>
                  <span className="value">{repos.length}</span>
                </div>
                <div className="stat-item">
                  <span className="label">Total Stars:</span>
                  <span className="value">
                    {repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0)}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="label">Total Forks:</span>
                  <span className="value">
                    {repos.reduce((sum, r) => sum + (r.forks_count || 0), 0)}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="label">Languages:</span>
                  <span className="value">
                    {new Set(repos.map(r => r.language).filter(Boolean)).size}
                  </span>
                </div>
              </div>
              <button className="export-btn" onClick={handleExportMetadata}>
                export metadata →
              </button>
            </div>
          )}

          {/* Export Stats */}
          <div className="export-stats">
            <span>{repos.length} repositories</span>
            <span>user @{username}</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  )
}
