import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * In production, /api/github is a Vercel function that attaches a server-side
 * PAT (see api/github/[...path].js). Locally there is no function runtime, so
 * dev and preview proxy the same path to GitHub directly — unauthenticated,
 * and therefore subject to the 60 req/hour limit, but it means the client has
 * a single code path instead of a branch only the deployed build ever runs.
 */
const githubProxy = {
  '/api/github': {
    target: 'https://api.github.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/github/, '')
  }
}

export default defineConfig({
  plugins: [react()],
  server: { proxy: githubProxy },
  preview: { proxy: githubProxy },
  build: {
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
