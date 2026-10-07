import { createReadStream, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { defineConfig, type Plugin, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * pdf.js's own data files, for the partner letters: the WebAssembly image
 * decoders (JPEG 2000, JBIG2, CCITT fax, ICC colour), the fonts it uses for
 * PDFs that don't embed theirs, and the CJK character maps. Without them a
 * letter's photos in those formats draw as blank space. They're served from
 * this site at /pdfjs/<version>/, so the CSP's 'self' covers them, and only
 * the ones a letter needs are ever fetched. src/letters/pdf.ts points at
 * the same path.
 */
function pdfjsData(): Plugin {
  const pkg = dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'))
  const version = (JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8')) as { version: string }).version
  const base = `pdfjs/${version}/`
  const dirs = ['wasm', 'standard_fonts', 'cmaps', 'iccs']
  const types: Record<string, string> = { wasm: 'application/wasm', js: 'text/javascript', bcmap: 'application/octet-stream' }
  return {
    name: 'pdfjs-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        if (!path.startsWith(`/${base}`)) return next()
        const [dir, file, ...rest] = path.slice(base.length + 1).split('/')
        const full = join(pkg, dir ?? '', file ?? '')
        if (!dirs.includes(dir ?? '') || !file || rest.length || file.includes('..') || !statSync(full, { throwIfNoEntry: false })?.isFile()) return next()
        res.setHeader('content-type', types[file.split('.').pop() ?? ''] ?? 'application/octet-stream')
        createReadStream(full).pipe(res)
      })
    },
    generateBundle() {
      for (const dir of dirs) {
        for (const file of readdirSync(join(pkg, dir))) {
          // quickjs is pdf.js's sandbox for scripted forms, which letters never run.
          if (file.startsWith('quickjs')) continue
          this.emitFile({ type: 'asset', fileName: `${base}${dir}/${file}`, source: readFileSync(join(pkg, dir, file)) })
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => {
  const config: UserConfig = { plugins: isSsrBuild ? [react()] : [react(), pdfjsData()] }

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
        input: { main: 'index.html', work: 'work.html', letters: 'letters.html', partners: 'partners.html' },
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
