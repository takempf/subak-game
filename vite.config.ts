import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import copy from 'rollup-plugin-copy'; // Import the plugin

export default defineConfig({
	plugins: [
		sveltekit(),
		// Add the copy plugin to copy the service worker
		copy({
			targets: [
				{ src: 'src/service-worker.js', dest: 'docs' }
			],
			hook: 'writeBundle' // Execute during the 'writeBundle' stage
		})
	]
});
