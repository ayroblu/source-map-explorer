import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { mapSourceMapHandler } from '../../../modules/api/map-source-map/server';

export const POST: RequestHandler = async ({ request }) => {
	const result = await mapSourceMapHandler(request);
	return json(result);
};
