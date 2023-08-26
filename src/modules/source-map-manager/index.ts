import sourceMap from 'source-map';

export async function resolve(path: string, line: number, column: number) {
	const map = await loadMapCached(path);
	const smc = await new sourceMap.SourceMapConsumer(map);
	const pos = smc.originalPositionFor({ line, column });
	if (!pos.source) {
		throw new Error('Mapping not found');
	}
	const name = pos.name;
	const src = smc.sourceContentFor(pos.source);
	return { pos, name, src };
}

export async function safeResolve(path: string, line: number, column: number) {
	try {
		return {
			data: await resolve(path, line, column),
			success: true
		};
	} catch (error) {
		return {
			error,
			success: false
		};
	}
}

const cache = new Map();
async function loadMap(path: string) {
	const js = await fetchSimpleText(path);
	if (js.startsWith('{')) {
		return JSON.parse(js);
	}
	const lastLine = js.split('\n').at(-1);
	// //# sourceMappingURL=https://ton.local.twitter.com/responsive-web-internal/sourcemaps/client-web/main.813dfefa.js.map
	if (!lastLine) {
		throw new Error(`Could not get last line of ${path}`);
	}
	const match = /sourceMappingURL=(.+)/g.exec(lastLine);
	if (!match) {
		throw new Error('Count not find last line of source map');
	}
	const sourceMapPath = match[1];
	return fetchSimpleJson(sourceMapPath);
}
function loadMapCached(path: string) {
	return withCache(path, async () => loadMap(path));
}
async function withCache<T>(key: string, func: () => Promise<T>): Promise<T> {
	const cachedValue = cache.get(key);
	if (cachedValue) {
		return cachedValue;
	}
	const result = await func();
	cachedValue.set(key, result);
	return result;
}

async function getFetchResponseSimple(path: string) {
	const response = await fetch(path);
	if (!response.ok) {
		throw new Error(`Fetch failed for path: ${path}`);
	}
	return response;
}
async function fetchSimpleJson(path: string) {
	const response = await getFetchResponseSimple(path);
	return response.json();
}
async function fetchSimpleText(path: string) {
	const response = await getFetchResponseSimple(path);
	return response.text();
}
