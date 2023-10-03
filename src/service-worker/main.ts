/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { build, files, prerendered } from '$service-worker';
declare const self: ServiceWorkerGlobalScope;

// if you ever change this, you need to delete existing cache storage
const version = '1';
const cacheName = `sw-precache-v${version}`;
const precacheRoutes = new Set();
const cacheablePaths = [
	...build, // the js and css and related parts of the app itself
	...files, // everything in `static`
	...prerendered // routes marked as prerendered
];
const prerenderedSet = new Set(prerendered);

// MARK: install
export function handlePrecache(event: ExtendableEvent) {
	event.waitUntil(handlePrecacheManifest());
}
async function handlePrecacheManifest() {
	saveRoutes(cacheablePaths);
	const cache = await caches.open(cacheName);
	const cachedRequests = await cache.keys();
	const cachedUrls = new Set(
		cachedRequests.map(({ url }) => url).map((url) => url.replace(self.location.origin, ''))
	);
	// NOTE: prerendered routes must always be fetched
	const newPaths = cacheablePaths.filter((url) => !cachedUrls.has(url) || prerenderedSet.has(url));
	log('sw: new precache:', newPaths.length, '/', cacheablePaths.length);

	for (const path of newPaths) {
		const reqUrl = new URL(path, self.location.origin);
		// TODO: update tests to support URL param to fetch
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
	const cacheablePathsSet = new Set(cacheablePaths);
	const cache = await caches.open(cacheName);
	const cachedRequests = await cache.keys();
	const staleRequests = cachedRequests.filter(
		(req) => !cacheablePathsSet.has(req.url.replace(self.location.origin, ''))
	);
	log('removing stale assets:', staleRequests.length, '/', cachedRequests.length);
	await Promise.all(staleRequests.map((req) => cache.delete(req)));
}

export function handleNavigationPreload(event: ExtendableEvent) {
	event.waitUntil(setNavigationPreload());
}
async function setNavigationPreload() {
	if (self.registration.navigationPreload) {
		await self.registration.navigationPreload.enable();
		// How to use
		// const response = await event.preloadResponse;
		// if (response) return response;
	}
}

// MARK: fetch
export function proxyFetch(event: FetchEvent) {
	const url = new URL(event.request.url);
	const route = `${url.origin}${url.pathname}`;
	if (precacheRoutes.has(route)) {
		event.respondWith(handlePrefetch(event));
	} else {
		log('unhandled route', route);
		unhandledRoutesLog.push(route);
	}
}
const unhandledRoutesLog: string[] = [];
async function handlePrefetch(event: FetchEvent, url: string = event.request.url) {
	const cache = await caches.open(cacheName);
	const match = await cache.match(url, { ignoreSearch: true });
	if (debug && unhandledRoutesLog.length) {
		log('missing:', unhandledRoutesLog);
	}
	if (match) {
		return match;
	}
	const res = await fetch(event.request);
	if (res.ok) {
		await cache.put(url, res.clone());
	}
	return res;
}

const debug = false;
function log(...args: unknown[]) {
	if (debug) {
		console.log(...args);
	}
}
