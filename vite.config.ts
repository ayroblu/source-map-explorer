import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			manifest: {
				icons: [
					{
						src: 'favicons/android-chrome-512x512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			}
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
