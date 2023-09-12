<script lang="ts">
	import { afterUpdate } from 'svelte';
	export let topPx: number;
	export let left: string;
	export let maxWidth: string;
	export let originalElement: HTMLElement | undefined;
	export let contextContent: (
		| string
		| {
				tag: 'highlight' | 'red';
				text: string;
		  }
	)[];
	let element: HTMLElement | undefined;
	let highlightElement: HTMLSpanElement | undefined;

	$: top = `${topPx}px`;
	afterUpdate(() => {
		// This scrolls the outside too, which isn't desired, so do it manually
		// highlightElement?.scrollIntoView({ block: 'center' });
		if (element && highlightElement) {
			const elRect = element.getBoundingClientRect();
			const hRect = highlightElement.getBoundingClientRect();
			const elCenter = elRect.top + elRect.height / 2;
			const hCenter = hRect.top + hRect.height / 2;
			element.scrollBy(0, hCenter - elCenter);
		}
		if (element && originalElement) {
			const originalTop = element.style.top;
			element.style.top = `${topPx}px`;
			const elRect = element.getBoundingClientRect();
			element.style.top = originalTop;
			// matches 90vh - 22px in styles
			const maxAdjustment = elRect.top - Math.ceil((window.innerHeight - 22) / 20);
			const originalRect = originalElement.getBoundingClientRect();
			const adjustmentIdeal = originalRect.top + originalRect.height / 2 - window.innerHeight / 2;
			const adjustment = Math.min(maxAdjustment, Math.max(-maxAdjustment, adjustmentIdeal));
			const adjustedTopPx = topPx + adjustment;
			top = `${adjustedTopPx}px`;
		}
	});
</script>

<div class="contextContent" style:top style:left style:max-width={maxWidth} bind:this={element}>
	{#each contextContent as part}{#if typeof part === 'string'}{part}{:else if part.tag === 'red'}<span
				class="red">{part.text}</span
			>{:else if part.tag === 'highlight'}<span class="highlight" bind:this={highlightElement}
				>{part.text}</span
			>{:else}{part.text}{part.text}{/if}{/each}
</div>

<style>
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
