/**
 * Calculate 3D positions for repos based on metadata
 * X-axis = Repository age (left = new, right = old)
 * Y-axis = Stars/activity level (top = more stars, bottom = less)
 * Z-axis = Forks/popularity (cluster by activity)
 */
export function calculatePositions(repos) {
  if (!repos.length) return []

  // Extract metadata for normalization
  const stars = repos.map((r) => r.stargazers_count || 0)
  const forks = repos.map((r) => r.forks_count || 0)
  const dates = repos.map((r) => new Date(r.created_at).getTime())

  // Handle edge cases: All repos same value (prevent division by zero)
  const minStars = Math.min(...stars)
  const maxStars = Math.max(...stars)
  const minForks = Math.min(...forks)
  const maxForks = Math.max(...forks)
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)

  const starRange = maxStars - minStars
  const forkRange = maxForks - minForks
  const dateRange = maxDate - minDate

  return repos.map((repo, i) => {
    // X-axis: Repository age (left = new, right = old)
    // Edge case: All repos same date → spread randomly
    const ageNorm =
      dateRange === 0 ? Math.random() : (dates[i] - minDate) / dateRange
    const x = ageNorm * 60 - 30 // Range: -30 to 30

    // Y-axis: Stars (higher = more stars, inverted so top = most stars)
    // Edge case: All repos have 0 stars → spread randomly
    const starsNorm =
      starRange === 0 ? Math.random() : (stars[i] - minStars) / starRange
    const y = (1 - starsNorm) * 40 - 20 // Range: -20 to 20

    // Z-axis: Forks (cluster by popularity)
    // Edge case: All repos have 0 forks → spread randomly
    const forksNorm =
      forkRange === 0 ? Math.random() : (forks[i] - minForks) / forkRange
    const z = forksNorm * 60 - 30 // Range: -30 to 30

    // Size: Based on stars (sqrt for visual balance)
    // Min 0.3, max 4, formula: sqrt(stars) / 10
    const size = Math.max(0.3, Math.min(4, Math.sqrt(stars[i]) / 10))

    return {
      repo,
      position: { x, y, z },
      size,
      metadata: {
        stars: stars[i],
        forks: forks[i],
        age: ageNorm
      }
    }
  })
}

/**
 * Optional: Prevent sphere overlaps with jitter
 * Add random displacement if two spheres are too close
 */
export function addAntiOverlapJitter(positionedRepos, minDistance = 2) {
  return positionedRepos.map((item, i) => {
    const pos = { ...item.position }

    for (let j = 0; j < i; j++) {
      const other = positionedRepos[j].position
      const dx = pos.x - other.x
      const dy = pos.y - other.y
      const dz = pos.z - other.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (dist < minDistance) {
        // Add random jitter to avoid overlap
        pos.x += (Math.random() - 0.5) * 2
        pos.y += (Math.random() - 0.5) * 2
        pos.z += (Math.random() - 0.5) * 2
      }
    }

    return { ...item, position: pos }
  })
}
