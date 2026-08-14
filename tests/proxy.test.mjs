/**
 * Proxy tests — run against a MOCKED upstream, never against real GitHub.
 *
 * No PAT exists on this machine and none is needed: what has to be proven here
 * is the proxy's own behaviour — that it refuses paths outside its allowlist,
 * that it attaches the token outbound and never leaks it, that it caches
 * successes and refuses to cache errors, and that it passes the rate-limit
 * signal through so the client can say "try again in 4m".
 *
 *   node --test tests/proxy.test.mjs
 *
 * Written with node:test so it runs with zero dependencies; S9 wires the same
 * assertions into the Vitest suite and CI.
 */
import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import handler from '../api/github/[...path].js'

const TOKEN = 'ghp_TESTTOKENnotreal000000000000000000'

/** Minimal VercelResponse stand-in that records what the handler did. */
function makeRes() {
  const res = {
    statusCode: null,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = String(v)
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(obj) {
      this.body = obj
      return this
    },
    send(text) {
      this.body = text
      return this
    }
  }
  return res
}

function makeReq(path, query = {}, { method = 'GET', accept = '' } = {}) {
  return {
    method,
    headers: { accept },
    query: { path: path.split('/'), ...query }
  }
}

let calls = []
const realFetch = globalThis.fetch

function mockUpstream(responder) {
  globalThis.fetch = async (url, init) => {
    calls.push({ url: url.toString(), init })
    return responder(url.toString(), init)
  }
}

function jsonResponse(body, { status = 200, headers = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      get: (k) => ({ 'content-type': 'application/json', ...headers })[k.toLowerCase()] ?? null
    },
    json: async () => body,
    text: async () => JSON.stringify(body)
  }
}

beforeEach(() => {
  calls = []
  process.env.GITHUB_TOKEN = TOKEN
})

afterEach(() => {
  globalThis.fetch = realFetch
  delete process.env.GITHUB_TOKEN
})

describe('allowlist', () => {
  test('permits the endpoints the app actually uses', async () => {
    mockUpstream(() => jsonResponse({ login: 'torvalds' }))
    for (const p of [
      'users/torvalds',
      'users/torvalds/repos',
      'repos/torvalds/linux/readme',
      'search/users'
    ]) {
      const res = makeRes()
      await handler(makeReq(p), res)
      assert.equal(res.statusCode, 200, `${p} should be allowed`)
    }
  })

  test('refuses anything else, so this is not an open authenticated proxy', async () => {
    mockUpstream(() => jsonResponse({ should: 'never be reached' }))
    for (const p of [
      'user', // the authenticated user — would expose the token owner
      'users/torvalds/followers',
      'repos/torvalds/linux', // full repo payload, not needed
      'orgs/github/members',
      'gists',
      'notifications'
    ]) {
      const res = makeRes()
      await handler(makeReq(p), res)
      assert.equal(res.statusCode, 403, `${p} must be refused`)
    }
    assert.equal(calls.length, 0, 'a refused path must never reach GitHub')
  })

  test('refuses a path that tries to escape the allowlist', async () => {
    mockUpstream(() => jsonResponse({}))
    const res = makeRes()
    await handler(makeReq('users/torvalds/../../user'), res)
    assert.equal(res.statusCode, 403)
    assert.equal(calls.length, 0)
  })

  test('refuses non-GET methods', async () => {
    mockUpstream(() => jsonResponse({}))
    const res = makeRes()
    await handler(makeReq('users/torvalds', {}, { method: 'DELETE' }), res)
    assert.equal(res.statusCode, 405)
    assert.equal(calls.length, 0)
  })
})

describe('the token', () => {
  test('rides the OUTBOUND request only', async () => {
    mockUpstream(() => jsonResponse({ login: 'torvalds' }))
    const res = makeRes()
    await handler(makeReq('users/torvalds'), res)

    assert.equal(calls[0].init.headers.Authorization, `Bearer ${TOKEN}`)

    const serialised = JSON.stringify({ headers: res.headers, body: res.body })
    assert.ok(!serialised.includes(TOKEN), 'the token must never reach the client')
    assert.ok(
      !Object.keys(res.headers).includes('authorization'),
      'no Authorization header may be returned'
    )
  })

  test('still works with no token configured, just with the lower limit', async () => {
    delete process.env.GITHUB_TOKEN
    mockUpstream(() => jsonResponse({ login: 'torvalds' }))
    const res = makeRes()
    await handler(makeReq('users/torvalds'), res)

    assert.equal(res.statusCode, 200)
    assert.equal(calls[0].init.headers.Authorization, undefined)
  })
})

