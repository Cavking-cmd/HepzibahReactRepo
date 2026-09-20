import path from "node:path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    includeAssets: ['favicon.png', 'favicon.svg', 'church-logo.png'],
    manifest: {
      name: 'RCCG Hephzibah Parish',
      short_name: 'Hephzibah Parish',
      description: 'RCCG Hephzibah Parish Church Portal',
      theme_color: '#0b1539',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      lang: 'en',
      categories: ['business', 'productivity'],
      icons: [
        { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      // SPA: any navigation (incl. direct deep-links like /admin) that hits
      // the SW resolves to the single entry point instead of a 404.
      navigateFallback: '/index.html',
      // Guarantee API/private traffic is NEVER served from cache.
      navigateFallbackDenylist: [/^\/api\//],
      runtimeCaching: [
        {
          // Remote production API — NetworkOnly so tokens/private records
          // are never written into the PWA cache.
          urlPattern: /^https:\/\/[^/]*onrender\.com\//,
          handler: 'NetworkOnly',
          options: { networkTimeoutSeconds: 0 },
        },
        {
          // Same-origin /api proxy (auth, users, attendance, inventory).
          urlPattern: /^\/api\//,
          handler: 'NetworkOnly',
          options: { networkTimeoutSeconds: 0 },
        },
      ],
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  })],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    allowedHosts: [".trycloudflare.com"],
    proxy: {
      "/api": {
        target: "http://localhost:5080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
