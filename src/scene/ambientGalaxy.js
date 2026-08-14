/**
 * ambientGalaxy — the empty state, which is the product.
 *
 * Most visitors never type a username. Before this existed, they saw an empty
 * canvas and, if they did search, an error from GitHub's 60 req/hour shared
 * limit. MOTION.md: "A visitor who types nothing still sees a living 3D
 * object, styled, branded, moving. That alone deletes the blank-page problem."
 *
 * Deliberately:
 *   - seeded, so every visitor and every screenshot sees the same galaxy
 *   - procedural, so it needs no API call, works offline and never rate-limits
 *   - UNCOLOURED, so it reads as scenery rather than as data. Language colour
 *     means something in this app; scenery must not borrow that meaning.
 */

/** Mulberry32 — deterministic, tiny. Same seed, same galaxy, every load. */
function rng(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const AMBIENT_COUNT = 88
export const AMBIENT_SEED = 20260814

/**
 * Build the placeholder galaxy.
 *
 * Shape: a thick disc, denser toward the centre, so it reads as a structure
 * rather than as noise in a box. Spheres are returned sorted centre-outward,
 * which is the order MOTION.md wants them to stream in.
 *
 * @param {number} [count]
 * @param {number} [seed]
 * @returns {Array<{position: {x,y,z}, size: number, radius: number}>}
 */
export function generateAmbientGalaxy(count = AMBIENT_COUNT, seed = AMBIENT_SEED) {
  const rand = rng(seed)
  const out = []

  for (let i = 0; i < count; i++) {
    // sqrt keeps the areal density even instead of clumping at the centre,
    // then a mild bias pulls a few more inward so the core reads as a core.
    const r = Math.pow(rand(), 0.62) * 34
    const theta = rand() * Math.PI * 2
    const height = (rand() - 0.5) * 16 * (1 - r / 48)

    // A little depth variance so it is a galaxy, not a plate.
    const z = Math.cos(theta) * r * 0.9 + (rand() - 0.5) * 6

    const position = {
      x: Math.sin(theta) * r,
      y: height,
      z
    }

    // Long-tail sizes, matching how real repositories distribute by stars.
    const size = 0.3 + Math.pow(rand(), 3) * 1.7

    out.push({
      position,
      size,
      radius: Math.hypot(position.x, position.y, position.z)
    })
  }

  // Centre outward — the order the entrance streams in.
  return out.sort((a, b) => a.radius - b.radius)
}