describe('query handling', () => {
  test('forwards only known parameters, and bounds them', async () => {
    mockUpstream(() => jsonResponse([]))
    const res = makeRes()
    await handler(
      makeReq('users/torvalds/repos', {
        per_page: '9999',
        page: '400',
        sort: 'stars',
        direction: 'desc',
        // Not in the allowlist — must be dropped rather than forwarded.
        client_secret: 'leak-me',
        callback: 'evil'
      }),
      res
    )

    const url = new URL(calls[0].url)
    assert.equal(url.searchParams.get('per_page'), '100', 'per_page is clamped')
    assert.equal(url.searchParams.get('page'), '10', 'page is clamped')
    assert.equal(url.searchParams.get('sort'), 'stars')
    assert.equal(url.searchParams.get('client_secret'), null)
    assert.equal(url.searchParams.get('callback'), null)
  })

  test('rejects an unknown sort value rather than passing it upstream', async () => {
    mockUpstream(() => jsonResponse([]))
    const res = makeRes()
    await handler(makeReq('users/torvalds/repos', { sort: 'not-a-sort' }), res)
    assert.equal(new URL(calls[0].url).searchParams.get('sort'), null)
  })
})

describe('caching', () => {
  test('a success is cacheable at the edge and briefly in the browser', async () => {
    mockUpstream(() => jsonResponse({ login: 'torvalds' }))
    const res = makeRes()
    await handler(makeReq('users/torvalds'), res)

    assert.match(res.headers['vercel-cdn-cache-control'], /s-maxage=1800/)
    assert.match(res.headers['vercel-cdn-cache-control'], /stale-while-revalidate=86400/)
    assert.match(res.headers['cache-control'], /max-age=60/)
    assert.ok(
      !/s-maxage/.test(res.headers['cache-control']),
      'the browser directive must not carry the edge TTL'
    )
  })

  test('an error is NOT cached', async () => {
    mockUpstream(() => jsonResponse({ message: 'Not Found' }, { status: 404 }))
    const res = makeRes()
    await handler(makeReq('users/nobody-at-all'), res)

    assert.equal(res.statusCode, 404)
    assert.equal(res.headers['cache-control'], 'no-store')
    assert.equal(res.headers['vercel-cdn-cache-control'], undefined)
  })
})

describe('rate-limit signal', () => {
  test('passes reset headers through so the client can say "try again in 4m"', async () => {
    const reset = String(Math.floor(Date.now() / 1000) + 240)
    mockUpstream(() =>
      jsonResponse(
        { message: 'API rate limit exceeded' },
        {
          status: 403,
          headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': reset }
        }
      )
    )
    const res = makeRes()
    await handler(makeReq('users/torvalds'), res)

    assert.equal(res.statusCode, 403)
    assert.equal(res.headers['x-ratelimit-reset'], reset)
    assert.equal(res.headers['x-ratelimit-remaining'], '0')
  })
})

describe('upstream failure', () => {
  test('a network error becomes a 502, not an unhandled rejection', async () => {
    globalThis.fetch = async () => {
      throw new Error('ECONNREFUSED')
    }
    const res = makeRes()
    await handler(makeReq('users/torvalds'), res)
    assert.equal(res.statusCode, 502)
  })
})

describe('README passthrough', () => {
  test('asks GitHub for raw content when the client does', async () => {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: url.toString(), init })
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'text/plain' : null) },
        text: async () => '# A readme'
      }
    }
    const res = makeRes()
    await handler(
      makeReq('repos/torvalds/linux/readme', {}, { accept: 'application/vnd.github.v3.raw' }),
      res
    )

    assert.equal(calls[0].init.headers.Accept, 'application/vnd.github.v3.raw')
    assert.equal(res.body, '# A readme')
    assert.equal(res.headers['content-type'], 'text/plain')
  })
})
