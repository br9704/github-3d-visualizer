/**
 * Deterministic GitHub API fixtures.
 *
 * Used by the screenshot harness and (from S9) the test suite, so that
 * verification never depends on the network or on GitHub's 60 req/hour
 * unauthenticated limit. Same seed in, same repos out.
 */

const LANGUAGES = [
  'JavaScript', 'Python', 'TypeScript', 'Go', 'Rust', 'C', 'Ruby',
  'Java', 'C++', 'Shell', null
];

/** Mulberry32 — small, fast, deterministic. */
function rng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a repo list with a realistic long-tail star distribution.
 * @param {number} count
 * @param {number} seed
 */
export function makeRepos(count = 100, seed = 42) {
  const rand = rng(seed);
  const now = Date.UTC(2026, 7, 14);
  const year = 365 * 24 * 3600 * 1000;

  return Array.from({ length: count }, (_, i) => {
    const stars = Math.floor(Math.pow(rand(), 4) * 60000);
    const ageYears = rand() * 12;
    const created = new Date(now - ageYears * year).toISOString();
    const pushedDaysAgo = Math.floor(Math.pow(rand(), 2) * 900);

    return {
      id: 1000 + i,
      name: `repo-${String(i).padStart(3, '0')}`,
      full_name: `fixture/repo-${String(i).padStart(3, '0')}`,
      html_url: `https://github.com/fixture/repo-${i}`,
      description: rand() > 0.15 ? `Fixture repository number ${i}.` : null,
      language: LANGUAGES[Math.floor(rand() * LANGUAGES.length)],
      stargazers_count: stars,
      forks_count: Math.floor(stars * (0.05 + rand() * 0.2)),
      open_issues_count: Math.floor(rand() * 80),
      watchers_count: stars,
      size: Math.floor(rand() * 40000),
      archived: rand() > 0.94,
      fork: rand() > 0.85,
      created_at: created,
      updated_at: new Date(now - pushedDaysAgo * 24 * 3600 * 1000).toISOString(),
      pushed_at: new Date(now - pushedDaysAgo * 24 * 3600 * 1000).toISOString()
    };
  }).sort((a, b) => b.stargazers_count - a.stargazers_count);
}

export function makeUser(login = 'fixture', publicRepos = 100) {
  return {
    login,
    id: 1,
    avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    html_url: `https://github.com/${login}`,
    name: 'Fixture User',
    public_repos: publicRepos
  };
}

export const README_TEXT =
  '# Fixture repository\n\nA deterministic README used by the screenshot harness ' +
  'and the test suite so verification never touches the network.\n\n' +
  '## Usage\n\n    npm install\n    npm run dev\n';
