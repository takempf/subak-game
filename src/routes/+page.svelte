<script lang="ts">
	import TKIcon from '../lib/icons/tk.svelte';

	import Game from '../lib/components/Game.svelte';
</script>

<main>
	<a class="tk" href="https://kempf.dev#subak"><TKIcon /></a>
	<Game />
</main>

<style>
	:global(body, html) {
		margin: 0;
		padding: 0;
	}

	:global(body) {
		background: linear-gradient(
			180deg,
			rgb(104, 79, 194) 0%,
			rgb(253, 29, 29) 85%,
			rgb(252, 176, 69) 100%
		);
	}

	main {
		min-height: 100vh;
		min-width: 100vw;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.tk {
		background: black;
		color: white;
		display: Flex;
		align-items: center;
		justify-content: center;
		border-radius: 1em;
		padding: 1em;
		justify-self: start;
		position: absolute;
		top: 1em;
		left: 1em;
		font-size: 10px;
	}
</style>
