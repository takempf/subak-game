import type { EventQueue, World } from '@dimforge/rapier2d-compat';

import {
	DEFAULT_IMAGES_PATH,
	DEFAULT_SOUNDS_PATH,
	FRUITS, // Assuming FRUITS is typed like: { radius: number; points: number }[]
	GAME_HEIGHT,
	GAME_WIDTH,
	WALL_THICKNESS
} from '../constants'; // Ensure constants are correctly typed in their file
import { AudioManager } from '../game/AudioManager.svelte';
import { Boundary } from '../game/Boundary';
import { Fruit } from '../game/Fruit';
import { throttle } from '../utils/throttle';
import { LeaderboardClient } from '../api/leaderboard-client.svelte';
import { TelemetryState } from './telemetry.svelte';

// --- Constants for Volume Mapping ---
const MIN_VELOCITY_FOR_SOUND = 0.2; // Ignore very gentle taps
const MAX_VELOCITY_FOR_MAX_VOL = 0.8; // Velocity at which sound is loudest
const MIN_COLLISION_VOLUME = 0.3; // Minimum volume for the quietest sound
const MAX_COLLISION_VOLUME = 1.0; // Maximum volume for the loudest sound
// --- Pitch variation settings ---
const PITCH_VARIATION_MIN = 0.9;
const PITCH_VARIATION_MAX = 1.1;
// Drop pitch rates: C major scale ~1.5 octaves (E4→B2), smallest fruit = highest pitch.
// Notes: E4, D4, C4, B3, A3, G3, F3, E3, D3, C3, B2. Each rate = 2^(semitones/12).
const DROP_PITCH_RATES = [
	1.2599, 1.1225, 1.0, 0.9439, 0.8409, 0.7492, 0.6674, 0.63, 0.5612, 0.5, 0.4729
];
// Bonus awarded when two watermelons (the largest fruit) merge and vanish
const WATERMELON_MERGE_POINTS = 100;
const MERGE_EFFECT_DURATION_MS = 1000;

