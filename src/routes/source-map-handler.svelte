<script lang="ts">
	import { browser } from '$app/environment';
	import { mapSourceMapHandler } from '../modules/api/map-source-map/client';
	import { get, set } from 'idb-keyval';
	import {
		convertText,
		getTraceParts,
		isLocalConversionSupported
	} from '../modules/source-map-manager';
	import type { StackTracePath } from '../modules/source-map-manager';
	import SourceContextContent from './source-context-content.svelte';
	import { sourcePartToHref } from './utils';
	import { onMount, onDestroy } from 'svelte';

	/* if (browser) { */
	/* 	console.log('setup controller change'); */
	/* 	navigator.serviceWorker.addEventListener( */
	/* 		'controllerchange', */
	/* 		() => { */
	/* 			console.log('controller changed'); */
	/* 		}, */
	/* 		{ once: true } */
	/* 	); */
	/* } */
	onMount(() => {
		window.addEventListener('paste', handlePaste);
	});
	onDestroy(() => {
		if (browser) {
			window.removeEventListener('paste', handlePaste);
		}
	});

	let isParsing = true;
	// 	let input = `Error: first
	//   clone@webpack://home/src/ReactChildren.js:23:14
	//   g@webpack://home/node_modules/react/src/render.js:241:24`;
	let input = '';
	let srcMap: Record<string, string> = {};
	Promise.all([get('input'), get('srcMap')])
		.then(([newInput, newSrcMap]) => {
			if (newInput && newSrcMap) {
				input = newInput;
				srcMap = newSrcMap;
			}
		})
		.finally(() => {
			isParsing = false;
		});
	async function handlePaste(event: ClipboardEvent) {
		const text = event.clipboardData?.getData('Text');
		if (!text) {
			return;
		}
		isParsing = true;
		try {
			const { text: newText, srcMap: newSrcMap } = await (isLocalConversionSupported(text)
				? convertText(text)
				: mapSourceMapHandler({ text }));
			input = newText;
			srcMap = newSrcMap;
			set('input', input);
			set('srcMap', srcMap);
		} finally {
			isParsing = false;
		}
	}
	$: parts = getTraceParts(input);
	$: isLoading = isParsing;
	let sourceContent: (string | { tag: 'highlight' | 'red'; text: string })[];
	let sourceTop = 10;
	let sourceLeft = '300px';
	let sourceMaxWidth = '300px';
	let originalElement: HTMLElement | undefined;
	const getHandleMouseEnter =
		({ filename, line, column }: StackTracePath) =>
		(event: MouseEvent & { currentTarget: HTMLElement }) => {
			const key = `${filename}:${line}:${column}`;
			const rect = event.currentTarget.getBoundingClientRect();
			const remainingWidth = window.innerWidth - rect.right;
			if (remainingWidth < 300) {
				return;
			}
			const content = srcMap[key];
			if (!content) return;
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
			sourceTop = window.scrollY + window.innerHeight / 2;
			sourceLeft = `${window.scrollX + rect.right + 20}px`;
			sourceMaxWidth = `${remainingWidth - 54}px`;
			originalElement = event.currentTarget;
		};
	const splitTaggedRegex = /(<(?:red|highlight)>.+?<\/(?:red|highlight)>)/g;
	const matchRedRegex = /<red>(.+)<\/red>/g;
	const matchHighlightRegex = /<highlight>(.+)<\/highlight>/g;
	$: contextContent = sourceContent;
	$: topPx = sourceTop;
	$: left = sourceLeft;
	$: maxWidth = sourceMaxWidth;
</script>

{#if isLoading}
	<p>Loading...</p>
{/if}
<section>
	<pre>{#each parts as part}{#if typeof part === 'string'}{part}{:else}<a
					target="_blank"
					href={sourcePartToHref(part)}
					on:mouseenter={getHandleMouseEnter(part)}
					>{#if part.filename.includes('node_modules')}<span class="faded"
							>{part.filename}:{part.line}:{part.column}</span
						>{:else}{part.filename}:{part.line}:{part.column}{/if}</a
				>{/if}{/each}</pre>
</section>

{#if contextContent}
	<SourceContextContent {topPx} {left} {maxWidth} {contextContent} {originalElement} />
{/if}

<style>
	a {
		color: inherit;
	}
	a:hover {
		background: #5bf;
		color: black;
	}
	.faded {
		opacity: 0.7;
	}
</style>
