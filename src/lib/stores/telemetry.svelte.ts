import { APP_VERSION, BUILD_HASH } from '../buildInfo';
import { OFFLINE_SESSION_TOKEN, calculateValidationHash } from '../api/validation';
import type { GameMilestone } from '../types/leaderboard';

export class TelemetryState {
	sessionStartTime: number | null = null;
	milestones: GameMilestone[] = [];

	setSession(_token: string | null): void {
		this.sessionStartTime = performance.now();
	}

	trackMilestone(points: number, fruitIndex: number, dropCount: number): void {
		if (this.sessionStartTime && points > 0) {
			this.milestones.push({
				timeOffsetMs: performance.now() - this.sessionStartTime,
				scoreIncrement: points,
				fruitIndex,
				dropCount
			});
		}
	}

	async buildSubmissionPayload(
		username: string,
		finalScore: number,
		sessionToken: string | null
	): Promise<Record<string, unknown> | null> {
		if (this.milestones.length === 0) {
			console.error('Cannot build submission payload: no milestones recorded');
			return null;
		}

		const token = sessionToken || OFFLINE_SESSION_TOKEN;
		const validationHash = await calculateValidationHash(
			username,
			finalScore,
			token,
			this.milestones
		);

		return {
			username,
			finalScore,
			sessionToken: token,
			milestones: this.milestones,
			validationHash,
			clientVersion: APP_VERSION,
			buildHash: BUILD_HASH
		};
	}

	reset(): void {
		this.milestones = [];
		this.sessionStartTime = null;
	}
}
