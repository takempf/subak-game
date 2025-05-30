/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, it, expect, beforeEach } from 'vitest';

import Game from '../Game.svelte';
import * as gameStateModule from '../../stores/game.svelte.js';

// --- Mock GameState ---------------------------------------------------------
const instances: any[] = [];

class MockGameState {
	score = 0;
	gameOver = false;
	status = 'uninitialized';
	currentFruitIndex = 0;
	nextFruitIndex = 1;
	fruitsState = $state<any[]>([]);
	mergeEffects: any[] = [];
	dropCount = 0;
	audioManager = { isMuted: false, toggleMute: vi.fn() };
	dropFruit = vi.fn((index: number, x: number, y: number) => {
		this.fruitsState.push({ x, y, rotation: 0, fruitIndex: index });
		this.dropCount++;
	});
	restartGame = vi.fn(() => {
		this.gameOver = false;
		this.fruitsState = [];
		this.dropCount = 0;
	});
	setStatus = vi.fn((status: string) => {
		this.status = status;
	});
	destroy = vi.fn();
	constructor() {
		instances.push(this);
	}
}

vi.mock('../../stores/game.svelte.js', () => ({ GameState: vi.fn() }));

// Replace the mocked constructor with our implementation
(gameStateModule as any).GameState.mockImplementation(
	(...args: any[]) => new MockGameState(...args)
);

// Mock FRUITS constant
const MOCK_FRUITS = [
	{ id: 0, name: 'FruitA', radius: 0.1, points: 10, image: 'images/fruitA.webp', color: 'red' },
	{ id: 1, name: 'FruitB', radius: 0.12, points: 20, image: 'images/fruitB.webp', color: 'yellow' },
	{ id: 2, name: 'FruitC', radius: 0.15, points: 30, image: 'images/fruitC.webp', color: 'orange' }
];

vi.mock('../../constants', async () => {
	const actual = await vi.importActual('../../constants');
	// Define fruitsForMock for the mock's internal use to avoid ReferenceError
	const fruitsForMock = [
		{ id: 0, name: 'FruitA', radius: 0.1, points: 10, image: 'images/fruitA.webp', color: 'red' },
		{ id: 1, name: 'FruitB', radius: 0.12, points: 20, image: 'images/fruitB.webp', color: 'yellow' },
		{ id: 2, name: 'FruitC', radius: 0.15, points: 30, image: 'images/fruitC.webp', color: 'orange' }
	];
	return {
		...(actual as any),
		FRUITS: fruitsForMock // Use the internally defined constant
	};
});

// ---------------------------------------------------------------------------

