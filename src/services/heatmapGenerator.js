/**
 * HeatmapGenerator - Generate heatmap data for visualization
 * Supports activity, contribution, language distribution, and growth heatmaps
 */

export class HeatmapGenerator {
  /**
   * Generate activity heatmap (stars gained over time)
   * Groups repos by creation date and aggregates metrics
   * @param {Array} repos - Repository objects
   * @returns {Array} Heatmap data for chart visualization
   */
  static generateActivityHeatmap(repos) {
    if (!Array.isArray(repos) || repos.length === 0) {
      return []
    }

    // Group by month/year
    const monthlyData = {}

    repos.forEach(repo => {
      const date = new Date(repo.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          reposCreated: 0,
          totalStars: 0,
          totalForks: 0,
          avgStars: 0
        }
      }

      monthlyData[monthKey].reposCreated += 1
      monthlyData[monthKey].totalStars += repo.stargazers_count || 0
      monthlyData[monthKey].totalForks += repo.forks_count || 0
    })

    // Calculate averages
    return Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(item => ({
        ...item,
        avgStars: Math.round(item.totalStars / item.reposCreated)
      }))
  }

  /**
   * Generate contribution heatmap (activity intensity)
   * Shows repository stats distribution
   * @param {Array} repos - Repository objects
   * @returns {Array} Heatmap grid data
   */
  static generateContributionHeatmap(repos) {
    if (!Array.isArray(repos) || repos.length === 0) {
      return []
    }

    // Create intensity scores (0-5) based on multiple factors
    return repos.map((repo, index) => {
      // Calculate intensity: (stars + forks + issues) / 100
      const intensity = Math.min(
        5,
        Math.floor(
          ((repo.stargazers_count || 0) +
            (repo.forks_count || 0) * 2 +
            (repo.open_issues_count || 0)) / 100
        )
      )

      return {
        id: repo.id,
        name: repo.name,
        intensity,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        issues: repo.open_issues_count || 0,
        position: index
      }
    })
  }

  /**
   * Generate language distribution heatmap
   * Shows which languages are most prevalent
   * @param {Array} repos - Repository objects
   * @returns {Object} Language distribution data
   */
  static generateLanguageHeatmap(repos) {
    if (!Array.isArray(repos) || repos.length === 0) {
      return {}
    }

    const languageStats = {}

    repos.forEach(repo => {
      const lang = repo.language || 'No Language'

      if (!languageStats[lang]) {
        languageStats[lang] = {
          language: lang,
          count: 0,
          totalStars: 0,
          totalForks: 0,
          avgStars: 0,
          avgForks: 0
        }
      }

      languageStats[lang].count += 1
      languageStats[lang].totalStars += repo.stargazers_count || 0
      languageStats[lang].totalForks += repo.forks_count || 0
    })

    // Calculate averages and sort by count
    return Object.values(languageStats)
      .map(item => ({
        ...item,
        avgStars: Math.round(item.totalStars / item.count),
        avgForks: Math.round(item.totalForks / item.count),
        intensity: Math.min(5, Math.ceil((item.count / repos.length) * 5))
      }))
      .sort((a, b) => b.count - a.count)
  }

  /**
   * Generate growth heatmap (repo growth over time)
   * Shows cumulative repo count and star growth
   * @param {Array} repos - Repository objects
   * @returns {Array} Growth trajectory data
   */
  static generateGrowthHeatmap(repos) {
    if (!Array.isArray(repos) || repos.length === 0) {
      return []
    }

    // Sort by creation date
    const sorted = [...repos].sort((a, b) =>
      new Date(a.created_at) - new Date(b.created_at)
    )

    let cumulativeRepos = 0
    let cumulativeStars = 0

    return sorted.map((repo, index) => {
      cumulativeRepos += 1
      cumulativeStars += repo.stargazers_count || 0

      return {
        repoName: repo.name,
        repoIndex: index + 1,
        cumulativeRepos,
        cumulativeStars,
        monthCreated: new Date(repo.created_at).toISOString().slice(0, 7),
        repoStars: repo.stargazers_count || 0
      }
    })
  }

  /**
   * Generate time-based activity grid (calendar-like heatmap)
   * Shows activity distribution across days/weeks
   * @param {Array} repos - Repository objects
   * @returns {Array} Activity grid data
   */
  static generateCalendarHeatmap(repos) {
    if (!Array.isArray(repos) || repos.length === 0) {
      return []
    }

    // Group by week number and day of week
    const weekData = {}

    repos.forEach(repo => {
      const date = new Date(repo.created_at)
      const weekNum = this.getWeekNumber(date)
      const dayOfWeek = date.getDay()
      const key = `${weekNum}-${dayOfWeek}`

      if (!weekData[key]) {
        weekData[key] = {
          week: weekNum,
          day: dayOfWeek,
          dayName: this.getDayName(dayOfWeek),
          count: 0,
          totalStars: 0
        }
      }

      weekData[key].count += 1
      weekData[key].totalStars += repo.stargazers_count || 0
    })

    return Object.values(weekData)
      .sort((a, b) => a.week - b.week || a.day - b.day)
  }

  /**
   * Generate repository maturity heatmap
   * Shows age vs stars relationship
   * @param {Array} repos - Repository objects
   * @returns {Array} Maturity scatter data
   */
  static generateMaturityHeatmap(repos) {
    if (!Array.isArray(repos) || repos.length === 0) {
      return []
    }

    const now = Date.now()

    return repos
      .map(repo => {
        const createdDate = new Date(repo.created_at)
        const ageInDays = Math.floor((now - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        const ageInYears = Math.floor(ageInDays / 365)

        return {
          name: repo.name,
          ageInYears,
          stars: repo.stargazers_count || 0,
          forks: repo.forks_count || 0,
          intensity: Math.min(5, Math.ceil(((repo.stargazers_count || 0) / 1000) * 5))
        }
      })
      .sort((a, b) => b.stars - a.stars)
  }

  /**
   * Calculate intensity color based on value
   * Returns RGBA color based on intensity (0-5)
   * @param {number} intensity - Intensity value (0-5)
   * @returns {string} RGBA color string
   */
  static getIntensityColor(intensity) {
    const colors = [
      'rgba(229, 231, 235, 0.5)',  // 0 - light gray
      'rgba(147, 197, 253, 0.7)',  // 1 - light blue
      'rgba(96, 165, 250, 0.8)',   // 2 - blue
      'rgba(37, 99, 235, 0.9)',    // 3 - darker blue
      'rgba(29, 78, 216, 1)',      // 4 - dark blue
      'rgba(15, 23, 42, 1)'        // 5 - very dark blue
    ]
    return colors[Math.min(5, Math.max(0, Math.floor(intensity)))]
  }

  /**
   * Helper: Get week number of date
   */
  static getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  }

  /**
   * Helper: Get day name
   */
  static getDayName(dayNum) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayNum]
  }

  /**
   * Generate comprehensive heatmap report
   * Combines all heatmap types
   * @param {Array} repos - Repository objects
   * @returns {Object} Complete heatmap report
   */
  static generateCompleteReport(repos) {
    return {
      activity: this.generateActivityHeatmap(repos),
      contribution: this.generateContributionHeatmap(repos),
      language: this.generateLanguageHeatmap(repos),
      growth: this.generateGrowthHeatmap(repos),
      calendar: this.generateCalendarHeatmap(repos),
      maturity: this.generateMaturityHeatmap(repos),
      generatedAt: new Date().toISOString()
    }
  }
}

// Export the class itself as the singleton — all methods are static
export const heatmapGenerator = HeatmapGenerator
