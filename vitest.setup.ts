import { vi } from 'vitest';

vi.mock('howler', () => ({
	Howl: vi.fn(() => ({ play: vi.fn(), stop: vi.fn() })),
	Howler: { ctx: { state: 'running' }, _muted: false }
}));

vi.mock('svelte/motion', () => ({
	Tween: {
		of: (getter: () => number) => ({ current: getter() })
	}
}));

// --- Mock database access ---------------------------------------------------
const mockScores: { id: number; score: number; date: Date }[] = [];
const mockPendingSubmissions: { id: number; payload: Record<string, unknown>; createdAt: Date }[] =
	[];

vi.mock('./src/lib/stores/db', () => ({
	saveScore: vi.fn(async (score: number): Promise<void> => {
		mockScores.push({ id: mockScores.length + 1, score, date: new Date() });
	}),
	getHighScores: vi.fn(async (): Promise<{ id: number; score: number; date: Date }[]> => {
		return [...mockScores].sort((a, b) => b.score - a.score).slice(0, 10);
	}),
	queueSubmission: vi.fn(async (payload: Record<string, unknown>): Promise<void> => {
		mockPendingSubmissions.push({
			id: mockPendingSubmissions.length + 1,
			payload,
			createdAt: new Date()
		});
	}),
	getPendingSubmissions: vi.fn(
		async (): Promise<{ id: number; payload: Record<string, unknown>; createdAt: Date }[]> => {
			return [...mockPendingSubmissions];
		}
	),
	deletePendingSubmission: vi.fn(async (id: number): Promise<void> => {
		const index = mockPendingSubmissions.findIndex((s) => s.id === id);
		if (index !== -1) {
			mockPendingSubmissions.splice(index, 1);
		}
	}),
	__mockScores: mockScores,
	__mockPendingSubmissions: mockPendingSubmissions
}));
