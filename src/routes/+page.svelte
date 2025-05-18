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
		background: linear-gradient(180deg, #6239ab, #e65353 85%, #fcb045);
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
		border-bottom-right-radius: 1em;
		padding: 1em;
		justify-self: start;
		position: absolute;
		top: 0;
		left: 0;
		font-size: 10px;
	}
</style>
