/**
 * Positioning tests.
 *
 * The bug these exist to prevent: stars and forks are power-law distributed,
 * and the original linear min-max normalisation sent almost every repository
 * to the same coordinate. The scene rendered as one overlapping mass with a
 * couple of outliers stranded far away. So the assertions here are about
 * SPREAD and SEPARATION, not about exact coordinates.
 */
import { test, describe } from 'vitest'
import assert from 'node:assert/strict'

import { calculatePositions } from '../src/utils/positioning.js'
import { makeRepos } from './fixtures/github.mjs'

/** A profile shaped like a real one: one giant, a few mid, a long flat tail. */
function powerLawRepos(n = 60) {
  return Array.from({ length: n }, (_, i) => ({
    name: `repo-${i}`,
    stargazers_count: i === 0 ? 60000 : i < 4 ? 900 : i % 7,
    forks_count: i === 0 ? 20000 : i < 4 ? 120 : 0,
    created_at: new Date(Date.UTC(2015 + (i % 10), (i * 3) % 12, 1)).toISOString(),
    language: 'C'
  }))
}

describe('spread', () => {
  test('a power-law profile still uses the whole axis', () => {
    const out = calculatePositions(powerLawRepos())
    const ys = out.map((o) => o.position.y)

    // With a linear min-max map, 56 of 60 repos land within a hair of the same
    // y. Rank mapping must spread them.
    const unique = new Set(ys.map((y) => Math.round(y))).size
    assert.ok(
      unique > out.length * 0.5,
      `expected the star axis to spread; only ${unique} distinct rows for ${out.length} repos`
    )

    const span = Math.max(...ys) - Math.min(...ys)
    assert.ok(span > 30, `star axis span was only ${span.toFixed(1)}`)
  })

  test('every axis is used, not just one', () => {
    const out = calculatePositions(makeRepos(80))
    for (const axis of ['x', 'y', 'z']) {
      const values = out.map((o) => o.position[axis])
      const span = Math.max(...values) - Math.min(...values)
      assert.ok(span > 20, `${axis} axis span was only ${span.toFixed(1)}`)
    }
  })

  test('ordering still means what it says: more stars sit higher', () => {
    const repos = [
      { name: 'low', stargazers_count: 1, forks_count: 0, created_at: '2020-01-01T00:00:00Z' },
      { name: 'mid', stargazers_count: 500, forks_count: 0, created_at: '2020-01-01T00:00:00Z' },
      { name: 'high', stargazers_count: 90000, forks_count: 0, created_at: '2020-01-01T00:00:00Z' }
    ]
    const out = calculatePositions(repos)
    const y = Object.fromEntries(out.map((o) => [o.repo.name, o.position.y]))
    assert.ok(y.high < y.mid, 'more stars must sit higher (smaller y is up)')
    assert.ok(y.mid < y.low)
  })
})

describe('separation', () => {
  test('no two nodes overlap after relaxation', () => {
    const out = calculatePositions(makeRepos(90))
    let worst = Infinity
    let offenders = 0

    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i]
        const b = out[j]
        const d = Math.hypot(
          a.position.x - b.position.x,
          a.position.y - b.position.y,
          a.position.z - b.position.z
        )
        const clearance = d - (a.size + b.size)
        if (clearance < worst) worst = clearance
        if (clearance < 0) offenders++
      }
    }

    assert.equal(offenders, 0, `${offenders} overlapping pairs; tightest clearance ${worst.toFixed(2)}`)
  })

  test('layout is deterministic — the same input gives the same output', () => {
    const repos = makeRepos(30)
    const a = calculatePositions(repos)
    const b = calculatePositions(repos)
    assert.deepEqual(
      a.map((o) => o.position),
      b.map((o) => o.position),
      'a reload must not reshuffle the universe'
    )
  })
})

describe('sizing', () => {
  test('size tracks stars and stays inside its bounds', () => {
    const out = calculatePositions([
      { name: 'zero', stargazers_count: 0, forks_count: 0, created_at: '2020-01-01T00:00:00Z' },
      { name: 'huge', stargazers_count: 400000, forks_count: 0, created_at: '2020-01-01T00:00:00Z' }
    ])
    const size = Object.fromEntries(out.map((o) => [o.repo.name, o.size]))
    assert.ok(size.zero >= 0.35, 'a zero-star repo must still be visible')
    assert.ok(size.huge <= 3.2, 'a 400k-star repo must not swallow the scene')
    assert.ok(size.huge > size.zero)
  })
})

describe('edge cases', () => {
  test('an empty list returns an empty layout', () => {
    assert.deepEqual(calculatePositions([]), [])
  })

  test('a single repository is placed, not crashed on', () => {
    const out = calculatePositions([
      { name: 'only', stargazers_count: 5, forks_count: 1, created_at: '2021-01-01T00:00:00Z' }
    ])
    assert.equal(out.length, 1)
    for (const axis of ['x', 'y', 'z']) {
      assert.ok(Number.isFinite(out[0].position[axis]), `${axis} must be finite`)
    }
  })

  test('identical repositories do not collapse onto one point', () => {
    const same = Array.from({ length: 12 }, (_, i) => ({
      name: `same-${i}`,
      stargazers_count: 7,
      forks_count: 2,
      created_at: '2022-06-01T00:00:00Z'
    }))
    const out = calculatePositions(same)
    const distances = []
    for (let i = 0; i < out.length; i++)
      for (let j = i + 1; j < out.length; j++)
        distances.push(
          Math.hypot(
            out[i].position.x - out[j].position.x,
            out[i].position.y - out[j].position.y,
            out[i].position.z - out[j].position.z
          )
        )
    assert.ok(Math.min(...distances) > 0.5, 'relaxation must separate identical inputs')
  })

  test('a missing or malformed created_at does not produce NaN coordinates', () => {
    const out = calculatePositions([
      { name: 'a', stargazers_count: 1, forks_count: 0, created_at: 'not-a-date' },
      { name: 'b', stargazers_count: 2, forks_count: 0 }
    ])
    for (const item of out) {
      for (const axis of ['x', 'y', 'z']) {
        assert.ok(Number.isFinite(item.position[axis]), `${item.repo.name}.${axis} was not finite`)
      }
    }
  })
})
