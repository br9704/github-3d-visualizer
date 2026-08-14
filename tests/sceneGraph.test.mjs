/**
 * Scene-graph contract tests.
 *
 * This format is consumed by another tool (gitpulse's `--export`), so the
 * tests are written against the CONTRACT rather than the implementation: what
 * a producer is allowed to omit, what a reader must refuse, and whether a
 * round trip is lossless.
 */
import { test, describe, expect } from 'vitest'
import assert from 'node:assert/strict'

import {
  SCENE_FORMAT,
  SCENE_VERSION,
  validateSceneGraph,
  parseSceneGraph,
  toSceneGraph,
  fromSceneGraph
} from '../src/scene/sceneGraph.js'
import { makeRepos } from './fixtures/github.mjs'
import { calculatePositions } from '../src/utils/positioning.js'

const positioned = calculatePositions(makeRepos(40))

describe('round trip', () => {
  test('export then import reproduces the scene exactly', () => {
    const graph = toSceneGraph(positioned, { login: 'fixture' }, {
      generatedAt: '2026-08-14T00:00:00.000Z'
    })

    const { ok, errors } = validateSceneGraph(graph)
    assert.ok(ok, `our own export must validate: ${errors.join('; ')}`)

    const back = fromSceneGraph(graph)

    assert.equal(back.repos.length, positioned.length)
    assert.ok(back.positioned, 'layout was pinned, so it must come back pinned')

    positioned.forEach((original, i) => {
      const round = back.positioned[i]
      assert.equal(round.repo.name, original.repo.name)
      assert.equal(round.repo.language, original.repo.language)
      assert.equal(round.repo.stargazers_count, original.repo.stargazers_count)
      assert.equal(round.repo.forks_count, original.repo.forks_count)
      assert.equal(round.size, original.size)
      assert.deepEqual(round.position, {
        x: original.position.x,
        y: original.position.y,
        z: original.position.z
      })
    })
  })

  test('survives a trip through JSON.stringify/parse, which is how it travels', () => {
    const graph = toSceneGraph(positioned, { login: 'fixture' })
    const { ok, graph: parsed } = parseSceneGraph(JSON.stringify(graph))
    assert.ok(ok)
    assert.equal(parsed.nodes.length, positioned.length)
  })
})

describe('what a producer may omit', () => {
  test('layout is optional — a producer that has no 3D opinion still works', () => {
    const graph = {
      format: SCENE_FORMAT,
      version: SCENE_VERSION,
      generator: 'gitpulse',
      nodes: [
        { id: 'a/one', label: 'one', language: 'Rust', stars: 12 },
        { id: 'a/two', label: 'two', language: 'Go', stars: 3 }
      ]
    }
    const { ok, errors } = validateSceneGraph(graph)
    assert.ok(ok, errors.join('; '))

    const back = fromSceneGraph(graph)
    assert.equal(back.positioned, null, 'no layout in, no layout out')
    assert.equal(back.repos.length, 2)
    // The app computes it instead, and that must succeed on this shape.
    assert.equal(calculatePositions(back.repos).length, 2)
  })

  test('a PARTIALLY positioned graph is treated as unpositioned', () => {
    // Honouring half a layout would put some nodes at meaningful coordinates
    // and the rest at the origin, which reads as a bug rather than as data.
    const graph = {
      format: SCENE_FORMAT,
      version: SCENE_VERSION,
      nodes: [
        { id: 'a/one', label: 'one', position: { x: 1, y: 2, z: 3 }, size: 1 },
        { id: 'a/two', label: 'two' }
      ]
    }
    assert.ok(validateSceneGraph(graph).ok)
    assert.equal(fromSceneGraph(graph).positioned, null)
  })

  test('only id and label are required', () => {
    const graph = {
      format: SCENE_FORMAT,
      version: SCENE_VERSION,
      nodes: [{ id: 'a/one', label: 'one' }]
    }
    assert.ok(validateSceneGraph(graph).ok)
  })
})

describe('what a reader must refuse', () => {
  test('an unknown version, rather than guessing', () => {
    const { ok, errors } = validateSceneGraph({
      format: SCENE_FORMAT,
      version: 99,
      nodes: [{ id: 'a', label: 'a' }]
    })
    assert.equal(ok, false)
    assert.ok(errors.some((e) => /unsupported version/.test(e)))
  })

  test('a foreign format', () => {
    const { ok, errors } = validateSceneGraph({
      format: 'something/else',
      version: 1,
      nodes: []
    })
    assert.equal(ok, false)
    assert.ok(errors.some((e) => /format must be/.test(e)))
  })

  test('duplicate node ids', () => {
    const { ok, errors } = validateSceneGraph({
      format: SCENE_FORMAT,
      version: SCENE_VERSION,
      nodes: [
        { id: 'a/one', label: 'one' },
        { id: 'a/one', label: 'again' }
      ]
    })
    assert.equal(ok, false)
    assert.ok(errors.some((e) => /duplicated/.test(e)))
  })

  test('negative counts and non-finite positions', () => {
    const { ok, errors } = validateSceneGraph({
      format: SCENE_FORMAT,
      version: SCENE_VERSION,
      nodes: [
        { id: 'a/one', label: 'one', stars: -5 },
        { id: 'a/two', label: 'two', position: { x: 0, y: NaN, z: 0 } },
        { id: 'a/three', label: 'three', size: 0 }
      ]
    })
    assert.equal(ok, false)
    assert.ok(errors.some((e) => /stars must be a non-negative number/.test(e)))
    assert.ok(errors.some((e) => /position must be/.test(e)))
    assert.ok(errors.some((e) => /size must be a positive number/.test(e)))
  })

  test('reports EVERY problem, not just the first', () => {
    const { errors } = validateSceneGraph({
      format: 'wrong',
      version: 42,
      nodes: [{ label: 'no id' }, { id: 'x' }]
    })
    assert.ok(errors.length >= 4, `expected several errors, got ${errors.length}`)
  })

  test('malformed JSON produces a readable message, not a crash', () => {
    const { ok, errors } = parseSceneGraph('{ not json')
    assert.equal(ok, false)
    assert.match(errors[0], /not valid json/)
  })

  test('null, arrays and primitives are refused', () => {
    for (const bad of [null, undefined, 42, 'a string', [1, 2, 3]]) {
      assert.equal(validateSceneGraph(bad).ok, false, `${JSON.stringify(bad)} must be refused`)
    }
  })
})

describe('the exported shape', () => {
  test('carries the format marker and version a consumer keys off', () => {
    const graph = toSceneGraph(positioned.slice(0, 2), { login: 'fixture' })
    assert.equal(graph.format, SCENE_FORMAT)
    assert.equal(graph.version, SCENE_VERSION)
    assert.equal(graph.subject.login, 'fixture')
    assert.equal(typeof graph.generatedAt, 'string')
  })

  test('can be exported without layout, for a consumer that wants to lay it out', () => {
    const graph = toSceneGraph(positioned.slice(0, 3), { login: 'fixture' }, {
      includeLayout: false
    })
    assert.ok(validateSceneGraph(graph).ok)
    assert.ok(graph.nodes.every((n) => n.position === undefined && n.size === undefined))
    assert.equal(fromSceneGraph(graph).positioned, null)
  })
})
