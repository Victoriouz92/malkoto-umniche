import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'fonts/*.woff2'],

      // Приложението трябва да работи изцяло офлайн: всичко се precache-ва.
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,json,mp3,ogg}'],
        // Активностите и графиката растат; вдигаме тавана от 2MB.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },

      manifest: {
        id: '/',
        name: 'Малкото Умниче — учене и игра',
        short_name: 'Умниче',
        description:
          'Безплатни образователни игри за деца 2–6 години. Без реклами, без абонаменти, работи офлайн.',
        lang: 'bg',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#FDFBF7',
        theme_color: '#FDFBF7',
        categories: ['education', 'kids'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      devOptions: { enabled: false },
    }),
  ],

  build: {
    target: 'es2022',
    cssTarget: 'chrome87',

    /**
     * Никакво вграждане на активи като data URI.
     *
     * По подразбиране Vite вгражда файлове под 4 KB, а почти цялата ни
     * графика е под този праг — тоест 47 от 50 SVG-та щяха да влязат в JS
     * чънка. Три последствия, всяко лошо: чънкът набъбва с ~190 KB текст,
     * браузърът го парсва като код, и една променена картинка обезсилва
     * кеша на целия чънк.
     *
     * Като отделни файлове те се кешират поотделно, а service worker-ът ги
     * precache-ва така или иначе — офлайн работата не страда.
     */
    assetsInlineLimit: 0,
    // Перф бюджет от PLAN.md T6.2 — предупреждава преди да сме надули bundle-а.
    chunkSizeWarningLimit: 220,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
