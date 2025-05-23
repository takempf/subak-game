import { World, EventQueue } from '@dimforge/rapier2d-compat';
import { Fruit } from '../game/Fruit';
import { AudioManager } from '../game/AudioManager.svelte';
import { Boundary } from '../game/Boundary';
export interface MergeEffectData {
    id: number;
    x: number;
    y: number;
    radius: number;
    startTime: number;
    duration: number;
}
export interface FruitState {
    x: number;
    y: number;
    rotation: number;
    fruitIndex: number;
}
interface GameStateProps {
    imagesPath?: string;
    soundsPath?: string;
}
export type GameStatus = 'uninitialized' | 'playing' | 'paused' | 'gameover';
export declare class GameState {
    audioManager: AudioManager | null;
    score: number;
    status: GameStatus;
    currentFruitIndex: number;
    nextFruitIndex: number;
    fruits: Fruit[];
    fruitsState: FruitState[];
    dropCount: number;
    mergeEffects: MergeEffectData[];
    mergeEffectIdCounter: number;
    physicsAccumulator: number;
    lastTime: number | null;
    animationFrameId: number | null;
    physicsWorld: World | null;
    eventQueue: EventQueue | null;
    colliderMap: Map<number, Fruit | Boundary>;
    lastBumpSoundTime: DOMHighResTimeStamp;
    imagesPath: string;
    soundsPath: string;
    throttledCheckGameOver?: () => void;
    constructor({ imagesPath, soundsPath }: GameStateProps);
    update(): void;
    initPhysics(): Promise<void>;
    stepPhysics(): void;
    checkCollisions(): void;
    createBounds(): void;
    createWall(x: number, y: number, width: number, height: number): void;
    mergeFruits(fruitA: Fruit, fruitB: Fruit): void;
    addFruit(fruitIndex: number, x: number, y: number): void;
    dropFruit(fruitIndex: number, x: number, y: number): void;
    checkGameOver(): void;
    /** Resets the game state, physics world, and clears the map */
    resetGame(): void;
    restartGame(): void;
    getRandomFruitIndex(limit?: number): number;
    setScore(newScore: number): void;
    setStatus(newStatus: GameStatus): void;
    setCurrentFruitIndex(newCurrentFruitIndex: number): void;
    setNextFruitIndex(newNextFruitIndex: number): void;
    setFruitsState(newFruits: FruitState[]): void;
    setDropCount(newDropCount: number): void;
    setMergeEffects(newMergeEffects: MergeEffectData[]): void;
    destroy(): void;
}
export {};
