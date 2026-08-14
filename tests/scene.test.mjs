/**
 * Scene-module tests: colours, easing, the ambient galaxy, liveness.
 *
 * These are the pure pieces the 3D code is built from. Testing them here means
 * a regression shows up as a failing assertion rather than as "the screenshot
 * looks a bit off".
 */
import { test, describe } from 'vitest'
import assert from 'node:assert/strict'

import {
  getLanguageInfo,
  getAllLanguageColors,
  getLanguageCode,
  getAllLanguageCodes
} from '../src/utils/colors.js'
import { easeOutCubic, easeOutQuad, linear, clamp01 } from '../src/scene/easing.js'
import {
  generateAmbientGalaxy,
  AMBIENT_COUNT,
  AMBIENT_SEED
} from '../src/scene/ambientGalaxy.js'
import { isAlive } from '../src/scene/instancedField.js'

describe('language colours', () => {
  test('known languages get their own colour', () => {
    assert.equal(getLanguageInfo('JavaScript').color, 0xf1e05a)
    assert.equal(getLanguageInfo('javascript').color, 0xf1e05a, 'matching is case-insensitive')
    assert.equal(getLanguageInfo('Rust').name, 'Rust')
  })

  test('unknown and null languages fall back to grey "Other"', () => {
    for (const input of [null, undefined, '', 'Brainfuck']) {
      const info = getLanguageInfo(input)
      assert.equal(info.color, 0x888888)
      assert.equal(info.name, 'Other')
    }
  })

  test('every colour in the map is a valid 24-bit value', () => {
    for (const [key, { color, name }] of Object.entries(getAllLanguageColors())) {
      assert.ok(Number.isInteger(color), `${key} colour must be an integer`)
      assert.ok(color >= 0 && color <= 0xffffff, `${key} colour out of range`)
      assert.ok(typeof name === 'string' && name.length > 0)
    }
  })
})

describe('language codes', () => {
  test('the node label for a known language is its short code', () => {
    assert.equal(getLanguageCode('JavaScript'), 'JS')
    assert.equal(getLanguageCode('Rust'), 'RS')
    assert.equal(getLanguageCode('C++'), 'C++')
  })

  test("GitHub's real names normalise — C++ and C# are not 'Other'", () => {
    // Regression: "C++".toLowerCase() is "c++" but the map key is "cpp", so
    // every C++ repository rendered grey and was labelled C+.
    assert.equal(getLanguageCode('C++'), 'C++')
    assert.equal(getLanguageCode('C#'), 'C#')
    assert.equal(getLanguageInfo('C++').name, 'C++')
    assert.equal(getLanguageInfo('C#').name, 'C#')
    assert.notEqual(getLanguageInfo('C++').color, 0x888888)
    assert.notEqual(getLanguageInfo('C#').color, 0x888888)
  })

  test('an unknown language degrades to two characters rather than breaking', () => {
    assert.equal(getLanguageCode('Zig'), 'ZI')
    assert.equal(getLanguageCode(null), '**')
  })

  test('multi-word names normalise too', () => {
    assert.equal(getLanguageInfo('Objective-C').name, 'Other', 'not mapped, but must not crash')
    assert.equal(getLanguageCode('Jupyter Notebook'), 'PY')
  })

  test('every code fits the atlas cell — three characters at most', () => {
    for (const code of getAllLanguageCodes()) {
      assert.ok(code.length <= 3, `"${code}" is too long for a node label`)
      assert.ok(code.length >= 1)
    }
  })

  test('codes are unique, so two languages never render identically', () => {
    const codes = getAllLanguageCodes()
    assert.equal(new Set(codes).size, codes.length)
  })
})

