import { detectFrameworks, detectAuthorType } from './frameworkDetection'

/**
 * Apply advanced filters to repositories
 * @param {Array} repos - Array of repositories to filter
 * @param {Object} filters - Filter configuration {languages, frameworks, authorTypes, filterMode}
 * @returns {Array} - Filtered repositories
 */
export function applyAdvancedFilters(repos, filters) {
  if (!filters || (!filters.languages?.length && !filters.frameworks?.length && !filters.authorTypes?.length)) {
    return repos
  }

  const { languages = [], frameworks = [], authorTypes = [], filterMode = 'AND' } = filters

  return repos.filter(repo => {
    // Detect repo properties
    const repoFrameworks = detectFrameworks(repo)
    const repoAuthorType = detectAuthorType(repo)
    const repoLanguage = repo.language?.toLowerCase() || ''

    // Check each filter dimension
    const languageMatch = !languages.length || languages.some(l => l.toLowerCase() === repoLanguage)
    const frameworkMatch = !frameworks.length || frameworks.some(f => repoFrameworks.includes(f))
    const authorTypeMatch = !authorTypes.length || authorTypes.includes(repoAuthorType)

    // Apply filter mode logic
    if (filterMode === 'AND') {
      // ALL filters must match
      return languageMatch && frameworkMatch && authorTypeMatch
    } else {
      // ANY filter can match (if filters exist)
      const hasLanguageFilter = languages.length > 0
      const hasFrameworkFilter = frameworks.length > 0
      const hasAuthorTypeFilter = authorTypes.length > 0

      let matchCount = 0
      if (hasLanguageFilter && languageMatch) matchCount++
      if (hasFrameworkFilter && frameworkMatch) matchCount++
      if (hasAuthorTypeFilter && authorTypeMatch) matchCount++

      const totalFilters = [hasLanguageFilter, hasFrameworkFilter, hasAuthorTypeFilter].filter(Boolean).length
      return matchCount > 0 || totalFilters === 0
    }
  })
}

/**
 * Get matching filters count for a repository
 * @param {Object} repo - Repository to check
 * @param {Object} filters - Filter configuration
 * @returns {Number} - Number of matching filters
 */
export function getRepoFilterMatchCount(repo, filters) {
  if (!filters) return 0

  const { languages = [], frameworks = [], authorTypes = [] } = filters

  let matches = 0

  const repoFrameworks = detectFrameworks(repo)
  const repoAuthorType = detectAuthorType(repo)
  const repoLanguage = repo.language?.toLowerCase() || ''

  if (languages.length && languages.some(l => l.toLowerCase() === repoLanguage)) {
    matches++
  }
  if (frameworks.length && frameworks.some(f => repoFrameworks.includes(f))) {
    matches++
  }
  if (authorTypes.length && authorTypes.includes(repoAuthorType)) {
    matches++
  }

  return matches
}
