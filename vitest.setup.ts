import { vi, beforeAll } from 'vitest';

beforeAll(() => {
	if (typeof window !== 'undefined' && !('matchMedia' in window)) {
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn()
			}))
		});
	}
	if (!HTMLElement.prototype.animate) {
		// minimal Web Animations API mock
		HTMLElement.prototype.animate = () => ({ finished: Promise.resolve(), cancel: () => {} });
	}
});

vi.mock('howler', () => {
	return {
		Howl: vi.fn(() => ({ play: vi.fn(), stop: vi.fn() })),
		Howler: { ctx: { state: 'running' }, _muted: false }
	};
});

vi.mock('svelte/motion', () => ({
	Tween: {
		of: (getter: () => number) => ({ current: getter() })
	}
}));

// --- Mock database access ---------------------------------------------------
const mockScores: { id: number; score: number; date: Date }[] = [];

vi.mock('./src/lib/stores/db', () => {
	return {
		saveScore: vi.fn(async (score: number) => {
			mockScores.push({ id: mockScores.length + 1, score, date: new Date() });
		}),
		getHighScores: vi.fn(async () => {
			return [...mockScores].sort((a, b) => b.score - a.score).slice(0, 10);
		}),
		__mockScores: mockScores
	};
});
