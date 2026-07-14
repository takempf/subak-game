import { render, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Leaderboard from '../Leaderboard.svelte';
import { LeaderboardClient } from '../../api/leaderboard-client.svelte';

vi.mock('$env/dynamic/public', () => ({
	env: { PUBLIC_LEADERBOARD_URL: 'http://localhost:3000' }
}));

const LOCAL_SCORES = [
	{ id: 1, score: 1200, date: new Date('2024-01-01') },
	{ id: 2, score: 800, date: new Date('2024-01-02') }
];

const DAILY_SCORES = {
	scores: [
		{ id: 10, score: 5000, created_at: '2024-03-01T00:00:00Z' },
		{ id: 11, score: 3000, created_at: '2024-03-02T00:00:00Z' }
	]
};

vi.mock('../../stores/db', () => ({
	getHighScores: vi.fn().mockResolvedValue([
		{ id: 1, score: 1200, date: new Date('2024-01-01') },
		{ id: 2, score: 800, date: new Date('2024-01-02') }
	]),
	saveScore: vi.fn().mockResolvedValue(undefined),
	queueSubmission: vi.fn().mockResolvedValue(undefined),
	getPendingSubmissions: vi.fn().mockResolvedValue([]),
	deletePendingSubmission: vi.fn().mockResolvedValue(undefined)
}));

// Helper: query rows only within the active tab panel (not trigger buttons)
const activeRows = (container: HTMLElement) =>
	container.querySelectorAll('[data-tabs-content][data-state="active"] tbody tr');

const activePanel = (container: HTMLElement) =>
	container.querySelector('[data-tabs-content][data-state="active"]');

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
	mockFetch = vi.fn().mockResolvedValue({
		ok: true,
		json: async () => DAILY_SCORES
	});
	vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('Leaderboard component', () => {
	it('renders provided local scores on local tab', async () => {
		const { container } = render(Leaderboard, {
			props: { localScores: LOCAL_SCORES, activeTab: 'local' }
		});

		await waitFor(() => {
			const rows = activeRows(container);
			expect(rows.length).toBe(LOCAL_SCORES.length);
			const firstRow = rows[0] as HTMLElement;
			expect(firstRow.querySelector('.rank')?.textContent).toBe('🏆');
			expect(firstRow.querySelector('.score')?.textContent).toContain('1,200');
		});
	});

	it('shows empty state when no scores on local tab', async () => {
		const db = await import('../../stores/db');
		(db.getHighScores as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

		const { container } = render(Leaderboard, {
			props: { localScores: [], activeTab: 'local' }
		});
		await waitFor(() => {
			const panel = activePanel(container);
			expect(panel?.querySelector('.empty')?.textContent).toContain('No scores yet');
		});
	});

	it('fetches daily scores on mount (default tab)', async () => {
		const client = new LeaderboardClient();
		const { container } = render(Leaderboard, {
			props: { localScores: LOCAL_SCORES, leaderboardClient: client }
		});

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/leaderboard'),
				expect.any(Object)
			);
		});

		await waitFor(() => {
			const rows = activeRows(container);
			expect(rows.length).toBe(DAILY_SCORES.scores.length);
			expect(rows[0].querySelector('.score')?.textContent).toContain('5,000');
		});
	});

	it('switches to local tab after viewing daily', async () => {
		const client = new LeaderboardClient();
		const { getAllByRole, container } = render(Leaderboard, {
			props: { localScores: LOCAL_SCORES, leaderboardClient: client }
		});

		await waitFor(() => expect(mockFetch).toHaveBeenCalled());

		await fireEvent.click(getAllByRole('tab', { name: /local/i })[0]);
		await waitFor(() => {
			const rows = activeRows(container);
			expect(rows.length).toBe(LOCAL_SCORES.length);
		});
	});

	describe('initials input', () => {
		const makeClientWithSubmission = () => {
			const client = new LeaderboardClient();
			client.submittedId = 10;
			client.editToken = 'edit-token';
			client.dailyScores = [{ id: 10, score: 5000, date: new Date(), username: undefined }];
			client.dailyScoresStatus = 'success';
			return client;
		};

		it('shows the initials input for the submitted score row', async () => {
			const client = makeClientWithSubmission();
			const { container } = render(Leaderboard, {
				props: { leaderboardClient: client, activeTab: 'daily' }
			});

			await waitFor(() => {
				expect(container.querySelector('input.initials-input')).not.toBeNull();
			});
		});

		it('updates leaderboardClient.pendingUsername as the user types', async () => {
			const client = makeClientWithSubmission();
			client.pendingUsername = '';
			const { container } = render(Leaderboard, {
				props: { leaderboardClient: client, activeTab: 'daily' }
			});

			await waitFor(() => expect(container.querySelector('input.initials-input')).not.toBeNull());

			const input = container.querySelector('input.initials-input') as HTMLInputElement;
			await fireEvent.input(input, { target: { value: 'abc' } });

			expect(client.pendingUsername).toBe('ABC');
		});

		it('calls submitPendingUsername when Enter is pressed', async () => {
			const client = makeClientWithSubmission();
			client.submitPendingUsername = vi.fn().mockResolvedValue(undefined);
			const { container } = render(Leaderboard, {
				props: { leaderboardClient: client, activeTab: 'daily' }
			});

			await waitFor(() => expect(container.querySelector('input.initials-input')).not.toBeNull());

			const input = container.querySelector('input.initials-input') as HTMLInputElement;
			await fireEvent.keyDown(input, { key: 'Enter' });

			expect(client.submitPendingUsername).toHaveBeenCalled();
		});

		it('hides the initials input once usernameSubmitted is true', async () => {
			const client = makeClientWithSubmission();
			client.usernameSubmitted = true;
			const { container } = render(Leaderboard, {
				props: { leaderboardClient: client, activeTab: 'daily' }
			});

			await waitFor(() => {
				expect(container.querySelector('input.initials-input')).toBeNull();
			});
		});
	});

	describe('day progress bar', () => {
		// 2026-03-04 15:00:00 PST = 23:00:00 UTC
		// elapsedSeconds = 15*3600 = 54000 / 86400 = 62.5%
		// remaining = 9h = 9h00m Remain
		const FIXED_TIME = new Date('2026-03-04T23:00:00Z');

		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(FIXED_TIME);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('renders the progress meter in the daily tab', async () => {
			const { container } = render(Leaderboard, {
				props: { activeTab: 'daily' }
			});

			await waitFor(() => {
				expect(container.querySelector('[role="meter"]')).not.toBeNull();
			});
		});

		it('aria-valuenow reflects elapsed percentage', async () => {
			const { container } = render(Leaderboard, {
				props: { activeTab: 'daily' }
			});

			await waitFor(() => {
				const meter = container.querySelector('[role="meter"]');
				expect(meter).not.toBeNull();
				// 15h elapsed of 24h = 62.5%
				const valuenow = Number(meter?.getAttribute('aria-valuenow'));
				expect(valuenow).toBeCloseTo(62.5, 0);
			});
		});

		it('shows the PST date label', async () => {
			const { getByText } = render(Leaderboard, {
				props: { activeTab: 'daily' }
			});

			await waitFor(() => {
				expect(getByText('March 4')).not.toBeNull();
			});
		});

		it('shows the remaining time label', async () => {
			const { getByText } = render(Leaderboard, {
				props: { activeTab: 'daily' }
			});

			await waitFor(() => {
				// 9h00m remaining
				expect(getByText('9h00m Remain')).not.toBeNull();
			});
		});

		it('shows PST date even when UTC date is different (cross-timezone)', async () => {
			// 2026-03-05T02:00:00Z = March 4 at 6:00pm PST (UTC-8)
			// UTC says March 5; PST says March 4
			vi.setSystemTime(new Date('2026-03-05T02:00:00Z'));

			const { getByText } = render(Leaderboard, {
				props: { activeTab: 'daily' }
			});

			await waitFor(() => {
				expect(getByText('March 4')).not.toBeNull();
			});
		});

		it('remaining time is anchored to PST midnight, not UTC midnight', async () => {
			// 2026-03-05T02:00:00Z = March 4 at 18:00:00 PST → 6h00m remain
			vi.setSystemTime(new Date('2026-03-05T02:00:00Z'));

			const { getByText } = render(Leaderboard, {
				props: { activeTab: 'daily' }
			});

			await waitFor(() => {
				expect(getByText('6h00m Remain')).not.toBeNull();
			});
		});

		it('does not render the progress meter on other tabs', async () => {
			const { container } = render(Leaderboard, {
				props: { activeTab: 'local' }
			});

			await waitFor(() => {
				const panel = activePanel(container);
				expect(panel?.querySelector('[role="meter"]')).toBeNull();
			});
		});
	});

	it('does not refetch daily scores once already loaded', async () => {
		const client = new LeaderboardClient();
		const { getAllByRole } = render(Leaderboard, {
			props: { localScores: LOCAL_SCORES, leaderboardClient: client }
		});

		await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

		// Switch away and back
		await fireEvent.click(getAllByRole('tab', { name: /local/i })[0]);
		await fireEvent.click(getAllByRole('tab', { name: /daily/i })[0]);

		// Should not have triggered another fetch
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});
});
