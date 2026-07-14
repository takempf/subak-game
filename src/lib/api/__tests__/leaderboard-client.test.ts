import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { LeaderboardClient } from '../leaderboard-client.svelte';

vi.mock('$env/dynamic/public', () => ({
	env: { PUBLIC_LEADERBOARD_URL: 'http://localhost:3000' }
}));

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
	mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
	vi.stubGlobal('fetch', mockFetch);
	window.localStorage.clear();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('LeaderboardClient.submitPendingUsername', () => {
	it('submits trimmed, uppercased username and marks as submitted', async () => {
		const client = new LeaderboardClient();
		client.submittedId = 42;
		client.editToken = 'edit-token';
		client.pendingUsername = ' abc ';

		await client.submitPendingUsername();

		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/leaderboard/update-username'),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ editToken: 'edit-token', username: 'ABC' })
			})
		);
		expect(client.usernameSubmitted).toBe(true);
	});

	it('saves the uppercased username to localStorage', async () => {
		const client = new LeaderboardClient();
		client.submittedId = 42;
		client.editToken = 'edit-token';
		client.pendingUsername = 'xyz';

		await client.submitPendingUsername();

		expect(window.localStorage.getItem('subak_initials')).toBe('XYZ');
	});

	it('is a no-op when submittedId is null', async () => {
		const client = new LeaderboardClient();
		client.submittedId = null;
		client.editToken = 'edit-token';
		client.pendingUsername = 'abc';

		await client.submitPendingUsername();

		expect(mockFetch).not.toHaveBeenCalled();
		expect(client.usernameSubmitted).toBe(false);
	});

	it('is a no-op when usernameSubmitted is already true', async () => {
		const client = new LeaderboardClient();
		client.submittedId = 42;
		client.editToken = 'edit-token';
		client.pendingUsername = 'abc';
		client.usernameSubmitted = true;

		await client.submitPendingUsername();

		expect(mockFetch).not.toHaveBeenCalled();
	});

	it.each([
		'a',
		'ab',
		'abcd'
	])('is a no-op when username length is invalid ("%s")', async (invalid) => {
		const client = new LeaderboardClient();
		client.submittedId = 42;
		client.editToken = 'edit-token';
		client.pendingUsername = invalid;

		await client.submitPendingUsername();

		expect(mockFetch).not.toHaveBeenCalled();
		expect(client.usernameSubmitted).toBe(false);
	});

	it('allows empty username (anonymous)', async () => {
		const client = new LeaderboardClient();
		client.submittedId = 42;
		client.editToken = 'edit-token';
		client.pendingUsername = '';

		await client.submitPendingUsername();

		expect(mockFetch).toHaveBeenCalled();
		expect(client.usernameSubmitted).toBe(true);
	});
});

describe('LeaderboardClient.reset', () => {
	it('resets usernameSubmitted to false', () => {
		const client = new LeaderboardClient();
		client.usernameSubmitted = true;

		client.reset();

		expect(client.usernameSubmitted).toBe(false);
	});

	it('re-reads pendingUsername from localStorage on reset', () => {
		window.localStorage.setItem('subak_initials', 'XYZ');
		const client = new LeaderboardClient();
		client.pendingUsername = 'AAA';

		client.reset();

		expect(client.pendingUsername).toBe('XYZ');
	});

	it('sets pendingUsername to empty string when localStorage has no entry', () => {
		const client = new LeaderboardClient();
		client.pendingUsername = 'AAA';

		client.reset();

		expect(client.pendingUsername).toBe('');
	});
});

describe('LeaderboardClient offline mode', () => {
	beforeEach(async () => {
		const { __mockPendingSubmissions } = (await import('../../stores/db')) as unknown as {
			__mockPendingSubmissions: unknown[];
		};
		__mockPendingSubmissions.length = 0;
	});

	it('queues score when fetch fails', async () => {
		mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
		const client = new LeaderboardClient();

		const payload = { username: 'TMP', finalScore: 123, sessionToken: 'offline' };
		const result = await client.submitScore(payload);

		expect(result).toEqual({ success: false, queued: true });
		expect(client.submissionStatus).toBe('queued');

		const { getPendingSubmissions } = await import('../../stores/db');
		const pending = await getPendingSubmissions();
		expect(pending.length).toBe(1);
		expect(pending[0].payload).toEqual(payload);
	});

	it('flushes pending submissions and updates username/hash on reconnect', async () => {
		const { queueSubmission, getPendingSubmissions } = await import('../../stores/db');

		const payload = {
			username: '',
			finalScore: 100,
			sessionToken: 'offline',
			milestones: [{ timeOffsetMs: 10, scoreIncrement: 10, fruitIndex: 1, dropCount: 1 }],
			validationHash: 'old-hash'
		};
		await queueSubmission(payload);

		window.localStorage.setItem('subak_initials', 'ABC');

		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true })
		});

		const client = new LeaderboardClient();
		await client.flushPendingSubmissions();

		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/leaderboard/submit'),
			expect.objectContaining({
				method: 'POST',
				body: expect.stringContaining('"username":"ABC"')
			})
		);

		const pending = await getPendingSubmissions();
		expect(pending.length).toBe(0);
	});
});
