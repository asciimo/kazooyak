import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Deploy target is a user-root / custom-domain GitHub Pages site, so the app
// lives at the origin root. If you ever move this to a project page like
// `user.github.io/kazooyak/`, change `base` to `/kazooyak/`.
export default defineConfig({
  base: '/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/*.png'],
      workbox: {
        globPatterns: ['**/*.{html,css,js,png,svg,json,woff2,webmanifest}'],
        navigateFallback: 'index.html',
      },
      manifest: {
        name: 'Kazooyak',
        short_name: 'Kazooyak',
        description: 'A pocket diatonic chord instrument in your browser.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#13151b',
        theme_color: '#13151b',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
