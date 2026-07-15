<script lang="ts">
import { onMount, setContext } from 'svelte';
import { fade, scale } from 'svelte/transition';
import { expoOut } from 'svelte/easing';

import { GameState } from '../stores/game.svelte.js';
import { saveScore } from '../stores/db';

// Import Utilities
import { clamp } from '../utils/clamp';
import { useCursorPosition } from '../hooks/useCursorPosition.svelte';
import { useBoundingRect } from '../hooks/useBoundingRect.svelte';

// Import Components
import Fruit from './Fruit.svelte';
import GameEntity from './GameEntity.svelte';
import GameSidebar from './GameSidebar.svelte';
import GameHeader from './GameHeader.svelte';
import GameOverModal from './GameOverModal.svelte';
import DebugMenu from '../components/DebugMenu.svelte';

// Import SVG fruit assets
import Blueberry from '../svg/blueberry.svg?url';
import Grape from '../svg/grape.svg?url';
import Lemon from '../svg/lemon.svg?url';
import Orange from '../svg/orange.svg?url';
import Apple from '../svg/apple.svg?url';
import Dragonfruit from '../svg/dragonfruit.svg?url';
import Pear from '../svg/pear.svg?url';
import Peach from '../svg/peach.svg?url';
import Pineapple from '../svg/pineapple.svg?url';
import Honeydew from '../svg/honeydew.svg?url';
import Watermelon from '../svg/watermelon.svg?url';

// Import Constants and Types
import {
	GAME_WIDTH,
	GAME_WIDTH_PX,
	GAME_OVER_HEIGHT,
	GAME_HEIGHT,
	FRUITS,
	DEFAULT_IMAGES_PATH,
	DEFAULT_SOUNDS_PATH
} from '../constants';

const fruitSvgs: Record<string, string> = {
	blueberry: Blueberry,
	grape: Grape,
	lemon: Lemon,
	orange: Orange,
	apple: Apple,
	dragonfruit: Dragonfruit,
	pear: Pear,
	peach: Peach,
	pineapple: Pineapple,
	honeydew: Honeydew,
	watermelon: Watermelon
};

const { imagesPath = DEFAULT_IMAGES_PATH, soundsPath = DEFAULT_SOUNDS_PATH } = $props();

// Game state reference
const gameState = new GameState({
	imagesPath,
	soundsPath
});
let showDebugMenu = $state(false);

// Find game area width and cursor position
let gameRef = $state<HTMLElement | null>(null);
let canvasRef = $state<HTMLCanvasElement | null>(null);
let gameBoundingRect = useBoundingRect();
let cursorPosition = useCursorPosition();

const spriteCache: HTMLCanvasElement[] = [];
const fruitImages: HTMLImageElement[] = [];
let imagesLoaded = $state(false);
let canvasCtx: CanvasRenderingContext2D | null = null;
// Resolved from --color-border-light once mounted; default matches the CSS token.
let borderLightColor = 'hsla(0, 0%, 0%, 0.075)';

// Device pixel ratio, capped at 2 to bound offscreen sprite memory.
function getDpr() {
	return Math.min(window.devicePixelRatio || 1, 2);
}

// The top GAME_OVER_HEIGHT band: a diagonal hatch plus the game-over line, matching the
// CSS `repeating-linear-gradient(-45deg, …)` (1px lines spaced 15px apart) it replaces.
function drawRestrictedArea(ctx: CanvasRenderingContext2D) {
	const width = gameWidthPx;
	const height = GAME_OVER_HEIGHT * pxScale;

	ctx.strokeStyle = borderLightColor;
	ctx.lineWidth = 1;

	ctx.save();
	ctx.beginPath();
	ctx.rect(0, 0, width, height);
	ctx.clip();
	const step = 15 * Math.SQRT2; // perpendicular spacing of 15px between 45° lines
	for (let c = 0; c <= width + height; c += step) {
		ctx.beginPath();
		ctx.moveTo(c, 0);
		ctx.lineTo(c - height, height);
		ctx.stroke();
	}
	ctx.restore();

	// Bottom border — the game-over line.
	ctx.beginPath();
	ctx.moveTo(0, height);
	ctx.lineTo(width, height);
	ctx.stroke();
}

