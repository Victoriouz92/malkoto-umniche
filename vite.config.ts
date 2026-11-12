import { createServer, defineConfig } from 'vite';
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
    {
      name: 'public-landing-html',
      apply: 'build',
      transformIndexHtml: {
        order: 'pre',
        async handler(html) {
          const server = await createServer({
            configFile: false,
            appType: 'custom',
            server: { middlewareMode: true },
            plugins: [react()],
            ssr: {
              noExternal: ['react-router', 'react-router-dom'],
              resolve: { conditions: ['module-sync', 'module', 'node'] },
            },
            optimizeDeps: { noDiscovery: true, include: [] },
            resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
          });
          try {
            const page = (await server.ssrLoadModule('/src/landing/prerender.tsx')) as {
              renderLanding: () => string;
            };
            return html.replace(
              '<div id="root"></div>',
              `<div id="root">${page.renderLanding()}</div>`,
            );
          } finally {
            await server.close();
          }
        },
      },
    },

    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'fonts/*.woff2'],

      // Приложението трябва да работи изцяло офлайн: всичко се precache-ва.
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webp,svg,woff2,json,mp3,ogg}'],
        // Originals remain available for social previews, but not in offline downloads.
        globIgnores: ['hero-malkoto-umniche.png', 'slide-*-wide.png'],
        // Активностите и графиката растат; вдигаме тавана от 2MB.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
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
        manualChunks(id) {
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          if (/\/node_modules\/react-router(-dom)?\//.test(id)) return 'router';
          if (id.includes('/node_modules/zod/')) return 'validation';
          const expedition =
            /\/src\/content\/activities\/expedition\/expedition-([a-z]+)-/.exec(id);
          if (expedition) return 'catalogue-' + expedition[1];
        },
      },
    },
  },
});
