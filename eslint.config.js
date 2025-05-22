import globals from 'globals';
import js from '@eslint/js';
import tsEslint from 'typescript-eslint';
import svelteEslint from 'eslint-plugin-svelte';
import prettierEslint from 'eslint-config-prettier';

import svelteConfig from './svelte.config.js';

export default tsEslint.config(
	js.configs.recommended,
	...tsEslint.configs.recommended,
	...svelteEslint.configs.prettier,
	// Apply Prettier's formatting rules
	prettierEslint,
	{
		ignores: ['dist/**', 'docs/**', '.svelte-kit/**']
	},
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		// See more details at: https://typescript-eslint.io/packages/parser/
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'], // Add support for additional file extensions, such as .svelte
				parser: tsEslint.parser,
				// Specify a parser for each language, if needed:
				// parser: {
				//   ts: ts.parser,
				//   js: espree,    // Use espree for .js files (add: import espree from 'espree')
				//   typescript: ts.parser
				// },

				// We recommend importing and specifying svelte.config.js.
				// By doing so, some rules in eslint-plugin-svelte will automatically read the configuration and adjust their behavior accordingly.
				// While certain Svelte settings may be statically loaded from svelte.config.js even if you don’t specify it,
				// explicitly specifying it ensures better compatibility and functionality.
				svelteConfig
			}
		}
	},
	{
		rules: {
			// Override or add rule settings here, such as:
			// 'svelte/rule-name': 'error'
		}
	}
);
