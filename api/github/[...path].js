/**
 * /api/github/* — the GitHub proxy.
 *
 * WHY THIS EXISTS
 *
 * The client used to call api.github.com directly with no Authorization
 * header, so every visitor shared GitHub's 60 requests/hour UNAUTHENTICATED
 * limit, keyed by IP — and that limit was tightened further in May 2025. A
 * public demo would rate-limit almost immediately for anyone who tried it.
 * This is the one thing that had to be fixed before deploying was meaningful.
 *
 * HOW IT KEEPS THE TOKEN SAFE
 *
 * The PAT is read from the environment and attached to the OUTBOUND fetch
 * only. It is never sent to the browser, never echoed in a response body, and
 * never appears in a header we return. Because the INCOMING request carries no
 * Authorization header of its own, responses are safely cacheable — which is
 * the whole point of the caching below.
 *
 * WHY CACHING IS THE REAL DEFENCE
 *
 * Demo traffic concentrates on a handful of famous usernames. The CDN cache,
 * not the rate limiter, is what keeps the PAT's 5,000/hour budget from being
 * spent: a cache hit costs zero GitHub quota. The rate limiter is the backstop
 * for someone deliberately enumerating usernames.
 *
 * SSRF
 *
 * The path is matched against an explicit allowlist of GitHub endpoints this
 * app actually uses. Without that, `/api/github/<anything>` would be an open
 * proxy that authenticates with our token.
 */

const GITHUB = 'https://api.github.com'

/**
 * The only upstream shapes this app needs. Anything else is refused.
 * Ordered most specific first.
 */
const ALLOWED = [
  /^users\/[A-Za-z0-9-]{1,39}$/,
  /^users\/[A-Za-z0-9-]{1,39}\/repos$/,
  /^repos\/[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}\/readme$/,
  /^search\/users$/
]

/** Query parameters that may be forwarded, and how they are bounded. */
const QUERY = {
  per_page: (v) => String(Math.min(100, Math.max(1, parseInt(v, 10) || 30))),
  page: (v) => String(Math.min(10, Math.max(1, parseInt(v, 10) || 1))),
  sort: (v) => (['stars', 'updated', 'created', 'pushed', 'full_name'].includes(v) ? v : null),
  direction: (v) => (['asc', 'desc'].includes(v) ? v : null),
  order: (v) => (['asc', 'desc'].includes(v) ? v : null),
  type: (v) => (['all', 'owner', 'member'].includes(v) ? v : null),
  q: (v) => (typeof v === 'string' && v.length <= 100 ? v : null)
}

/* Cache windows. Long at the edge, short in the browser: a visitor gets fresh
   enough data, while the edge absorbs the repeat traffic. */
const EDGE_TTL = 1800 // 30 min
const EDGE_SWR = 86400 // serve stale for a day while revalidating
const BROWSER_TTL = 60

/*
 * Per-IP throttling is a WAF rule, not code.
 *
 * Rule `github-proxy` (id rule_github_proxy_NLZkDO): path starts with
 * /api/github, 100 requests per 60s keyed by IP, fixed window, deny for 1m.
 * The edge cache is the primary budget defence — most demo traffic hits a
 * handful of famous usernames and never reaches GitHub at all — and this
 * bounds what a single abusive IP can do to the remainder.
 *
 * This used to be an in-function `checkRateLimit('github-proxy')` behind a
 * dynamic `import('@vercel/firewall')` wrapped in a try/catch that returned
 * false on failure. It had never throttled a single request: `@vercel/firewall`
 * was never a dependency, so the import always threw and the catch always chose
 * the fail-open path. The rule ID it passed did not match a rule either. It was
 * a throttle in the shape of the code and in no other respect.
 *
 * Enforcing at the edge is also strictly better than enforcing here: a
 * throttled request is rejected before the function is invoked, so abuse costs
 * no compute rather than merely no GitHub quota.
 */

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const segments = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path].filter(Boolean)
  const upstreamPath = segments.join('/')

  if (!ALLOWED.some((re) => re.test(upstreamPath))) {
    // Explicitly not "not found" — the path is understood and refused. An open
    // proxy that authenticates with our token is the failure mode here.
    return res.status(403).json({ error: 'endpoint not proxied' })
  }

  const url = new URL(`${GITHUB}/${upstreamPath}`)
  for (const [key, raw] of Object.entries(req.query)) {
    if (key === 'path' || !(key in QUERY)) continue
    const value = QUERY[key](Array.isArray(raw) ? raw[0] : raw)
    if (value != null) url.searchParams.set(key, value)
  }

  const token = process.env.GITHUB_TOKEN
  const headers = {
    // The client asks for raw README content; everything else is JSON.
    Accept: req.headers.accept?.includes('raw')
      ? 'application/vnd.github.v3.raw'
      : 'application/vnd.github+json',
    'User-Agent': 'github-3d-visualizer',
    'X-GitHub-Api-Version': '2022-11-28'
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let upstream
  try {
    upstream = await fetch(url, { headers })
  } catch {
    return res.status(502).json({ error: 'could not reach github' })
  }

  // Pass through the rate-limit signal so the client can say "try again in Nm"
  // rather than "try again later". These are not CORS-safelisted, but this is
  // a same-origin response, so the browser can read them without an
  // Access-Control-Expose-Headers dance.
  for (const h of ['x-ratelimit-remaining', 'x-ratelimit-reset']) {
    const v = upstream.headers.get(h)
    if (v) res.setHeader(h, v)
  }

  if (!upstream.ok) {
    // Errors must not be cached — a 404 for a username that is about to exist,
    // or a 403 from a momentarily exhausted budget, should not stick.
    res.setHeader('Cache-Control', 'no-store')
    const body = await upstream.text().catch(() => '')
    return res
      .status(upstream.status)
      .json({ error: upstream.statusText || 'upstream error', detail: body.slice(0, 200) })
  }

  // Vercel-CDN-Cache-Control governs Vercel's edge; CDN-Cache-Control governs
  // any CDN in front of it; Cache-Control governs the browser. Setting all
  // three is what lets the edge hold a long copy while the browser holds a
  // short one.
  res.setHeader(
    'Vercel-CDN-Cache-Control',
    `public, s-maxage=${EDGE_TTL}, stale-while-revalidate=${EDGE_SWR}`
  )
  res.setHeader(
    'CDN-Cache-Control',
    `public, s-maxage=${EDGE_TTL}, stale-while-revalidate=${EDGE_SWR}`
  )
  res.setHeader('Cache-Control', `public, max-age=${BROWSER_TTL}`)

  const contentType = upstream.headers.get('content-type') || 'application/json'
  res.setHeader('Content-Type', contentType)

  if (contentType.includes('application/json')) {
    return res.status(200).send(JSON.stringify(await upstream.json()))
  }
  return res.status(200).send(await upstream.text())
}

// Exported for tests: the allowlist and query bounds are the security surface,
// and they should be asserted, not assumed.
export const _internals = { ALLOWED, QUERY, EDGE_TTL, BROWSER_TTL }
