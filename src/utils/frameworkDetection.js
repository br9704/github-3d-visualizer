// Framework detection based on common naming patterns and repo metadata
const frameworkPatterns = {
  react: { keywords: ['react', 'nextjs', 'next.js'], pattern: /react|nextjs|next\.js|^n[ex]xt/ },
  vue: { keywords: ['vue', 'vuejs', 'vue.js', 'nuxt'], pattern: /vue|nuxt/ },
  angular: { keywords: ['angular', 'angularjs', 'angular.js'], pattern: /angular/ },
  svelte: { keywords: ['svelte', 'sveltekit'], pattern: /svelte|sveltekit/ },
  ember: { keywords: ['ember', 'emberjs', 'ember.js'], pattern: /ember/ },
  django: { keywords: ['django'], pattern: /django/ },
  flask: { keywords: ['flask'], pattern: /flask/ },
  fastapi: { keywords: ['fastapi'], pattern: /fastapi/ },
  spring: { keywords: ['spring', 'spring-boot'], pattern: /spring|spring-boot/ },
  express: { keywords: ['express', 'expressjs'], pattern: /express/ },
  nextjs: { keywords: ['nextjs', 'next.js'], pattern: /nextjs|next\.js/ },
  nuxtjs: { keywords: ['nuxtjs', 'nuxt.js'], pattern: /nuxtjs|nuxt\.js/ },
  gatsby: { keywords: ['gatsby', 'gatsbyjs'], pattern: /gatsby/ },
  laravel: { keywords: ['laravel'], pattern: /laravel/ },
  rails: { keywords: ['rails', 'ruby-on-rails'], pattern: /rails|ruby-on-rails/ },
  nest: { keywords: ['nestjs', 'nest.js'], pattern: /nestjs|nest\.js/ },
  dotnet: { keywords: ['.net', 'asp.net', 'aspnetcore'], pattern: /\.net|asp\.net|aspnetcore/ }
}

export function detectFrameworks(repo) {
  const frameworks = new Set()
  
  if (!repo) return []
  
  const searchText = [
    repo.name || '',
    repo.description || '',
    repo.language || ''
  ]
    .join(' ')
    .toLowerCase()

  Object.entries(frameworkPatterns).forEach(([framework, { pattern }]) => {
    if (pattern.test(searchText)) {
      frameworks.add(framework)
    }
  })

  return Array.from(frameworks)
}

export function detectAuthorType(repo) {
  // Simple heuristic: if owner is an org (typically plural nouns or capital org names)
  // Fallback: check if the repo owner has uppercase patterns typical of orgs
  if (!repo || !repo.owner) return 'personal'
  
  const owner = repo.owner.login || ''
  const isOrg = repo.owner.type === 'Organization' || owner !== owner.toLowerCase()
  
  return isOrg ? 'organization' : 'personal'
}

export function getAllFrameworks() {
  return Object.keys(frameworkPatterns)
}
