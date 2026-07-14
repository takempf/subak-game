<script lang="ts">
import { GAME_WIDTH, GAME_WIDTH_PX } from '../constants';

// Import all fruit manually as static asset paths
import Blueberry from '$lib/svg/blueberry.svg?url';
import Grape from '$lib/svg/grape.svg?url';
import Lemon from '$lib/svg/lemon.svg?url';
import Orange from '$lib/svg/orange.svg?url';
import Apple from '$lib/svg/apple.svg?url';
import Dragonfruit from '$lib/svg/dragonfruit.svg?url';
import Pear from '$lib/svg/pear.svg?url';
import Peach from '$lib/svg/peach.svg?url';
import Pineapple from '$lib/svg/pineapple.svg?url';
import Honeydew from '$lib/svg/honeydew.svg?url';
import Watermelon from '$lib/svg/watermelon.svg?url';

const fruitSvgs: Record<string, string> = {
	Blueberry,
	Grape,
	Lemon,
	Orange,
	Apple,
	Dragonfruit,
	Pear,
	Peach,
	Pineapple,
	Honeydew,
	Watermelon
};

interface FruitProps {
	radius: number | string;
	name: string;
	display?: 'block' | 'inline';
	scale?: number;
	danger?: boolean;
}

let { radius, name, display = 'block', scale = 1, danger = false }: FruitProps = $props();

const width = $derived.by(() => {
	const scaledGameWidthPx = GAME_WIDTH_PX * scale;

	return Number.isFinite(radius)
		? `${(((radius as number) * 2) / GAME_WIDTH) * scaledGameWidthPx}px`
		: radius;
});
const FruitComponent = $derived.by(() => {
	const fruitKey = `${name.at(0).toUpperCase()}${name.slice(1)}`;
	if (!fruitKey) return '';
	return fruitSvgs[fruitKey] || '';
});
</script>

<div
  data-name={name}
  class="fruit"
  class:danger
  style:width
  style:display={display === "inline" ? "inline-block" : display}
>
  {#if FruitComponent}
    <img src={FruitComponent} alt={name} style="display: block; width: 100%; height: 100%;" />
  {/if}
</div>

<style>
  .fruit {
    aspect-ratio: 1 / 1;
    user-select: none;
    outline: 3px solid transparent;
    outline-offset: 10px;
    transition: outline-color 150ms ease-in;
  }

  .fruit.danger {
    border-radius: 50%;
    outline: 3px solid hotpink;
  }
</style>
