<script lang="ts">
	import { onMount } from 'svelte';
	import { FRUITS, GAME_WIDTH, GAME_OVER_HEIGHT } from '../constants';

	const { gameState } = $props();

	let visible = false;
	let selectedFruit = 0;
	let xPos = GAME_WIDTH / 2;

	onMount(() => {
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams(window.location.search);
			visible = params.get('debug') === 'true';
		}
	});

	function dropDebugFruit() {
		if (!visible || !gameState) return;
		gameState.addFruit(selectedFruit, xPos, GAME_OVER_HEIGHT / 2);
	}

	function endGame() {
		if (!gameState) return;
		gameState.setStatus('gameover');
	}
</script>

{#if visible}
	<div class="debug-menu">
		<label>
			Fruit
			<select bind:value={selectedFruit}>
				{#each FRUITS as fruit, i}
					<option value={i}>{fruit.name}</option>
				{/each}
			</select>
		</label>

		<label>
			X Position
			<input type="range" min="0" max={GAME_WIDTH} step="0.01" bind:value={xPos} />
		</label>

		<button type="button" on:click={dropDebugFruit}>drop fruit</button>
		<button type="button" on:click={endGame}>end game</button>
	</div>
{/if}

<style>
	.debug-menu {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 0.25em;
		background: rgba(255, 255, 255, 0.9);
		padding: 0.5em;
		font-size: 12px;
	}
	.debug-menu label {
		display: flex;
		flex-direction: column;
	}
</style>
