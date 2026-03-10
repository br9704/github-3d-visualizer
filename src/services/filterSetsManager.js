/**
 * FilterSetsManager - Manage saved filter combinations
 * Handles creation, saving, loading, and deletion of custom filter sets
 * Persists to localStorage for browser-level persistence
 */

export class FilterSetsManager {
  /**
   * Initialize manager with localStorage key
   * @param {string} storageKey - localStorage key for storing filter sets
   */
  constructor(storageKey = 'github3dviz-filter-sets') {
    this.storageKey = storageKey
    this.defaultSets = this.initializeDefaults()
  }

  /**
   * Initialize default filter sets (built-in examples)
   * @returns {Map<string, Object>} Default filter sets
   */
  initializeDefaults() {
    return new Map([
      ['popular', {
        id: 'popular',
        name: 'Popular Repos',
        description: 'Highly starred repositories across all languages',
        filters: {
          minStars: 100,
          sortBy: 'stars',
          excludeArchived: true
        },
        isDefault: true,
        createdAt: Date.now()
      }],
      ['python-data', {
        id: 'python-data',
        name: 'Python Data Science',
        description: 'Python repos focused on data science & ML',
        filters: {
          languages: ['python'],
          frameworks: ['django', 'flask', 'fastapi'],
          excludeArchived: true
        },
        isDefault: true,
        createdAt: Date.now()
      }],
      ['web-frontend', {
        id: 'web-frontend',
        name: 'Web Frontend',
        description: 'JavaScript/TypeScript web frontend frameworks',
        filters: {
          languages: ['javascript', 'typescript'],
          frameworks: ['react', 'vue', 'svelte', 'angular'],
          excludeArchived: true
        },
        isDefault: true,
        createdAt: Date.now()
      }]
    ])
  }

  /**
   * Load all saved filter sets from localStorage + defaults
   * @returns {Array<Object>} Array of filter set objects
   */
  loadAllSets() {
    try {
      const stored = localStorage.getItem(this.storageKey)
      const userSets = stored ? JSON.parse(stored) : {}
      
      // Merge defaults with user-saved sets
      const allSets = new Map(this.defaultSets)
      Object.values(userSets).forEach(set => {
        allSets.set(set.id, set)
      })
      
      return Array.from(allSets.values()).sort((a, b) => 
        b.createdAt - a.createdAt
      )
    } catch (error) {
      console.error('Error loading filter sets:', error)
      return Array.from(this.defaultSets.values())
    }
  }

  /**
   * Get a single filter set by ID
   * @param {string} setId - Filter set ID
   * @returns {Object|null} Filter set or null if not found
   */
  getSet(setId) {
    try {
      const stored = localStorage.getItem(this.storageKey)
      const userSets = stored ? JSON.parse(stored) : {}
      
      // Check user sets first, then defaults
      return userSets[setId] || this.defaultSets.get(setId) || null
    } catch (error) {
      console.error('Error getting filter set:', error)
      return null
    }
  }

  /**
   * Save a new or updated filter set
   * @param {string} name - Display name for the set
   * @param {Object} filters - Filter configuration object
   * @param {string} description - Optional description
   * @returns {Object} Saved filter set with generated ID
   */
  saveSet(name, filters, description = '') {
    try {
      const stored = localStorage.getItem(this.storageKey)
      const userSets = stored ? JSON.parse(stored) : {}
      
      // Generate unique ID based on name + timestamp
      const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const newSet = {
        id,
        name,
        description,
        filters,
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      userSets[id] = newSet
      localStorage.setItem(this.storageKey, JSON.stringify(userSets))
      
      return newSet
    } catch (error) {
      console.error('Error saving filter set:', error)
      throw new Error('Failed to save filter set')
    }
  }

  /**
   * Update an existing filter set
   * @param {string} setId - ID of set to update
   * @param {Object} updates - Fields to update (name, description, filters)
   * @returns {Object} Updated filter set
   */
  updateSet(setId, updates) {
    try {
      const stored = localStorage.getItem(this.storageKey)
      const userSets = stored ? JSON.parse(stored) : {}
      
      if (!userSets[setId]) {
        throw new Error(`Filter set ${setId} not found`)
      }
      
      userSets[setId] = {
        ...userSets[setId],
        ...updates,
        updatedAt: Date.now()
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(userSets))
      return userSets[setId]
    } catch (error) {
      console.error('Error updating filter set:', error)
      throw error
    }
  }

  /**
   * Delete a filter set
   * @param {string} setId - ID of set to delete
   * @returns {boolean} True if successfully deleted
   */
  deleteSet(setId) {
    try {
      const stored = localStorage.getItem(this.storageKey)
      const userSets = stored ? JSON.parse(stored) : {}
      
      if (userSets[setId]) {
        delete userSets[setId]
        localStorage.setItem(this.storageKey, JSON.stringify(userSets))
        return true
      }
      return false
    } catch (error) {
      console.error('Error deleting filter set:', error)
      throw error
    }
  }

  /**
   * Export filter set as JSON
   * @param {string} setId - ID of set to export
   * @returns {string} JSON string representation
   */
  exportSet(setId) {
    const set = this.getSet(setId)
    if (!set) throw new Error('Filter set not found')
    
    return JSON.stringify(set, null, 2)
  }

  /**
   * Import a filter set from JSON
   * @param {string} jsonString - JSON string of filter set
   * @returns {Object} Imported filter set
   */
  importSet(jsonString) {
    try {
      const set = JSON.parse(jsonString)
      
      // Validate required fields
      if (!set.name || !set.filters) {
        throw new Error('Invalid filter set: missing name or filters')
      }
      
      // Generate new ID to avoid conflicts
      const newSet = {
        ...set,
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      const stored = localStorage.getItem(this.storageKey)
      const userSets = stored ? JSON.parse(stored) : {}
      userSets[newSet.id] = newSet
      localStorage.setItem(this.storageKey, JSON.stringify(userSets))
      
      return newSet
    } catch (error) {
      console.error('Error importing filter set:', error)
      throw new Error('Failed to import filter set: ' + error.message)
    }
  }

  /**
   * Clear all user-saved filter sets (keeps defaults)
   */
  clearAllUserSets() {
    try {
      localStorage.removeItem(this.storageKey)
    } catch (error) {
      console.error('Error clearing filter sets:', error)
      throw error
    }
  }

  /**
   * Get usage statistics for filter sets
   * @returns {Object} Statistics including total count, default count, user count
   */
  getStats() {
    const allSets = this.loadAllSets()
    const defaultSets = allSets.filter(s => s.isDefault)
    const userSets = allSets.filter(s => !s.isDefault)
    
    return {
      total: allSets.length,
      defaults: defaultSets.length,
      userCreated: userSets.length,
      recentlyCreated: userSets.filter(s => 
        Date.now() - s.createdAt < 24 * 60 * 60 * 1000
      ).length
    }
  }
}

// Export singleton instance
export const filterSetsManager = new FilterSetsManager()
