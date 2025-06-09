import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa'; // Import the plugin

export default defineConfig({
  plugins: [
    sveltekit(),
    VitePWA({
      // Service worker options
      registerType: 'autoUpdate', // Automatically update the service worker when new content is available
      injectRegister: 'auto', // Automatically inject the registration script
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webmanifest,xml,txt,wav,mp3,woff,woff2,ttf,eot}'], // Files to cache
        // Runtime caching for network-first strategy (StaleWhileRevalidate)
        // This ensures that the app tries to fetch fresh content first,
        // and falls back to cache if offline. Updates are fetched in the background.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'navigation-cache',
              networkTimeoutSeconds: 3, // Timeout for network request before falling back to cache
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|gif|jpg|jpeg|svg|ico|webp|avif|wav|mp3)$/,
            handler: 'CacheFirst', // For static assets, cache first is usually fine
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate', // JS and CSS can be updated, so stale-while-revalidate
            options: {
              cacheName: 'static-resources-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 24 * 60 * 60 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      // PWA Manifest options
      manifest: {
        name: 'Subak - Suika Game Clone',
        short_name: 'Subak',
        description: 'A clone of the popular Suika (Watermelon) game, built with Svelte.',
        theme_color: '#ffffff', // Adjust as needed
        background_color: '#ffffff', // Adjust as needed
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'favicon.png', // Make sure you have this icon or update path
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'favicon.png', // And a larger one for other purposes
            sizes: '512x512',
            type: 'image/png'
          }
          // Add more icons as needed (e.g., for different sizes, maskable icons)
        ]
      },
      devOptions: {
        enabled: true, // Enable PWA in development for easier testing
        type: 'module',
      }
    })
  ]
});
