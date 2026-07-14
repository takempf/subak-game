/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, prerendered, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE = `subak-cache-${version}`;

const ASSETS = [...build, ...files, ...prerendered];
const CACHE_FIRST_PATHS = new Set([...build, ...files]);

self.addEventListener('install', (event: ExtendableEvent): void => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache): Promise<void> => cache.addAll(ASSETS))
			.then((): Promise<void> => self.skipWaiting())
	);
});

self.addEventListener('activate', (event: ExtendableEvent): void => {
	event.waitUntil(
		caches
			.keys()
			.then(
				(keys): Promise<boolean[]> =>
					Promise.all(
						keys.filter((k): boolean => k !== CACHE).map((k): Promise<boolean> => caches.delete(k))
					)
			)
			.then((): Promise<void> => self.clients.claim())
	);
});

self.addEventListener('fetch', (event: FetchEvent): void => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);

	if (url.origin !== self.location.origin) return;

	event.respondWith(
		(async (): Promise<Response> => {
			if (CACHE_FIRST_PATHS.has(url.pathname)) {
				const cached = await caches.match(url.pathname, { cacheName: CACHE });
				if (cached) return cached;
			}

			try {
				const response = await fetch(request);
				if (response.ok) {
					const cache = await caches.open(CACHE);
					cache.put(request, response.clone());
				}
				return response;
			} catch (err) {
				const cache = await caches.open(CACHE);
				const cached = await cache.match(request);
				if (cached) return cached;

				if (request.mode === 'navigate') {
					const fallback = await cache.match('/');
					if (fallback) return fallback;
				}
				throw err;
			}
		})()
	);
});
