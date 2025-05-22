/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameState } from '../game.svelte.js';
import { FRUITS } from '../../constants';

// Stub physics related methods before constructing GameState
const proto: any = GameState.prototype;
vi.spyOn(proto, 'initPhysics').mockImplementation(async function (this: any) {
	this.physicsWorld = {
		integrationParameters: { dt: 1 / 60 },
		removeRigidBody: vi.fn()
	};
	this.eventQueue = { drainCollisionEvents: vi.fn() };
});
vi.spyOn(proto, 'update').mockImplementation(() => {});
vi.spyOn(proto, 'addFruit').mockImplementation(function (
	this: any,
	fruitIndex: number,
	x: number,
	y: number
) {
	const fruit = {
		fruitIndex,
		radius: FRUITS[fruitIndex].radius,
		points: FRUITS[fruitIndex].points,
		body: {
			handle: (this._handle = (this._handle ?? 0) + 1),
			isValid: () => true,
			translation: () => ({ x, y }),
			rotation: () => 0,
			linvel: () => ({ x: 0, y: 0 })
		},
		collider: { handle: this._handle || 0 },
		destroy: vi.fn(),
		physicsWorld: this.physicsWorld
	};
	this.fruits.push(fruit);
	this.colliderMap.set(fruit.body.handle, fruit);
	return fruit;
});

beforeEach(() => {
	vi.clearAllMocks();
});

describe('GameState merging', () => {
	it('merges two fruits of the same type', () => {
		const state = new GameState({});
		// add two fruits of type 0
		const a = state.addFruit(0, 0.2, 0.2);
		const b = state.addFruit(0, 0.25, 0.2);
		const initialCount = state.fruits.length;
		state.mergeFruits(a, b);
		expect(state.fruits.length).toBe(initialCount - 1);
		expect(state.fruits[0].fruitIndex).toBe(1);
		expect(state.score).toBe(FRUITS[1].points);
	});
});
