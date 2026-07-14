<!-- App.svelte -->
<script lang="ts">
import SoundOn from '../icons/sound-on.svelte';
import SoundOff from '../icons/sound-off.svelte';
import IntroductionModal from './IntroductionModal.svelte';
import Fruit from './Fruit.svelte';
import type { GameState } from '$lib/stores/game.svelte';
import { installPrompt } from '../stores/install.svelte.js';

interface GameHeaderProps {
	gameState: GameState;
}

const { gameState }: GameHeaderProps = $props();

let showIntroduction = $state(true);

function handleIntroductionClick() {
	showIntroduction = true;
	gameState.setStatus('paused');
}

function handleCloseIntroduction() {
	showIntroduction = false;
	gameState.setStatus('playing');
}

function handleMuteClick() {
	gameState?.audioManager?.toggleMute();
}
</script>

<header class="header">
  <div class="leading">
    <div class="app-title">
      Subak Game <Fruit name="watermelon" radius="1em" />
    </div>
    <button onclick={handleIntroductionClick}>About</button>
    {#if installPrompt.available}
      <button onclick={() => installPrompt.promptInstall()}>📲 Install App</button>
    {/if}
  </div>
  <div class="trailing">
    <button onclick={handleMuteClick} aria-label="Toggle Sound">
      {#if gameState?.audioManager?.isMuted}
        <SoundOff />
      {:else}
        <SoundOn />
      {/if}
    </button>
  </div>
</header>

<IntroductionModal
  open={showIntroduction}
  gameStatus={gameState?.status}
  onClose={handleCloseIntroduction}
  leaderboardClient={gameState?.leaderboard}
/>

<style>
  .app-title {
    display: flex;
    align-items: center;
    gap: 0.5em;
    font-weight: 550;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1em;
    padding: 0.5em 1em;
  }

  .leading,
  .trailing {
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
</style>
