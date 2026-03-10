/**
 * UserPreferences Service
 * Manages persistent user configuration for the 3D GitHub Visualizer
 *
 * Features:
 * - Save/load default filter configuration
 * - Theme preference persistence (beyond basic dark/light)
 * - Visualization display settings (sphere size, fog, labels)
 * - Layout preferences (panel positions, expanded states)
 * - Performance settings (quality, particle count)
 *
 * @module userPreferences
 */

/** @constant {string} localStorage key for all preferences */
const PREFS_KEY = 'github3dviz-user-preferences'

/** @constant {string} Current schema version — bump on breaking changes */
const SCHEMA_VERSION = '1.0.0'

/**
 * @typedef {Object} FilterPreferences
 * @property {string|null} defaultLanguage - Default language filter on load
 * @property {number} minStars - Minimum stars threshold
 * @property {boolean} excludeArchived - Hide archived repos by default
 * @property {boolean} excludeForks - Hide forked repos by default
 * @property {string} sortBy - Default sort field: 'stars'|'updated'|'name'|'forks'
 */

/**
 * @typedef {Object} VisualizationPreferences
 * @property {number} sphereScale - Sphere size multiplier (0.5–2.0)
 * @property {boolean} showLabels - Show repo name labels
 * @property {boolean} showFog - Enable atmospheric fog
 * @property {boolean} enableParticles - Show star-field particles
 * @property {string} colorScheme - Color mapping: 'language'|'stars'|'age'|'forks'
 * @property {boolean} autoRotate - Auto-rotate camera on idle
 * @property {number} autoRotateSpeed - Rotation speed (0.1–3.0)
 */

/**
 * @typedef {Object} PerformancePreferences
 * @property {'high'|'medium'|'low'} quality - Render quality preset
 * @property {number} maxRepos - Hard cap on displayed repos
 * @property {boolean} enableShadows - Shadow rendering
 * @property {boolean} enableAntiAlias - Anti-aliasing (costs performance)
 */

/**
 * @typedef {Object} LayoutPreferences
 * @property {boolean} filterPanelExpanded - Filter panel open on start
 * @property {boolean} exportPanelExpanded - Export panel open on start
 * @property {boolean} heatmapExpanded - Heatmap panel open on start
 * @property {boolean} filterSetsExpanded - Filter sets panel open on start
 * @property {string} panelSide - Which side to anchor panels: 'left'|'right'
 */

/**
 * @typedef {Object} UserPreferences
 * @property {string} version - Schema version
 * @property {FilterPreferences} filters - Filter defaults
 * @property {VisualizationPreferences} visualization - Visual settings
 * @property {PerformancePreferences} performance - Render quality
 * @property {LayoutPreferences} layout - UI layout state
 * @property {number} savedAt - Unix timestamp of last save
 */

/** Default preferences — used on first load or after reset */
const DEFAULT_PREFERENCES = {
  version: SCHEMA_VERSION,
  filters: {
    defaultLanguage: null,
    minStars: 0,
    excludeArchived: false,
    excludeForks: false,
    sortBy: 'stars'
  },
  visualization: {
    sphereScale: 1.0,
    showLabels: false,
    showFog: true,
    enableParticles: true,
    colorScheme: 'language',
    autoRotate: false,
    autoRotateSpeed: 0.5
  },
  performance: {
    quality: 'high',
    maxRepos: 500,
    enableShadows: false,
    enableAntiAlias: true
  },
  layout: {
    filterPanelExpanded: false,
    exportPanelExpanded: false,
    heatmapExpanded: false,
    filterSetsExpanded: false,
    panelSide: 'right'
  },
  savedAt: null
}

/**
 * UserPreferencesManager
 * Handles reading, writing, and resetting all user preferences
 */
export class UserPreferencesManager {
  /**
   * @param {string} storageKey - localStorage key (override in tests)
   */
  constructor(storageKey = PREFS_KEY) {
    this.storageKey = storageKey
  }

  // ─── Read ───────────────────────────────────────────────────────────────────

  /**
   * Load all preferences from localStorage.
   * Falls back to defaults if nothing is stored or parsing fails.
   *
   * @returns {UserPreferences} The full preferences object
   */
  loadAll() {
    try {
      const raw = localStorage.getItem(this.storageKey)
      if (!raw) return { ...DEFAULT_PREFERENCES }

      const parsed = JSON.parse(raw)

      // Deep-merge with defaults so new keys added in future versions still work
      return this._mergeWithDefaults(parsed)
    } catch {
      return { ...DEFAULT_PREFERENCES }
    }
  }

