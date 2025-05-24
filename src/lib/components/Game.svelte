<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { scale } from 'svelte/transition';
	import { expoOut } from 'svelte/easing';

	// Import Stores and Types
	import { GameState } from '../stores/game.svelte.js';
	import { saveScore, getHighScores } from '../stores/db';

	// Import Utilities
	import { clamp } from '../utils';
	import { useCursorPosition } from '../hooks/useCursorPosition.svelte.js';
	import { useBoundingRect } from '../hooks/useBoundingRect.svelte.js';

	// Import Components
	import Fruit from './Fruit.svelte';
	import MergeEffect from './MergeEffect.svelte';
	import GameEntity from './GameEntity.svelte';
	import GameSidebar from './GameSidebar.svelte';
	import GameHeader from './GameHeader.svelte';
	import GameOverModal from './GameOverModal.svelte';
	import DebugMenu from '../components/DebugMenu.svelte';

	// Import Constants and Types
	import {
		GAME_WIDTH,
		GAME_WIDTH_PX,
		GAME_OVER_HEIGHT,
		FRUITS,
		DEFAULT_IMAGES_PATH,
		DEFAULT_SOUNDS_PATH
	} from '../constants';

	const { imagesPath = DEFAULT_IMAGES_PATH, soundsPath = DEFAULT_SOUNDS_PATH } = $props();

	// Game state reference
	let gameState = $state<GameState | null>(null);
	let highScores = $state([]);
	let showDebugMenu = $state(false);

	// Find game area width and cursor position
	let gameRef = $state<HTMLElement | null>(null);
	let gameBoundingRect = useBoundingRect();
	let cursorPosition = useCursorPosition();

	setContext('imagesPath', imagesPath);
	setContext('soundsPath', soundsPath);

	onMount(() => {
		gameState = new GameState({
			imagesPath,
			soundsPath
		});

		setContext('gameState', gameState);

		const urlParams = new URLSearchParams(window.location.search);
		const isDebugQuery = urlParams.get('debug') === 'true';
		const isLocalhost =
			window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
		showDebugMenu = isDebugQuery && isLocalhost;

		return function onUnmount() {
			gameState.destroy();
		};
	});

	$effect(() => {
		cursorPosition.ref = gameRef;
		gameBoundingRect.ref = gameRef;
	});

	// Find fruit data
	let currentFruit = $derived(FRUITS[gameState?.currentFruitIndex]);

	let gameWidthPx = $derived(gameBoundingRect?.rect?.width || GAME_WIDTH_PX);
	let gameScale = $derived(gameWidthPx / GAME_WIDTH_PX);

	let clampedMouseX: number = $derived.by(() => {
		const currentFruitRadius = currentFruit?.radius ?? 0.1; // Safety check
		const radiusRatio = currentFruitRadius / GAME_WIDTH;
		const radiusPx = radiusRatio * gameWidthPx;
		// Update mouseX state, clamped within bounds
		return clamp(cursorPosition.x, radiusPx, gameWidthPx - radiusPx);
	});

	let isDropping = $state(false);

	// Save score and load leaderboard when game is over
	$effect(async () => {
		if (gameState?.status === 'gameover') {
			if (typeof gameState.score === 'number') {
				await saveScore(gameState.score);
				highScores = await getHighScores();
			} else {
				console.error('Attempted to save invalid score:', gameState.score);
			}
		}
	});

	function dropCurrentFruit() {
		if (!gameState || gameState.status !== 'playing' || isDropping) return;

		isDropping = true;

		gameState.dropFruit(
			gameState.currentFruitIndex,
			(clampedMouseX / gameWidthPx) * GAME_WIDTH,
			GAME_OVER_HEIGHT / 2
		);

		// Prevent dropping too quickly
		setTimeout(() => {
			isDropping = false;
		}, 500); // Cooldown duration
	}

	// --- Event Handlers ---

	// Handle clicking/tapping to drop a fruit
	function handleClick(event: PointerEvent): void {
		// Only react to primary pointer button (typically left click).
		// If the button property is undefined (e.g. in some test
		// environments), treat it as a primary button click. This keeps
		// browser navigation buttons functional.
		if (event.button !== undefined && event.button !== 0) return;

		dropCurrentFruit();
	}

	// Handle keyboard interaction for dropping fruit (Accessibility)
	function handleKeyDown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			dropCurrentFruit();

			event.preventDefault(); // Prevent default spacebar scroll
		}
	}

	function handleGameOverClose() {
		gameState?.restartGame();
	}
</script>

