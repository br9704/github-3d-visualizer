/**
 * FilterSetsManager Component
 * UI for managing custom filter combinations
 * - Save current filters as named set
 * - Load previously saved filter sets
 * - Edit/rename sets
 * - Delete sets
 * - Export/Import sets
 */

import { useState, useEffect } from 'react'
import { filterSetsManager } from '../services/filterSetsManager'
import '../styles/FilterSetsManager.css'

export default function FilterSetsManager({ currentFilters, onLoadSet }) {
  const [sets, setSets] = useState([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [newSetName, setNewSetName] = useState('')
  const [newSetDescription, setNewSetDescription] = useState('')
  const [selectedSet, setSelectedSet] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [importJson, setImportJson] = useState('')
  const [message, setMessage] = useState(null)

  // Load filter sets on mount
  useEffect(() => {
    loadSets()
  }, [])

  /**
   * Reload all filter sets from storage
   */
  const loadSets = () => {
    try {
      const allSets = filterSetsManager.loadAllSets()
      setSets(allSets)
    } catch (error) {
      showError('Failed to load filter sets')
    }
  }

  /**
   * Save current filters as a new set
   */
  const handleSaveSet = () => {
    if (!newSetName.trim()) {
      showError('Please enter a set name')
      return
    }

    try {
      const saved = filterSetsManager.saveSet(
        newSetName,
        currentFilters,
        newSetDescription
      )
      
      loadSets()
      setNewSetName('')
      setNewSetDescription('')
      setShowSaveDialog(false)
      showSuccess(`Filter set "${newSetName}" saved!`)
    } catch (error) {
      showError('Failed to save filter set')
    }
  }

  /**
   * Load a saved filter set
   */
  const handleLoadSet = (setId) => {
    try {
      const set = filterSetsManager.getSet(setId)
      if (set) {
        onLoadSet(set.filters)
        setSelectedSet(setId)
        showSuccess(`Loaded filter set: ${set.name}`)
      }
    } catch (error) {
      showError('Failed to load filter set')
    }
  }

  /**
   * Delete a filter set
   */
  const handleDeleteSet = (setId) => {
    if (window.confirm('Delete this filter set?')) {
      try {
        filterSetsManager.deleteSet(setId)
        loadSets()
        if (selectedSet === setId) setSelectedSet(null)
        showSuccess('Filter set deleted')
      } catch (error) {
        showError('Failed to delete filter set')
      }
    }
  }

  /**
   * Update filter set name
   */
  const handleRenamSet = (setId) => {
    if (!editName.trim()) {
      showError('Please enter a name')
      return
    }

    try {
      filterSetsManager.updateSet(setId, { name: editName })
      loadSets()
      setEditingId(null)
      showSuccess('Filter set renamed')
    } catch (error) {
      showError('Failed to rename filter set')
    }
  }

  /**
   * Export a filter set as JSON
   */
  const handleExportSet = (setId) => {
    try {
      const json = filterSetsManager.exportSet(setId)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `filter-set-${setId}.json`
      a.click()
      URL.revokeObjectURL(url)
      showSuccess('Filter set exported')
    } catch (error) {
      showError('Failed to export filter set')
    }
  }

  /**
   * Import a filter set from JSON
   */
  const handleImportSet = () => {
    if (!importJson.trim()) {
      showError('Please paste JSON')
      return
    }

    try {
      const imported = filterSetsManager.importSet(importJson)
      loadSets()
      setImportJson('')
      setShowImportDialog(false)
      showSuccess(`Imported filter set: ${imported.name}`)
    } catch (error) {
      showError('Invalid JSON: ' + error.message)
    }
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

  const stats = filterSetsManager.getStats()
  const defaultSets = sets.filter(s => s.isDefault)
  const userSets = sets.filter(s => !s.isDefault)

  return (
    <div className="filter-sets-manager">
      <div 
        className="filter-sets-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="filter-sets-title">
          <span className="icon">💾</span>
          <span>Filter Sets</span>
          <span className="badge">{userSets.length}</span>
        </div>
        <span className="toggle">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="filter-sets-content">
          {/* Message Display */}
          {message && (
            <div className={`message message-${message.type}`}>
              {message.text}
            </div>
          )}

          {/* Action Buttons */}
          <div className="filter-sets-actions">
            <button 
              className="btn btn-primary"
              onClick={() => setShowSaveDialog(true)}
            >
              💾 Save Current Filters
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowImportDialog(true)}
            >
              📥 Import Set
            </button>
          </div>

          {/* Save Dialog */}
          {showSaveDialog && (
            <div className="dialog-overlay" onClick={() => setShowSaveDialog(false)}>
              <div className="dialog-content" onClick={e => e.stopPropagation()}>
                <h3>Save Filter Set</h3>
                <input
                  type="text"
                  placeholder="Set name (e.g., 'Python Data Science')"
                  value={newSetName}
                  onChange={e => setNewSetName(e.target.value)}
                  className="dialog-input"
                  autoFocus
                />
                <textarea
                  placeholder="Optional description"
                  value={newSetDescription}
                  onChange={e => setNewSetDescription(e.target.value)}
                  className="dialog-textarea"
                  rows="3"
                />
                <div className="dialog-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={handleSaveSet}
                  >
                    Save
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setShowSaveDialog(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Import Dialog */}
          {showImportDialog && (
            <div className="dialog-overlay" onClick={() => setShowImportDialog(false)}>
              <div className="dialog-content" onClick={e => e.stopPropagation()}>
                <h3>Import Filter Set</h3>
                <textarea
                  placeholder="Paste JSON here..."
                  value={importJson}
                  onChange={e => setImportJson(e.target.value)}
                  className="dialog-textarea"
                  rows="6"
                />
                <div className="dialog-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={handleImportSet}
                  >
                    Import
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowImportDialog(false)
                      setImportJson('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Default Sets Section */}
          {defaultSets.length > 0 && (
            <div className="filter-sets-section">
              <h4 className="section-title">Built-in Sets</h4>
              <div className="sets-list">
                {defaultSets.map(set => (
                  <div 
                    key={set.id}
                    className={`set-item ${selectedSet === set.id ? 'selected' : ''}`}
                  >
                    <div 
                      className="set-info"
                      onClick={() => handleLoadSet(set.id)}
                    >
                      <div className="set-name">{set.name}</div>
                      {set.description && (
                        <div className="set-description">{set.description}</div>
                      )}
                    </div>
                    <div className="set-actions">
                      <button 
                        className="btn-icon"
                        onClick={() => handleExportSet(set.id)}
                        title="Export"
                      >
                        📤
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Sets Section */}
          {userSets.length > 0 && (
            <div className="filter-sets-section">
              <h4 className="section-title">My Saved Sets ({userSets.length})</h4>
              <div className="sets-list">
                {userSets.map(set => (
                  <div 
                    key={set.id}
                    className={`set-item ${selectedSet === set.id ? 'selected' : ''}`}
                  >
                    {editingId === set.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="set-edit-input"
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="set-info"
                        onClick={() => handleLoadSet(set.id)}
                      >
                        <div className="set-name">{set.name}</div>
                        {set.description && (
                          <div className="set-description">{set.description}</div>
                        )}
                        <div className="set-meta">
                          Created {new Date(set.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    <div className="set-actions">
                      {editingId === set.id ? (
                        <>
                          <button 
                            className="btn-icon btn-confirm"
                            onClick={() => handleRenamSet(set.id)}
                            title="Save"
                          >
                            ✓
                          </button>
                          <button 
                            className="btn-icon btn-cancel"
                            onClick={() => setEditingId(null)}
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            className="btn-icon"
                            onClick={() => {
                              setEditingId(set.id)
                              setEditName(set.name)
                            }}
                            title="Rename"
                          >
                            ✎
                          </button>
                          <button 
                            className="btn-icon"
                            onClick={() => handleExportSet(set.id)}
                            title="Export"
                          >
                            📤
                          </button>
                          <button 
                            className="btn-icon btn-danger"
                            onClick={() => handleDeleteSet(set.id)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="filter-sets-stats">
            <div className="stat">
              <span className="label">Total:</span>
              <span className="value">{stats.total}</span>
            </div>
            <div className="stat">
              <span className="label">Built-in:</span>
              <span className="value">{stats.defaults}</span>
            </div>
            <div className="stat">
              <span className="label">Custom:</span>
              <span className="value">{stats.userCreated}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
