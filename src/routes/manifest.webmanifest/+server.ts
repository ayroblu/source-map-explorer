import { json } from '@sveltejs/kit';

export const prerender = true;
export function GET() {
	return json({
		name: 'source-map-explorer',
		short_name: 'source-map-explorer',
		start_url: './',
		display: 'standalone',
		background_color: '#ffffff',
		lang: 'en',
		scope: './',
		icons: [
			{
				src: './favicons/android-chrome-512x512.png',
				sizes: '512x512',
				type: 'image/png'
			}
		]
	});
}
