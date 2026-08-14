import { toSceneGraph } from '../scene/sceneGraph'
/**
 * DataExporter - Export visualization data in multiple formats
 * Supports JSON, CSV, and visualization snapshots
 */

export class DataExporter {
  /**
   * Export repos data as JSON
   * @param {Array} repos - Array of repository objects
   * @param {string} format - 'full' | 'minimal' (default: 'full')
   * @returns {string} JSON string
   */
  static exportAsJSON(repos, format = 'full') {
    if (!Array.isArray(repos) || repos.length === 0) {
      throw new Error('No repositories to export')
    }

    let exportData
    if (format === 'minimal') {
      // Minimal format: just essential fields
      exportData = repos.map(repo => ({
        name: repo.name,
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language,
        description: repo.description
      }))
    } else {
      // Full format: all fields
      exportData = repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        url: repo.html_url,
        description: repo.description,
        language: repo.language,
        topics: repo.topics || [],
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        watchers: repo.watchers_count,
        issues: repo.open_issues_count,
        created: repo.created_at,
        updated: repo.updated_at,
        pushed: repo.pushed_at,
        archived: repo.archived,
        size: repo.size
      }))
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Export repos data as CSV
   * @param {Array} repos - Array of repository objects
   * @param {Array} columns - Columns to include (default: essential columns)
   * @returns {string} CSV string
   */
  static exportAsCSV(repos, columns = null) {
    if (!Array.isArray(repos) || repos.length === 0) {
      throw new Error('No repositories to export')
    }

    // Default columns to export
    const defaultColumns = [
      'name',
      'language',
      'stars',
      'forks',
      'issues',
      'url',
      'description'
    ]

    const cols = columns || defaultColumns
    
    // CSV Header
    const header = cols.map(col => `"${col}"`).join(',')
    
    // CSV Rows
    const rows = repos.map(repo => {
      return cols.map(col => {
        let value
        
        switch (col) {
          case 'name':
            value = repo.name
            break
          case 'language':
            value = repo.language || 'N/A'
            break
          case 'stars':
            value = repo.stargazers_count
            break
          case 'forks':
            value = repo.forks_count
            break
          case 'issues':
            value = repo.open_issues_count
            break
          case 'url':
            value = repo.html_url
            break
          case 'description':
            value = repo.description || ''
            break
          case 'created':
            value = new Date(repo.created_at).toISOString().split('T')[0]
            break
          case 'updated':
            value = new Date(repo.updated_at).toISOString().split('T')[0]
            break
          case 'topics':
            value = Array.isArray(repo.topics) ? repo.topics.join(';') : ''
            break
          default:
            value = repo[col] || ''
        }
        
        // Escape quotes and wrap in quotes
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    }).join('\n')

    return `${header}\n${rows}`
  }

  /**
   * Export visualization as image snapshot
   * @param {HTMLCanvasElement} canvas - Three.js renderer canvas
   * @param {string} filename - Output filename
   * @param {string} format - 'png' | 'jpeg' (default: 'png')
   */
  static exportSnapshot(canvas, filename, format = 'png') {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error('Valid canvas element required')
    }

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
    const extension = format === 'jpeg' ? '.jpg' : '.png'
    
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename + extension
      link.click()
      URL.revokeObjectURL(url)
    }, mimeType, format === 'jpeg' ? 0.95 : undefined)
  }

  /**
   * Export metadata and statistics
   * @param {Array} repos - Array of repositories
   * @param {string} username - GitHub username
   * @returns {Object} Metadata object
   */
  static generateMetadata(repos, username) {
    if (!Array.isArray(repos) || repos.length === 0) {
      throw new Error('No repositories to analyze')
    }

    const languages = {}
    let totalStars = 0
    let totalForks = 0
    let totalWatchers = 0

    repos.forEach(repo => {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1
      }
      totalStars += repo.stargazers_count || 0
      totalForks += repo.forks_count || 0
      totalWatchers += repo.watchers_count || 0
    })

    return {
      exportedAt: new Date().toISOString(),
      username: username,
      repoCount: repos.length,
      totalStars,
      totalForks,
      totalWatchers,
      averageStars: Math.round(totalStars / repos.length),
      languages: languages,
      topLanguages: Object.entries(languages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([lang, count]) => ({ language: lang, count }))
    }
  }

  /**
   * Download file helper
   * @param {string} content - File content
   * @param {string} filename - Filename
   * @param {string} mimeType - MIME type
   */
  static downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Create comprehensive export package (JSON + CSV + metadata)
   * @param {Array} repos - Array of repositories
   * @param {string} username - GitHub username
   * @returns {Object} Export data with all formats
   */
  static createExportPackage(repos, username) {
    if (!Array.isArray(repos) || repos.length === 0) {
      throw new Error('No repositories to export')
    }

    const metadata = this.generateMetadata(repos, username)
    const json = this.exportAsJSON(repos, 'full')
    const csv = this.exportAsCSV(repos)
    
    return {
      metadata,
      json,
      csv,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Estimate export size
   * @param {Array} repos - Array of repositories
   * @param {string} format - 'json' | 'csv'
   * @returns {number} Estimated size in bytes
   */
  static estimateExportSize(repos, format = 'json') {
    if (!Array.isArray(repos) || repos.length === 0) {
      return 0
    }

    try {
      let content
      if (format === 'json') {
        content = this.exportAsJSON(repos, 'full')
      } else {
        content = this.exportAsCSV(repos)
      }
      return new Blob([content]).size
    } catch (error) {
      return 0
    }
  }
}

// Export class directly (all methods are static)
export const dataExporter = DataExporter


/**
 * Export the current view as a scene graph.
 *
 * This is the WRITE side of the same contract SceneImport reads, which is what
 * makes the round trip testable: export -> import must reproduce the scene
 * exactly. gitpulse's `--export` targets this format.
 *
 * @param {Array<{repo: object, position: {x,y,z}, size: number}>} positioned
 * @param {string} username
 * @returns {string} JSON
 */
export function exportSceneGraph(positioned, username) {
  return JSON.stringify(toSceneGraph(positioned, { login: username }), null, 2)
}
