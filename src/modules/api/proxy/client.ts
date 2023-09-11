type ProxyRequest = { url: string };
export async function proxyHandler(params: ProxyRequest) {
	return makeFetchGetUnsafe('/api/proxy', params);
}

async function makeFetchGetUnsafe(path: string, params: Record<string, string>): Promise<string> {
	const result = await makeFetchGet(path, params);
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
async function makeFetchGet(
	path: string,
	params: Record<string, string>
): Promise<SafeReturn<string>> {
	const search = new URLSearchParams();
	Object.entries(params).forEach(([key, value]) => {
		search.set(key, value);
	});
	const response = await fetch(`${path}?${search.toString()}`);
	if (!response.ok) {
		return {
			ok: false,
			failureType: 'code',
			status: response.status,
			statusText: response.statusText,
			response
		};
	}
	const result = await response.text();
	return {
		ok: true,
		data: result
	};
}
