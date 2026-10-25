import { readFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  // The app version shown in Settings and the menu, from package.json.
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Cawang — Catat Keuangan',
        short_name: 'Cawang',
        description: 'Catat uang masuk, keluar, Safe-Pay, dan budget per Cycle gajian.',
        lang: 'id',
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        background_color: '#f3f5f7',
        theme_color: '#f3f5f7',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // The app is Indonesian and English; other scripts' font files load only if ever needed.
        globIgnores: ['**/manrope-{cyrillic,cyrillic-ext,greek,vietnamese}-*'],
        runtimeCaching: [
          {
            // Offline is read-only: only Supabase GETs are cached, writes always need the network.
            urlPattern: ({ url, request }) => url.pathname.startsWith('/rest/v1/') && request.method === 'GET',
            handler: 'NetworkFirst',
            options: {
              // Keep in sync with SUPABASE_READ_CACHE in src/providers/auth-provider.tsx.
              cacheName: 'supabase-reads',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 300, maxAgeSeconds: 14 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // Fixed port: Supabase redirect URLs and Google OAuth origins point at it.
  server: { port: 8888, strictPort: true },
  preview: { port: 8888, strictPort: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
