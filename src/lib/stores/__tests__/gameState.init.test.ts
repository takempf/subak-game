// src/lib/stores/__tests__/gameState.init.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameState, type GameStatus } from '../game.svelte.ts'; // Corrected import path
import { init as rapierInit } from '@dimforge/rapier2d-compat';

// Mock dependencies
vi.mock('@dimforge/rapier2d-compat', async () => {
  const actual = await vi.importActual('@dimforge/rapier2d-compat');
  return {
    ...actual,
    init: vi.fn().mockResolvedValue(null),
    World: vi.fn().mockImplementation(() => ({
      createRigidBody: vi.fn().mockImplementation((desc) => ({ 
        handle: Math.random(), 
        userData: {}, 
        translation: vi.fn().mockReturnValue(desc?.translation || {x:0, y:0}), 
        linvel: vi.fn().mockReturnValue({ x: 0, y: 0 }),
        isValid: vi.fn().mockReturnValue(true),
        collider: vi.fn().mockReturnValue({ handle: Math.random() }) 
      })),
      createCollider: vi.fn().mockImplementation((desc, bodyHandle) => ({ 
        handle: Math.random(), 
        userData: {},
        setActiveEvents: vi.fn(), 
        setRestitution: vi.fn(),
        setFriction: vi.fn(),
        setMass: vi.fn(),
      })),
      removeRigidBody: vi.fn(),
      step: vi.fn(),
      integrationParameters: { dt: 1 / 60, numSolverIterations: 4 },
      gravity: { x: 0, y: 9.81 }
    })),
    EventQueue: vi.fn().mockImplementation(() => ({
        drainCollisionEvents: vi.fn(),
    })),
  };
});

// Mock AudioManager
vi.mock('../../game/AudioManager.svelte', () => ({
  AudioManager: vi.fn().mockImplementation(() => ({
    playSound: vi.fn(),
    stopSound: vi.fn(),
    loadSounds: vi.fn().mockResolvedValue(null), 
  })),
}));

// Mock throttle utility
vi.mock('../../utils/throttle', () => ({
  throttle: vi.fn((fn) => fn), 
}));


describe('GameState Minimal Initialization Test', () => {
  let gameState: GameState;

  beforeEach(async () => {
    await rapierInit(); 
    
    gameState = new GameState({ soundsPath: '', imagesPath: '' });
  });

  afterEach(() => {
    if (gameState && typeof gameState.destroy === 'function') {
      gameState.destroy();
    }
    vi.clearAllMocks();
  });

  it('should complete initialize() and set initial status', async () => {
    console.log('Starting gameState.initialize() in minimal test...');
    await gameState.initialize();
    console.log('gameState.initialize() completed.');
    
    expect(gameState.status).toBe('uninitialized'); 
    console.log('Assertion passed.');
  });
});