<!--
  Disable specific a11y rules for this div because:
  1. role="application" correctly identifies it as a complex interactive widget.
  2. tabindex="0" makes it focusable.
  3. Keyboard and pointer event listeners provide the necessary interaction.
  This pattern is appropriate for custom game-like interfaces.
-->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="game-container">
	<div
		class="game responsive-font-size"
		role="application"
		aria-label="Fruit merging game area"
		tabindex="0">
		<div class="header"><GameHeader {gameState} /></div>
		<div class="sidebar"><GameSidebar {gameState} /></div>

		<!-- Game Container -->
		<div
			class="gameplay-area"
			bind:this={gameRef}
			onpointerup={handleClick}
			onkeydown={handleKeyDown}
			aria-hidden="true">
			<!-- aria-hidden because the wrapper handles interaction -->

			<div class="restricted-area"></div>

			{#if gameState}
				<div class="drop-line" style:translate="{clampedMouseX - 1}px 0"></div>

				<!-- Merge effects - Use effect.id as the key -->
				{#each gameState.mergeEffects as effect (effect.id)}
					<GameEntity x={effect.x} y={effect.y} scale={gameScale}>
						<MergeEffect {...effect} radius={effect.radius * gameScale} />
					</GameEntity>
				{/each}

				<!-- Preview fruit - Appears when not dropping -->
				{#if gameState.status !== 'gameover' && !isDropping && currentFruit}
					<div
						class="preview-fruit"
						aria-hidden="true"
						style:translate="{clampedMouseX}px 0"
						in:scale={{ opacity: 1, easing: expoOut, duration: 250 }}>
						<!-- aria-hidden as it's purely visual feedback -->
						<GameEntity x={0} y={GAME_OVER_HEIGHT / 2} scale={gameScale}>
							<Fruit {...currentFruit} radius={currentFruit.radius} scale={gameScale} />
						</GameEntity>
					</div>
				{/if}

				<!-- Rendered fruits - Use a unique identifier if available, otherwise index -->
				<!-- Assuming FruitState doesn't have a stable ID, index might be necessary -->
				<!-- If FruitState *does* get an ID (e.g., collider handle), use fruit.id -->
				{#each gameState.fruitsState as fruitState, i (i)}
					{@const fruit = FRUITS[fruitState.fruitIndex]}
					<GameEntity
						x={fruitState.x}
						y={fruitState.y}
						rotation={fruitState.rotation}
						scale={gameScale}>
						<Fruit {...fruit} radius={fruit.radius * gameScale} />
					</GameEntity>
				{/each}
			{/if}
		</div>

		{#if gameState}
			<GameOverModal
				open={gameState.status === 'gameover'}
				score={gameState.score}
				scores={highScores}
				onClose={handleGameOverClose} />
		{/if}
	</div>
	{#if showDebugMenu && gameState}
		<DebugMenu {gameState} />
	{/if}
</div>

<style>
	.game-container {
		--min-container-width: 100;
		--max-container-width: 600;
		--min-font-size-px: 2;
		--max-font-size-px: 16;

		container-type: inline-size;
		width: clamp(100px, 100%, 700px);
		max-width: calc(100svh * 2 / 3);

		@media (max-width: 480px) {
			max-width: calc(100svh * 1 / 2);
		}
	}

	.responsive-font-size {
		/* Calculate the slope and intercept for the linear interpolation */
		/* Slope = (max_font - min_font) / (max_width - min_width) */
		--_slope: calc(
			(var(--max-font-size-px) - var(--min-font-size-px)) /
				(var(--max-container-width) - var(--min-container-width))
		);

		/* Intercept = min_font - slope * min_width */
		/* Multiply by 1px here to ensure the result has a px unit */
		--_intercept-px: calc(
			var(--min-font-size-px) * 1px - var(--_slope) * var(--min-container-width) * 1px
		);

		/* Preferred value = intercept + slope * current_width (100cqi) */
		/* The slope calculation results in a unitless number, */
		/* multiplying by 1cqi gives it the correct dimension. */
		--_preferred-value: calc(var(--_intercept-px) + var(--_slope) * 100cqi);

		/* Apply clamp using the variables and calculated values */
		font-size: clamp(
			/* MIN: Multiply unitless variable by 1px */ calc(var(--min-font-size-px) * 1px),
			/* PREFERRED: Use the calculated value */ var(--_preferred-value),
			/* MAX: Multiply unitless variable by 1px */ calc(var(--max-font-size-px) * 1px)
		);
	}

	.game {
		--color-border: hsla(0, 0%, 0%, 0.1);
		--color-border-light: hsla(0, 0%, 0%, 0.075);
		--color-background: hsl(0, 0%, 95%);
		--color-background-light: hsl(0, 0%, 99%);
		--color-background-dark: hsl(0, 0%, 90%);
		--color-text: hsl(0, 0%, 20%);
		--color-light-text: hsl(0, 0%, 35%);
		--color-very-light-text: hsl(0, 0%, 50%);
		--border-radius: 1em;

		display: grid;
		grid-template-columns: 1fr 4fr;
		grid-template-areas: 'header header' 'sidebar gameplay';

		position: relative;
		overflow: hidden;

		user-select: none; /* Prevent text selection */
		touch-action: none; /* Prevent default touch actions like scrolling */
		outline: none; /* Remove default focus outline if desired, but ensure custom focus style */
		background: var(--color-background);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);

		font-family: Geist, Inter, sans-serif;
		font-optical-sizing: auto;
		font-style: normal;
		font-weight: 400;

		@media (max-width: 480px) {
			grid-template-columns: 1fr;
			grid-template-areas: 'sidebar' 'gameplay' 'header';
		}

		:global(*) {
			box-sizing: border-box;
		}

		:global(b, strong, h1, h2, h3, h4, h5, h6) {
			font-weight: 550;
		}

		:global(h1, h2, h3, h4, h5, h6) {
			margin: 0;
		}

		:global(button) {
			font-size: 1em;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			height: 2em;
			background-color: var(--color-background);
			border: none;
			border-radius: 0.5em;
			padding: 0.25em 0.75em;
			color: var(--color-text);
			box-shadow:
				0px 0px 0px 1px rgba(0, 0, 0, 0.125),
				0px 0px 0px 1px rgba(0, 0, 0, 0.1),
				inset 0px 1px 0px 0px rgba(255, 255, 255, 0.95);
			cursor: pointer;
			transition:
				background-color 250ms,
				box-shadow 250ms,
				translate 250ms;

			&:hover {
				background-color: var(--color-background-light);
				translate: 0px -2px;
				box-shadow:
					0px 2px 0px 1px rgba(0, 0, 0, 0.125),
					0px 0px 0px 1px rgba(0, 0, 0, 0.1),
					inset 0px 1px 0px 0px rgba(255, 255, 255, 0.95);
				transition:
					background-color 100ms,
					box-shadow 100ms,
					translate 100ms;
			}

			&:active {
				background-color: var(--color-background-dark);
				translate: 0px 0px;
				box-shadow:
					0px 0px 0px 1px rgba(0, 0, 0, 0.125),
					0px 0px 0px 1px rgba(0, 0, 0, 0.1),
					inset 0px 1px 0px 0px rgba(255, 255, 255, 0.95);
			}
		}

		:global(var) {
			font-family: Geist, monospace;
			font-variant-numeric: tabular-nums;
			font-optical-sizing: auto;
			font-style: normal;
		}
	}

	/* Add focus style for accessibility */
	.game:focus-visible {
		box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.6); /* Example focus ring */
	}

	.gameplay-area {
		min-width: 0px;
		flex-grow: 1;
		flex-shrink: 1;
		aspect-ratio: 2 / 3;
		position: relative;
		box-shadow: inset hsla(0, 0%, 0%, 0.2) 0 2px 2px;
		background-color: var(--color-background-dark);

		/* Removed cursor: pointer as interaction is on wrapper */
		user-select: none;
		overflow: hidden;
		touch-action: none;
	}

	.restricted-area {
		position: absolute;
		top: 0;
		left: 0;
		height: 16.666%;
		width: 100%;
		border-bottom: 1px solid var(--color-border-light);
		background-image: repeating-linear-gradient(
			-45deg,
			/* Gradient direction */ var(--color-border-light) 0px,
			/* Start color from 0px */ var(--color-border-light) 1px,
			/* Color extends to 1px */ transparent 1px,
			/* Transparent starts at 1px */ transparent 15px /* Transparent extends to 3px (1px + 2px) */
				/* The pattern repeats every 3px */
		);
	}

	.drop-line {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 0;
		width: 1px;
		height: 100%;
		background: var(--color-border-light);
	}

	.preview-fruit {
		position: absolute;
		top: 0;
		left: 0; /* Left is now fixed, use transform for horizontal positioning */
		/* width: 100%; */ /* Width is determined by the fruit component */
		pointer-events: none; /* Prevent interaction */
		z-index: 1;
	}

	.sidebar {
		grid-area: sidebar;
		border-top: var(--color-border-light) 1px solid;
	}

	.header {
		grid-area: header;
	}
</style>
