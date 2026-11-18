import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { readFileSync, writeFileSync } from 'node:fs'

// Bake the Pages base path into dist/404.html so the SPA fallback knows the
// repo prefix at runtime (referrer-based recovery fails on direct URL entry).
function inject404Base(): Plugin {
  return {
    name: 'inject-404-base',
    apply: 'build',
    generateBundle() { /* handled in closeBundle on dist output */ },
    closeBundle() {
      const base = process.env.VITE_BASE_PATH || ''
      try {
        const p = 'dist/404.html'
        let html = readFileSync(p, 'utf8')
        html = html.replaceAll('__PAGES_BASE__', base)
        writeFileSync(p, html)
      } catch { /* 404.html absent — non-Pages host */ }
    }
  }
}

// GitHub Pages serves the app under a repo subpath — only apply the base
// path when building for Pages (locally and other hosts use the default root).
export default defineConfig({
  plugins: [react(), inject404Base()],
  base: process.env.VITE_BASE_PATH || '/',
})
