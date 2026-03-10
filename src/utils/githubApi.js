import axios from 'axios'
import { getLanguageInfo } from './colors'

const GITHUB_API = 'https://api.github.com'

const axiosInstance = axios.create({
  timeout: 8000,
  headers: { Accept: 'application/vnd.github.v3+json' }
})

/**
 * Fetch all public repos for a GitHub user with pagination
 * Max 100 repos per request, default to first 100 total
 */
export async function fetchUserRepos(username, maxRepos = 100) {
  if (!username?.trim()) {
    throw new Error('Username is required')
  }

  try {
    // Fetch user first to check public_repos count
    const userResponse = await axiosInstance.get(
      `${GITHUB_API}/users/${username}`
    )
    const user = userResponse.data

    if (user.public_repos === 0) {
      return { user, repos: [], rateLimitRemaining: null }
    }

    // Paginated fetch: Get repos up to maxRepos (default 100)
    // IMPORTANT: Cap at 3 pages (300 repos) to avoid excessive API calls
    const repos = []
    const pagesNeeded = Math.min(
      Math.ceil(Math.min(user.public_repos, maxRepos) / 100),
      3 // Hard limit: fetch max 3 pages (300 repos)
    )

    for (let page = 1; page <= pagesNeeded; page++) {
      const reposResponse = await axiosInstance.get(
        `${GITHUB_API}/users/${username}/repos?per_page=100&page=${page}&sort=stars&order=desc`
      )

      repos.push(...reposResponse.data)

      // Extract rate limit info from headers
      const remaining = reposResponse.headers['x-ratelimit-remaining']
      const reset = reposResponse.headers['x-ratelimit-reset']

      // RATE LIMIT CHECK: Stop early if fewer than 5 requests remaining
      if (remaining && parseInt(remaining) < 5) {
        console.warn(
          `Rate limit low (${remaining} remaining). Stopping pagination.`
        )
        break
      }

      if (page === pagesNeeded) {
        return {
          user,
          repos: repos.slice(0, maxRepos),
          rateLimitRemaining: remaining ? parseInt(remaining) : null,
          rateLimitReset: reset ? parseInt(reset) * 1000 : null // Convert to ms
        }
      }

      // Small delay between paginated requests (100ms per page)
      await new Promise((r) => setTimeout(r, 100))
    }

    return {
      user,
      repos: repos.slice(0, maxRepos),
      rateLimitRemaining: repos.length > 0 ? null : null
    }
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('GitHub user not found')
    }
    if (error.response?.status === 403 || error.response?.status === 429) {
      const reset = error.response.headers['x-ratelimit-reset']
      const resetTimestamp = reset ? parseInt(reset) : null
      const resetDate = resetTimestamp ? new Date(resetTimestamp * 1000) : null
      const minutesUntilReset = resetDate
        ? Math.ceil((resetDate - Date.now()) / 60000)
        : null
      throw new Error(
        `GitHub API rate limit exceeded. ${minutesUntilReset ? `Reset in ${minutesUntilReset} minutes.` : 'Try again later.'}`
      )
    }
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout (8s). Check your connection.')
    }
    throw new Error(error.message || 'Failed to fetch repositories')
  }
}

/**
 * Fetch README for a specific repo with retry logic
 */
export async function fetchRepoReadme(
  username,
  repoName,
  retries = 2,
  backoffMs = 100
) {
  try {
    const response = await axiosInstance.get(
      `${GITHUB_API}/repos/${username}/${repoName}/readme`,
      {
        headers: { Accept: 'application/vnd.github.v3.raw' },
        timeout: 5000 // 5-second timeout for README fetch
      }
    )
    return response.data.slice(0, 500) // Truncate to 500 chars
  } catch (error) {
    if (error.response?.status === 404) {
      return null // No README found, don't retry (404 is permanent)
    }
    if (error.response?.status === 429) {
      // Rate limited on README fetch; don't retry, fail silently
      console.warn(`Rate limited fetching README for ${repoName}`)
      return null
    }
    if (
      retries > 0 &&
      (error.response?.status >= 500 || error.code === 'ECONNABORTED')
    ) {
      // Linear backoff: 100ms → 200ms → 400ms
      const delay = backoffMs * (4 - retries)
      console.warn(
        `README fetch failed for ${repoName}, retrying in ${delay}ms (attempts left: ${retries})`
      )
      await new Promise((r) => setTimeout(r, delay))
      return fetchRepoReadme(username, repoName, retries - 1, backoffMs)
    }
    return null // Silent fail after retries exhausted
  }
}

/**
 * Fetch READMEs for multiple repos with batching
 * maxConcurrent: 5 (balances speed with resource efficiency)
 */
export async function fetchRepoReadmeBatch(
  username,
  repos,
  maxConcurrent = 5
) {
  const results = []

  // Process in batches to avoid overwhelming API
  for (let i = 0; i < repos.length; i += maxConcurrent) {
    const batch = repos.slice(i, i + maxConcurrent)
    const promises = batch.map((repo) =>
      fetchRepoReadme(username, repo.name)
        .then((readme) => ({
          ...repo,
          readme: readme || 'No README found'
        }))
        .catch((err) => {
          console.warn(`Error fetching README for ${repo.name}:`, err.message)
          return { ...repo, readme: 'No README found' }
        })
    )

    results.push(...(await Promise.all(promises)))

    // Delay between batches (200ms)
    if (i + maxConcurrent < repos.length) {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  return results
}

/**
 * localStorage caching
 */
export function getCachedRepos(username) {
  try {
    const cached = JSON.parse(
      localStorage.getItem(`repos_${username}`)
    )
    if (
      cached &&
      Date.now() - cached.timestamp <
        30 * 60 * 1000
    ) {
      // 30 min TTL
      return cached.data
    }
  } catch (e) {
    console.warn('Failed to read cache:', e)
  }
  return null
}

export function cacheRepos(username, repos) {
  try {
    localStorage.setItem(
      `repos_${username}`,
      JSON.stringify({
        data: repos,
        timestamp: Date.now()
      })
    )
  } catch (e) {
    console.warn('Failed to cache repos:', e)
  }
}

export { getLanguageInfo }
