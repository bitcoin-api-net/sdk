// @ts-check

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import vue from '@astrojs/vue';
import { defineConfig } from 'astro/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
	// Enable Vue to support Vue components.
	integrations: [vue()],
	site: "https://bitcoin-api.net",
	vite: {
		resolve: {
			alias: {
				'@styles': path.resolve(__dirname, 'src/styles'),
				'@components': path.resolve(__dirname, 'src/components'),
				'@layouts': path.resolve(__dirname, 'src/layouts'),
			},
		},
	},
});
