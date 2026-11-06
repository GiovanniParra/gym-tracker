import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Served from https://<user>.github.io/gym-tracker/
export default defineConfig({
  base: '/gym-tracker/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon.svg'],
      manifest: {
        name: 'Sage — Gym Tracker',
        short_name: 'Sage',
        description: 'Workout, weight and calorie tracker',
        theme_color: '#F7F8F5',
        background_color: '#F7F8F5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/gym-tracker/',
        scope: '/gym-tracker/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/*-latin-*.woff2'],
      },
    }),
  ],
})
