import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/tabby/',
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        // Give Firestore a stable chunk name so the service worker can skip
        // precaching it (see globIgnores below).
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/node_modules\/(@firebase\/firestore|firebase\/firestore)/.test(id)) return 'firestore'
          // Code shared by Auth and Firestore must not end up in the lazy
          // Firestore chunk, or the entry would have to import it eagerly.
          if (/node_modules\/(@firebase|firebase|idb|tslib)\//.test(id)) return 'firebase'
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // The PDF renderer (~1.2 MB) and Firestore (~0.5 MB) aren't needed to open
        // the app, so they're cached the first time they're used instead of on
        // install. Filenames are content-hashed, so cache-first is safe.
        globIgnores: ['**/react-pdf*.js', '**/firestore-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(react-pdf|firestore-)[^/]*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tabby-lazy-chunks',
              expiration: { maxEntries: 20 },
            },
          },
        ],
      },
      manifest: {
        name: 'Tabby — Song Sheet Editor',
        short_name: 'Tabby',
        description: 'Write and format guitar song sheets with chords.',
        theme_color: '#f6f1e7',
        background_color: '#f6f1e7',
        display: 'standalone',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
})
