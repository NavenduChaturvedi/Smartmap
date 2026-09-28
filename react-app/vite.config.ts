import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Social previews need absolute URLs, so index.html uses %SITE_URL%. It comes
// from VITE_SITE_URL, falling back to Vercel's production domain at build time.
function siteUrl(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '')
  const vercelHost = env.VERCEL_PROJECT_PRODUCTION_URL
  const url = (env.VITE_SITE_URL || (vercelHost ? `https://${vercelHost}` : '')).replace(/\/$/, '')
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', url),
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), siteUrl(mode)],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
}))
