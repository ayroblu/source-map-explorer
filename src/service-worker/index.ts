/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { cleanupStaleAssets, handleNavigationPreload, handlePrecache, proxyFetch } from './main';

self.addEventListener('fetch', proxyFetch);

self.addEventListener('install', handlePrecache);
// Skip Waiting makes the new service worker the active service worker
self.addEventListener('install', () => self.skipWaiting());
// claim makes the new requests go to the new service worker
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('activate', cleanupStaleAssets);

/** Since our app is prerendered, we don't need navigation preload */
const withNavigationPreload = false;
if (withNavigationPreload) {
	self.addEventListener('activate', handleNavigationPreload);
}