function updateSpriteCache() {
	spriteCache.length = 0;
	const dpr = getDpr();

	for (let i = 0; i < FRUITS.length; i++) {
		const fruit = FRUITS[i];
		const img = fruitImages[i];
		const physicalRadius = fruit.radius * pxScale * dpr;
		const physicalSize = Math.max(1, Math.ceil(physicalRadius * 2));

		const offscreen = document.createElement('canvas');
		offscreen.width = physicalSize;
		offscreen.height = physicalSize;
		offscreen.dataset.name = fruit.name;
		const offCtx = offscreen.getContext('2d');
		if (offCtx) {
			if (img) {
				offCtx.drawImage(img, 0, 0, physicalSize, physicalSize);
			} else {
				// Fallback colored circle if image failed to load or is missing (e.g. in test env)
				offCtx.beginPath();
				offCtx.arc(physicalSize / 2, physicalSize / 2, physicalRadius, 0, Math.PI * 2);
				offCtx.fillStyle = fruit.color || '#ff0000';
				offCtx.fill();
				offCtx.strokeStyle = '#000000';
				offCtx.lineWidth = 1;
				offCtx.stroke();
			}
		}
		spriteCache[i] = offscreen;
	}
}

function renderCanvas() {
	const ctx = canvasCtx;
	if (!ctx || !canvasRef) return;

	const dpr = getDpr();

	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

	drawRestrictedArea(ctx);

	// 1. Draw merge effects
	const currentTime = performance.now();
	for (const effect of gameState.mergeEffects) {
		const elapsed = currentTime - effect.startTime;
		const progress = elapsed / effect.duration;
		if (progress < 1) {
			const t = 1 - (1 - progress) ** 5; // quintic ease out
			const currentRadius = effect.radius * (1 + t * 4) * pxScale;
			const opacity = 1 - t;
			ctx.save();
			ctx.beginPath();
			ctx.arc(effect.x * pxScale, effect.y * pxScale, currentRadius, 0, Math.PI * 2);
			ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.25})`;
			ctx.lineWidth = 1;
			ctx.stroke();
			ctx.restore();
		}
	}

	// 2. Draw fruits. Production reads live physics-body positions; the mocked
	// GameState used in tests exposes only fruitsState, so fall back to that.
	// Both are normalized to a common { x, y, rotation, fruitIndex, id } shape.
	const drawables = gameState.fruits?.length
		? gameState.fruits.flatMap((f) => {
				if (!f.body.isValid()) return [];
				const pos = f.body.translation();
				return [
					{ x: pos.x, y: pos.y, rotation: f.body.rotation(), fruitIndex: f.fruitIndex, id: f.id }
				];
			})
		: gameState.fruitsState;

	for (const fruit of drawables) {
		const sprite = spriteCache[fruit.fruitIndex];
		if (!sprite) continue;

		const cx = fruit.x * pxScale;
		const cy = fruit.y * pxScale;
		const r = FRUITS[fruit.fruitIndex].radius * pxScale;

		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(fruit.rotation);
		ctx.drawImage(sprite, -r, -r, r * 2, r * 2);
		ctx.restore();

		// Danger indicator
		if (fruit.id === gameState.gameOverFruitId) {
			ctx.save();
			ctx.beginPath();
			ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
			ctx.strokeStyle = 'hotpink';
			ctx.lineWidth = 3;
			ctx.stroke();
			ctx.restore();
		}
	}
}

function generateScreenshot(): string {
	if (!gameRef || !canvasRef) {
		throw new Error('Could not find the gameplay area to screenshot.');
	}

	// The game canvas holds every visible element at game-over (fruits, merge effects,
	// danger ring) but is transparent elsewhere, so composite it over the gameplay-area
	// background rather than snapshotting the whole DOM.
	const output = document.createElement('canvas');
	output.width = canvasRef.width;
	output.height = canvasRef.height;

	const ctx = output.getContext('2d');
	if (!ctx) {
		throw new Error('Failed to generate screenshot: could not acquire a canvas context.');
	}

	ctx.fillStyle = getComputedStyle(gameRef).backgroundColor || 'hsl(0, 0%, 90%)';
	ctx.fillRect(0, 0, output.width, output.height);
	ctx.drawImage(canvasRef, 0, 0);

	return output.toDataURL('image/png');
}

let renderAnimationFrameId: number | null = null;
function renderLoop() {
	renderCanvas();
	renderAnimationFrameId = requestAnimationFrame(renderLoop);
}

onMount(() => {
	const urlParams = new URLSearchParams(window.location.search);
	const isDebugQuery = urlParams.get('debug') === 'true';
	const isLocalhost =
		window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
	showDebugMenu = isDebugQuery && isLocalhost;

	// Only initialize physics and audio on client
	gameState.init();

	if (gameRef) {
		borderLightColor =
			getComputedStyle(gameRef).getPropertyValue('--color-border-light').trim() || borderLightColor;
	}

	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (gameState.status === 'playing') {
			event.preventDefault();
		}
	}

	// Auto-pause while the tab is hidden, and resume when it returns — but only if
	// *we* paused it. Otherwise switching away from a deliberately-paused game (e.g.
	// the About modal is open) would wrongly resume it on return.
	let pausedByVisibility = false;

	function handleVisibilityChange() {
		if (document.hidden) {
			if (gameState.status === 'playing') {
				pausedByVisibility = true;
				gameState.setStatus('paused');
			}
		} else if (pausedByVisibility) {
			pausedByVisibility = false;
			if (gameState.status === 'paused') {
				gameState.setStatus('playing');
			}
		}
	}

	window.addEventListener('beforeunload', handleBeforeUnload);
	document.addEventListener('visibilitychange', handleVisibilityChange);

	// Load SVG fruit assets
	const loadPromises = FRUITS.map((fruit, index) => {
		const src = fruitSvgs[fruit.name];
		if (!src) {
			return Promise.resolve();
		}
		return new Promise<void>((resolve) => {
			const img = new Image();
			img.src = src;
			img.onload = () => {
				fruitImages[index] = img;
				resolve();
			};
			img.onerror = () => {
				console.warn(`Failed to load SVG for ${fruit.name}`);
				resolve();
			};
		});
	});

	Promise.all(loadPromises)
		.then(() => {
			imagesLoaded = true;
		})
		.catch((err) => {
			console.error('Error preloading fruit images:', err);
		});

	renderLoop();

	return function onUnmount() {
		window.removeEventListener('beforeunload', handleBeforeUnload);
		document.removeEventListener('visibilitychange', handleVisibilityChange);
		gameState.destroy();
		if (renderAnimationFrameId) {
			cancelAnimationFrame(renderAnimationFrameId);
		}
	};
});

// Find fruit data
let currentFruit = $derived(FRUITS[gameState.currentFruitIndex]);
let gameWidthPx = $derived(gameBoundingRect?.rect?.width || GAME_WIDTH_PX);
let gameScale = $derived(gameWidthPx / GAME_WIDTH_PX);
// Meters → pixels for canvas rendering (physics units are meters).
let pxScale = $derived(gameWidthPx / GAME_WIDTH);

let clampedMouseX: number = $derived.by(() => {
	const currentFruitRadius = currentFruit?.radius ?? 0.1; // Safety check
	const radiusRatio = currentFruitRadius / GAME_WIDTH;
	const radiusPx = radiusRatio * gameWidthPx;
	// Update mouseX state, clamped within bounds
	return clamp(cursorPosition.x, radiusPx, gameWidthPx - radiusPx);
});

let isDropping = $state(false);
let showGameOverModal = $state(false);

$effect(() => {
	gameWidthPx; // rebuild sprites when the game area is resized
	if (imagesLoaded) {
		updateSpriteCache();
	}
});

$effect(() => {
	if (canvasRef) {
		const dpr = getDpr();
		canvasCtx = canvasRef.getContext('2d');
		canvasRef.width = gameWidthPx * dpr;
		canvasRef.height = gameWidthPx * (GAME_HEIGHT / GAME_WIDTH) * dpr;
		renderCanvas();
	} else {
		canvasCtx = null;
	}
});

$effect(() => {
	// Physics-driven frames are painted by the rAF loop; this also drives a synchronous
	// redraw on state changes for tests, where rAF isn't pumped and GameState is mocked.
	gameState.fruitsState;
	gameState.mergeEffects;
	gameState.status;
	gameState.gameOverFruitId;
	renderCanvas();
});

// Save score and show modal after a delay when game is over
$effect(() => {
	if (gameState.status !== 'gameover') {
		showGameOverModal = false;
		return;
	}

	if (typeof gameState.score === 'number') {
		saveScore(gameState.score);
	} else {
		console.error('Attempted to save invalid score:', gameState.score);
	}

	const timer = setTimeout(() => {
		showGameOverModal = true;
	}, 1500);

	return () => {
		clearTimeout(timer);
	};
});

function dropCurrentFruit() {
	if (gameState.status !== 'playing' || isDropping) return;

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
	gameState.restartGame();
}

// Set context for child components to consume
setContext('imagesPath', imagesPath);
setContext('soundsPath', soundsPath);
setContext('generateScreenshot', generateScreenshot);
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
    tabindex="0"
  >
    <div class="header"><GameHeader {gameState} /></div>
    <div class="sidebar"><GameSidebar {gameState} /></div>

    <!-- Game Container -->
    <div
      class="gameplay-area"
      bind:this={gameRef}
      onpointerup={handleClick}
      onkeydown={handleKeyDown}
      aria-hidden="true"
      use:gameBoundingRect.action
      use:cursorPosition.action={gameBoundingRect.rect}
    >
      <!-- aria-hidden because the wrapper handles interaction -->

      <canvas bind:this={canvasRef} class="gameplay-canvas"></canvas>

      {#if gameState.status !== "gameover"}
        <div class="drop-line" style:translate="{clampedMouseX - 1}px 0" out:fade={{ duration: 200 }}></div>
      {/if}

      <!-- Preview fruit - Appears when not dropping -->
      {#if gameState.status !== "gameover" && !isDropping && currentFruit}
        <!-- aria-hidden as it's purely visual feedback -->
        <div
          class="preview-fruit"
          aria-hidden="true"
          style:translate="{clampedMouseX}px 0"
        >
          <GameEntity x={0} y={GAME_OVER_HEIGHT / 2} scale={gameScale}>
            <div
              class="preview-fruit-wrapper"
              in:scale={{ opacity: 1, easing: expoOut, duration: 250 }}
            >
              <Fruit
                {...currentFruit}
                radius={currentFruit.radius}
                scale={gameScale}
              />
            </div>
          </GameEntity>
        </div>
      {/if}
    </div>

    <GameOverModal
      {gameState}
      open={showGameOverModal}
      score={gameState.score}
      onClose={handleGameOverClose}
    />
  </div>

  {#if showDebugMenu}
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

    @media (aspect-ratio < 0.65) {
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
      var(--min-font-size-px) * 1px - var(--_slope) * var(--min-container-width) *
        1px
    );

    /* Preferred value = intercept + slope * current_width (100cqi) */
    /* The slope calculation results in a unitless number, */
    /* multiplying by 1cqi gives it the correct dimension. */
    --_preferred-value: calc(var(--_intercept-px) + var(--_slope) * 100cqi);

    /* Apply clamp using the variables and calculated values */
    font-size: clamp(
      /* MIN: Multiply unitless variable by 1px */
        calc(var(--min-font-size-px) * 1px),
      /* PREFERRED: Use the calculated value */ var(--_preferred-value),
      /* MAX: Multiply unitless variable by 1px */
        calc(var(--max-font-size-px) * 1px)
    );
  }

  .game {
    --color-border: hsla(0, 0%, 0%, 0.1);
    --color-border-light: hsla(0, 0%, 0%, 0.075);
    --color-focus-outline: rgb(2, 191, 96);
    --color-background: hsl(0, 0%, 95%);
    --color-background-light: hsl(0, 0%, 99%);
    --color-background-dark: hsl(0, 0%, 90%);
    --color-text: hsl(0, 0%, 20%);
    --color-light-text: hsl(0, 0%, 35%);
    --color-very-light-text: hsl(0, 0%, 50%);

    --color-blueberry: hsl(233, 100%, 69.8%);
    --color-grape: hsl(86.3, 48.6%, 49.6%);
    --color-lemon: hsl(39.3, 100%, 59%);
    --color-orange: hsl(20.7, 99.1%, 56.5%);
    --color-apple: hsl(1.7, 100%, 42.7%);
    --color-dragonfruit: hsl(343.7, 92.9%, 55.7%);
    --color-pear: hsl(61.3, 60%, 65%);
    --color-peach: hsl(17.2, 93.5%, 70%);
    --color-pineapple: hsl(42, 100%, 60.2%);
    --color-honeydew: hsl(86.2, 69.2%, 66.9%);
    --color-watermelon: hsl(74, 74.1%, 45.5%);

    --border-radius: 1em;

    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 4fr);
    grid-template-areas: "header header" "sidebar gameplay";

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
    line-height: 1.5;

    @media (aspect-ratio < 0.65) {
      grid-template-columns: 1fr;
      grid-template-areas: "sidebar" "gameplay" "header";
    }

    :global(*) {
      box-sizing: border-box;
    }

    :global(a) {
      font-weight: normal;
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
    border-radius: 1em;
    cursor: s-resize;

    /* Removed cursor: pointer as interaction is on wrapper */
    user-select: none;
    overflow: hidden;
    touch-action: none;
    isolation: isolate;
  }
  
  .gameplay-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 3;
  }

  .drop-line {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
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
    z-index: 4;
  }

  .sidebar {
    grid-area: sidebar;
  }

  .header {
    grid-area: header;
  }
</style>
