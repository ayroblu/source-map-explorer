import type { MapSourceMapRequest, MapSourceMapResponse } from './types';

export async function mapSourceMapHandler(params: MapSourceMapRequest) {
	return makeFetchPostUnsafe<MapSourceMapRequest, MapSourceMapResponse>('/api/parse', params);
}

async function makeFetchPostUnsafe<P, R>(path: string, params: P): Promise<R> {
	const result = await makeFetchPost<R>(path, params);
	if (!result.ok) throw new Error(`Got api response: ${result.status}`);
	return result.data;
}
type SafeReturn<T> =
	| {
			ok: true;
			data: T;
	  }
	| {
			ok: false;
			failureType: 'network-error' | 'code';
			status: number;
			statusText: string;
			response: Response;
	  };
async function makeFetchPost<T>(path: string, params: unknown): Promise<SafeReturn<T>> {
	const response = await fetch(path, {
		body: JSON.stringify(params),
		method: 'POST'
	});
	if (!response.ok) {
		return {
			ok: false,
			failureType: 'code',
			status: response.status,
			statusText: response.statusText,
			response
		};
	}
	const result = await response.json();
	return {
		ok: true,
		data: result
	};
}
