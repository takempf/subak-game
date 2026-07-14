<script lang="ts">
import { onMount } from 'svelte';
import { getHighScores } from '../stores/db';
import type { LeaderboardClient, LeaderboardScore } from '../api/leaderboard-client.svelte';
import Tabs from './Tabs.svelte';
import Progress from './Progress.svelte';
import InitialsInput from './InitialsInput.svelte';
import { connectivity } from '../stores/connectivity.svelte';

interface LeaderboardProps {
	leaderboardClient?: LeaderboardClient;
	localScores?: LeaderboardScore[];
	activeTab?: 'daily' | 'overall' | 'local';
}
let {
	leaderboardClient,
	localScores = [],
	activeTab = $bindable('daily')
}: LeaderboardProps = $props();

let internalLocalScores = $state<LeaderboardScore[]>(localScores);

const tabs = $derived(
	connectivity.online
		? [
				{ value: 'daily', label: '🌎 Daily', content: dailyPanel },
				{ value: 'overall', label: '🌎 Overall', content: overallPanel },
				{ value: 'local', label: '💻 Local', content: localScoresPanel }
			]
		: [{ value: 'local', label: '💻 Local', content: localScoresPanel }]
);

$effect(() => {
	if (!connectivity.online) {
		activeTab = 'local';
	}
});

export const fetchLocalScores = async () => {
	try {
		internalLocalScores = (await getHighScores()) as LeaderboardScore[];
	} catch (err) {
		console.error('Failed to fetch local scores', err);
	}
};

$effect(() => {
	if (activeTab === 'daily' && leaderboardClient?.dailyScoresStatus === 'idle') {
		leaderboardClient.fetchDailyScores();
	}
	if (activeTab === 'overall' && leaderboardClient?.overallScoresStatus === 'idle') {
		leaderboardClient.fetchOverallScores();
	}
	if (activeTab === 'local') {
		fetchLocalScores();
	}
});

onMount(() => {
	if (internalLocalScores.length === 0 && activeTab === 'local') {
		fetchLocalScores();
	}
});

let leaderboardEl: HTMLDivElement | null = $state(null);

$effect(() => {
	const submittedId = leaderboardClient?.submittedId;
	const scores = leaderboardClient?.dailyScores;

	if (submittedId == null || !leaderboardEl || !scores || scores.length === 0) return;

	// Ensure the daily tab is active before scrolling. Svelte will flush this
	// reactive write as a microtask, which completes before requestAnimationFrame
	// fires, so the daily tab content will be visible when we query the DOM.
	activeTab = 'daily';

	requestAnimationFrame(() => {
		if (!leaderboardEl) return;
		const row = leaderboardEl.querySelector(
			`[data-tabs-content][data-state="active"] tr[data-id="${submittedId}"]`
		) as HTMLElement | null;
		row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		(row?.querySelector('input') as HTMLInputElement | null)?.focus();
	});
});

const pstTimeParts = new Intl.DateTimeFormat('en-US', {
	hour: 'numeric',
	minute: 'numeric',
	second: 'numeric',
	hour12: false,
	timeZone: 'America/Los_Angeles'
});

const pstDateLabel = new Intl.DateTimeFormat('en-US', {
	month: 'long',
	day: 'numeric',
	timeZone: 'America/Los_Angeles'
});

function getDayInfo(): {
	elapsedPercent: number;
	remainingLabel: string;
	dateLabel: string;
} {
	const now = new Date();
	const parts = pstTimeParts.formatToParts(now);
	const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
	const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
	const second = Number(parts.find((p) => p.type === 'second')?.value ?? 0);
	const elapsedSeconds = hour * 3600 + minute * 60 + second;
	const totalSeconds = 86400;
	const remainingSeconds = totalSeconds - elapsedSeconds;
	const h = Math.floor(remainingSeconds / 3600);
	const m = Math.floor((remainingSeconds % 3600) / 60);
	return {
		elapsedPercent: (elapsedSeconds / totalSeconds) * 100,
		remainingLabel: `${h}h${String(m).padStart(2, '0')}m Remain`,
		dateLabel: pstDateLabel.format(now)
	};
}

let dayInfo = $state(getDayInfo());

$effect(() => {
	const interval = setInterval(() => {
		dayInfo = getDayInfo();
	}, 60_000);
	return () => clearInterval(interval);
});

const formatter = new Intl.DateTimeFormat('en-US', {
	year: '2-digit',
	month: '2-digit',
	day: '2-digit',
	timeZone: 'America/Los_Angeles'
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
	hour: 'numeric',
	minute: '2-digit',
	timeZone: 'America/Los_Angeles'
});
</script>

