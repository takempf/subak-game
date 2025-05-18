<script lang="ts">
	import { onMount } from 'svelte';

	import { getHighScores } from '../stores/db';

	import Modal from './Modal.svelte';
	import Leaderboard from './Leaderboard.svelte';

	const { open, score, onClose } = $props();

	let highScores = $state([]);

	onMount(async () => {
		highScores = await getHighScores();
	});

	function handleStartClick() {
		onClose();
	}
</script>

<Modal {open} {onClose}>
	<div class="content">
		<h2 class="heading">Thanks for playing!</h2>
		<div class="score">
			<div class="score-text">Your score was</div>
			<var class="score-value">{score}</var>
		</div>

		<Leaderboard scores={highScores} />

		<button onclick={handleStartClick}>Start New Game</button>
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
		gap: 1.5em;
	}

	.score-value {
		display: block;
		text-align: center;
		font-size: 2em;
		font-weight: 500;
		color: rgb(49, 181, 82);
	}
</style>
