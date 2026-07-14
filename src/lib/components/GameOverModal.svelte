<script lang="ts">
import Modal from './Modal.svelte';
import Leaderboard from './Leaderboard.svelte';
import InitialsInput from './InitialsInput.svelte';
import ModalCreditsFooter from './ModalCreditsFooter.svelte';
import GameScreenshot from './GameScreenshot.svelte';
import type { GameState } from '../stores/game.svelte';

interface GameOverModalProps {
	open: boolean;
	score: number;
	onClose: () => void;
	gameState: GameState;
}
const { open, score, onClose, gameState }: GameOverModalProps = $props();

let tab = $state<'daily' | 'overall' | 'local'>('daily');

$effect(() => {
	if (open && gameState.leaderboard.submissionStatus === 'idle') {
		autoSubmit();
	}
});

async function autoSubmit() {
	const token = gameState.leaderboard.sessionToken;
	const username = gameState.leaderboard.pendingUsername;

	const payload = await gameState.telemetry.buildSubmissionPayload(username, score, token);
	if (payload) {
		await gameState.leaderboard.submitScore(payload);
	}
}

async function handleClose() {
	await gameState.leaderboard.submitPendingUsername();
	onClose();
}

function handleStartClick() {
	handleClose();
}
</script>

{#snippet append()}
  <ModalCreditsFooter />
{/snippet}

<Modal {open} onClose={handleClose} {append} title="Game Over">
  <div class="content">
    <h2 class="heading">Thanks for playing!</h2>

    {#if gameState.leaderboard.submissionStatus === 'queued'}
      <div class="queued-container">
        <p class="queued-message">
          You're offline — your score will be submitted when you reconnect.
        </p>
        <div class="initials-prompt">
          <label for="offline-initials-input">Enter Initials: </label>
          <InitialsInput
            id="offline-initials-input"
            bind:value={
              () => gameState.leaderboard.pendingUsername,
              (v) => gameState.leaderboard.setInitials(v)
            }
          />
        </div>
      </div>
    {/if}

    <div class="score-and-screen">
      <Leaderboard
        bind:activeTab={tab}
        leaderboardClient={gameState.leaderboard}
      />
      <div class="screenshot"><GameScreenshot /></div>
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

  .queued-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75em;
    padding: 1em;
    border-radius: 8px;
    background: rgba(255, 193, 7, 0.1);
    border: 1px solid rgba(255, 193, 7, 0.25);
    width: 100%;
    box-sizing: border-box;
  }

  .queued-message {
    color: oklch(0.75 0.15 85);
    font-size: 0.9em;
    text-align: center;
    margin: 0;
  }

  .initials-prompt {
    display: flex;
    align-items: center;
    gap: 0.5em;
    font-size: 0.95em;
  }

  .score-and-screen {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    justify-items: center;
    gap: 1em;
    width: 100%;
  }

  .screenshot {
    width: 100%;
  }
</style>
