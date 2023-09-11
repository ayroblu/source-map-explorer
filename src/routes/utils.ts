import type { StackTracePath } from '../modules/source-map-manager';
import { PUBLIC_SOURCE_URL_TEMPLATE } from '$env/static/public';

const url = PUBLIC_SOURCE_URL_TEMPLATE;
if (!url.includes('{filepath}') || !url.includes('{line}')) {
	throw new Error('expected {filepath} and {line} template values in template url');
}

export function sourcePartToHref(part: StackTracePath) {
	const { filename, line, column } = part;
	const nodeModulePath = pathToNodeModulePath(filename, line, column);
	if (nodeModulePath) {
		return nodeModulePath;
	}
	const realFilename = filename.replace('webpack:///', '');
	// https://sourcegraph.com/github.com/facebook/react/-/blob/packages/react/src/ReactChildren.js?L37
	return url.replace('{filepath}', realFilename).replace('{line}', line);
}

const isNpm = true;
function pathToNodeModulePath(path: string, line: string, column: string): string | void {
	if (isNpm) {
		const match = nodeModuleNpmRegex.exec(path);
		if (!match) {
			return;
		}
		return `https://www.npmjs.com/package/${match[1]}?activeTab=code&path=${match[2]}&line=${line}&column=${column}`;
	} else {
		const match = nodeModuleUnpkgRegex.exec(path);
		if (!match) {
			return;
		}
		return `https://unpkg.com/${match[1]}?line=${line}&column=${column}`;
	}
}
const nodeModuleNpmRegex = /node_modules\/(.+?)\/(.+)/;
const nodeModuleUnpkgRegex = /node_modules\/(.+)/;
