<script lang="ts">
	import { getContext } from 'svelte';

	import Modal from './Modal.svelte';

	import { getHighScores } from '../stores/db';
	import { onMount } from 'svelte';
	import Leaderboard from './Leaderboard.svelte';
	import Fruit from './Fruit.svelte';

	const { open, gameOver, onClose } = $props();

	let highScores = $state([]);

	onMount(async () => {
		highScores = await getHighScores();
	});

	function handleStartClick() {
		onClose();
	}

	const startButtonText = $derived(gameOver ? 'Start Game' : 'Resume Game');
</script>

<Modal {open} {onClose}>
	<div class="content">
		<h2 class="heading">Subak Game <Fruit name="watermelon" radius="1em" /></h2>
		<div>
			Match fruits <Fruit name="lemon" radius="1em" display="inline" /> to merge them into a bigger fruit
			<Fruit name="orange" radius="1em" display="inline" />.<br />Try to get to a <Fruit
				name="watermelon"
				radius="1em"
				display="inline" />.
		</div>
		<Leaderboard scores={highScores} />
		<button onclick={handleStartClick}>{startButtonText}</button>
	</div>
</Modal>

<style>
	.heading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5em;
		font-size: 1em;
		margin: 0;
	}

	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;
	}
</style>
