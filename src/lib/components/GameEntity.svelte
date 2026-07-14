<script lang="ts">
import { GAME_WIDTH, GAME_WIDTH_PX } from '../constants';

let {
	x = 0, // meters
	y = 0, // meters
	rotation = 0,
	scale = 1,
	zIndex = undefined,
	children
}: {
	x?: number;
	y?: number;
	rotation?: number;
	scale?: number;
	zIndex?: number;
	children: import('svelte').Snippet;
} = $props();

const scaledGameWidthPx = $derived(scale * GAME_WIDTH_PX);
const translateX = $derived((x / GAME_WIDTH) * scaledGameWidthPx);
const translateY = $derived((y / GAME_WIDTH) * scaledGameWidthPx);
</script>

<div
	class="game-entity"
	style:translate="calc(-50% + {translateX}px) calc(-50% + {translateY}px)"
	style:rotate="{rotation}rad"
	style:z-index={zIndex}>
	{@render children()}
</div>

<style>
	.game-entity {
		position: absolute;
	}
</style>
