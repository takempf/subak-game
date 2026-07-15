/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';

// Hoist: stub WASM-heavy physics engine and screenshot library before Game.svelte loads
vi.mock('@dimforge/rapier2d-compat', () => ({
	init: vi.fn().mockResolvedValue(undefined),
	Vector2: vi.fn((x: number, y: number) => ({ x, y })),
	World: vi.fn(() => ({
		integrationParameters: { dt: 1 / 60, numSolverIterations: 8 },
		step: vi.fn(),
		removeRigidBody: vi.fn()
	})),
	EventQueue: vi.fn(() => ({ drainCollisionEvents: vi.fn() })),
	RigidBodyDesc: {
		dynamic: vi.fn(() => ({
			setTranslation: vi.fn().mockReturnThis(),
			setLinearDamping: vi.fn().mockReturnThis()
		}))
	},
	ColliderDesc: {
		ball: vi.fn(() => ({
			setRestitution: vi.fn().mockReturnThis(),
			setFriction: vi.fn().mockReturnThis(),
			setActiveEvents: vi.fn().mockReturnThis()
		}))
	},
	ActiveEvents: { COLLISION_EVENTS: 1 }
}));

vi.mock('modern-screenshot', () => ({
	domToPng: vi.fn().mockResolvedValue('data:image/png;base64,stub')
}));

vi.mock('../../stores/db', () => ({
	saveScore: vi.fn().mockResolvedValue(undefined),
	getHighScores: vi.fn().mockResolvedValue([])
}));

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, it, expect, beforeEach } from 'vitest';

import Game from '../Game.svelte';
import * as gameStateModule from '../../stores/game.svelte.js';

// --- Mock GameState ---------------------------------------------------------
const instances: any[] = [];
export const setStatusSpy = vi.fn();
export const dropFruitSpy = vi.fn();
export const restartGameSpy = vi.fn();

function createMockGameState() {
	const state = $state({
		score: 0,
		gameOver: false,
		status: 'uninitialized',
		currentFruitIndex: 0,
		nextFruitIndex: 1,
		fruitsState: [] as any[],
		mergeEffects: [] as any[],
		dropCount: 0,
		gameOverFruitId: null as number | null,
		audioManager: { isMuted: false, toggleMute: vi.fn() },
		telemetry: {
			fetchSession: vi.fn(),
			submitGlobalScore: vi.fn(),
			reset: vi.fn(),
			buildSubmissionPayload: vi.fn().mockResolvedValue(null)
		},
		leaderboard: {
			submissionStatus: 'idle',
			sessionToken: null,
			submitScore: vi.fn(),
			submitPendingUsername: vi.fn().mockResolvedValue(undefined),
			dailyScores: [],
			dailyScoresStatus: 'idle',
			overallScores: [],
			overallScoresStatus: 'idle',
			fetchDailyScores: vi.fn(),
			fetchOverallScores: vi.fn(),
			editToken: null,
			submittedId: null,
			submittedRank: null
		},
		// Methods
		dropFruit: (index: number, x: number, y: number) => {
			state.fruitsState.push({ id: Math.random(), x, y, rotation: 0, fruitIndex: index });
			state.dropCount++;
			dropFruitSpy(index, x, y);
		},
		restartGame: () => {
			state.gameOver = false;
			state.fruitsState = [];
			state.dropCount = 0;
			state.status = 'playing';
			restartGameSpy();
		},
		setStatus: (status: string) => {
			state.status = status;
			setStatusSpy(status);
		},
		init: vi.fn(async () => {}),
		destroy: vi.fn()
	});
	instances.push(state);
	return state;
}

vi.mock('../../stores/game.svelte.js', () => ({ GameState: vi.fn() }));

// Replace the mocked constructor with our implementation
(gameStateModule as any).GameState.mockImplementation(createMockGameState);

// Mock FRUITS constant
const MOCK_FRUITS = [
	{ id: 0, name: 'FruitA', radius: 0.1, points: 10, image: 'images/fruitA.webp', color: 'red' },
	{ id: 1, name: 'FruitB', radius: 0.12, points: 20, image: 'images/fruitB.webp', color: 'yellow' },
	{ id: 2, name: 'FruitC', radius: 0.15, points: 30, image: 'images/fruitC.webp', color: 'orange' }
];