{#snippet scoreTable(
  scores: LeaderboardScore[],
  showInput: boolean,
  mode: "daily" | "overall" | "local",
)}
  <div class="scoresScroll">
    {#if scores && scores.length > 0}
      <table>
        <tbody>
          {#each scores as score, index (score.id)}
            {@const rank = index + 1}
            {@const isSubmitted = leaderboardClient?.submittedId === score.id}
            <tr
              data-id={score.id}
              class:highlight={isSubmitted}
              class:gold={rank === 1}
            >
              <td class="rank">{rank}</td>
              <td class="username">
                {#if isSubmitted && showInput && !leaderboardClient?.usernameSubmitted}
                  {#if rank === 1}🏆
                  {/if}<InitialsInput
                    bind:value={
                      () => leaderboardClient?.pendingUsername ?? "",
                      (v) => {
                        if (leaderboardClient)
                          leaderboardClient.pendingUsername = v;
                      }
                    }
                    onkeydown={(e) => {
                      if (e.key === "Enter")
                        leaderboardClient?.submitPendingUsername();
                    }}
                  />
                {:else}
                  {score.username || "???"}
                  {#if rank === 1}🏆{/if}
                {/if}
              </td>
              <td class="score">
                <strong>{Intl.NumberFormat().format(score.score)}</strong>
              </td>
              <td class="createdAt"
                >{mode === "daily"
                  ? timeFormatter.format(score.date)
                  : formatter.format(score.date)}</td
              >
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <div class="empty">No scores yet.</div>
    {/if}
  </div>
{/snippet}

{#snippet localScoresPanel()}
  <div class="scores">
    <div class="scoresScroll">
      {#if internalLocalScores && internalLocalScores.length > 0}
        <table>
          <tbody>
            {#each internalLocalScores as score, index (score.id)}
              {@const rank = index + 1}
              <tr data-id={score.id} class:gold={rank === 1}>
                <td class="rank"
                  >{#if rank === 1}🏆{:else}{rank}{/if}</td
                >
                <td class="score">
                  <strong>{Intl.NumberFormat().format(score.score)}</strong>
                </td>
                <td class="createdAt">{formatter.format(score.date)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <div class="empty">No scores yet.</div>
      {/if}
    </div>
  </div>
{/snippet}

{#snippet dailyPanel()}
  <div class="dailyScores">
    <div class="scores">
      {#if leaderboardClient?.dailyScoresStatus === "loading"}
        <div class="empty">Loading...</div>
      {:else if leaderboardClient?.dailyScoresStatus === "error"}
        <div class="empty">Failed to load scores.</div>
      {:else}
        {@render scoreTable(
          leaderboardClient?.dailyScores ?? [],
          true,
          "daily",
        )}
      {/if}
    </div>
    <Progress
      value={dayInfo.elapsedPercent}
      label={dayInfo.dateLabel}
      labelRight={dayInfo.remainingLabel}
      class="day-progress"
    />
  </div>
{/snippet}

{#snippet overallPanel()}
  <div class="scores">
    {#if leaderboardClient?.overallScoresStatus === "loading"}
      <div class="empty">Loading...</div>
    {:else if leaderboardClient?.overallScoresStatus === "error"}
      <div class="empty">Failed to load scores.</div>
    {:else}
      {@render scoreTable(
        leaderboardClient?.overallScores ?? [],
        false,
        "overall",
      )}
    {/if}
  </div>
{/snippet}

<div class="leaderboard" bind:this={leaderboardEl}>
  <Tabs bind:value={activeTab} {tabs} />
  <div class="time-disclaimer">
    {#if !connectivity.online}
      Offline — showing local scores
    {:else}
      (All times are USA/California based)
    {/if}
  </div>
</div>

<style>
  .leaderboard {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5em;
    width: 100%;
  }

  .empty {
    padding: 2em;
    text-align: center;
    color: #666;
  }

  .scores {
    border: var(--color-border-light) 1px solid;
    border-radius: 10px;
    width: 100%;
    min-height: 5em;
  }

  .dailyScores {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }

  .scoresScroll {
    mask-image: linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 1em);
    min-width: 17em;
    height: 15em;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .rank,
  .score,
  .createdAt {
    font-style: normal;
    font-variant-numeric: tabular-nums;
    font-feature-settings: "ss01";
  }

  .username {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-weight: bold;
    letter-spacing: 0.1em;
  }

  .createdAt {
    text-align: right;
    font-size: 0.8em;
  }

  .score {
    text-align: right;
  }

  .time-disclaimer {
    font-size: 0.8em;
  }

  table {
    border-collapse: collapse;
    width: 100%;
  }

  td {
    border-bottom: var(--color_light-border) 1px dotted;
    padding: 0.4em 0.2em;
  }

  td:first-child {
    padding-left: 0.5em;
  }

  td:last-child {
    padding-right: 0.75em;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:nth-child(even) {
    background: var(--color-background);
  }

  tr.highlight {
    background-color: rgba(68, 253, 115, 0.11);
  }

  tr.gold {
    background-color: oklch(0.76 0.175 62 / 0.25);
    background-image: linear-gradient(
      115deg,
      oklch(0.85 0.152 82 / 0) 35%,
      oklch(96.415% 0.02917 75.642) 50%,
      oklch(0.85 0.152 82 / 0) 65%
    );
    background-size: 400px 100%;
    background-repeat: no-repeat;
    animation: gold-shimmer 5s ease-in-out infinite;
  }

  @keyframes gold-shimmer {
    0%,
    30% {
      background-position: -400px center;
    }
    50%,
    100% {
      background-position: calc(100% + 400px) center;
    }
  }

  .username :global(.initials-input) {
    margin-left: -0.5em;
  }
</style>
