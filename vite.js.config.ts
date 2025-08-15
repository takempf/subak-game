import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import svg from '@poppanator/sveltekit-svg';

export default defineConfig({
	build: {
		lib: {
			entry: 'src/lib/index.ts',
			name: 'SubakGame',
			fileName: 'index',
			formats: ['es']
		},
		rollupOptions: {
			output: {
				dir: 'dist-js',
				inlineDynamicImports: true
			}
		}
	},
	plugins: [
		svg(),
		svelte({
			compilerOptions: {
				customElement: true
			}
		})
	]
});
