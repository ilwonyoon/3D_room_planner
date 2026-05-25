import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// bond-demo branch: PWA + service-worker removed (desktop demo, no offline
// support needed). Original mobile config is preserved on `main`.
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
    proxy: {
      // The Anthropic-key-bearing API runs on :3001 (scripts/api-server.mjs).
      // Same-origin /api/* from the SPA gets forwarded so the browser never
      // sees the API key.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