vi.mock('../../constants', async () => {
	const actual = await vi.importActual('../../constants');
	const fruitsForMock = [
		{ id: 0, name: 'FruitA', radius: 0.1, points: 10, image: 'images/fruitA.webp', color: 'red' },
		{
			id: 1,
			name: 'FruitB',
			radius: 0.12,
			points: 20,
			image: 'images/fruitB.webp',
			color: 'yellow'
		},
		{
			id: 2,
			name: 'FruitC',
			radius: 0.15,
			points: 30,
			image: 'images/fruitC.webp',
			color: 'orange'
		}
	];
	return {
		...(actual as any),
		FRUITS: fruitsForMock
	};
});

// ---------------------------------------------------------------------------

beforeEach(() => {
	instances.length = 0;
	setStatusSpy.mockClear();
	dropFruitSpy.mockClear();
	restartGameSpy.mockClear();
});

describe('Game component', () => {
	it('initializes with introduction modal open', () => {
		const { getAllByText } = render(Game);
		expect(getAllByText('Subak Game').length).toBeGreaterThan(0);
		expect(instances.length).toBe(1);
		expect(instances[0].score).toBe(0);
	});

	it('moves drop line and preview fruit with pointer', async () => {
		const { container, getAllByRole } = render(Game);
		// close introduction modal → sets status to 'playing'
		await fireEvent.click(getAllByRole('button', { name: /start game/i })[0]);
		await tick();

		const area = container.querySelector('.gameplay-area') as HTMLElement;
		Object.defineProperty(area, 'getBoundingClientRect', {
			value: () => ({ left: 0, top: 0, width: 600, height: 900, right: 600, bottom: 900 })
		});

		await fireEvent.pointerMove(area, { clientX: 150, clientY: 100 });

		const dropLine = container.querySelector('.drop-line') as HTMLElement;
		const preview = container.querySelector('.preview-fruit') as HTMLElement;
		expect(dropLine.style.translate).toContain('148px');
		expect(preview.style.translate).toContain('149px');
	});

	it('drops a fruit on pointer-up when playing', async () => {
		const { container, getAllByRole } = render(Game);
		await fireEvent.click(getAllByRole('button', { name: /start game/i })[0]);
		await tick();

		// Force status to 'playing' so dropCurrentFruit runs
		instances[0].status = 'playing';
		await tick();

		const area = container.querySelector('.gameplay-area') as HTMLElement;
		Object.defineProperty(area, 'getBoundingClientRect', {
			value: () => ({ left: 0, top: 0, width: 600, height: 900, right: 600, bottom: 900 })
		});

		await fireEvent.pointerUp(area, { button: 0 });
		await tick();

		expect(dropFruitSpy).toHaveBeenCalled();
	});

	it('opens introduction modal via About button and pauses game', async () => {
		const { getAllByRole } = render(Game);

		// Close intro first
		await fireEvent.click(getAllByRole('button', { name: /start game/i })[0]);
		await tick();

		// Click About → pauses via setStatus('paused')
		await fireEvent.click(getAllByRole('button', { name: /about/i })[0]);
		await tick();

		expect(setStatusSpy).toHaveBeenCalledWith('paused');

		// Modal reappears with "Resume Game" text (derived from 'paused' status)
		expect(getAllByRole('button', { name: /resume game/i }).length).toBeGreaterThan(0);
	});

	it('maintains correct fruit images after state changes (merges/removals)', async () => {
		const drawImageSpy = vi.spyOn(CanvasRenderingContext2D.prototype, 'drawImage');
		const { getAllByRole } = render(Game);

		await fireEvent.click(getAllByRole('button', { name: /start game/i })[0]);
		await tick();

		const mockGameState = instances[0];
		expect(mockGameState).toBeTruthy();

		drawImageSpy.mockClear();
		mockGameState.fruitsState.length = 0;
		mockGameState.fruitsState.push(
			{ id: 1, x: 100, y: 100, rotation: 0, fruitIndex: 0 }, // FruitA
			{ id: 2, x: 200, y: 100, rotation: 0, fruitIndex: 1 }, // FruitB
			{ id: 3, x: 300, y: 100, rotation: 0, fruitIndex: 0 } // FruitA
		);
		mockGameState.setStatus('playing');
		await tick();

		let drawnNames = drawImageSpy.mock.calls
			.slice(-mockGameState.fruitsState.length)
			.map((call) => (call[0] as HTMLCanvasElement).dataset?.name)
			.filter(Boolean);
		expect(drawnNames).toEqual([MOCK_FRUITS[0].name, MOCK_FRUITS[1].name, MOCK_FRUITS[0].name]);

		// Remove FruitA's, keep FruitB
		drawImageSpy.mockClear();
		const fruitB = mockGameState.fruitsState[1];
		mockGameState.fruitsState.length = 0;
		mockGameState.fruitsState.push(fruitB);
		await tick();

		drawnNames = drawImageSpy.mock.calls
			.slice(-mockGameState.fruitsState.length)
			.map((call) => (call[0] as HTMLCanvasElement).dataset?.name)
			.filter(Boolean);
		expect(drawnNames).toEqual([MOCK_FRUITS[1].name]);

		// Add FruitC
		drawImageSpy.mockClear();
		mockGameState.fruitsState.push({ id: 4, x: 400, y: 100, rotation: 0, fruitIndex: 2 });
		await tick();

		drawnNames = drawImageSpy.mock.calls
			.slice(-mockGameState.fruitsState.length)
			.map((call) => (call[0] as HTMLCanvasElement).dataset?.name)
			.filter(Boolean);
		expect(drawnNames).toEqual([MOCK_FRUITS[1].name, MOCK_FRUITS[2].name]);

		drawImageSpy.mockRestore();
	});

	it('hides drop line and preview fruit when game is over', async () => {
		const { container, getAllByRole } = render(Game);
		await fireEvent.click(getAllByRole('button', { name: /start game/i })[0]);
		await tick();

		const mockState = instances[0];
		mockState.status = 'playing';
		await tick();

		expect(container.querySelector('.drop-line')).not.toBeNull();
		expect(container.querySelector('.preview-fruit')).not.toBeNull();

		mockState.status = 'gameover';
		await tick();

		// The drop line fades out via a Svelte transition — while transitioning it remains
		// in the DOM but is marked inert. Either state means it's no longer interactive.
		const dropLine = container.querySelector('.drop-line');
		expect(dropLine === null || dropLine.hasAttribute('inert')).toBe(true);
		expect(container.querySelector('.preview-fruit')).toBeNull();
	});

	it('applies danger class only to the fruit matching gameOverFruitId', async () => {
		const strokeCalls: string[] = [];
		const originalStroke = CanvasRenderingContext2D.prototype.stroke;
		const strokeSpy = vi
			.spyOn(CanvasRenderingContext2D.prototype, 'stroke')
			.mockImplementation(function (this: CanvasRenderingContext2D) {
				strokeCalls.push(String(this.strokeStyle));
				originalStroke.apply(this);
			});

		const { getAllByRole } = render(Game);
		await fireEvent.click(getAllByRole('button', { name: /start game/i })[0]);
		await tick();

		const mockState = instances[0];
		const culpritId = 99;

		strokeCalls.length = 0;
		mockState.gameOverFruitId = culpritId;
		mockState.fruitsState = [
			{ id: culpritId, x: 0.3, y: 0.1, rotation: 0, fruitIndex: 0 },
			{ id: 100, x: 0.3, y: 0.2, rotation: 0, fruitIndex: 1 }
		];
		mockState.status = 'gameover';
		await tick();

		// We expect 'hotpink' stroke (for danger outline) to be executed
		const hasDangerOutline = strokeCalls.some((c) => c === 'hotpink' || c === '#ff69b4');
		expect(hasDangerOutline).toBe(true);

		// Now check that if we clear the danger culprit, no hotpink stroke occurs
		strokeCalls.length = 0;
		mockState.gameOverFruitId = null;
		await tick();
		const hasDangerOutlineAfterClear = strokeCalls.some((c) => c === 'hotpink' || c === '#ff69b4');
		expect(hasDangerOutlineAfterClear).toBe(false);

		strokeSpy.mockRestore();
	});

	it('delays game over modal by 1.5 seconds after gameover', async () => {
		vi.useFakeTimers();
		try {
			const { container, getAllByRole } = render(Game);
			// Close the intro modal so it doesn't interfere
			await fireEvent.click(getAllByRole('button', { name: /start game/i })[0]);
			await tick();

			instances[0].status = 'gameover';
			await tick();
			await Promise.resolve(); // flush saveScore microtask

			// "Thanks for playing!" is unique to the GameOverModal content
			const gameOverContent = () => container.textContent?.includes('Thanks for playing!') ?? false;

			expect(gameOverContent()).toBe(false);

			vi.advanceTimersByTime(1499);
			await tick();
			expect(gameOverContent()).toBe(false);

			vi.advanceTimersByTime(1);
			await tick();
			expect(gameOverContent()).toBe(true);
		} finally {
			vi.useRealTimers();
		}
	});
});
