import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

const THIRTY_DAYS = 60 * 60 * 24 * 30

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Pocketroom',
        short_name: 'Pocketroom',
        description: 'Mobile 3D Room Planner',
        theme_color: '#1B1B1B',
        background_color: '#1B1B1B',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webp,wasm,woff2}'],
        globIgnores: [
          '**/assets/hdri/**',
          '**/assets/model-thumbnails/**',
          '**/assets/models/**',
          '**/assets/models-ktx2/**',
          '**/assets/textures-runtime/**',
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/model-thumbnails/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'model-thumbnails',
              expiration: {
                maxEntries: 400,
                maxAgeSeconds: THIRTY_DAYS,
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/assets/') &&
              /\.(?:glb|ktx2|hdr|jpg|jpeg|png|webp)$/i.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'runtime-3d-assets',
              expiration: {
                maxEntries: 650,
                maxAgeSeconds: THIRTY_DAYS,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5175,
    strictPort: true,
  },
})