beforeEach(() => {
	instances.length = 0;
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
		// close introduction modal
		await fireEvent.click(getAllByRole('button', { name: /start game/i })[0]);
		await tick();

		const area = container.querySelector('.gameplay-area') as HTMLElement;
		Object.defineProperty(area, 'getBoundingClientRect', {
			value: () => ({ left: 0, top: 0, width: 600, height: 900, right: 600, bottom: 900 })
		});

		await fireEvent.mouseMove(area, { clientX: 150, clientY: 100 });

		const dropLine = container.querySelector('.drop-line') as HTMLElement;
		const preview = container.querySelector('.preview-fruit') as HTMLElement;
		expect(dropLine.style.translate).toContain('149px');
		expect(preview.style.translate).toContain('150px');
	});

	it.skip('drops a fruit on click', async () => {
		const { container, getAllByRole } = render(Game);
		await fireEvent.click(getAllByRole('button', { name: /start game/i })[0]);
		await tick();

		const area = container.querySelector('.gameplay-area') as HTMLElement;
		Object.defineProperty(area, 'getBoundingClientRect', {
			value: () => ({ left: 0, top: 0, width: 600, height: 900, right: 600, bottom: 900 })
		});

		await fireEvent.pointerUp(area, { button: 0 });
		expect(instances[0].dropFruit).toHaveBeenCalled();
		expect(instances[0].fruitsState.length).toBe(1);
	});

	it.skip('handles modal visibility and game restart', async () => {
		const { getAllByRole } = render(Game);

		// intro visible
		let resumeButtons = getAllByRole('button', { name: /start game/i });
		expect(resumeButtons.length).toBeGreaterThan(0);

		// close intro
		await fireEvent.click(resumeButtons[0]);
		await tick();

		// open intro via header button
		await fireEvent.click(getAllByRole('button', { name: /about/i })[0]);
		resumeButtons = getAllByRole('button', { name: /resume game/i });
		expect(resumeButtons.length).toBeGreaterThan(0);

		// simulate game over and ensure game over modal shows
		instances[0].gameOver = true;
		await tick();

		// restart game
		instances[0].restartGame();
		expect(instances[0].restartGame).toHaveBeenCalled();
	});

	it('maintains correct fruit images after state changes (merges/removals)', async () => {
		const { container, getAllByRole, debug } = render(Game);

		// Start the game by clicking the start button in the modal
		const startGameButton = getAllByRole('button', { name: /start game/i })[0];
		await fireEvent.click(startGameButton);
		await tick(); // Wait for game to initialize and modal to close

		const mockGameState = instances[0] as MockGameState;
		expect(mockGameState).toBeTruthy();

		// Simulate adding initial fruits: FruitA, FruitB, FruitA
		// Ensure IDs are unique for keying
		mockGameState.fruitsState = [
			{ id: 1, x: 100, y: 100, rotation: 0, fruitIndex: 0 }, // FruitA
			{ id: 2, x: 200, y: 100, rotation: 0, fruitIndex: 1 }, // FruitB
			{ id: 3, x: 300, y: 100, rotation: 0, fruitIndex: 0 }  // FruitA
		];
		mockGameState.setStatus('playing'); // Ensure game is in a state that renders fruits
		await tick(); // Allow Svelte to render the fruits

		let fruitImages = container.querySelectorAll('.fruit-entity img') as NodeListOf<HTMLImageElement>;
		expect(fruitImages.length).toBe(3);
		// Note: getAttribute('src') might return the full URL. We check for endsWith.
		expect(fruitImages[0].getAttribute('src')).toContain(MOCK_FRUITS[0].image); // FruitA
		expect(fruitImages[1].getAttribute('src')).toContain(MOCK_FRUITS[1].image); // FruitB
		expect(fruitImages[2].getAttribute('src')).toContain(MOCK_FRUITS[0].image); // FruitA

		// Simulate a "merge" or removal: remove the two FruitA's, leaving FruitB
		// This simulates a scenario where the first and last elements are removed,
		// testing if the keyed #each correctly preserves the middle element (FruitB).
		mockGameState.fruitsState = [
			mockGameState.fruitsState[1] // Keep only FruitB
		];
		await tick(); // Allow Svelte to re-render

		fruitImages = container.querySelectorAll('.fruit-entity img') as NodeListOf<HTMLImageElement>;
		// debug(); // Optional: to see the DOM structure if the test fails

		expect(fruitImages.length).toBe(1);
		expect(fruitImages[0].getAttribute('src')).toContain(MOCK_FRUITS[1].image); // Should still be FruitB

		// Simulate adding another fruit to see if it still works
		mockGameState.fruitsState.push({ id: 4, x: 400, y: 100, rotation: 0, fruitIndex: 2 }); // FruitC
		await tick();

		fruitImages = container.querySelectorAll('.fruit-entity img') as NodeListOf<HTMLImageElement>;
		expect(fruitImages.length).toBe(2);
		expect(fruitImages[0].getAttribute('src')).toContain(MOCK_FRUITS[1].image); // FruitB
		expect(fruitImages[1].getAttribute('src')).toContain(MOCK_FRUITS[2].image); // FruitC
	});

	it('should call dropFruit on pointerup after pointerdown and pointermove sequence', async () => {
		const { container, getAllByRole } = render(Game);
		const mockGameState = instances[0] as MockGameState;

		// Ensure the intro modal is closed and game is ready
		await fireEvent.click(getAllByRole('button', { name: /start game/i })[0]);
		mockGameState.setStatus('playing'); // Set status to allow dropping
		await tick();

		const gameplayArea = container.querySelector('.gameplay-area') as HTMLElement;
		expect(gameplayArea).toBeTruthy();

		// Mock getBoundingClientRect for the gameplay area
		// This is important for clampedMouseX calculation which is used by dropFruit
		Object.defineProperty(gameplayArea, 'getBoundingClientRect', {
			value: ()_ => ({
				left: 0,
				top: 0,
				width: 600, // Corresponds to GAME_WIDTH_PX if not overridden by component
				height: 900,
				right: 600,
				bottom: 900
			})
		});

		// Simulate pointer events
		await fireEvent.pointerDown(gameplayArea, { clientX: 100, clientY: 100, button: 0 });
		await fireEvent.pointerMove(gameplayArea, { clientX: 110, clientY: 110, button: 0 });
		await fireEvent.pointerUp(gameplayArea, { clientX: 110, clientY: 110, button: 0 });

		await tick(); // Allow Svelte to process the event and call dropFruit

		expect(mockGameState.dropFruit).toHaveBeenCalled();
	});
});
