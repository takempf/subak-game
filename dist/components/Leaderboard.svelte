<script lang="ts">
	// Define props using Svelte 5 $props rune
	interface Score {
		id: number;
		score: number;
		date: Date;
	}

	interface LeaderboardProps {
		scores: Score[];
		highlightScore?: number;
	}
	let { scores, highlightScore }: LeaderboardProps = $props();

	let tableContainer: HTMLDivElement | null = $state(null);

	$effect(() => {
		// By reading 'scores' here, we make it a reactive dependency of the effect.
		// This ensures the effect re-runs if the scores data itself changes,
		// which is important because the row we're looking for depends on this data.
		const currentScores = scores;

		if (
			highlightScore == null || // No score to highlight
			!tableContainer || // The scroll container isn't in the DOM yet
			!currentScores || // Scores data isn't available
			currentScores.length === 0 // Scores data is empty
		) {
			// console.log('Effect: Conditions not met for scrolling. Exiting.');
			return;
		}

		const row = tableContainer.querySelector(
			`tr[data-score="${highlightScore}"]`
		) as HTMLElement | null;
		row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	});

	// Date formatter remains the same
	const formatter = new Intl.DateTimeFormat('en-US', {
		year: '2-digit',
		month: '2-digit',
		day: '2-digit'
	});
</script>

{#if scores && scores.length > 0}
	<div class="leaderboard">
		<div>
			Top Scores from <strong>This Browser</strong>
		</div>
		<div class="scores">
			<div class="scoresScroll" bind:this={tableContainer}>
				<table>
					<tbody>
						{#each scores as score, index (score.id)}
							{@const rank = index + 1}
							<tr data-score={score.score} class:highlight={score.score === highlightScore}>
								<td class="rank">{rank}</td>
								<td class="score">
									<strong>{Intl.NumberFormat().format(score.score)}</strong>
								</td>
								<td class="createdAt">{formatter.format(score.date)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
{/if}

<style>
	.leaderboard {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5em;
	}

	.scores {
		border: var(--color-border-light) 1px solid;
		border-radius: 10px;
	}

	.scoresScroll {
		mask-image: linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 1em);
		max-height: 7.5em;
		overflow-y: auto;
		overflow-x: hidden;
	}

	/* Combined selectors - using createdAt based on JSX */
	.rank,
	.score,
	.createdAt {
		font-style: normal;
		font-variant-numeric: tabular-nums;
		font-feature-settings: 'ss01';
	}

	.score {
		text-align: right;
	}

	/* .name class was in original CSS but not used in JSX, omitted here */

	table {
		border-collapse: collapse;
		width: 100%;
	}

	td {
		border-bottom: var(--color_light-border) 1px dotted;
		padding: 0.4em 0.5em;
	}

	/* Flattened nested selectors */
	td:first-child {
		padding-left: 1em;
	}

	td:last-child {
		padding-right: 1em;
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
</style>
