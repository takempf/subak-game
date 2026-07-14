import { env } from '$env/dynamic/public';
import { queueSubmission, getPendingSubmissions, deletePendingSubmission } from '../stores/db';
import { connectivity } from '../stores/connectivity.svelte';
import { calculateValidationHash } from './validation';

interface GlobalScoreResponse {
	id: number;
	score: number;
	created_at: string;
	username?: string;
}

export interface LeaderboardScore {
	id: number;
	score: number;
	date: Date;
	username?: string;
}

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';
type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error' | 'queued';

function getStoredInitials(): string {
	return typeof window !== 'undefined' ? window.localStorage.getItem('subak_initials') || '' : '';
}

export class LeaderboardClient {
	// --- Daily Scores ---
	dailyScores: LeaderboardScore[] = $state([]);
	dailyScoresStatus: AsyncStatus = $state('idle');

	private unsubscribeOnline: (() => void) | null = null;

	constructor() {
		if (typeof window !== 'undefined') {
			this.flushPendingSubmissions();
			this.unsubscribeOnline = connectivity.onOnline((): void => {
				this.flushPendingSubmissions();
			});
		}
	}

	destroy(): void {
		this.unsubscribeOnline?.();
		this.unsubscribeOnline = null;
	}

	private parseScores(scores: GlobalScoreResponse[]): LeaderboardScore[] {
		return scores.map(
			(s: GlobalScoreResponse): LeaderboardScore => ({
				id: s.id,
				score: s.score,
				username: s.username,
				date: new Date(s.created_at)
			})
		);
	}

