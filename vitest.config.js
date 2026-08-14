import { defineConfig } from 'vitest/config'

/**
 * Two environments, chosen per file rather than globally.
 *
 * The proxy and the scene-graph contract are plain Node — giving them a DOM
 * would let a test accidentally depend on browser globals the serverless
 * function will never have. The services genuinely need localStorage, Blob and
 * URL.createObjectURL, so those files opt into jsdom with a docblock pragma.
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.{js,mjs,jsx}'],
    // Node by default. Files that genuinely need a DOM opt in with a
    // `// @vitest-environment jsdom` pragma, so a test cannot quietly start
    // depending on a browser global the serverless function will never have.
    environment: 'node',
    restoreMocks: true,
    reporters: 'default'
  }
})
