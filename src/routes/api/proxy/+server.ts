import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { handler } from '../../../modules/api/proxy/server';

export const GET: RequestHandler = async ({ url }) => {
	const result = await handler(url);
	return text(result);
};