	private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
		const controller = new AbortController();
		const timeoutId = setTimeout((): void => controller.abort(), 8000);
		try {
			return await fetch(url, {
				...options,
				signal: controller.signal
			});
		} finally {
			clearTimeout(timeoutId);
		}
	}

	async fetchDailyScores(): Promise<void> {
		if (this.dailyScoresStatus === 'loading') return;

		this.dailyScoresStatus = 'loading';
		try {
			const res = await this.fetchWithTimeout(
				`${env.PUBLIC_LEADERBOARD_URL}/api/leaderboard?type=daily`
			);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const data = await res.json();
			this.dailyScores = this.parseScores(data.scores);
			this.dailyScoresStatus = 'success';
		} catch (err) {
			console.error('Failed to fetch daily scores', err);
			this.dailyScoresStatus = 'error';
		}
	}

	// --- Overall Scores ---
	overallScores: LeaderboardScore[] = $state([]);
	overallScoresStatus: AsyncStatus = $state('idle');

	async fetchOverallScores(): Promise<void> {
		if (this.overallScoresStatus === 'loading') return;

		this.overallScoresStatus = 'loading';
		try {
			const res = await this.fetchWithTimeout(
				`${env.PUBLIC_LEADERBOARD_URL}/api/leaderboard?type=overall`
			);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const data = await res.json();
			this.overallScores = this.parseScores(data.scores);
			this.overallScoresStatus = 'success';
		} catch (err) {
			console.error('Failed to fetch overall scores', err);
			this.overallScoresStatus = 'error';
		}
	}

	// --- Session ---
	sessionToken: string | null = $state(null);

	async startSession(): Promise<void> {
		try {
			const res = await this.fetchWithTimeout(
				`${env.PUBLIC_LEADERBOARD_URL}/api/leaderboard/start`,
				{
					method: 'POST'
				}
			);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const data = await res.json();
			this.sessionToken = data.token;
		} catch (err) {
			console.error('Failed to start session', err);
			this.sessionToken = null;
		}
	}

	// --- Score Submission ---
	submissionStatus: SubmissionStatus = $state('idle');
	editToken: string | null = $state(null);
	submittedId: number | null = $state(null);
	submittedRank: number | null = $state(null);

	// --- Pending Username ---
	pendingUsername: string = $state(getStoredInitials());
	usernameSubmitted: boolean = $state(false);

	setInitials(value: string): void {
		this.pendingUsername = value.toUpperCase();
		if (typeof window !== 'undefined') {
			window.localStorage.setItem('subak_initials', this.pendingUsername);
		}
	}

	async submitPendingUsername(): Promise<void> {
		if (this.usernameSubmitted || !this.submittedId) return;
		const trimmed = this.pendingUsername.trim().toUpperCase();
		if (trimmed.length !== 3 && trimmed.length !== 0) return;
		await this.updateUsername(trimmed);
		this.usernameSubmitted = true;
		if (typeof window !== 'undefined') {
			window.localStorage.setItem('subak_initials', trimmed);
		}
	}

	private postSubmission(payload: Record<string, unknown>): Promise<Response> {
		return this.fetchWithTimeout(`${env.PUBLIC_LEADERBOARD_URL}/api/leaderboard/submit`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
	}

	async submitScore(
		payload: Record<string, unknown>
	): Promise<{ success: boolean; error?: string; queued?: boolean }> {
		this.submissionStatus = 'submitting';
		try {
			const res = await this.postSubmission(payload);

			const data = await res.json();

			if (data.success) {
				this.submissionStatus = 'success';
				this.editToken = data.editToken ?? null;
				this.submittedId = data.id ?? null;
				this.submittedRank = data.rank ?? null;

				if (data.scores) {
					this.dailyScores = this.parseScores(data.scores);
					this.dailyScoresStatus = 'success';
				}
			} else {
				this.submissionStatus = 'error';
			}

			return data;
		} catch (err) {
			console.error('Score submission failed, queueing for retry', err);
			await queueSubmission(payload);
			this.submissionStatus = 'queued';
			return { success: false, queued: true };
		}
	}

	private flushPromise: Promise<void> | null = null;

	flushPendingSubmissions(): Promise<void> {
		this.flushPromise ??= this.doFlushPendingSubmissions().finally((): void => {
			this.flushPromise = null;
		});
		return this.flushPromise;
	}

	private async doFlushPendingSubmissions(): Promise<void> {
		const pending = await getPendingSubmissions();
		if (pending.length === 0) return;

		const currentInitials = this.pendingUsername;

		for (const item of pending) {
			try {
				const payload = { ...item.payload } as Record<string, unknown>;
				if (currentInitials && payload.username !== currentInitials) {
					payload.username = currentInitials;
					payload.validationHash = await calculateValidationHash(
						currentInitials,
						payload.finalScore as number,
						payload.sessionToken as string,
						payload.milestones as unknown[]
					);
				}

				const res = await this.postSubmission(payload);
				const data = await res.json();
				if (data.success || res.status === 400 || res.status === 422) {
					if (item.id !== undefined) {
						await deletePendingSubmission(item.id);
					}
				}
			} catch (err) {
				console.error('Failed to flush pending submission, stopping queue processing', err);
				break;
			}
		}
	}

	// --- Update Username ---
	async updateUsername(username: string): Promise<void> {
		if (!this.editToken || !this.submittedId) return;

		try {
			const res = await this.fetchWithTimeout(
				`${env.PUBLIC_LEADERBOARD_URL}/api/leaderboard/update-username`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ editToken: this.editToken, username })
				}
			);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const id = this.submittedId;
			this.dailyScores = this.dailyScores.map(
				(s: LeaderboardScore): LeaderboardScore => (s.id === id ? { ...s, username } : s)
			);
		} catch (err) {
			console.error('Failed to update username', err);
		}
	}

	// --- Lifecycle ---
	reset(): void {
		this.sessionToken = null;
		this.submissionStatus = 'idle';
		this.editToken = null;
		this.submittedId = null;
		this.submittedRank = null;
		this.usernameSubmitted = false;
		this.pendingUsername = getStoredInitials();
		// Keep scores cached across games — they're still valid
	}
}
