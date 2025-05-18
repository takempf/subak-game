<script>
	import { onMount } from 'svelte';
	import { getHighScores } from '../stores/db';

	let scores = [];

	onMount(async () => {
		scores = await getHighScores();
	});
</script>

<div class="scoreboard">
	<h3>High Scores</h3>
	<div class="scores">
		{#each scores as { score, date }, i (i)}
			<div class="score-entry">
				<span>{i + 1}.</span>
				<span>{score}</span>
				<span>{new Date(date).toLocaleDateString()}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.scoreboard {
		background: rgba(255, 255, 255, 0.9);
		padding: 1rem;
		border-radius: 8px;
		max-width: 300px;
	}

	.scores {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.score-entry {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 1rem;
	}
</style>
