import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    svelte({
      preprocess: vitePreprocess({ style: false }),
      configFile: false,
      compilerOptions: { generate: 'dom' }
    })
  ],
  resolve: {
    mainFields: ['browser', 'module', 'main'],
    conditions: ['browser']
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts']
  }
});