  /**
   * Load a specific preference section.
   *
   * @param {'filters'|'visualization'|'performance'|'layout'} section
   * @returns {Object} The section preferences
   */
  loadSection(section) {
    const all = this.loadAll()
    return all[section] ?? DEFAULT_PREFERENCES[section]
  }

  /**
   * Load a single preference value.
   *
   * @param {string} section - Section key
   * @param {string} key - Key within section
   * @param {*} fallback - Value to return if key doesn't exist
   * @returns {*} The preference value
   */
  get(section, key, fallback = undefined) {
    const prefs = this.loadAll()
    return prefs?.[section]?.[key] ?? fallback
  }

  // ─── Write ──────────────────────────────────────────────────────────────────

  /**
   * Save all preferences to localStorage.
   *
   * @param {UserPreferences} preferences - Full prefs object
   * @returns {boolean} True on success
   */
  saveAll(preferences) {
    try {
      const toStore = {
        ...preferences,
        version: SCHEMA_VERSION,
        savedAt: Date.now()
      }
      localStorage.setItem(this.storageKey, JSON.stringify(toStore))
      return true
    } catch {
      return false
    }
  }

  /**
   * Update a specific section of preferences.
   * Merges the provided partial object into the existing section.
   *
   * @param {'filters'|'visualization'|'performance'|'layout'} section
   * @param {Object} updates - Partial updates to apply
   * @returns {boolean} True on success
   */
  saveSection(section, updates) {
    const all = this.loadAll()
    const updated = {
      ...all,
      [section]: { ...all[section], ...updates }
    }
    return this.saveAll(updated)
  }

  /**
   * Set a single preference value.
   *
   * @param {string} section - Section key
   * @param {string} key - Key within section
   * @param {*} value - Value to store
   * @returns {boolean} True on success
   */
  set(section, key, value) {
    return this.saveSection(section, { [key]: value })
  }

  // ─── Reset ──────────────────────────────────────────────────────────────────

  /**
   * Reset all preferences to factory defaults.
   *
   * @returns {UserPreferences} The default preferences object
   */
  reset() {
    try {
      localStorage.removeItem(this.storageKey)
    } catch {
      // Ignore storage errors on reset
    }
    return { ...DEFAULT_PREFERENCES }
  }

  /**
   * Reset a single section to its defaults.
   *
   * @param {'filters'|'visualization'|'performance'|'layout'} section
   * @returns {boolean} True on success
   */
  resetSection(section) {
    const all = this.loadAll()
    const updated = {
      ...all,
      [section]: { ...DEFAULT_PREFERENCES[section] }
    }
    return this.saveAll(updated)
  }

  // ─── Export / Import ────────────────────────────────────────────────────────

  /**
   * Export preferences as a JSON string for sharing/backup.
   *
   * @returns {string} JSON-encoded preferences
   */
  export() {
    const prefs = this.loadAll()
    return JSON.stringify(prefs, null, 2)
  }

  /**
   * Import preferences from a JSON string.
   * Validates schema version before applying.
   *
   * @param {string} jsonString - JSON preferences string
   * @returns {{ success: boolean, message: string, prefs?: UserPreferences }}
   */
  import(jsonString) {
    try {
      const parsed = JSON.parse(jsonString)
      const merged = this._mergeWithDefaults(parsed)
      this.saveAll(merged)
      return { success: true, message: 'Preferences imported successfully', prefs: merged }
    } catch (err) {
      return { success: false, message: `Import failed: ${err.message}` }
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Deep-merge stored preferences with defaults.
   * Ensures missing keys from older versions are filled in.
   *
   * @param {Object} stored - Parsed stored preferences
   * @returns {UserPreferences} Merged preferences
   * @private
   */
  _mergeWithDefaults(stored) {
    const result = { ...DEFAULT_PREFERENCES }

    const sections = ['filters', 'visualization', 'performance', 'layout']
    sections.forEach(section => {
      if (stored[section] && typeof stored[section] === 'object') {
        result[section] = { ...DEFAULT_PREFERENCES[section], ...stored[section] }
      }
    })

    if (stored.savedAt) result.savedAt = stored.savedAt
    if (stored.version) result.version = stored.version

    return result
  }

  /**
   * Check whether the user has any saved preferences.
   *
   * @returns {boolean}
   */
  hasStoredPreferences() {
    try {
      return localStorage.getItem(this.storageKey) !== null
    } catch {
      return false
    }
  }

  /**
   * Return the default preferences structure (useful for UI reset)
   *
   * @returns {UserPreferences}
   */
  getDefaults() {
    return { ...DEFAULT_PREFERENCES }
  }
}

/** Singleton instance — import this in components */
export const userPreferences = new UserPreferencesManager()
