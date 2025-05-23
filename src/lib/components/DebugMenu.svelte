<script lang="ts">
  import type { GameState } from '$lib/stores/game.svelte'; // Adjust if GameState type is not directly exportable or path is different
  import { FRUITS, GAME_WIDTH, GAME_OVER_HEIGHT } from '$lib/constants';

  const { gameState } = $props<{ gameState: GameState }>();

  let selectedFruitIndex = $state(0);
  let selectedXPosition = $state(GAME_WIDTH / 2);

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
  <h3>Debug Menu</h3>

  <div>
    <label for="fruit-select">Select Fruit:</label>
    <select id="fruit-select" bind:value={selectedFruitIndex}>
      {#each FRUITS as fruit, index}
        <option value={index}>{fruit.name} (Index: {index})</option>
      {/each}
    </select>
  </div>

  <div>
    <label for="x-position-slider">X Position: {selectedXPosition.toFixed(2)}</label>
    <input
      type="range"
      id="x-position-slider"
      min="0"
      max={GAME_WIDTH}
      step={GAME_WIDTH / 100}
      bind:value={selectedXPosition}
    />
  </div>

  <div>
    <button onclick={handleDropFruit}>Drop Fruit</button>
  </div>

  <div>
    <button onclick={handleEndGame}>End Game</button>
  </div>
</div>

<style>
  .debug-menu {
    position: fixed;
    top: 10px;
    right: 10px;
    background-color: #f8f9fa; /* Lighter background */
    padding: 15px;
    border: 1px solid #ced4da; /* Softer border */
    border-radius: 8px; /* Slightly more rounded corners */
    z-index: 1000;
    font-family: Arial, sans-serif; /* Common sans-serif font */
    width: 280px; /* Define a width */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Subtle shadow for depth */
  }

  .debug-menu h3 {
    margin-top: 0;
    margin-bottom: 15px; /* More space below title */
    font-size: 1.1em;
    color: #343a40; /* Darker text for title */
  }

  .debug-menu div {
    margin-bottom: 12px; /* Consistent spacing for control groups */
  }

  .debug-menu label {
    display: block;
    margin-bottom: 6px;
    font-size: 0.9em;
    color: #495057; /* Slightly softer label color */
  }

  .debug-menu select,
  .debug-menu input[type="range"],
  .debug-menu button {
    width: 100%;
    padding: 10px; /* More padding for easier interaction */
    box-sizing: border-box;
    border-radius: 4px; /* Consistent border-radius */
    border: 1px solid #ced4da;
    background-color: #ffffff; /* White background for inputs */
    font-size: 0.9em;
  }

  .debug-menu input[type="range"] {
    padding: 0; /* Range input padding is often handled differently by browsers */
  }

  .debug-menu button {
    background-color: #007bff; /* Bootstrap primary blue */
    color: white;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
  }

  .debug-menu button:hover {
    background-color: #0056b3; /* Darker blue on hover */
  }
</style>
