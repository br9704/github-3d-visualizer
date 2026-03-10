import { useMemo } from 'react'
import '../styles/AnalyticsDashboard.css'

export default function AnalyticsDashboard({ repos = [] }) {
  const analytics = useMemo(() => {
    if (!repos || repos.length === 0) return null

    // Language breakdown
    const languageStats = {}
    let totalStars = 0
    let totalForks = 0
    let totalWatchers = 0

    repos.forEach(repo => {
      const lang = repo.language || 'Other'
      if (!languageStats[lang]) {
        languageStats[lang] = { count: 0, stars: 0, forks: 0 }
      }
      languageStats[lang].count++
      languageStats[lang].stars += repo.stargazers_count || 0
      languageStats[lang].forks += repo.forks_count || 0

      totalStars += repo.stargazers_count || 0
      totalForks += repo.forks_count || 0
      totalWatchers += repo.watchers_count || 0
    })

    // Sort by count
    const sortedLanguages = Object.entries(languageStats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8) // Top 8 languages

    // Most forked repos
    const mostForked = [...repos]
      .sort((a, b) => (b.forks_count || 0) - (a.forks_count || 0))
      .slice(0, 5)

    // Most starred repos
    const mostStarred = [...repos]
      .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
      .slice(0, 5)

    // Growth trends (simulated based on current stars/forks)
    const growthTrends = repos
      .map(repo => ({
        name: repo.name,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        growth: (repo.stargazers_count || 0) + (repo.forks_count || 0) // Combined momentum
      }))
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 10)

    return {
      totalRepos: repos.length,
      totalStars,
      totalForks,
      totalWatchers,
      languageStats: sortedLanguages,
      mostForked,
      mostStarred,
      growthTrends
    }
  }, [repos])

  if (!analytics) return null

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h2>📊 Repository Analytics</h2>
      </div>

      {/* Summary Stats */}
      <div className="analytics-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-number">{analytics.totalRepos}</div>
            <div className="stat-label">Total Repositories</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-number">{analytics.totalStars.toLocaleString()}</div>
            <div className="stat-label">Total Stars</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔀</div>
          <div className="stat-content">
            <div className="stat-number">{analytics.totalForks.toLocaleString()}</div>
            <div className="stat-label">Total Forks</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👁️</div>
          <div className="stat-content">
            <div className="stat-number">{analytics.totalWatchers.toLocaleString()}</div>
            <div className="stat-label">Watchers</div>
          </div>
        </div>
      </div>

      {/* Language Breakdown */}
      <div className="analytics-section">
        <h3>Language Breakdown</h3>
        <div className="language-chart">
          {analytics.languageStats.map(([lang, stats]) => {
            const percentage = (stats.count / analytics.totalRepos) * 100
            return (
              <div key={lang} className="language-bar">
                <div className="language-info">
                  <span className="language-name">{lang}</span>
                  <span className="language-count">{stats.count} repos</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="language-percentage">{percentage.toFixed(1)}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Forked Repos */}
      <div className="analytics-section">
        <h3>🔀 Most Forked Repositories</h3>
        <div className="repo-list">
          {analytics.mostForked.map((repo, idx) => (
            <div key={repo.id} className="repo-item">
              <div className="repo-rank">{idx + 1}</div>
              <div className="repo-info">
                <div className="repo-name">{repo.name}</div>
                <div className="repo-stats">
                  <span>⭐ {(repo.stargazers_count || 0).toLocaleString()}</span>
                  <span>🔀 {(repo.forks_count || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Starred Repos */}
      <div className="analytics-section">
        <h3>⭐ Most Starred Repositories</h3>
        <div className="repo-list">
          {analytics.mostStarred.map((repo, idx) => (
            <div key={repo.id} className="repo-item">
              <div className="repo-rank">{idx + 1}</div>
              <div className="repo-info">
                <div className="repo-name">{repo.name}</div>
                <div className="repo-stats">
                  <span>⭐ {(repo.stargazers_count || 0).toLocaleString()}</span>
                  <span>🔀 {(repo.forks_count || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Growth Trends */}
      <div className="analytics-section">
        <h3>📈 Growth Trends (Top 10)</h3>
        <div className="growth-chart">
          {analytics.growthTrends.map((repo, idx) => {
            const maxGrowth = analytics.growthTrends[0]?.growth || 1
            const growthPercentage = (repo.growth / maxGrowth) * 100
            return (
              <div key={repo.name} className="growth-bar">
                <div className="growth-info">
                  <span className="growth-rank">{idx + 1}.</span>
                  <span className="growth-name">{repo.name}</span>
                </div>
                <div className="growth-bar-container">
                  <div
                    className="growth-fill"
                    style={{ width: `${growthPercentage}%` }}
                  />
                </div>
                <span className="growth-value">{repo.growth}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
