<script lang="ts">
	// Define props using Svelte 5 $props rune
	interface Score {
		id: number;
		score: number;
		date: Date;
	}

	interface LeaderboardProps {
		scores: Score[];
	}
	let { scores }: LeaderboardProps = $props();

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
			<div class="scoresScroll">
				<table>
					<tbody>
						{#each scores as score, index (score.id)}
							{@const rank = index + 1}
							<tr>
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
		max-height: 8.5em;
		overflow: auto;
	}

	/* Combined selectors - using createdAt based on JSX */
	.rank,
	.score,
	.createdAt {
		font-style: normal;
		font-variant-numeric: tabular-nums;
		font-feature-settings: 'ss01';
		text-align: right;
	}

	/* .name class was in original CSS but not used in JSX, omitted here */

	table {
		border-collapse: collapse;
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
</style>
