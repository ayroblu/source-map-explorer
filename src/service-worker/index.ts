import './types';
import { cleanupStaleAssets, precacheManifest, proxyFetch } from './main';

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('fetch', proxyFetch);

self.addEventListener('install', precacheManifest);
// Skip Waiting makes the new service worker the active service worker
self.addEventListener('install', () => self.skipWaiting());
// claim makes the new requests go to the new service worker
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('activate', cleanupStaleAssets);
