<script lang="ts">
	import { mapSourceMapHandler } from '../modules/api/map-source-map/client';
	import { getTraceParts } from '../modules/source-map-manager';
	import { sourcePartToHref } from './utils';
	import { onMount, onDestroy } from 'svelte';

	onMount(() => {
		window.addEventListener('paste', handlePaste);
	});
	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('paste', handlePaste);
		}
	});

	let isParsing = false;
	let input = `Error: first
  clone@webpack://home/src/ReactChildren.js:23:14
  g@webpack://home/node_modules/react/src/render.js:241:24`;
	let srcMap = {};
	async function handlePaste(event: ClipboardEvent & { currentTarget: HTMLTextAreaElement }) {
		const text = event.clipboardData?.getData('Text');
		if (!text) {
			return;
		}
		isParsing = true;
		try {
			const { text: newText, srcMap: newSrcMap } = await mapSourceMapHandler({ text });
			input = newText;
			srcMap = newSrcMap;
		} finally {
			isParsing = false;
		}
	}
	$: parts = getTraceParts(input);
	$: isLoading = isParsing;
	let sourceContent;
	let sourceTop = '10px';
	let sourceLeft = '300px';
	let sourceMaxWidth = '300px';
	const getHandleMouseEnter =
		({ filename, line, column }) =>
		(event) => {
			const key = `${filename}:${line}:${column}`;
			const rect = event.currentTarget.getBoundingClientRect();
			const remainingWidth = window.innerWidth - rect.right;
			if (remainingWidth < 300) {
				return;
			}
			const content = srcMap[key];
			// sourceContent = srcMap[key]
			sourceContent = content.split(splitTaggedRegex).map((t) => {
				const redMatch = matchRedRegex.exec(t);
				if (redMatch) {
					return { tag: 'red', text: redMatch[1] };
				}
				const highlightMatch = matchHighlightRegex.exec(t);
				if (highlightMatch) {
					return { tag: 'highlight', text: highlightMatch[1] };
				}
				return t;
			});
			sourceTop = `${window.scrollY + window.innerHeight / 2}px`;
			sourceLeft = `${window.scrollX + rect.right + 20}px`;
			sourceMaxWidth = `${remainingWidth - 54}px`;
		};
	const splitTaggedRegex = /(<(?:red|highlight)>.+?<\/(?:red|highlight)>)/g;
	const matchRedRegex = /<red>(.+)<\/red>/g;
	const matchHighlightRegex = /<highlight>(.+)<\/highlight>/g;
	$: contextContent = sourceContent;
	$: top = sourceTop;
	$: left = sourceLeft;
	$: maxWidth = sourceMaxWidth;
</script>

{#if isLoading}
	<p>Loading...</p>
{/if}
{#if contextContent}
	<div class="contextContent" style:top style:left style:max-width={maxWidth}>
		{#each contextContent as part}{#if typeof part === 'string'}{part}{:else if part.tag === 'red'}<span
					class="red">{part.text}</span
				>{:else if part.tag === 'highlight'}<span
					class="highlight">{part.text}</span
				>{:else}{part.text}{part.text}{/if}{/each}
	</div>
{/if}
<section>
	<pre>{#each parts as part}{#if typeof part === 'string'}{part}{:else}<a
					target="_blank"
					href={sourcePartToHref(part)}
					on:mouseenter={getHandleMouseEnter(part)}>{part.filename}:{part.line}:{part.column}</a
				>{/if}{/each}</pre>
</section>

<style>
	a {
		color: inherit;
	}
	a:hover {
		background: #5bf;
		color: black;
	}
	.red {
		color: red;
	}
	.highlight {
		background: yellow;
		color: black;
	}
	.contextContent {
		position: absolute;
		white-space: pre-wrap;
		padding: 10px;
		border-radius: 8px;
		border: 1px solid #aaa;
		background: black;
		overflow: auto;
		font-family: monospace;
		max-height: calc(90vh - 22px);
		transform: translateY(-50%);
	}
</style>
