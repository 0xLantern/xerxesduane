import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => {
  const config: UserConfig = { plugins: [react()] }

  // Split heavy, rarely-changing vendor code into its own cached chunk.
  // Because the site navigates between routes with full page loads, this lets
  // the browser reuse React + framer-motion across navigations instead of
  // re-downloading the whole bundle each time. Skipped for the SSR build,
  // which must stay a single entry for the prerender step.
  if (!isSsrBuild) {
    config.build = {
      rollupOptions: {
        // work.html is the hours log on work.xerxesduane.com: its own page,
        // never prerendered, so it only exists in the client build.
        // letters.html is the partner letters on ministry.xerxesduane.com, the same way.
        input: { main: 'index.html', work: 'work.html', letters: 'letters.html' },
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // lenis is dynamically imported post-hydration — keep it out of
              // the eagerly-loaded vendor chunk so it lazy-loads as its own.
              if (id.includes('lenis')) return undefined
              // Same for the background shader, loaded once the page is idle.
              if (id.includes('@paper-design')) return undefined
              // pdf.js is for the partner letters only, loaded when a letter opens.
              if (id.includes('pdfjs-dist')) return undefined
              return 'vendor'
            }
          },
        },
      },
    }
  }

  return config
})
