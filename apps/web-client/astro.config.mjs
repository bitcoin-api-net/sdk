// @ts-check
import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(__dirname).split(path.sep).slice(0, -2).join(path.sep);
const { SITE_URL } = loadEnv(process.env.NODE_ENV ?? 'production', PROJECT_DIR, '');

// https://astro.build/config
export default defineConfig({
  integrations: [vue()],
  site: SITE_URL,
  vite: {
    envDir: PROJECT_DIR,
    define: {},
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@styles': path.resolve(__dirname, 'src/styles'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@layouts': path.resolve(__dirname, 'src/layouts'),
        '@services': path.resolve(__dirname, 'src/services'),
        '@icons': path.resolve(__dirname, 'src/icons'),
      },
    },
  },
});
