<script lang="ts">
	import type { GameState } from '$lib/stores/game.svelte'; // Adjust if GameState type is not directly exportable or path is different
	import { FRUITS, GAME_WIDTH, GAME_OVER_HEIGHT } from '$lib/constants';

	const { gameState } = $props<{ gameState: GameState }>();

	let isCollapsed = $state(false);
	let selectedFruitIndex = $state(0);
	let selectedXPosition = $state(GAME_WIDTH / 2);

	function toggleCollapse() {
		isCollapsed = !isCollapsed;
	}

	function handleDropFruit() {
		if (gameState) {
			gameState.dropFruit(selectedFruitIndex, selectedXPosition, GAME_OVER_HEIGHT / 2);
		}
	}

	function handleEndGame() {
		if (gameState) {
			gameState.setStatus('gameover');
		}
	}
</script>

<div class="debug-menu">
	<header class="debug-menu-header">
		<h3>Debug Menu</h3>
		<button class="toggle-button" onclick={toggleCollapse}>
			{#if isCollapsed}Show{:else}Hide{/if}
		</button>
	</header>

	{#if !isCollapsed}
		<div class="debug-menu-content">
			<div class="input-group">
				<label for="fruit-select">Select Fruit:</label>
				<select id="fruit-select" bind:value={selectedFruitIndex}>
					{#each FRUITS as fruit, index}
						<option value={index}>{fruit.name} (Index: {index})</option>
					{/each}
				</select>
			</div>

			<div class="input-group">
				<label for="x-position-slider">X Position: {selectedXPosition.toFixed(2)}</label>
				<input
					type="range"
					id="x-position-slider"
					min="0"
					max={GAME_WIDTH}
					step={GAME_WIDTH / 100}
					bind:value={selectedXPosition} />
			</div>

			<div class="input-group">
				<button onclick={handleDropFruit} disabled={gameState?.status !== 'playing'}
					>Drop Fruit</button>
			</div>

			<div class="input-group">
				<button onclick={handleEndGame}>End Game</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.debug-menu {
		position: fixed;
		top: 0.5em;
		right: 0.5em;
		display: flex;
		flex-direction: column;
		gap: 1em;
		background-color: rgba(0, 0, 0, 0.8);
		color: white;
		padding: 15px;
		border-radius: 1em; /* Slightly more rounded corners */
		z-index: 1000;
		width: 280px; /* Define a width */
		font-size: 0.9rem;
		backdrop-filter: blur(10px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Subtle shadow for depth */
		transition: height 0.3s ease; /* Basic animation for height change */

		h3 {
			margin-top: 0;
			margin-bottom: 0; /* Adjusted as margin-bottom is now on debug-menu-header */
			font-size: 1em;
		}
	}

	.debug-menu-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.toggle-button {
		width: auto; /* Allow button to size to content */
		min-width: 50px; /* Ensure a minimum width for "Show"/"Hide" */
	}

	.debug-menu-content {
		display: flex;
		flex-direction: column;
		gap: 1em;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.debug-menu label {
		display: block;
		font-size: 1em;
	}
</style>
