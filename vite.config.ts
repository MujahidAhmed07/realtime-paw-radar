import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves the app under /realtime-paw-radar/ — only apply the base
// path when building for Pages (locally and other hosts use the default root).
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
})
