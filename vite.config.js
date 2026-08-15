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

/**
 * Advertise the scene chunks in the HTML.
 *
 * Splitting Three.js out of the entry chunk is only half a win, and the other
 * half is a regression if it is left alone. A dynamic import cannot be
 * requested until the chunk containing the import statement has been
 * downloaded, parsed and executed — so without this, the largest asset in the
 * app queues *behind* the two smallest ones instead of travelling beside them.
 *
 * Measured on a cold cache, time to the first drawn frame (scripts/firstpaint.mjs):
 *
 *   Fast 3G   one chunk 2549 ms  ->  split, no preload 3493 ms  ->  split + preload 2614 ms
 *
 * The split without this line costs almost a second of the hero moment on a
 * slow link. With it, the browser opens all three connections at once and the
 * scene arrives within noise of where the single bundle had it, while the HUD
 * still paints from its own small chunk.
 */
function preloadSceneChunks() {
  return {
    name: 'preload-scene-chunks',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return
      // Vite already preloads the entry's static imports; these are the
      // dynamic ones it has no way to know are needed immediately.
      const already = new Set([...html.matchAll(/href="\/([^"]+\.js)"/g)].map((m) => m[1]))
      return Object.keys(ctx.bundle)
        .filter((name) => /^assets\/(three|Visualizer)-[\w-]+\.js$/.test(name))
        .filter((name) => !already.has(name))
        .map((name) => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: '', href: `/${name}` },
          injectTo: 'head'
        }))
    }
  }
}

export default defineConfig({
  plugins: [react(), preloadSceneChunks()],
  server: { proxy: githubProxy },
  preview: { proxy: githubProxy },
  build: {
    minify: 'terser',
    rollupOptions: {
      output: {
        /**
         * Three.js is ~600 kB of the bundle and is only needed once the scene
         * mounts. Splitting it out means the HUD paints from a small chunk
         * while the engine streams in beside it, instead of the browser
         * parsing the whole renderer before anything appears.
         *
         * React is split too — it changes far less often than app code, so a
         * separate chunk stays cached across deploys.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/three/')) return 'three'
          if (id.includes('/react') || id.includes('/scheduler/')) return 'react'
        }
      }
    }
  }
})
