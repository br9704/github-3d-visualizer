import { useState, useEffect } from 'react'
import { getAllFrameworks } from '../utils/frameworkDetection'
import '../styles/AdvancedFilterPanel.css'

export default function AdvancedFilterPanel({
  languages = [],
  onFilterChange,
  repos = []
}) {
  const frameworks = getAllFrameworks()
  
  const [filters, setFilters] = useState({
    languages: [],
    frameworks: [],
    authorTypes: [],
    filterMode: 'AND' // AND or OR logic
  })

  const [expanded, setExpanded] = useState(false)
  const [filterCount, setFilterCount] = useState(0)

  // Update filter count
  useEffect(() => {
    const count = 
      filters.languages.length + 
      filters.frameworks.length + 
      filters.authorTypes.length
    setFilterCount(count)
  }, [filters])

  // Notify parent of filter change
  useEffect(() => {
    onFilterChange(filters)
  }, [filters])

  const toggleLanguage = (lang) => {
    setFilters(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }))
  }

  const toggleFramework = (framework) => {
    setFilters(prev => ({
      ...prev,
      frameworks: prev.frameworks.includes(framework)
        ? prev.frameworks.filter(f => f !== framework)
        : [...prev.frameworks, framework]
    }))
  }

  const toggleAuthorType = (type) => {
    setFilters(prev => ({
      ...prev,
      authorTypes: prev.authorTypes.includes(type)
        ? prev.authorTypes.filter(t => t !== type)
        : [...prev.authorTypes, type]
    }))
  }

  const clearAllFilters = () => {
    setFilters({
      languages: [],
      frameworks: [],
      authorTypes: [],
      filterMode: filters.filterMode
    })
  }

  const toggleFilterMode = () => {
    setFilters(prev => ({
      ...prev,
      filterMode: prev.filterMode === 'AND' ? 'OR' : 'AND'
    }))
  }

  return (
    <div className="advanced-filter-panel">
      <div 
        className="filter-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="filter-title">
          <span className="filter-icon">⚙️</span>
          <span>Advanced Filters</span>
          {filterCount > 0 && (
            <span className="filter-badge">{filterCount}</span>
          )}
        </div>
        <span className="filter-toggle">
          {expanded ? '▼' : '▶'}
        </span>
      </div>

      {expanded && (
        <div className="filter-content">
          {/* Filter Mode Toggle */}
          <div className="filter-mode-section">
            <label>Filter Logic:</label>
            <div className="filter-mode-toggle">
              <button
                className={`mode-btn ${filters.filterMode === 'AND' ? 'active' : ''}`}
                onClick={toggleFilterMode}
              >
                {filters.filterMode === 'AND' ? '✓ AND' : 'OR'}
              </button>
              <span className="mode-info">
                {filters.filterMode === 'AND' 
                  ? 'Match ALL selected filters' 
                  : 'Match ANY selected filter'}
              </span>
            </div>
          </div>

          {/* Languages */}
          {languages.length > 0 && (
            <div className="filter-section">
              <label>Languages ({filters.languages.length})</label>
              <div className="filter-options">
                {languages.map(lang => (
                  <label key={lang} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.languages.includes(lang)}
                      onChange={() => toggleLanguage(lang)}
                    />
                    <span className="checkbox-label">{lang}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Frameworks */}
          {frameworks.length > 0 && (
            <div className="filter-section">
              <label>Frameworks ({filters.frameworks.length})</label>
              <div className="filter-options">
                {frameworks.map(framework => (
                  <label key={framework} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={filters.frameworks.includes(framework)}
                      onChange={() => toggleFramework(framework)}
                    />
                    <span className="checkbox-label">{framework}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Author Types */}
          <div className="filter-section">
            <label>Author Type ({filters.authorTypes.length})</label>
            <div className="filter-options">
              {['personal', 'organization'].map(type => (
                <label key={type} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.authorTypes.includes(type)}
                    onChange={() => toggleAuthorType(type)}
                  />
                  <span className="checkbox-label">
                    {type === 'personal' ? '👤 Personal' : '🏢 Organization'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Clear Button */}
          {filterCount > 0 && (
            <button 
              className="clear-filters-btn"
              onClick={clearAllFilters}
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
