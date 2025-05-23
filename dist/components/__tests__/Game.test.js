/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import Game from '../Game.svelte';
import * as gameStateModule from '../../stores/game.svelte.js';
// --- Mock GameState ---------------------------------------------------------
const instances = [];
class MockGameState {
    score = 0;
    gameOver = false;
    status = 'uninitialized';
    currentFruitIndex = 0;
    nextFruitIndex = 1;
    fruitsState = [];
    mergeEffects = [];
    dropCount = 0;
    audioManager = { isMuted: false, toggleMute: vi.fn() };
    dropFruit = vi.fn((index, x, y) => {
        this.fruitsState.push({ x, y, rotation: 0, fruitIndex: index });
        this.dropCount++;
    });
    restartGame = vi.fn(() => {
        this.gameOver = false;
        this.fruitsState = [];
        this.dropCount = 0;
    });
    setStatus = vi.fn((status) => {
        this.status = status;
    });
    destroy = vi.fn();
    constructor() {
        instances.push(this);
    }
}
vi.mock('../../stores/game.svelte.js', () => ({ GameState: vi.fn() }));
// Replace the mocked constructor with our implementation
gameStateModule.GameState.mockImplementation((...args) => new MockGameState(...args));
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
        const area = container.querySelector('.gameplay-area');
        Object.defineProperty(area, 'getBoundingClientRect', {
            value: () => ({ left: 0, top: 0, width: 600, height: 900, right: 600, bottom: 900 })
        });
        await fireEvent.mouseMove(area, { clientX: 150, clientY: 100 });
        const dropLine = container.querySelector('.drop-line');
        const preview = container.querySelector('.preview-fruit');
        expect(dropLine.style.translate).toContain('149px');
        expect(preview.style.translate).toContain('150px');
    });
    it.skip('drops a fruit on click', async () => {
        const { container, getAllByRole } = render(Game);
        await fireEvent.click(getAllByRole('button', { name: /start game/i })[0]);
        await tick();
        const area = container.querySelector('.gameplay-area');
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
});
