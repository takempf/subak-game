<script lang="ts">
	import { getContext } from 'svelte';

	import Modal from './Modal.svelte';
	import Leaderboard from './Leaderboard.svelte';
	import ModalCreditsFooter from './ModalCreditsFooter.svelte';
	import GameScreenshot from './GameScreenshot.svelte';

	const { open, score, scores = [], onClose } = $props();

	const gameRef = getContext('gameRef');

	function handleStartClick() {
		onClose();
	}
</script>

{#snippet append()}
	<ModalCreditsFooter />
{/snippet}

<Modal {open} {onClose} {append}>
	<div class="content">
		<h2 class="heading">Thanks for playing!</h2>

		<div class="score-and-screen">
			<div class="scores">
				<div class="score">
					<div class="score-text">Your score was</div>
					<var class="score-value">{Intl.NumberFormat().format(score)}</var>
				</div>
				<Leaderboard {scores} highlightScore={score} />
			</div>
			<div class="screenshot"><GameScreenshot {gameRef} /></div>
		</div>

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

	.score-and-screen {
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: center;
		justify-items: center;
		gap: 1em;
	}

	.score {
		text-align: center;
	}

	.scores {
		display: flex;
		flex-direction: column;
		gap: 1em;
	}

	.screenshot {
	}
</style>
