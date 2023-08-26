import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { MapSourceMapResponse } from './types';
import { convertText } from '../../source-map-manager';

export async function mapSourceMapHandler(request: Request): Promise<MapSourceMapResponse> {
	const { text } = await parse(request);
	return convertText(text);
}

const MapSourceMapRequest = z.object({
	text: z.string()
});
export type MapSourceMapRequest = z.infer<typeof MapSourceMapRequest>;

async function parse(request: Request) {
	const result = MapSourceMapRequest.safeParse(await request.json());
	if (result.success === false) {
		throw error(400, { message: 'invalid params' });
	}
	return result.data;
}
