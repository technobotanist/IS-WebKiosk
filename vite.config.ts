import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Innovation Studio Exhibition Builder',
        short_name: 'Innovation Studio',
        description: 'Innovation Studio exhibition editor and launcher for public web destinations.',
        start_url: '/',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#d3e2fc',
        theme_color: '#d3e2fc',
        icons: [
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      }
    })
  ]
});
