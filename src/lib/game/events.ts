// src/lib/game/events.ts

import type { GameStatus } from '../stores/game.svelte.ts'; // Assuming GameStatus is exported

// Base interface for all game events
interface BaseGameEvent {
  timestamp: DOMHighResTimeStamp;
}

// Event: FRUIT_DROP
export interface FruitDropEvent extends BaseGameEvent {
  eventName: 'FRUIT_DROP';
  fruitIndex: number; // Index of the fruit in the FRUITS array
  coordinates: { x: number; y: number };
}

// Event: FRUIT_MERGE
export interface FruitMergeEvent extends BaseGameEvent {
  eventName: 'FRUIT_MERGE';
  newFruitIndex: number; // Index of the newly formed fruit
  coordinates: { x: number; y: number }; // Coordinates of the merge
}

// Event: GAME_START
export interface GameStartEvent extends BaseGameEvent {
  eventName: 'GAME_START';
}

// Event: GAME_OVER
export interface GameOverEvent extends BaseGameEvent {
  eventName: 'GAME_OVER';
  score: number;
}

// Event: GAME_PAUSE
export interface GamePauseEvent extends BaseGameEvent {
  eventName: 'GAME_PAUSE';
}

// Event: GAME_STATUS
export interface GameStatusEvent extends BaseGameEvent {
  eventName: 'GAME_STATUS';
  previousStatus: GameStatus;
  currentStatus: GameStatus;
}

// Union type for all possible game events
export type GameEvent =
  | FruitDropEvent
  | FruitMergeEvent
  | GameStartEvent
  | GameOverEvent
  | GamePauseEvent
  | GameStatusEvent;
