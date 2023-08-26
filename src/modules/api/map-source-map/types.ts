export type { MapSourceMapRequest } from './server';
export type MapSourceMapResponse = {
	text: string;
	srcMap: Record<string, string>;
};
