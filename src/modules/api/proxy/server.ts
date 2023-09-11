import { error } from '@sveltejs/kit';
import type { ProxyResponse } from './types';
import { fetchSimpleText } from '../../source-map-manager/utils';

export async function handler(url: URL): Promise<ProxyResponse> {
	const { url: parsedUrl } = await parse(url);
	return fetchSimpleText(parsedUrl);
}

async function parse(url: URL) {
	const urlPath = url.searchParams.get('url');
	if (typeof urlPath !== 'string') {
		throw error(400, { message: 'invalid params' });
	}
	return { url: urlPath}
}
