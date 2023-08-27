/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;
import type { PrecacheEntry } from './types';

const cacheName = `sw-precache-${self.registration.scope}`;
const runtimeCacheName = `sw-runtimecache-${self.registration.scope}`;
const precacheRoutes = new Set();
const mappedRoutes = {
	[self.registration.scope]: `${self.registration.scope}index.html`
};
const runtimePaths = [`${self.registration.scope}favicons`, `${self.registration.scope}assets`];
const workboxManifest = self.__WB_MANIFEST || [];
// console.log("manifest", workboxManifest);

// MARK: install
export function precacheManifest(event: ExtendableEvent) {
	event.waitUntil(handlePrecacheManifest());
}
async function handlePrecacheManifest() {
	const cacheablePaths = getCacheablePaths(workboxManifest);
	saveRoutes(cacheablePaths);
	const cache = await caches.open(cacheName);
	const cachedRequests = await cache.keys();
	const cachedUrls = new Set(cachedRequests.map(({ url }) => url));
	const newPaths = cacheablePaths.filter((url) => !cachedUrls.has(url));

	for (const path of newPaths) {
		// console.log("new precache path", path);
		const reqUrl = new URL(path);
		await cache.add(reqUrl);
	}
}
function saveRoutes(routes: string[]) {
	for (const route of routes) {
		const url = new URL(route);
		const simplifiedRoute = `${url.origin}${url.pathname}`;
		precacheRoutes.add(simplifiedRoute);
	}
}

// MARK: activate
export function cleanupStaleAssets(event: ExtendableEvent) {
	event.waitUntil(handleRemoveStaleAssets());
}
async function handleRemoveStaleAssets() {
	const cacheablePathsSet = new Set(getCacheablePaths(workboxManifest));
	const cache = await caches.open(cacheName);
	const cachedRequests = await cache.keys();
	const staleRequests = cachedRequests.filter((req) => !cacheablePathsSet.has(req.url));
	await Promise.all(staleRequests.map((req) => cache.delete(req)));
}

// MARK: fetch
export function proxyFetch(event: FetchEvent) {
	const url = new URL(event.request.url);
	const route = `${url.origin}${url.pathname}`;
	if (precacheRoutes.has(route)) {
		event.respondWith(handlePrefetch(event));
	} else if (mappedRoutes[route]) {
		event.respondWith(handlePrefetch(event, mappedRoutes[route]));
	} else if (runtimePaths.some((path) => route.startsWith(path))) {
		event.respondWith(handleRuntimeFetch(event));
	} else {
		// console.log("unhandled route", route);
	}
}
async function handlePrefetch(event: FetchEvent, url: string = event.request.url) {
	const cache = await caches.open(cacheName);
	const match = await cache.match(url, { ignoreSearch: true });
	if (match) {
		return addCorpHeaders(match);
	}
	const res = await fetch(event.request.clone());
	return addCorpHeaders(res);
}
function addCorpHeaders(response: Response) {
	const headers = new Headers(response.headers);
	headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
	headers.set('Cross-Origin-Opener-Policy', 'same-origin');

	return new Response(response.body, {
		headers,
		status: response.status,
		statusText: response.statusText
	});
}
async function handleRuntimeFetch(event: FetchEvent) {
	const cache = await caches.open(runtimeCacheName);
	// CacheFirst
	const match = await cache.match(event.request, { ignoreSearch: true });
	if (match) {
		return addCorpHeaders(match);
	}
	const response = await fetch(event.request);
	if (response.ok) {
		cache.put(event.request, response.clone());
	}
	return addCorpHeaders(response);
}

// MARK: utils
function getCacheablePaths(workboxManifest: (PrecacheEntry | string)[]): string[] {
	const manifestEntries = workboxManifest as PrecacheEntry[];
	const cacheableUrls = manifestEntries.map(({ revision, url }) => {
		const reqUrl = new URL(self.registration.scope + url);
		if (revision) {
			reqUrl.searchParams.append('__WB_REVISION__', revision);
		}
		return reqUrl.href;
	});
	return cacheableUrls;
}
