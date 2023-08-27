/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { build, files, version } from '$service-worker';
declare const self: ServiceWorkerGlobalScope;

const cacheName = `sw-precache-${self.registration.scope}-${version}`;
const precacheRoutes = new Set();
const mappedRoutes = {
	[self.registration.scope]: `${self.registration.scope}index.html`
};
const ASSETS = [
	...build, // the app itself
	...files // everything in `static`
];

// // MARK: install
export function handlePrecache(event: ExtendableEvent) {
	event.waitUntil(handlePrecacheManifest());
}
async function handlePrecacheManifest() {
	const cacheablePaths = ASSETS;
	saveRoutes(cacheablePaths);
	const cache = await caches.open(cacheName);
	const cachedRequests = await cache.keys();
	const cachedUrls = new Set(cachedRequests.map(({ url }) => url));
	const newPaths = cacheablePaths.filter((url) => !cachedUrls.has(url));

	for (const path of newPaths) {
		// console.log("new precache path", path);
		const reqUrl = new URL(path, self.location.origin);
		await cache.add(reqUrl);
	}
}
function saveRoutes(routes: string[]) {
	for (const route of routes) {
		const url = new URL(route, self.location.origin);
		const simplifiedRoute = `${url.origin}${url.pathname}`;
		precacheRoutes.add(simplifiedRoute);
	}
}

// MARK: activate
export function cleanupStaleAssets(event: ExtendableEvent) {
	event.waitUntil(handleRemoveStaleAssets());
}
async function handleRemoveStaleAssets() {
	const cacheablePathsSet = new Set(ASSETS);
	const cache = await caches.open(cacheName);
	const cachedRequests = await cache.keys();
	const staleRequests = cachedRequests.filter((req) => !cacheablePathsSet.has(req.url));
	await Promise.all(staleRequests.map((req) => cache.delete(req)));
}

// // MARK: fetch
export function proxyFetch(event: FetchEvent) {
	const url = new URL(event.request.url);
	const route = `${url.origin}${url.pathname}`;
	if (precacheRoutes.has(route)) {
		event.respondWith(handlePrefetch(event));
	} else if (mappedRoutes[route]) {
		event.respondWith(handlePrefetch(event, mappedRoutes[route]));
	} else {
		console.log('unhandled route', route);
	}
}
async function handlePrefetch(event: FetchEvent, url: string = event.request.url) {
	const cache = await caches.open(cacheName);
	const match = await cache.match(url, { ignoreSearch: true });
	if (match) {
		return match;
	}
	// const res = await fetch(event.request.clone());
	const res = await fetch(event.request);
	if (res.ok) {
		await cache.put(url, res.clone());
	}
	return res;
}