describe('easing', () => {
  test('curves start at 0 and end at 1', () => {
    for (const fn of [easeOutCubic, easeOutQuad, linear]) {
      assert.equal(fn(0), 0)
      assert.equal(fn(1), 1)
    }
  })

  test('NOTHING overshoots — the design system forbids bounce', () => {
    // This is the assertion that would have caught easeOutBack, which the
    // original entrance used and which overshoots past 1.0 by ~10%.
    for (const fn of [easeOutCubic, easeOutQuad, linear]) {
      for (let t = 0; t <= 1.0001; t += 0.01) {
        const v = fn(t)
        assert.ok(v >= 0 && v <= 1, `${fn.name}(${t.toFixed(2)}) = ${v} left [0,1]`)
      }
    }
  })

  test('curves are monotonic — nothing moves backwards mid-animation', () => {
    for (const fn of [easeOutCubic, easeOutQuad, linear]) {
      let prev = -Infinity
      for (let t = 0; t <= 1; t += 0.02) {
        const v = fn(t)
        assert.ok(v >= prev, `${fn.name} went backwards at t=${t.toFixed(2)}`)
        prev = v
      }
    }
  })

  test('ease-out actually eases out: fast first, slow last', () => {
    assert.ok(easeOutCubic(0.25) > 0.25, 'the first quarter should cover more than a quarter')
    assert.ok(easeOutCubic(0.75) > 0.75)
  })

  test('input outside [0,1] is clamped rather than extrapolated', () => {
    assert.equal(clamp01(-5), 0)
    assert.equal(clamp01(5), 1)
    assert.equal(easeOutCubic(-1), 0)
    assert.equal(easeOutCubic(2), 1)
  })
})

describe('ambient galaxy', () => {
  test('is seeded — every visitor and every screenshot sees the same galaxy', () => {
    const a = generateAmbientGalaxy()
    const b = generateAmbientGalaxy()
    assert.deepEqual(a, b)
    assert.notDeepEqual(
      generateAmbientGalaxy(AMBIENT_COUNT, AMBIENT_SEED + 1),
      a,
      'a different seed must give a different galaxy'
    )
  })

  test('streams in centre-outward, which is the order MOTION.md asks for', () => {
    const items = generateAmbientGalaxy()
    for (let i = 1; i < items.length; i++) {
      assert.ok(
        items[i].radius >= items[i - 1].radius,
        `node ${i} is closer to the centre than node ${i - 1}`
      )
    }
  })

  test('every node is finite, positive and inside the disc', () => {
    for (const item of generateAmbientGalaxy()) {
      for (const axis of ['x', 'y', 'z']) {
        assert.ok(Number.isFinite(item.position[axis]))
      }
      assert.ok(item.size > 0)
      assert.ok(item.radius <= 45, `radius ${item.radius} escaped the disc`)
    }
  })

  test('needs no API call and no browser — it is pure data', () => {
    // The whole point of the ambient galaxy is that it works offline and never
    // rate-limits. If this module ever reached for fetch or window, this test
    // would fail in the node environment.
    assert.equal(generateAmbientGalaxy(10).length, 10)
  })
})

describe('liveness', () => {
  const now = Date.parse('2026-08-14T00:00:00Z')

  test('a repository pushed within 30 days is alive', () => {
    assert.equal(isAlive({ pushed_at: '2026-08-01T00:00:00Z' }, now), true)
  })

  test('a repository pushed long ago is not', () => {
    assert.equal(isAlive({ pushed_at: '2025-01-01T00:00:00Z' }, now), false)
  })

  test('falls back to updated_at, and refuses to guess without either', () => {
    assert.equal(isAlive({ updated_at: '2026-08-10T00:00:00Z' }, now), true)
    assert.equal(isAlive({}, now), false)
    assert.equal(isAlive({ pushed_at: 'nonsense' }, now), false)
    assert.equal(isAlive(null, now), false)
  })

  test('the boundary is 30 days, not 29 or 31', () => {
    const day = 24 * 60 * 60 * 1000
    assert.equal(isAlive({ pushed_at: new Date(now - 29 * day).toISOString() }, now), true)
    assert.equal(isAlive({ pushed_at: new Date(now - 31 * day).toISOString() }, now), false)
  })
})
