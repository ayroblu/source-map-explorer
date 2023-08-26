import sourceMap, { type MappedPosition } from 'source-map';

export async function convertText(
	input: string
): Promise<{ text: string; srcMap: Record<string, string> }> {
	const parts = input.split(sourceRegex).map((text) => {
		const match = sourcePartsRegex.exec(text);
		if (!match) {
			return text;
		}
		return {
			functionName: match[1],
			filename: match[2],
			line: match[3],
			column: match[4]
		};
	});
	const srcMap: Record<string, string> = {};
	const modifiedParts = await Promise.all(
		parts.map(async (part) => {
			if (typeof part === 'string') return part;
			const { functionName, filename, line, column } = part;
			const result = await safeResolve(filename, parseInt(line, 10), parseInt(column, 10));
			if (!result.success) {
				console.error(result.error);
				return `${functionName}@${filename}:${line}:${column}`;
			}
			const { pos, src } = result.data;
			const { line: newLine, column: newColumn, name } = pos;
			const newFunctionName = functionName;
			const newFilename = name ?? '';
			if (!srcMap[newFilename]) {
				srcMap[newFilename] = src;
			}
			return `${newFunctionName}@${newFilename}:${newLine}:${newColumn}`;
		})
	);
	return {
		text: modifiedParts.join(''),
		srcMap
	};
}

const sourceRegex = /([\S]*@[\S]+:\d+:\d+)/g;
const sourcePartsRegex = /([\S]*)@([\S]+):(\d+):(\d+)/;

type ResolveReturn = {
	pos: MappedPosition;
	src: string;
};
async function resolve(path: string, line: number, column: number): Promise<ResolveReturn> {
	const map = await loadMapCached(path);
	const smc = await new sourceMap.SourceMapConsumer(map);
	const pos = smc.originalPositionFor({ line, column });
	if (!pos.source || !pos.line || !pos.column) {
		throw new Error('Mapping not found');
	}
	const resultPos = {
		source: pos.source,
		line: pos.line,
		column: pos.column,
		name: pos.name ?? undefined
	};
	const src = smc.sourceContentFor(pos.source);
	if (!src) {
		throw new Error('Source not found');
	}
	return { pos: resultPos, src };
}

type SafeReturn<T> =
	| {
			success: true;
			data: T;
	  }
	| {
			success: false;
			error: unknown;
	  };
async function safeResolve(
	path: string,
	line: number,
	column: number
): Promise<SafeReturn<Awaited<ReturnType<typeof resolve>>>> {
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
