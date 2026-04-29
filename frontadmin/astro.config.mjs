// @ts-check

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://127.0.0.1:8000';

// https://astro.build/config
export default defineConfig({
  vite: {
    server: {
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    plugins: [tailwindcss()],
  },

  integrations: [react()],
});
