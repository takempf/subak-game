<script lang="ts">
	import { quadOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';

	import Fruit from './Fruit.svelte';
	import CircleOfEvolution from './CircleOfEvolution.svelte';

	import { FRUITS } from '../constants';
	import InterpolatingNumber from './InterpolatingNumber.svelte';

	const { gameState } = $props();

	let nextFruit = $derived(FRUITS[gameState?.nextFruitIndex] ?? null);
</script>

<div class="game-sidebar">
	<section class="section" aria-live="polite">
		<!-- Use aria-live for screen readers to announce changes -->
		<h5 class="section__heading">Next</h5>
		<div class="next-fruit">
			{#if nextFruit}
				{#key gameState.dropCount}
					<div
						class="next-fruit-wrapper"
						in:fly={{ delay: 450, easing: quadOut, duration: 250, x: -50 }}
						out:fly={{ delay: 250, easing: quadOut, duration: 250, x: 50 }}>
						<Fruit radius="2.5em" name={nextFruit.name} />
					</div>
				{/key}
			{/if}
		</div>
		<!-- Safety check for name -->
	</section>
	<section class="section" aria-live="polite">
		<h5 class="section__heading">Score</h5>
		<var class="score"><InterpolatingNumber number={gameState?.score ?? 0} /></var>
	</section>
	<section class="section">
		<h5 class="section__heading">Cycle</h5>
		<CircleOfEvolution />
	</section>
</div>

<style>
	.game-sidebar {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-around;
		gap: 0.75em;
		padding: 0.75em;
	}

	.section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75em;
	}

	.section__heading {
		margin: 0;
		font-size: 1em;
		text-transform: uppercase;
		letter-spacing: 10%;
	}

	.next-fruit {
		display: grid;
		grid-template-areas: 'main';
		align-items: center;
		justify-items: center;
		box-shadow: inset hsla(0, 0%, 0%, 0.2) 0 2px 2px;
		background-color: var(--color-background-dark);
		border-radius: 2em;
		padding: 0.75em 1em;
		overflow: hidden;
	}

	.next-fruit-wrapper {
		grid-area: main;
	}

	.score {
		display: block;
		font-weight: 500;
		font-size: 1.5em;
		border: var(--color-border-light) 1px solid;
		border-radius: 1em;
		padding: 0.25em 0.5em;
		max-width: 100%;
	}

	@media (max-width: 480px) {
		.game-sidebar {
			flex-direction: row;
			flex-wrap: wrap;
		}
	}
</style>
