// src/lib/stores/__tests__/gameState.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameState, type GameStatus } from '../game.svelte.ts'; 
import type { GameEvent, GameStatusEvent, FruitDropEvent, FruitMergeEvent, GameStartEvent, GamePauseEvent, GameOverEvent } from '../../game/events';
import { FRUITS } from '../../constants';
import { init as rapierInitActual } from '@dimforge/rapier2d-compat'; // Keep actual for Vector2 etc. if needed by GameState directly

// Mock throttle from ../utils/throttle
vi.mock('../../utils/throttle', () => ({
  throttle: vi.fn((fn) => fn), 
}));

// Mock AudioManager
vi.mock('../../game/AudioManager.svelte', () => {
  return {
    AudioManager: vi.fn().mockImplementation(() => ({
      playSound: vi.fn(),
      stopAllSounds: vi.fn(),
    }))
  };
});

// Mock Rapier's init, World, EventQueue
vi.mock('@dimforge/rapier2d-compat', async () => {
  const actual = await vi.importActual('@dimforge/rapier2d-compat');
  return {
    ...actual, // Preserve Vector2, ColliderDesc etc. from actual library
    init: vi.fn().mockResolvedValue(null), // Mock init
    World: vi.fn().mockImplementation((gravity) => ({ // Mock World
      createRigidBody: vi.fn().mockReturnValue({ handle: 0, userData: {}, translation: vi.fn(), linvel: vi.fn(), isValid: vi.fn(() => true), collider: vi.fn(() => ({handle:0})) }),
      createCollider: vi.fn().mockReturnValue({ handle: 0, setActiveEvents: vi.fn(), setRestitution: vi.fn(), setFriction: vi.fn(), setMass: vi.fn() }),
      removeRigidBody: vi.fn(),
      step: vi.fn(),
      integrationParameters: { dt: 1 / 60, numSolverIterations: 4 },
      gravity: gravity
    })),
    EventQueue: vi.fn().mockImplementation(() => ({ // Mock EventQueue
        drainCollisionEvents: vi.fn(),
    })),
  };
});

describe('GameState Event Dispatching (Ultra-simplified initialize content)', () => {
  let gameState: GameState;
  let mockOnEventCallback: ReturnType<typeof vi.fn>;
  let originalInitPhysics: typeof GameState.prototype.initPhysics;
  let originalResetGame: typeof GameState.prototype.resetGame;

  beforeEach(async () => {
    // Ensure Rapier's (mocked) init is called, as GameState might await it via this.initPhysics
    await rapierInitActual(); // This is actually the mocked init due to vi.mock above

    // Spy on and simplify initPhysics and resetGame
    originalInitPhysics = GameState.prototype.initPhysics;
    originalResetGame = GameState.prototype.resetGame;

    GameState.prototype.initPhysics = vi.fn(async function(this: GameState) {
      console.log('Ultra-mocked initPhysics called');
      // Do almost nothing, ensure it's synchronous for the mock's execution part
      this.physicsWorld = null; // Or assign a very simple mock object if needed by other parts of GameState
      this.eventQueue = null;
      this.colliderMap = new Map();
      return Promise.resolve(); // Still needs to be async to match signature
    });

    GameState.prototype.resetGame = vi.fn(function(this: GameState) {
      console.log('Ultra-mocked resetGame called');
      // Do almost nothing, crucially DO NOT call setStatus for this specific diagnostic run
      this.fruits = [];
      this.score = 0;
      this.status = 'uninitialized'; // Manually set status
    });
    
    gameState = new GameState({ soundsPath: '', imagesPath: '' });
    
    console.log('Attempting gameState.initialize() [ultra-simplified]');
    try {
      await gameState.initialize(); 
      console.log('gameState.initialize() completed [ultra-simplified]');
    } catch (e) {
      console.error('Error during gameState.initialize() [ultra-simplified]', e);
      throw e; // Re-throw to fail test if initialize itself errors
    }

    mockOnEventCallback = vi.fn();
    gameState.onEventCallback = mockOnEventCallback;
  });

  afterEach(() => {
    GameState.prototype.initPhysics = originalInitPhysics;
    GameState.prototype.resetGame = originalResetGame;
    
    vi.clearAllMocks();
    if (gameState && typeof gameState.destroy === 'function') {
        gameState.destroy(); 
    }
  });

  // Only one test to minimize variables
  it('should allow setStatus to be called after ultra-simplified initialize', () => {
    // If initialize hung, this test won't even start.
    // The mocked resetGame manually set status to 'uninitialized' without dispatching.
    // So, the first setStatus call here will be from 'uninitialized'.
    expect(gameState.status).toBe('uninitialized'); 
    
    const newStatus: GameStatus = 'playing';
    gameState.setStatus(newStatus); // This uses the REAL setStatus

    expect(mockOnEventCallback).toHaveBeenCalledOnce();
    const event = mockOnEventCallback.mock.calls[0][0] as GameStatusEvent;
    expect(event.eventName).toBe('GAME_STATUS');
    expect(event.previousStatus).toBe('uninitialized');
    expect(event.currentStatus).toBe(newStatus);
  });

  // Comment out other tests for this diagnostic run
  /* ... all other tests ... */
});
