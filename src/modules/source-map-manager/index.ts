import sourceMap, { type MappedPosition } from 'source-map';
import { fetchSimpleJson, fetchSimpleText, maybeAdjustFetchPath, setupCache } from './utils';
import { browser } from '$app/environment';

export function isLocalConversionSupported(input: string): boolean {
	const parts = getTraceParts(input);
	return parts.every((part) => {
		if (typeof part === 'string') return true;
		return cache.cache.has(part.filename);
	});
}

export async function convertText(
	input: string
): Promise<{ text: string; srcMap: Record<string, string> }> {
	const parts = getTraceParts(input);
	const srcMap: Record<string, string> = {};
	const modifiedParts = await Promise.all(
		parts.map(async (part) => {
			if (typeof part === 'string') return part;
			const { name, filename, line, column } = part;
			const result = await safeResolve(filename, parseInt(line, 10), parseInt(column, 10));
			if (!result.success) {
				console.error('failed to resolve', filename, line, column, result.error);
				return `${filename}:${line}:${column}`;
			}
			const { pos, src } = result.data;
			const { name: newName, line: newLine, column: newColumn, source } = pos;
			const newFilename = source;
			const newTrace = `${newFilename}:${newLine}:${newColumn}`;
			if (!srcMap[newTrace]) {
				srcMap[newTrace] = src;
			}
			if (name || newName) {
				return `at ${newName ?? name} (${newTrace})`;
			}
			return newTrace;
		})
	);
	return {
		text: modifiedParts.join(''),
		srcMap
	};
}

export type StackTracePath = {
	filename: string;
	line: string;
	column: string;
	name: string | undefined;
	prefix: string | undefined;
	suffix: string | undefined;
};
export function getTraceParts(input: string): (string | StackTracePath)[] {
	return input.split(sourceRegex).map((text) => {
		const match = sourcePartsRegex.exec(text);
		if (!match) {
			return text;
		}
		return {
			prefix: match[1],
			name: match[2],
			filename: match[3],
			line: match[4],
			column: match[5],
			suffix: match[6]
		};
	});
}

const sourceRegex = /((?:at [\w (]+)?[\w]+:\/\/[\S]+:\d+:\d+\)?)/g;
const sourcePartsRegex = /(at (\w+) \(|at )?([\S]+):(\d+):(\d+)(\))?/;

type ResolveReturn = {
	pos: MappedPosition;
	src: string;
};
async function resolve(path: string, line: number, column: number): Promise<ResolveReturn> {
	if (!path.startsWith('https:')) {
		throw new Error(`resolve: "${path}" does not start with https`);
	}
	const map = await loadMapCached(maybeAdjustFetchPath(path));
	return sourceMap.SourceMapConsumer.with(map, null, (smc) => {
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
		const sourceContent = smc.sourceContentFor(pos.source);
		if (!sourceContent) {
			throw new Error('Source not found');
		}
		const src = slice(sourceContent, pos.line, pos.column, { context: 20 });
		return { pos: resultPos, src };
	});
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
	const sourceMapPath = browser ? `/api/proxy?url=${encodeURIComponent(match[1])}` : match[1];
	console.log('loading', sourceMapPath);
	return fetchSimpleJson(sourceMapPath);
}
const cache = setupCache<string>();
function loadMapCached(path: string) {
	return cache.withCache(path, loadMap);
}

function slice(text: string, line: number, column: number, opts: { context?: number }) {
	const delimiter = '\n';
	const before = opts.context || 0;
	const after = opts.context || 0;
	const lines = text.split(delimiter);
	const begin = Math.max(0, line - before - 1);
	const end = Math.min(line + after - 1, lines.length - 1);
	const slice = lines.slice(begin, end + 1);
	if (column > 100 || slice.some((s) => s.length > 300)) {
		return [
			lines[line - 1].slice(column - 1 - 30, column - 1 + 30),
			'^'.padStart(32).replace('^', '<red>^</red>')
		].join('\n');
	}
	slice[line - begin - 1] = `<highlight>${slice[line - begin - 1]}</highlight>`;
	slice.splice(line - begin, 0, '^'.padStart(column + 1).replace('^', '<red>^</red>'));
	return slice.join(delimiter);
}
