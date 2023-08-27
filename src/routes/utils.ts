import type { StackTracePath } from '../modules/source-map-manager';

export function sourcePartToHref(part: StackTracePath) {
	const { filename, line, column } = part;
	const nodeModulePath = pathToNodeModulePath(filename, line, column);
	if (nodeModulePath) {
		return nodeModulePath;
	}
	const realFilename = filename.replace('webpack:///', '');
	// https://sourcegraph.com/github.com/facebook/react/-/blob/packages/react/src/ReactChildren.js?L37
	return `https://sourcegraph.com/github.com/facebook/react/-/blob/${realFilename}?L${line}`;
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
