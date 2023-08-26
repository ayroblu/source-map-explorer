import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

export const POST: RequestHandler = async ({ request }) => {
	const { text } = await parse(request);
	console.log('text', text);
	return json({ text });
};

const Request = z.object({
	text: z.string()
});
async function parse(request: Request) {
	const result = Request.safeParse(await request.json());
	if (result.success === false) {
		throw error(400, { message: 'invalid params' });
	}
	return result.data;
}

// extract the inferred type
// type User = z.infer<typeof User>;
// { username: string }
