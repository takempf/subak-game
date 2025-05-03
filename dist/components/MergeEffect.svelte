<script lang="ts">
  import { GAME_WIDTH, GAME_WIDTH_PX } from '../constants';

  interface MergeEffectProps {
    radius: number;
    scale?: number;
    duration?: number;
  }

  let { radius, scale = 1, duration = 1000 }: MergeEffectProps = $props();

  const scaledGameWidthPx = $derived(GAME_WIDTH_PX * scale);
  const width = $derived(((radius * 2) / GAME_WIDTH) * scaledGameWidthPx);
</script>

<!-- svelte-ignore element_invalid_self_closing_tag -->
<div
  class="merge-effect"
  style:width={`${width}px`}
  style="--duration: {duration}ms" />

<style>
  @keyframes ripple {
    from {
      scale: 1;
      opacity: 1;
    }
    to {
      scale: 5;
      opacity: 0;
    }
  }

  .merge-effect {
    --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    border: 1px solid hsla(0, 0%, 0%, 0.25);
    animation: ripple var(--duration) var(--ease-out-quint);
  }
</style>
