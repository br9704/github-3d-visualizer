/**
 * The scene-graph interchange format.
 *
 * This is a CONTRACT, not an internal shape: gitpulse's `--export` writes it
 * and this app reads it. That means two rules apply that would not apply to an
 * internal type:
 *
 *   1. `version` is explicit, and a reader must refuse a version it does not
 *      understand rather than guessing.
 *   2. Layout is OPTIONAL. A producer that only knows about repositories
 *      should not have to invent 3D coordinates; if `position` and `size` are
 *      absent this app computes them with its own positioning rules. A
 *      producer that HAS a layout it cares about can pin it.
 *
 * Declared in aethereum as `SceneGraph v1` (frozen).
 */

export const SCENE_FORMAT = 'github-3d-visualizer/scene'
export const SCENE_VERSION = 1

/** Fields a node must carry. Everything else is optional. */
const REQUIRED_NODE_FIELDS = ['id', 'label']

/**
 * Validate an untrusted object against the contract.
 *
 * Returns every problem rather than throwing on the first, because a producer
 * fixing their exporter wants the whole list, not a game of whack-a-mole.
 *
 * @param {unknown} input
 * @returns {{ok: boolean, errors: string[], graph: object|null}}
 */
export function validateSceneGraph(input) {
  const errors = []

  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['not an object'], graph: null }
  }

  if (input.format !== SCENE_FORMAT) {
    errors.push(
      `format must be "${SCENE_FORMAT}", got ${JSON.stringify(input.format ?? null)}`
    )
  }

  if (input.version !== SCENE_VERSION) {
    // Deliberately not "best effort". A reader that guesses at an unknown
    // version produces a wrong picture silently, which is worse than refusing.
    errors.push(`unsupported version ${JSON.stringify(input.version ?? null)} — expected ${SCENE_VERSION}`)
  }

  if (!Array.isArray(input.nodes)) {
    errors.push('nodes must be an array')
    return { ok: false, errors, graph: null }
  }

  if (input.nodes.length === 0) {
    errors.push('nodes is empty')
  }

  const seen = new Set()
  input.nodes.forEach((node, i) => {
    if (node == null || typeof node !== 'object') {
      errors.push(`nodes[${i}] is not an object`)
      return
    }
    for (const field of REQUIRED_NODE_FIELDS) {
      if (typeof node[field] !== 'string' || node[field].length === 0) {
        errors.push(`nodes[${i}].${field} must be a non-empty string`)
      }
    }
    if (typeof node.id === 'string') {
      if (seen.has(node.id)) errors.push(`nodes[${i}].id "${node.id}" is duplicated`)
      seen.add(node.id)
    }
    for (const field of ['stars', 'forks', 'issues', 'watchers']) {
      if (node[field] != null && (typeof node[field] !== 'number' || node[field] < 0)) {
        errors.push(`nodes[${i}].${field} must be a non-negative number`)
      }
    }
    if (node.position != null) {
      const p = node.position
      const bad =
        typeof p !== 'object' ||
        ['x', 'y', 'z'].some((k) => typeof p[k] !== 'number' || !Number.isFinite(p[k]))
      if (bad) errors.push(`nodes[${i}].position must be {x, y, z} finite numbers`)
    }
    if (node.size != null && (typeof node.size !== 'number' || !(node.size > 0))) {
      errors.push(`nodes[${i}].size must be a positive number`)
    }
  })

  return { ok: errors.length === 0, errors, graph: errors.length === 0 ? input : null }
}

/**
 * Build a scene graph from this app's own state.
 *
 * Used by the export panel, and by the round-trip test that proves the format
 * survives a lap through both directions.
 *
 * @param {Array<{repo: object, position: {x,y,z}, size: number}>} positioned
 * @param {{login?: string}} [subject]
 * @param {{includeLayout?: boolean, generatedAt?: string}} [options]
 */
export function toSceneGraph(positioned, subject = {}, options = {}) {
  const { includeLayout = true, generatedAt = new Date().toISOString() } = options

  return {
    format: SCENE_FORMAT,
    version: SCENE_VERSION,
    generator: 'github-3d-visualizer',
    generatedAt,
    subject: { login: subject.login ?? null },
    nodes: positioned.map(({ repo, position, size }) => {
      const node = {
        id: repo.full_name || `${subject.login ?? 'unknown'}/${repo.name}`,
        label: repo.name,
        language: repo.language ?? null,
        description: repo.description ?? null,
        url: repo.html_url ?? null,
        stars: repo.stargazers_count ?? 0,
        forks: repo.forks_count ?? 0,
        issues: repo.open_issues_count ?? 0,
        watchers: repo.watchers_count ?? 0,
        createdAt: repo.created_at ?? null,
        pushedAt: repo.pushed_at ?? repo.updated_at ?? null
      }
      if (includeLayout) {
        node.position = { x: position.x, y: position.y, z: position.z }
        node.size = size
      }
      return node
    })
  }
}

/**
 * Turn a validated graph into the shape the rest of the app already speaks.
 *
 * Returns repo-like objects so every existing consumer — the detail panel, the
 * language filter, the exporters, the heatmaps — works unchanged. A separate
 * "imported scene" code path would mean maintaining two of everything.
 *
 * @param {object} graph - already through validateSceneGraph
 * @returns {{repos: object[], positioned: object[]|null, subject: object}}
 */
export function fromSceneGraph(graph) {
  const repos = graph.nodes.map((node) => ({
    id: node.id,
    name: node.label,
    full_name: node.id,
    html_url: node.url ?? null,
    description: node.description ?? null,
    language: node.language ?? null,
    stargazers_count: node.stars ?? 0,
    forks_count: node.forks ?? 0,
    open_issues_count: node.issues ?? 0,
    watchers_count: node.watchers ?? 0,
    created_at: node.createdAt ?? null,
    updated_at: node.pushedAt ?? null,
    pushed_at: node.pushedAt ?? null,
    archived: false,
    fork: false,
    readme: null
  }))

  // Layout is honoured only if EVERY node carries it. A partially-positioned
  // graph would put some nodes at meaningful coordinates and the rest at the
  // origin, which reads as a bug rather than as data.
  const allPositioned = graph.nodes.every(
    (n) => n.position != null && typeof n.size === 'number'
  )

  const positioned = allPositioned
    ? graph.nodes.map((node, i) => ({
        repo: repos[i],
        position: { x: node.position.x, y: node.position.y, z: node.position.z },
        size: node.size,
        metadata: { stars: node.stars ?? 0, forks: node.forks ?? 0, age: 0 }
      }))
    : null

  return {
    repos,
    positioned,
    subject: graph.subject ?? {},
    generator: graph.generator ?? 'unknown'
  }
}

/**
 * Parse raw text into a scene graph, with messages in the app's own voice.
 *
 * @param {string} text
 * @returns {{ok: boolean, errors: string[], graph: object|null}}
 */
export function parseSceneGraph(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    return { ok: false, errors: [`not valid json — ${err.message}`], graph: null }
  }
  return validateSceneGraph(parsed)
}
