// These constants are injected at build time by vite.config.ts.
// They are replaced with literal string values during the build step.
declare const __APP_VERSION__: string;
declare const __BUILD_HASH__: string;

export const APP_VERSION: string =
	typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown';
export const BUILD_HASH: string =
	typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'unknown';
