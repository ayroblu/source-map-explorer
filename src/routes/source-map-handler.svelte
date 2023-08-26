<script lang="ts">
	import { mapSourceMapHandler } from '../modules/api/map-source-map/client';

	let input = `Error: first
  clone@webpack://home/src/ReactChildren.js:23:14
  g@webpack://home/node_modules/react/src/render.js:241:24`;
	async function handlePaste(event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) {
		// const text = event.currentTarget.value;
		const text = event.clipboardData?.getData('Text');
		console.log('errr', new Error('hi').stack);
		if (!text) {
			return;
		}
		const { text: newText } = await mapSourceMapHandler({ text });
		input = newText;
	}
	const sourceRegex = /([\S]*@[\S]+:\d+:\d+)/g;
	const sourcePartsRegex = /([\S]*)@([\S]+):(\d+):(\d+)/g;
	$: parts = input.split(sourceRegex).map((text) => {
		const match = sourcePartsRegex.exec(text);
		if (!match) {
			return text;
		}
		return {
			functionName: match[1],
			filename: match[2],
			line: match[3],
			column: match[4]
		};
	});
	type SourcePart = {
		filename: string;
		line: string;
		column: string;
	};

	function sourcePartToHref(part: SourcePart) {
		const { filename, line } = part;
		const realFilename = filename.replace('webpack://home', 'packages/react');
		// https://sourcegraph.com/github.com/facebook/react/-/blob/packages/react/src/ReactChildren.js?L37
		return `https://sourcegraph.com/github.com/facebook/react/-/blob/${realFilename}?L${line}`;
	}
</script>

<textarea rows={1} on:paste={handlePaste} />

<section>
	<li>Can click on links to reveal in source graph</li>
	<li>fade out items that are in node_modules</li>
	<pre>{#each parts as part}{#if typeof part === 'string'}{part}{:else}<a
					target="_blank"
					href={sourcePartToHref(part)}
					>{part.functionName}@{part.filename}:{part.line}:{part.column}</a
				>{/if}{/each}</pre>
</section>

<style>
	a {
		color: inherit;
	}
</style>
