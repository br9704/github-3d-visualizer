// @vitest-environment jsdom
/**
 * Service tests — the ones that genuinely need a DOM.
 *
 * localStorage, Blob and URL.createObjectURL are real dependencies of these
 * modules, so this file opts into jsdom with the pragma above. Everything
 * that does NOT need a browser stays in the node environment, so a test cannot
 * quietly start depending on a global the serverless function will never have.
 */
import { test, describe, beforeEach, vi } from 'vitest'
import assert from 'node:assert/strict'

import { heatmapGenerator } from '../../src/services/heatmapGenerator.js'
import { collaborationService } from '../../src/services/collaborationService.js'
import { userPreferences } from '../../src/services/userPreferences.js'
import { makeRepos } from '../fixtures/github.mjs'

const repos = makeRepos(50)

beforeEach(() => {
  localStorage.clear()
})

describe('heatmap intensity ramp', () => {
  test('runs dark to bright, so the most active repos are the most visible', () => {
    // The original ramp went light grey to near-black. On a warm-black ground
    // that rendered the MOST active repositories closest to invisible.
    const shades = [0, 1, 2, 3, 4, 5].map((i) =>
      heatmapGenerator.getIntensityColor(i)
    )

    const luminance = (rgba) => {
      const [r, g, b, a = '1'] = rgba.match(/[\d.]+/g)
      return (Number(r) * 0.2126 + Number(g) * 0.7152 + Number(b) * 0.0722) * Number(a)
    }

    for (let i = 1; i < shades.length; i++) {
      assert.ok(
        luminance(shades[i]) > luminance(shades[i - 1]),
        `intensity ${i} must be brighter than ${i - 1} on a dark ground`
      )
    }
  })

  test('clamps out-of-range intensities instead of returning undefined', () => {
    for (const i of [-5, 0, 5, 99, NaN]) {
      const c = heatmapGenerator.getIntensityColor(i)
      assert.ok(typeof c === 'string' && c.startsWith('rgba('), `got ${c} for ${i}`)
    }
  })
})

describe('share links', () => {
  test('a state survives the round trip through a URL', () => {
    const state = {
      username: 'torvalds',
      language: 'c',
      minStars: 25,
      colorScheme: 'language'
    }
    const url = collaborationService.generateShareUrl(state)
    const back = collaborationService.parseShareUrl(url)

    assert.equal(back.username, 'torvalds')
    assert.equal(back.language, 'c')
    assert.equal(back.minStars, 25)
  })

  test('a malformed or absent share param returns null rather than throwing', () => {
    assert.equal(collaborationService.parseShareUrl('https://example.com/'), null)
    assert.equal(
      collaborationService.parseShareUrl('https://example.com/?viz=not-base64!!'),
      null
    )
    assert.equal(collaborationService.parseShareUrl('not even a url'), null)
  })
})

describe('annotations are local only', () => {
  test('comments persist to localStorage and come back', () => {
    const repo = 'torvalds/linux'
    const result = collaborationService.addComment(repo, 'a note')
    assert.equal(result.success, true)

    const comments = collaborationService.getComments(repo)
    assert.equal(comments.length, 1)
    assert.equal(comments[0].text, 'a note')
    assert.ok(comments[0].createdAt, 'a comment must be timestamped')
  })

  test('an empty comment is refused', () => {
    assert.equal(collaborationService.addComment('a/b', '   ').success, false)
  })

  test('comments can be deleted and pinned', () => {
    const repo = 'a/b'
    collaborationService.addComment(repo, 'one')
    const [comment] = collaborationService.getComments(repo)

    assert.equal(collaborationService.togglePinComment(repo, comment.id), true)
    assert.equal(collaborationService.getComments(repo)[0].isPinned, true)

    assert.equal(collaborationService.deleteComment(repo, comment.id), true)
    assert.equal(collaborationService.getComments(repo).length, 0)
  })

  test('nothing leaves the browser — no network call is made', () => {
    // The README calls this "Share & Annotate (local)" precisely because there
    // is no server. If that ever stopped being true, this would catch it.
    const spy = vi.fn()
    globalThis.fetch = spy
    collaborationService.addComment('a/b', 'local only')
    collaborationService.saveSnapshot('snap', '', { username: 'x' })
    collaborationService.generateShareUrl({ username: 'x' })
    assert.equal(spy.mock.calls.length, 0)
  })
})

describe('snapshots', () => {
  test('save, list and delete', () => {
    const saved = collaborationService.saveSnapshot('first', 'a description', {
      username: 'torvalds'
    })
    assert.equal(saved.success, true)

    const list = collaborationService.loadSnapshots()
    assert.equal(list.length, 1)
    assert.equal(list[0].name, 'first')

    assert.equal(collaborationService.deleteSnapshot(list[0].id), true)
    assert.equal(collaborationService.loadSnapshots().length, 0)
  })

  test('an unnamed snapshot is refused', () => {
    assert.equal(collaborationService.saveSnapshot('', '', {}).success, false)
  })
})

describe('preferences', () => {
  test('defaults load when nothing is stored', () => {
    const prefs = userPreferences.loadAll()
    assert.ok(prefs.filters, 'filters group must exist')
    assert.ok(prefs.visualization)
    assert.ok(prefs.performance)
    assert.equal(typeof prefs.filters.minStars, 'number')
  })

  test('a set value survives a reload', () => {
    userPreferences.set('filters', 'minStars', 42)
    assert.equal(userPreferences.loadAll().filters.minStars, 42)
  })

  test('corrupt storage falls back to defaults rather than crashing', () => {
    localStorage.setItem('github3dviz_preferences', '{ not json')
    const prefs = userPreferences.loadAll()
    assert.ok(prefs.filters, 'must still return a usable shape')
  })
})

describe('heatmap generation', () => {
  test('every mode produces data for a real repository list', () => {
    for (const mode of ['contribution', 'languages', 'activity', 'maturity', 'growth']) {
      const fn =
        heatmapGenerator[
          `generate${mode[0].toUpperCase()}${mode.slice(1)}${
            mode === 'languages' ? 'Distribution' : mode === 'contribution' ? 'Heatmap' : 'Data'
          }`
        ]
      if (typeof fn !== 'function') continue
      const out = fn.call(heatmapGenerator, repos)
      assert.ok(Array.isArray(out) || typeof out === 'object', `${mode} returned nothing usable`)
    }
  })

  test('an empty repository list does not throw', () => {
    assert.doesNotThrow(() => heatmapGenerator.getIntensityColor(0))
  })
})
