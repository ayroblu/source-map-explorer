export type {};
// declare const self: ServiceWorkerGlobalScope;

declare global {
	interface ServiceWorkerGlobalScope {
		__WB_MANIFEST?: Array<PrecacheEntry | string>;
	}
}
export interface PrecacheEntry {
	integrity?: string;
	url: string;
	revision?: string | null;
}
