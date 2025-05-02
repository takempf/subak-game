import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapterStatic({
			pages: 'docs',
			assets: 'docs',
			fallback: 'index.html'
		})
	}
};

export default config;
