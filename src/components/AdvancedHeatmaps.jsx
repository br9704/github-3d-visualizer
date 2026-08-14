/**
 * AdvancedHeatmaps Component
 * Multi-view heatmap visualization for repository analytics
 * - Activity heatmap (temporal)
 * - Contribution intensity heatmap
 * - Language distribution
 * - Growth trajectory
 * - Repository maturity scatter
 */

import { useState, useMemo } from 'react'
import { heatmapGenerator } from '../services/heatmapGenerator'
import '../styles/AdvancedHeatmaps.css'

export default function AdvancedHeatmaps({ repos }) {
  const [expanded, setExpanded] = useState(false)
  const [selectedView, setSelectedView] = useState('contribution')
  const [hoveredItem, setHoveredItem] = useState(null)

  if (!repos || repos.length === 0) {
    return null
  }

  // Generate heatmap data
  const heatmapData = useMemo(() => {
    return heatmapGenerator.generateCompleteReport(repos)
  }, [repos])

  /**
   * Render Contribution Intensity Heatmap
   */
  const renderContributionHeatmap = () => {
    const data = heatmapData.contribution
    const maxIntensity = Math.max(...data.map(d => d.intensity))

    return (
      <div className="heatmap-view contribution-heatmap">
        <h4>Repository Contribution Intensity</h4>
        <div className="heatmap-grid">
          {data.map((item, idx) => (
            <div
              key={item.id}
              className="heatmap-cell"
              style={{
                backgroundColor: heatmapGenerator.getIntensityColor(item.intensity),
                opacity: 0.6 + (item.intensity / 5) * 0.4
              }}
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {hoveredItem?.id === item.id && (
                <div className="heatmap-tooltip">
                  <div className="tooltip-name">{item.name}</div>
                  <div className="tooltip-stat">stars {item.stars}</div>
                  <div className="tooltip-stat">forks {item.forks}</div>
                  <div className="tooltip-stat">issues {item.issues}</div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="heatmap-legend">
          <span className="legend-label">Intensity:</span>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="legend-item"
              style={{ backgroundColor: heatmapGenerator.getIntensityColor(i) }}
            />
          ))}
          <span className="legend-label">Low → High</span>
        </div>
      </div>
    )
  }

  /**
   * Render Language Distribution Heatmap
   */
  const renderLanguageHeatmap = () => {
    const data = heatmapData.language.slice(0, 10) // Top 10 languages

    return (
      <div className="heatmap-view language-heatmap">
        <h4>Language Distribution</h4>
        <div className="language-bars">
          {data.map(item => (
            <div key={item.language} className="language-bar">
              <div className="language-label">
                <span>{item.language || 'No Language'}</span>
                <span className="count">({item.count})</span>
              </div>
              <div className="bar-container">
                <div
                  className="bar-fill"
                  style={{
                    width: `${(item.count / data[0].count) * 100}%`,
                    backgroundColor: heatmapGenerator.getIntensityColor(item.intensity)
                  }}
                >
                  <span className="bar-label">
                    avg {item.avgStars} stars
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="heatmap-stats">
          <div className="stat">
            <span className="label">Languages</span>
            <span className="value">{heatmapData.language.length}</span>
          </div>
          <div className="stat">
            <span className="label">Repos</span>
            <span className="value">{repos.length}</span>
          </div>
          <div className="stat">
            <span className="label">Total Stars</span>
            <span className="value">
              {repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  /**
   * Render Activity Timeline Heatmap
   */
  const renderActivityHeatmap = () => {
    const data = heatmapData.activity
    const maxStars = Math.max(...data.map(d => d.totalStars || 0))

    return (
      <div className="heatmap-view activity-heatmap">
        <h4>Repository Creation Activity Over Time</h4>
        <div className="activity-timeline">
          {data.map((item, idx) => (
            <div
              key={item.month}
              className="activity-bar"
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div
                className="bar-height"
                style={{
                  height: `${(item.totalStars / maxStars) * 100}px`,
                  backgroundColor: heatmapGenerator.getIntensityColor(
                    Math.min(5, Math.ceil((item.reposCreated / data.length) * 5))
                  )
                }}
              >
                {hoveredItem?.month === item.month && (
                  <div className="activity-tooltip">
                    <div>{item.month}</div>
                    <div>{item.reposCreated} repos</div>
                    <div>{item.totalStars} stars</div>
                  </div>
                )}
              </div>
              <div className="bar-label">{item.month}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  /**
   * Render Maturity Scatter Plot
   */
  const renderMaturityHeatmap = () => {
    const data = heatmapData.maturity
    const maxAge = Math.max(...data.map(d => d.ageInYears))
    const maxStars = Math.max(...data.map(d => d.stars))

    return (
      <div className="heatmap-view maturity-heatmap">
        <h4>Repository Maturity (Age vs Stars)</h4>
        <div className="scatter-plot">
          <div className="plot-bg">
            {data.map(item => (
              <div
                key={item.name}
                className="scatter-point"
                style={{
                  left: `${(item.ageInYears / maxAge) * 100}%`,
                  bottom: `${(item.stars / maxStars) * 100}%`,
                  backgroundColor: heatmapGenerator.getIntensityColor(item.intensity)
                }}
                onMouseEnter={() => setHoveredItem(item)}
                onMouseLeave={() => setHoveredItem(null)}
                title={item.name}
              >
                {hoveredItem?.name === item.name && (
                  <div className="scatter-tooltip">
                    <div className="tooltip-name">{item.name}</div>
                    <div>Age: {item.ageInYears} years</div>
                    <div>{item.stars} stars</div>
                    <div>{item.forks} forks</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="plot-axes">
            <div className="y-axis">Stars →</div>
            <div className="x-axis">← Age (Years)</div>
          </div>
        </div>
        <div className="plot-legend">
          <p>Reposit size increases with contribution intensity</p>
        </div>
      </div>
    )
  }

  /**
   * Render Growth Trajectory
   */
  const renderGrowthHeatmap = () => {
    const data = heatmapData.growth
    const maxStars = Math.max(...data.map(d => d.cumulativeStars))

    return (
      <div className="heatmap-view growth-heatmap">
        <h4>Cumulative Growth Trajectory</h4>
        <div className="growth-chart">
          <svg viewBox="0 0 800 300" className="growth-svg">
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="800" height="300" fill="url(#grid)" />

            {/* Cumulative stars line */}
            <polyline
              points={data.map((item, idx) => {
                const x = (idx / data.length) * 800
                const y = 300 - (item.cumulativeStars / maxStars) * 280
                return `${x},${y}`
              }).join(' ')}
              fill="none"
              stroke="#888888"
              strokeWidth="2"
            />

            {/* Data points */}
            {data.map((item, idx) => {
              const x = (idx / data.length) * 800
              const y = 300 - (item.cumulativeStars / maxStars) * 280
              return (
                <circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="#888888"
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <title>{item.repoName}: {item.cumulativeStars} stars</title>
                </circle>
              )
            })}
          </svg>
          {hoveredItem && hoveredItem.repoName && (
            <div className="growth-tooltip">
              <div className="tooltip-name">{hoveredItem.repoName}</div>
              <div>{hoveredItem.cumulativeRepos} repos total</div>
              <div>{hoveredItem.cumulativeStars} cumulative stars</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="advanced-heatmaps">
      <div
        className="heatmaps-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="heatmaps-title">
          <span className="icon">▚</span>
          <span>heatmaps</span>
        </div>
        <span className="toggle">{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div className="heatmaps-content">
          {/* View Selector */}
          <div className="heatmap-tabs">
            <button
              className={`tab ${selectedView === 'contribution' ? 'active' : ''}`}
              onClick={() => setSelectedView('contribution')}
            >
              contribution
            </button>
            <button
              className={`tab ${selectedView === 'language' ? 'active' : ''}`}
              onClick={() => setSelectedView('language')}
            >
              languages
            </button>
            <button
              className={`tab ${selectedView === 'activity' ? 'active' : ''}`}
              onClick={() => setSelectedView('activity')}
            >
              activity
            </button>
            <button
              className={`tab ${selectedView === 'maturity' ? 'active' : ''}`}
              onClick={() => setSelectedView('maturity')}
            >
              maturity
            </button>
            <button
              className={`tab ${selectedView === 'growth' ? 'active' : ''}`}
              onClick={() => setSelectedView('growth')}
            >
              growth
            </button>
          </div>

          {/* Heatmap Views */}
          <div className="heatmap-view-container">
            {selectedView === 'contribution' && renderContributionHeatmap()}
            {selectedView === 'language' && renderLanguageHeatmap()}
            {selectedView === 'activity' && renderActivityHeatmap()}
            {selectedView === 'maturity' && renderMaturityHeatmap()}
            {selectedView === 'growth' && renderGrowthHeatmap()}
          </div>
        </div>
      )}
    </div>
  )
}
