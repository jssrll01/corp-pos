import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon-192.png','icon-512.png'],
    workbox: { mode: 'development', globPatterns: ['**/*.{js,css,html,png,svg,woff2}'] },
    manifest: {
      name: 'RestoPOS', short_name: 'POS', start_url: '/', display: 'standalone', orientation: 'landscape',
      background_color: '#0f172a', theme_color: '#0f172a',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    }
  })]
})
