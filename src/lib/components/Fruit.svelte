<script lang="ts">
	import { GAME_WIDTH, GAME_WIDTH_PX } from '../constants';

	// Extract the SvgComponent type
	import type BlueberrySvgComponent from '../svg/blueberry.svg?component';
	type SvgComponent = typeof BlueberrySvgComponent;

	// Import all fruit manually
	import Blueberry from '../svg/blueberry.svg?component';
	import Grape from '../svg/grape.svg?component';
	import Lemon from '../svg/lemon.svg?component';
	import Orange from '../svg/orange.svg?component';
	import Apple from '../svg/apple.svg?component';
	import Dragonfruit from '../svg/dragonfruit.svg?component';
	import Pear from '../svg/pear.svg?component';
	import Peach from '../svg/peach.svg?component';
	import Pineapple from '../svg/pineapple.svg?component';
	import Honeydew from '../svg/honeydew.svg?component';
	import Watermelon from '../svg/watermelon.svg?component';

	const fruitSvgs: Record<string, SvgComponent> = {
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
	}

	let { radius, name, display = 'block', scale = 1 }: FruitProps = $props();

	const width = $derived.by(() => {
		const scaledGameWidthPx = GAME_WIDTH_PX * scale;

		return Number.isFinite(radius)
			? `${(((radius as number) * 2) / GAME_WIDTH) * scaledGameWidthPx}px`
			: radius;
	});
	const FruitComponent = $derived.by(() => {
		const fruitKey = `${name.at(0).toUpperCase()}${name.slice(1)}`;
		// Handle the case where a fruit SVG might not be found to prevent runtime errors.
		if (!fruitKey) return null;
		return fruitSvgs[fruitKey];
	});
</script>

<div
	data-name={name}
	class="fruit"
	style:width
	style:display={display === 'inline' ? 'inline-block' : display}>
	{#if FruitComponent}<FruitComponent style="display: block" {name} />{/if}
</div>

<style>
	.fruit {
		aspect-ratio: 1 / 1;
		user-select: none;
	}
</style>