// Helper function (as defined above)
function mapRange(
	value: number,
	inMin: number,
	inMax: number,
	outMin: number,
	outMax: number
): number {
	const clampedValue = Math.max(inMin, Math.min(value, inMax));
	return ((clampedValue - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

// --- Interfaces remain the same ---
interface MergeEffectData {
	id: number;
	x: number;
	y: number;
	radius: number;
	startTime: number;
	duration: number;
}
interface FruitState {
	id: number; // Add this line
	x: number;
	y: number;
	rotation: number;
	fruitIndex: number;
}
interface GameStateProps {
	imagesPath?: string;
	soundsPath?: string;
}
type GameStatus = 'uninitialized' | 'playing' | 'paused' | 'gameover';

export class GameState {
	__rapier: typeof import('@dimforge/rapier2d-compat') | undefined = undefined;

	audioManager: AudioManager | null = $state(null);
	score: number = $state(0);
	status: GameStatus = $state('uninitialized');
	currentFruitIndex: number = $state(0);
	nextFruitIndex: number = $state(0);
	fruits: Fruit[] = [];
	fruitsState: FruitState[] = $state([]);
	fruitsStateById: Map<number, FruitState> = new Map();
	dropCount: number = $state(0);
	mergeEffects: MergeEffectData[] = $state([]);

	// Telemetry & API
	telemetry: TelemetryState = new TelemetryState();
	leaderboard: LeaderboardClient = new LeaderboardClient();

	gameOverFruitId: number | null = $state(null);

	mergeEffectIdCounter: number = 0;

	physicsAccumulator: number = 0;
	lastTime: number | null = null;
	animationFrameId: number | null = null;

	physicsWorld: World | null = null;
	eventQueue: EventQueue | null = null;
	colliderMap: Map<number, Fruit | Boundary> = new Map();

	// Configuration
	imagesPath: string = DEFAULT_IMAGES_PATH;
	soundsPath: string = DEFAULT_SOUNDS_PATH;

	throttledCheckGameOver?: () => void;

	constructor({ imagesPath, soundsPath }: GameStateProps) {
		if (imagesPath) this.imagesPath = imagesPath;
		if (soundsPath) this.soundsPath = soundsPath;

		this.throttledCheckGameOver = throttle(this.checkGameOver, 500);
	}

	async init() {
		const { soundsPath } = this;
		this.audioManager = new AudioManager({ soundsPath });
		await this.initPhysics();
		this.resetGame();
		this.startNewSession();
	}

	update() {
		// Ensure loop only runs if status is 'playing'
		if (this.status !== 'playing') {
			if (this.animationFrameId) {
				cancelAnimationFrame(this.animationFrameId);
				this.animationFrameId = null;
			}
			return;
		}

		this.stepPhysics(); // Run physics step
		this.throttledCheckGameOver?.(); // We done here?

		// Only request next frame if still playing
		if (this.status === 'playing') {
			this.animationFrameId = requestAnimationFrame(() => this.update());
		} else {
			// If status changed mid-update (e.g. gameover), ensure cleanup
			if (this.animationFrameId) {
				cancelAnimationFrame(this.animationFrameId);
				this.animationFrameId = null;
			}
		}
	}

	async initPhysics(): Promise<void> {
		try {
			this.__rapier = await import('@dimforge/rapier2d-compat');
			await this.__rapier.init();

			// Why is this so far off of reality.
			const gravity = new this.__rapier.Vector2(0.0, 9.86 * 0.15);
			this.physicsWorld = new this.__rapier.World(gravity);
			this.physicsWorld.integrationParameters.numSolverIterations = 8;
			this.eventQueue = new this.__rapier.EventQueue(true); // Create event queue (true enables contact events)
			this.colliderMap.clear(); // Ensure map is clear on init
			this.createBounds();
		} catch (error) {
			console.error('Failed to initialize Rapier or create physics world:', error);
			this.setStatus('gameover');
		}
	}

	stepPhysics(): void {
		if (!this.physicsWorld || !this.eventQueue) {
			// Don't step if world or event queue doesn't exist
			return;
		}

		const currentTime = performance.now();
		const physicsStepMs = this.physicsWorld.integrationParameters.dt * 1000;

		let steppedThisFrame = false;
		// Clamp the per-frame delta (e.g. Math.min(delta, 100) ms) to prevent catch-up burst
		const delta = Math.min(currentTime - (this.lastTime ?? currentTime), 100);
		this.physicsAccumulator += delta;
		this.lastTime = currentTime;

		while (this.physicsAccumulator >= physicsStepMs) {
			this.physicsAccumulator -= physicsStepMs;
			this.physicsWorld.step(this.eventQueue);
			this.checkCollisions();
			steppedThisFrame = true;
		}

		// Only update rendering state on frames where at least one physics step ran
		if (steppedThisFrame) {
			for (const fruit of this.fruits) {
				if (!fruit.body.isValid()) continue;
				if (fruit.body.isSleeping()) continue;

				const state = this.fruitsStateById.get(fruit.id);
				if (state) {
					const position = fruit.body.translation();
					state.x = position.x;
					state.y = position.y;
					state.rotation = fruit.body.rotation();
				}
			}
		}

		const newMergeEffects = this.mergeEffects.filter(
			(effect) => currentTime - effect.startTime < effect.duration
		);
		if (newMergeEffects.length !== this.mergeEffects.length) {
			this.mergeEffects = newMergeEffects;
		}
	}

	checkCollisions() {
		if (!this.eventQueue) {
			return;
		}

		const mergePairs: { fruitA: Fruit; fruitB: Fruit }[] = [];
		const mergedHandlesThisStep = new Set<number>(); // Track handles involved in a merge *this step*

		this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
			// Only process contacts that *started* in this step
			if (!started) {
				return;
			}

			// Look up our data associated with the collider handles
			const collisionItemA = this.colliderMap.get(handle1);
			const collisionItemB = this.colliderMap.get(handle2);

			if (collisionItemA?.body && collisionItemB?.body && this.audioManager) {
				// Apply random pitch variation
				const rate =
					PITCH_VARIATION_MIN + Math.random() * (PITCH_VARIATION_MAX - PITCH_VARIATION_MIN);

				// if it's two fruits they will always fire pop sound effect
				if (
					collisionItemA instanceof Fruit &&
					collisionItemB instanceof Fruit &&
					collisionItemA.fruitIndex === collisionItemB.fruitIndex
				) {
					const popRate = DROP_PITCH_RATES[collisionItemA.fruitIndex] ?? 1.0;
					this.audioManager.playSound('pop', { volume: 1, rate: popRate });
					// bump sounds have complex logic
				} else {
					// Get velocities (use {x:0, y:0} for static bodies or null bodies)
					const vel1 = collisionItemA.body.linvel() ?? { x: 0, y: 0 };
					const vel2 = collisionItemB.body.linvel() ?? { x: 0, y: 0 };

					// Calculate relative velocity magnitude
					const relVelX = vel1.x - vel2.x;
					const relVelY = vel1.y - vel2.y;
					const relVelMag = Math.sqrt(relVelX * relVelX + relVelY * relVelY);

					// --- Determine Volume and Play Sound ---
					if (relVelMag >= MIN_VELOCITY_FOR_SOUND) {
						// Map velocity to volume
						const volume = mapRange(
							relVelMag,
							MIN_VELOCITY_FOR_SOUND,
							MAX_VELOCITY_FOR_MAX_VOL,
							MIN_COLLISION_VOLUME,
							MAX_COLLISION_VOLUME
						);

						// Pitch based on the largest fruit involved in the collision
						const fruitA = collisionItemA instanceof Fruit ? collisionItemA : null;
						const fruitB = collisionItemB instanceof Fruit ? collisionItemB : null;
						const dominantFruit =
							fruitA && fruitB
								? fruitA.fruitIndex >= fruitB.fruitIndex
									? fruitA
									: fruitB
								: (fruitA ?? fruitB);
						const bumpRate = dominantFruit
							? (DROP_PITCH_RATES[dominantFruit.fruitIndex] ?? 1.0)
							: rate;

						// Play the sound using AudioManager
						this.audioManager.playSound('bump', { volume, rate: bumpRate });
					}
				}
			}

			// Avoid processing if either collider is already part of a merge this step
			if (mergedHandlesThisStep.has(handle1) || mergedHandlesThisStep.has(handle2)) {
				return;
			}

			let fruitA: Fruit | undefined;
			let fruitB: Fruit | undefined;
			if (collisionItemA instanceof Fruit && collisionItemB instanceof Fruit) {
				fruitA = collisionItemA;
				fruitB = collisionItemB;
			} else {
				return;
			}

			// Ensure both colliders correspond to known fruit data and are valid
			if (!fruitA || !fruitB || !fruitA.body.isValid() || !fruitB.body.isValid()) {
				// One or both colliders might not be fruits (e.g., walls) or might have been removed
				return;
			}

			// Check if fruits are the same type
			if (fruitA.fruitIndex === fruitB.fruitIndex) {
				// Ensure consistent order (optional, but good practice)
				const handleA = Math.min(handle1, handle2);
				const handleB = Math.max(handle1, handle2);
				mergePairs.push({ fruitA, fruitB });

				// Mark handles as merged for this step
				mergedHandlesThisStep.add(handleA);
				mergedHandlesThisStep.add(handleB);
			}
		});

		// --- Step 2: Process Queued Merges ---
		if (mergePairs.length > 0) {
			mergePairs.forEach(({ fruitA, fruitB }) => {
				this.mergeFruits(fruitA, fruitB);
			});
		}
	}

	createBounds() {
		// Create walls (walls don't need collision events for merging)
		this.createWall(WALL_THICKNESS / -2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT); // left
		this.createWall(GAME_WIDTH + WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT); // right
		this.createWall(GAME_WIDTH / 2, GAME_HEIGHT + WALL_THICKNESS / 2, GAME_WIDTH, WALL_THICKNESS); // floor
	}

	createWall(x: number, y: number, width: number, height: number): void {
		if (!this.physicsWorld) {
			console.error('Cannot create wall: Physics world not initialized.');
			return;
		}

		const boundary = new Boundary(x, y, width, height, this.physicsWorld);

		this.colliderMap.set(boundary.collider.handle, boundary);
	}

	mergeFruits(fruitA: Fruit, fruitB: Fruit): void {
		if (!this.physicsWorld) {
			console.error('Cannot merge fruits: Physics world not initialized.');
			return;
		}

		// Check if data exists and bodies are valid
		if (!fruitA.body.isValid() || !fruitB.body.isValid()) {
			console.warn(
				`Attempted to merge handles ${fruitA.body.handle}, ${fruitB.body.handle}, but data/body was missing or invalid. Might have been merged already.`
			);
			return;
		}

		const posA = fruitA.body.translation();
		const posB = fruitB.body.translation();
		const midpoint = {
			x: (posA.x + posB.x) / 2,
			y: (posA.y + posB.y) / 2
		};

		// Two watermelons (the largest fruit) merge into nothing for a flat bonus
		const isWatermelonMerge = fruitA.fruitIndex === FRUITS.length - 1;
		const nextIndex = fruitA.fruitIndex + 1;
		const nextFruitType = FRUITS[nextIndex];
		if (!isWatermelonMerge && !nextFruitType) {
			console.error(`Invalid next fruit index during merge: ${nextIndex}`);
			return;
		}

		// Remove the old fruits from the physics world and all bookkeeping *first*
		this.removeFruit(fruitA);
		this.removeFruit(fruitB);

		const points = nextFruitType ? nextFruitType.points || 0 : WATERMELON_MERGE_POINTS;
		const effectRadius = nextFruitType ? nextFruitType.radius : fruitA.radius;
		const milestoneIndex = nextFruitType ? nextIndex : fruitA.fruitIndex;

		// Add merge visual effect
		this.mergeEffects = [
			...this.mergeEffects,
			{
				id: this.mergeEffectIdCounter++,
				x: midpoint.x,
				y: midpoint.y,
				radius: effectRadius,
				startTime: performance.now(),
				duration: MERGE_EFFECT_DURATION_MS
			}
		];

		// Add the new, larger fruit (addFruit will update map and array)
		if (!isWatermelonMerge) {
			this.addFruit(nextIndex, midpoint.x, midpoint.y);
		}

		this.telemetry.trackMilestone(points, milestoneIndex, this.dropCount);
		this.score += points;
	}

	/** Removes a fruit from the physics world and all bookkeeping (counterpart to addFruit) */
	private removeFruit(fruit: Fruit): void {
		fruit.destroy();
		this.colliderMap.delete(fruit.collider.handle);
		this.fruits = this.fruits.filter((f) => f !== fruit);
		this.fruitsState = this.fruitsState.filter((f) => f.id !== fruit.id);
		this.fruitsStateById.delete(fruit.id);
	}

	addFruit(fruitIndex: number, x: number, y: number): Fruit | undefined {
		if (!this.physicsWorld) {
			console.error('Cannot add fruit: Physics world not initialized.');
			return;
		}

		const fruit = new Fruit(fruitIndex, x, y, this.physicsWorld);

		if (!fruit) {
			console.error(`Invalid fruitIndex: ${fruitIndex}`);
			return;
		}

		// update current state of fruits
		this.fruits = [...this.fruits, fruit];

		this.colliderMap.set(fruit.collider.handle, fruit);

		// Synchronize fruitsState immediately!
		const position = fruit.body.translation();
		this.fruitsState.push({
			id: fruit.id,
			x: position.x,
			y: position.y,
			rotation: fruit.body.rotation(),
			fruitIndex: fruit.fruitIndex
		});
		this.fruitsStateById.set(fruit.id, this.fruitsState[this.fruitsState.length - 1]);

		return fruit;
	}

	dropFruit(fruitIndex: number, x: number, y: number): void {
		this.addFruit(fruitIndex, x, y);
		this.currentFruitIndex = this.nextFruitIndex;
		this.nextFruitIndex = this.getRandomFruitIndex();
		this.dropCount += 1;
	}

	checkGameOver(): void {
		if (this.status === 'gameover') return;

		for (const fruit of this.fruits) {
			if (fruit.isOutOfBounds()) {
				this.gameOverFruitId = fruit.id;
				this.setStatus('gameover');
				break;
			}
		}
	}

	/** Resets the game state, physics world, and clears the map */
	resetGame(): void {
		if (this.physicsWorld) {
			this.fruits.forEach((fruit) => {
				fruit.destroy();
				this.colliderMap.delete(fruit.collider.handle);
			});
		}

		// Clear internal state
		this.fruits = [];
		this.fruitsState = [];
		this.fruitsStateById.clear();
		this.lastTime = null;
		this.mergeEffectIdCounter = 0;
		this.dropCount = 0;
		this.telemetry.reset();
		this.leaderboard.reset();

		this.gameOverFruitId = null;

		// Reset Svelte fields directly
		this.mergeEffects = [];
		this.score = 0;
		this.status = 'uninitialized'; // Set to uninitialized, GameHeader will transition to playing
		this.currentFruitIndex = this.getRandomFruitIndex();
		this.nextFruitIndex = this.getRandomFruitIndex();
	}

	restartGame(): void {
		this.resetGame();
		this.startNewSession();
		this.setStatus('playing');
	}

	private startNewSession(): void {
		this.leaderboard.startSession().finally((): void => {
			const token = this.leaderboard.sessionToken;
			this.telemetry.setSession(token);
		});
	}

	getRandomFruitIndex(limit: number = 5) {
		return Math.floor(Math.random() * limit);
	}

	setStatus(newStatus: GameStatus) {
		const oldStatus = this.status;
		this.status = newStatus;

		if (newStatus === 'playing') {
			if (oldStatus !== 'playing') {
				this.lastTime = performance.now(); // Reset lastTime for correct delta on resume
				if (!this.animationFrameId) {
					// Avoid multiple loops
					this.update();
				}
			}
		} else if (['paused', 'gameover', 'uninitialized'].includes(newStatus)) {
			if (this.animationFrameId) {
				cancelAnimationFrame(this.animationFrameId);
				this.animationFrameId = null;
			}
		}
	}

	destroy() {
		this.status = 'gameover'; // Ensure loop stops and cleanup occurs
		this.leaderboard.destroy();
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
		this.eventQueue?.free();
		this.physicsWorld?.free();
		this.eventQueue = null;
		this.physicsWorld = null;
		this.colliderMap.clear();
		this.fruits = [];
		this.fruitsState = [];
		this.fruitsStateById.clear();
	}
}
