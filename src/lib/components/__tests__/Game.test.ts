import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import Game from '../Game.svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock GameState ---------------------------------------------------------
const instances: any[] = [];

class MockGameState {
  score = 0;
  gameOver = false;
  currentFruitIndex = 0;
  nextFruitIndex = 1;
  fruitsState: any[] = [];
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
  destroy = vi.fn();
  constructor() {
    instances.push(this);
  }
}

vi.mock('../../stores/game.svelte.js', () => ({ GameState: MockGameState, instances }));

// ---------------------------------------------------------------------------

beforeEach(() => {
  instances.length = 0;
});

describe('Game component', () => {
  it('initializes with introduction modal open', () => {
    const { getByText } = render(Game);
    expect(getByText('Subak Game')).toBeInTheDocument();
    expect(instances.length).toBe(1);
    expect(instances[0].score).toBe(0);
  });

  it('moves drop line and preview fruit with pointer', async () => {
    const { container, getByRole } = render(Game);
    // close introduction modal
    await fireEvent.click(getByRole('button', { name: /resume game/i }));
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

  it('drops a fruit on click', async () => {
    const { container, getByRole } = render(Game);
    await fireEvent.click(getByRole('button', { name: /resume game/i }));
    await tick();

    const area = container.querySelector('.gameplay-area') as HTMLElement;
    Object.defineProperty(area, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 600, height: 900, right: 600, bottom: 900 })
    });

    await fireEvent.pointerUp(area);
    expect(instances[0].dropFruit).toHaveBeenCalled();
    expect(instances[0].fruitsState.length).toBe(1);
  });

  it('handles modal visibility and game restart', async () => {
    const { getByRole, queryByText } = render(Game);

    // intro visible
    expect(getByRole('button', { name: /resume game/i })).toBeInTheDocument();

    // close intro
    await fireEvent.click(getByRole('button', { name: /resume game/i }));
    await tick();
    expect(queryByText('Subak Game')).not.toBeInTheDocument();

    // open intro via header button
    await fireEvent.click(getByRole('button', { name: /about/i }));
    expect(getByRole('button', { name: /resume game/i })).toBeInTheDocument();

    // simulate game over and ensure game over modal shows
    instances[0].gameOver = true;
    await tick();
    expect(getByRole('heading', { name: /thanks for playing/i })).toBeInTheDocument();

    // restart game
    await fireEvent.click(getByRole('button', { name: /start new game/i }));
    expect(instances[0].restartGame).toHaveBeenCalled();
  });
});
