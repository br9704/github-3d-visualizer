/**
 * UserPreferencesPanel Component
 * Persistent user configuration for the 3D GitHub Visualizer
 *
 * Sections:
 *  1. Filter Defaults - language, stars threshold, archive/fork exclusion, sort
 *  2. Visualization   - sphere scale, labels, fog, particles, color scheme
 *  3. Performance     - quality preset, max repos, shadows, anti-alias
 *  4. Layout          - panel expanded states, panel side
 *  5. Import/Export   - share prefs as JSON
 */

import { useState, useEffect, useCallback } from 'react'
import { userPreferences } from '../services/userPreferences'
import '../styles/UserPreferencesPanel.css'

/**
 * ToggleSwitch - Accessible boolean toggle
 * @param {{ checked: boolean, onChange: Function, id: string }} props
 */
function ToggleSwitch({ checked, onChange, id }) {
  return (
    <label className="toggle-switch" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span className="toggle-track">
        <span className="toggle-knob" />
      </span>
    </label>
  )
}

/**
 * UserPreferencesPanel
 * Collapsible sidebar panel for managing all persistent user settings.
 *
 * @param {Object}   props
 * @param {Function} props.onPreferencesChange - Called with full prefs object when saved
 */
export default function UserPreferencesPanel({ onPreferencesChange }) {
  const [expanded, setExpanded] = useState(false)
  const [prefs, setPrefs] = useState(() => userPreferences.loadAll())
  const [message, setMessage] = useState(null)
  const [showImportArea, setShowImportArea] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [activeSection, setActiveSection] = useState('visualization')

  /** Show a timed status message */
  const showMessage = useCallback((text, type = 'success') => {
    setMessage({ text, type })
    const timer = setTimeout(() => setMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [])

  /** Persist a section update and notify parent */
  const handleSectionUpdate = useCallback((section, updates) => {
    const updatedPrefs = {
      ...prefs,
      [section]: { ...prefs[section], ...updates }
    }
    setPrefs(updatedPrefs)
    userPreferences.saveSection(section, updates)
    // Notify parent so App.jsx can react to preference changes
    if (onPreferencesChange) {
      onPreferencesChange(updatedPrefs)
    }
  }, [prefs, onPreferencesChange])

  /** Save all current prefs to localStorage */
  const handleSaveAll = useCallback(() => {
    const ok = userPreferences.saveAll(prefs)
    if (ok) {
      showMessage('preferences saved')
      if (onPreferencesChange) onPreferencesChange(prefs)
    } else {
      showMessage('failed to save preferences', 'error')
    }
  }, [prefs, onPreferencesChange, showMessage])

  /** Reset everything to defaults */
  const handleReset = useCallback(() => {
    const defaults = userPreferences.reset()
    setPrefs(defaults)
    showMessage('preferences reset to defaults')
    if (onPreferencesChange) onPreferencesChange(defaults)
  }, [onPreferencesChange, showMessage])

  /** Export prefs as JSON download */
  const handleExport = useCallback(() => {
    try {
      const json = userPreferences.export()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'github3dviz-preferences.json'
      a.click()
      URL.revokeObjectURL(url)
      showMessage('preferences exported')
    } catch {
      showMessage('export failed', 'error')
    }
  }, [showMessage])

  /** Import prefs from the textarea */
  const handleImport = useCallback(() => {
    const result = userPreferences.import(importJson)
    if (result.success) {
      setPrefs(result.prefs)
      setImportJson('')
      setShowImportArea(false)
      showMessage('preferences imported')
      if (onPreferencesChange) onPreferencesChange(result.prefs)
    } else {
      showMessage(result.message, 'error')
    }
  }, [importJson, onPreferencesChange, showMessage])

  // ─── Section renderers ────────────────────────────────────────────────────

  /** Render the Filter Defaults section */
  const renderFilterSection = () => (
    <div className="prefs-section">
      <div className="prefs-section-title">Filter Defaults</div>

      <div className="pref-row">
        <span className="pref-label">Min. Stars Threshold</span>
        <input
          type="number"
          className="pref-number"
          min={0}
          max={100000}
          step={10}
          value={prefs.filters.minStars}
          onChange={e => handleSectionUpdate('filters', { minStars: Number(e.target.value) })}
          title="Only show repos with at least this many stars"
        />
      </div>

      <div className="pref-row">
        <span className="pref-label">
          Exclude Archived Repos
          <small>Hide repos marked as archived</small>
        </span>
        <ToggleSwitch
          id="pref-exclude-archived"
          checked={prefs.filters.excludeArchived}
          onChange={val => handleSectionUpdate('filters', { excludeArchived: val })}
        />
      </div>

      <div className="pref-row">
        <span className="pref-label">
          Exclude Forked Repos
          <small>Hide repos that are forks</small>
        </span>
        <ToggleSwitch
          id="pref-exclude-forks"
          checked={prefs.filters.excludeForks}
          onChange={val => handleSectionUpdate('filters', { excludeForks: val })}
        />
      </div>

      <div className="pref-row">
        <span className="pref-label">Default Sort</span>
        <select
          className="pref-select"
          value={prefs.filters.sortBy}
          onChange={e => handleSectionUpdate('filters', { sortBy: e.target.value })}
        >
          <option value="stars">stars</option>
          <option value="updated">updated</option>
          <option value="name">name</option>
          <option value="forks">forks</option>
          <option value="created">created</option>
        </select>
      </div>
    </div>
  )

  /** Render the Visualization section */
  const renderVisualizationSection = () => (
    <div className="prefs-section">
      <div className="prefs-section-title">Visualization</div>

      <div className="pref-row">
        <span className="pref-label">
          Sphere Scale
          <small>Resize all repository spheres</small>
        </span>
        <div className="pref-range-wrapper">
          <input
            type="range"
            className="pref-range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={prefs.visualization.sphereScale}
            onChange={e => handleSectionUpdate('visualization', { sphereScale: Number(e.target.value) })}
          />
          <span className="range-value">{prefs.visualization.sphereScale.toFixed(1)}×</span>
        </div>
      </div>

      <div className="pref-row">
        <span className="pref-label">
          Color Scheme
          <small>What determines sphere color</small>
        </span>
        <select
          className="pref-select"
          value={prefs.visualization.colorScheme}
          onChange={e => handleSectionUpdate('visualization', { colorScheme: e.target.value })}
        >
          <option value="language">language</option>
          <option value="stars">stars</option>
          <option value="age">age</option>
          <option value="forks">forks</option>
        </select>
      </div>

      <div className="pref-row">
        <span className="pref-label">Show Labels</span>
        <ToggleSwitch
          id="pref-show-labels"
          checked={prefs.visualization.showLabels}
          onChange={val => handleSectionUpdate('visualization', { showLabels: val })}
        />
      </div>

      <div className="pref-row">
        <span className="pref-label">Atmospheric Fog</span>
        <ToggleSwitch
          id="pref-fog"
          checked={prefs.visualization.showFog}
          onChange={val => handleSectionUpdate('visualization', { showFog: val })}
        />
      </div>

      <div className="pref-row">
        <span className="pref-label">Star Particles</span>
        <ToggleSwitch
          id="pref-particles"
          checked={prefs.visualization.enableParticles}
          onChange={val => handleSectionUpdate('visualization', { enableParticles: val })}
        />
      </div>

      <div className="pref-row">
        <span className="pref-label">
          Auto-Rotate Camera
          <small>Slowly orbit when idle</small>
        </span>
        <ToggleSwitch
          id="pref-autorotate"
          checked={prefs.visualization.autoRotate}
          onChange={val => handleSectionUpdate('visualization', { autoRotate: val })}
        />
      </div>

      {prefs.visualization.autoRotate && (
        <div className="pref-row">
          <span className="pref-label">Rotation Speed</span>
          <div className="pref-range-wrapper">
            <input
              type="range"
              className="pref-range"
              min={0.1}
              max={3.0}
              step={0.1}
              value={prefs.visualization.autoRotateSpeed}
              onChange={e => handleSectionUpdate('visualization', { autoRotateSpeed: Number(e.target.value) })}
            />
            <span className="range-value">{prefs.visualization.autoRotateSpeed.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  )

  /** Render the Performance section */
  const renderPerformanceSection = () => (
    <div className="prefs-section">
      <div className="prefs-section-title">Performance</div>

      <div className="pref-row">
        <span className="pref-label">
          Render Quality
          <small>Trade quality for frame rate</small>
        </span>
        <select
          className="pref-select"
          value={prefs.performance.quality}
          onChange={e => handleSectionUpdate('performance', { quality: e.target.value })}
        >
          <option value="high">high</option>
          <option value="medium">medium</option>
          <option value="low">low (fastest)</option>
        </select>
      </div>

      <div className="pref-row">
        <span className="pref-label">
          Max Repos Displayed
          <small>Cap to improve performance</small>
        </span>
        <input
          type="number"
          className="pref-number"
          min={10}
          max={1000}
          step={10}
          value={prefs.performance.maxRepos}
          onChange={e => handleSectionUpdate('performance', { maxRepos: Number(e.target.value) })}
        />
      </div>

      <div className="pref-row">
        <span className="pref-label">Anti-Aliasing</span>
        <ToggleSwitch
          id="pref-antialias"
          checked={prefs.performance.enableAntiAlias}
          onChange={val => handleSectionUpdate('performance', { enableAntiAlias: val })}
        />
      </div>
    </div>
  )

  /** Render the Layout section */
  const renderLayoutSection = () => (
    <div className="prefs-section">
      <div className="prefs-section-title">Layout Defaults</div>

      <div className="pref-row">
        <span className="pref-label">Filter Sets Panel Open</span>
        <ToggleSwitch
          id="pref-filtersets-open"
          checked={prefs.layout.filterSetsExpanded}
          onChange={val => handleSectionUpdate('layout', { filterSetsExpanded: val })}
        />
      </div>

      <div className="pref-row">
        <span className="pref-label">Export Panel Open</span>
        <ToggleSwitch
          id="pref-export-open"
          checked={prefs.layout.exportPanelExpanded}
          onChange={val => handleSectionUpdate('layout', { exportPanelExpanded: val })}
        />
      </div>

      <div className="pref-row">
        <span className="pref-label">Heatmap Panel Open</span>
        <ToggleSwitch
          id="pref-heatmap-open"
          checked={prefs.layout.heatmapExpanded}
          onChange={val => handleSectionUpdate('layout', { heatmapExpanded: val })}
        />
      </div>
    </div>
  )

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="user-preferences-panel">
      {/* Collapsible header */}
      <div className="prefs-header" onClick={() => setExpanded(prev => !prev)}>
        <div className="prefs-header-title">
          <span>preferences</span>
        </div>
        <div className="prefs-header-actions">
          <span className="prefs-toggle">{expanded ? '▾' : '▸'}</span>
        </div>
      </div>

      {expanded && (
        <div className="prefs-content">
          {/* Status message */}
          {message && (
            <div className={`prefs-message ${message.type}`}>
              {message.text}
            </div>
          )}

          {/* Section tabs */}
          <div className="heatmap-tabs" style={{ marginBottom: 14 }}>
            {['visualization', 'filters', 'performance', 'layout'].map(section => (
              <button
                key={section}
                className={`tab ${activeSection === section ? 'active' : ''}`}
                onClick={() => setActiveSection(section)}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </div>

          {/* Active section content */}
          {activeSection === 'filters'       && renderFilterSection()}
          {activeSection === 'visualization' && renderVisualizationSection()}
          {activeSection === 'performance'   && renderPerformanceSection()}
          {activeSection === 'layout'        && renderLayoutSection()}

          {/* Import area */}
          {showImportArea && (
            <div className="prefs-section">
              <div className="prefs-section-title">Import JSON</div>
              <textarea
                className="prefs-import-area"
                placeholder="Paste preferences JSON here..."
                value={importJson}
                onChange={e => setImportJson(e.target.value)}
              />
              <div className="prefs-footer" style={{ marginTop: 8 }}>
                <button className="prefs-btn prefs-btn-primary" onClick={handleImport}>
                  Apply
                </button>
                <button
                  className="prefs-btn prefs-btn-secondary"
                  onClick={() => { setShowImportArea(false); setImportJson('') }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="prefs-footer">
            <button className="prefs-btn prefs-btn-primary" onClick={handleSaveAll}>
              save
            </button>
            <button className="prefs-btn prefs-btn-secondary" onClick={handleExport}>
              export
            </button>
            <button
              className="prefs-btn prefs-btn-secondary"
              onClick={() => setShowImportArea(prev => !prev)}
            >
              import
            </button>
            <button className="prefs-btn prefs-btn-danger" onClick={handleReset}>
              reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
