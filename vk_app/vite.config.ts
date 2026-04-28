import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

function handleModuleDirectivesPlugin() {
  return {
    name: 'handle-module-directives-plugin',
    transform(code, id) {
      if (id.includes('@vkontakte/icons')) {
        code = code.replace(/"use-client";?/g, '');
      }
      return { code };
    },
  };
}

/**
 * Some chunks may be large.
 * This will not affect the loading speed of the site.
 * We collect several versions of scripts that are applied depending on the browser version.
 * This is done so that your code runs equally well on the site and in the odr.
 * The details are here: https://dev.vk.ru/mini-apps/development/on-demand-resources.
 */
export default defineConfig({
  base: './',

  plugins: [
    react(),
    handleModuleDirectivesPlugin(),
    legacy({
      targets: ['defaults', 'not IE 11', 'ios >= 12'],
      renderLegacyChunks: false,
    }),
  ],

  resolve: {
    alias: [
      {
        find: /^@vkontakte\/vkui$/,
        replacement: '@vkontakte/vkui/dist/cssm',
      },
    ],
  },

  build: {
    outDir: 'build',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // VKUI компоненты — самый тяжёлый, кешируется отдельно
            if (id.includes('@vkontakte/vkui')) {
              return 'vkui';
            }
            // Иконки VK — меняются редко, хорошо кешируются
            if (id.includes('@vkontakte/icons')) {
              return 'icons';
            }
            // VK Bridge — отдельно, т.к. VK его уже может кешировать
            if (id.includes('@vkontakte/vk-bridge')) {
              return 'vk-bridge';
            }
            // VK Router — отдельно
            if (id.includes('@vkontakte/vk-mini-apps-router')) {
              return 'vk-router';
            }
            // React + React DOM — самое стабильное, редко обновляется
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react';
            }
            // Остальные зависимости
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
