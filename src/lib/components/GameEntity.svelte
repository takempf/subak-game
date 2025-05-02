<script lang="ts">
  import { GAME_WIDTH, GAME_WIDTH_PX } from '../constants';

  let {
    x = 0, // meters
    y = 0, // meters
    rotation = 0,
    scale = 1,
    children
  } = $props();

  const scaledGameWidthPx = $derived(scale * GAME_WIDTH_PX);
  const translateX = $derived((x / GAME_WIDTH) * scaledGameWidthPx);
  const translateY = $derived((y / GAME_WIDTH) * scaledGameWidthPx);
</script>

<div
  class="game-entity"
  style:translate="calc(-50% + {translateX}px) calc(-50% + {translateY}px)"
  style:rotate="{rotation}rad">
  {@render children()}
</div>

<style>
  .game-entity {
    position: absolute;
    will-change: translate, rotate;
  }
</style>
