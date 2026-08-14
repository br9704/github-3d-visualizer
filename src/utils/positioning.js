/**
 * Calculate 3D positions for repositories.
 *
 *   X = repository age      (left = newest, right = oldest)
 *   Y = stars               (top = most starred)
 *   Z = fork activity       (depth)
 *
 * WHY THIS IS NOT A LINEAR MIN-MAX MAP
 *
 * Stars and forks are power-law distributed: one repository with 60,000 stars
 * and ninety with fewer than fifty is the normal shape of a GitHub profile.
 * Normalising that linearly — `(v - min) / (max - min)` — sends almost every
 * repository to the same coordinate, because almost every value is a rounding
 * error next to the maximum. The result was a dense clump with everything
 * overlapping, and a couple of outliers stranded far away.
 *
 * So each axis is mapped by RANK (its percentile among the others), which is
 * distribution-free: n repositories always spread evenly across the axis
 * whatever the underlying numbers look like. Ties are broken by the raw value
 * so the ordering still means what it says.
 *
 * A relaxation pass then pushes apart any pair still closer than the sum of
 * their radii, so large spheres do not swallow their neighbours.
 */

const SPAN_X = 116 // age
const SPAN_Y = 78 // stars
const SPAN_Z = 92 // forks

/**
 * Map values to their rank in [0, 1].
 * @param {number[]} values
 * @returns {number[]} normalised rank per input index
 */
function rankNormalise(values) {
  const n = values.length
  if (n === 0) return []
  if (n === 1) return [0.5]

  const order = values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v)

  const out = new Array(n)
  order.forEach((entry, rank) => {
    out[entry.i] = rank / (n - 1)
  })
  return out
}

/**
 * Push apart spheres that overlap.
 *
 * Deterministic, and bounded: a fixed number of passes, each moving a pair
 * apart along the line between them. Positions stay close to the data-driven
 * layout — this is separation, not a physics simulation.
 *
 * @param {Array<{position:{x,y,z}, size:number}>} items
 * @param {number} passes
 */
function relaxOverlaps(items, passes = 18) {
  const n = items.length
  // Beyond a few hundred, the O(n^2) pass stops being worth its cost and the
  // rank spread alone is enough.
  if (n < 2 || n > 400) return

  // Generous: nodes have to read as separate objects with labels on them,
  // not as a cluster of touching balls.
  const gap = 4.2

  for (let pass = 0; pass < passes; pass++) {
    let moved = false

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = items[i]
        const b = items[j]
        const minDist = a.size + b.size + gap

        let dx = b.position.x - a.position.x
        let dy = b.position.y - a.position.y
        let dz = b.position.z - a.position.z
        let d = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (d >= minDist) continue

        // Exactly coincident: nudge along a fixed axis rather than a random
        // one, so the layout stays deterministic across reloads.
        if (d < 1e-6) {
          dx = 1
          dy = 0
          dz = 0
          d = 1
        }

        const push = (minDist - d) / 2
        const ux = (dx / d) * push
        const uy = (dy / d) * push
        const uz = (dz / d) * push

        a.position.x -= ux
        a.position.y -= uy
        a.position.z -= uz
        b.position.x += ux
        b.position.y += uy
        b.position.z += uz
        moved = true
      }
    }

    if (!moved) break
  }
}

/**
 * @param {Array<Object>} repos - GitHub repository objects
 * @returns {Array<{repo:Object, position:{x,y,z}, size:number, metadata:Object}>}
 */
export function calculatePositions(repos) {
  if (!repos.length) return []

  const stars = repos.map((r) => r.stargazers_count || 0)
  const forks = repos.map((r) => r.forks_count || 0)
  const dates = repos.map((r) => {
    const t = new Date(r.created_at).getTime()
    return Number.isNaN(t) ? 0 : t
  })

  const ageRank = rankNormalise(dates)
  const starRank = rankNormalise(stars)
  const forkRank = rankNormalise(forks)

  const items = repos.map((repo, i) => ({
    repo,
    position: {
      x: ageRank[i] * SPAN_X - SPAN_X / 2,
      // Inverted so the most-starred sit at the top.
      y: (1 - starRank[i]) * SPAN_Y - SPAN_Y / 2,
      z: forkRank[i] * SPAN_Z - SPAN_Z / 2
    },
    // Size still tracks stars directly — sqrt keeps a 60k-star repo from
    // being 1000x the radius of a 60-star one.
    size: Math.max(0.35, Math.min(3.2, Math.sqrt(stars[i]) / 12)),
    metadata: {
      stars: stars[i],
      forks: forks[i],
      age: ageRank[i]
    }
  }))

  relaxOverlaps(items)

  return items
}

/**
 * Legacy random-jitter separation.
 *
 * Superseded by the deterministic relaxation inside `calculatePositions`;
 * kept exported because it is part of this module's public surface.
 *
 * @deprecated use calculatePositions, which relaxes overlaps itself
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
        pos.x += (Math.random() - 0.5) * 2
        pos.y += (Math.random() - 0.5) * 2
        pos.z += (Math.random() - 0.5) * 2
      }
    }

    return { ...item, position: pos }
  })
}
