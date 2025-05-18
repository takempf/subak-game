import {
	init as rapierInit,
	Vector2,
	World,
	EventQueue // Import EventQueue
} from '@dimforge/rapier2d-compat';

import { Fruit } from '../game/Fruit';

import {
	FRUITS, // Assuming FRUITS is typed like: { radius: number; points: number }[]
	GAME_WIDTH,
	GAME_HEIGHT,
	WALL_THICKNESS,
	DEFAULT_IMAGES_PATH,
	DEFAULT_SOUNDS_PATH
} from '../constants'; // Ensure constants are correctly typed in their file
import { throttle } from '../utils/throttle';
import { AudioManager } from '../game/AudioManager.svelte';
import { Boundary } from '../game/Boundary';

// --- Constants for Volume Mapping ---
const MIN_VELOCITY_FOR_SOUND = 0.2; // Ignore very gentle taps
const MAX_VELOCITY_FOR_MAX_VOL = 0.8; // Velocity at which sound is loudest
const MIN_COLLISION_VOLUME = 0.3; // Minimum volume for the quietest sound
const MAX_COLLISION_VOLUME = 1.0; // Maximum volume for the loudest sound
// --- Pitch variation settings ---
const PITCH_VARIATION_MIN = 0.9;
const PITCH_VARIATION_MAX = 1.1;

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

export class GameState {
	audioManager: AudioManager | null = null;
	score: number = $state(0);
	gameOver: boolean = $state(false);
	currentFruitIndex: number = $state(0);
	nextFruitIndex: number = $state(0);
	fruits: Fruit[] = [];
	fruitsState: FruitState[] = $state([]);
	dropCount: number = $state(0);
	mergeEffects: MergeEffectData[] = $state([]);

	mergeEffectIdCounter: number = 0;

	physicsAccumulator: number = 0;
	lastTime: number | null = null;
	animationFrameId: number | null = null;

	physicsWorld: World | null = null;
	eventQueue: EventQueue | null = null;
	colliderMap: Map<number, Fruit | Boundary> = new Map();

	lastBumpSoundTime: DOMHighResTimeStamp = 0;

	// Configuration
	imagesPath: string = DEFAULT_IMAGES_PATH;
	soundsPath: string = DEFAULT_SOUNDS_PATH;

	throttledCheckGameOver?: () => void;

	constructor({ imagesPath, soundsPath }: GameStateProps) {
		(async () => {
			if (imagesPath) this.imagesPath = imagesPath;
			if (soundsPath) this.soundsPath = soundsPath;
			this.audioManager = new AudioManager({ soundsPath });
			this.throttledCheckGameOver = throttle(this.checkGameOver, 500);
			await this.initPhysics();
			this.resetGame();
			this.update();
		})();
	}

	update() {
		if (this.gameOver) {
			// Stop loop if component destroyed or game over
			if (this.animationFrameId) {
				cancelAnimationFrame(this.animationFrameId);
				this.animationFrameId = null;
			}
			return;
		}

		this.stepPhysics(); // Run physics step
		this.throttledCheckGameOver?.(); // We done here?
		this.animationFrameId = requestAnimationFrame(() => this.update()); // Request next frame
	}

	async initPhysics(): Promise<void> {
		console.log('Starting Rapier physics engine...');
		try {
			await rapierInit();
			console.log('Rapier physics initialized.');

			// Why is this so far off of reality.
			const gravity = new Vector2(0.0, 9.86 * 0.15);
			this.physicsWorld = new World(gravity);
			this.physicsWorld.integrationParameters.numSolverIterations = 8;
			this.eventQueue = new EventQueue(true); // Create event queue (true enables contact events)
			this.colliderMap.clear(); // Ensure map is clear on init
			this.createBounds();

			console.log('Physics world and event queue created and set.');
		} catch (error) {
			console.error('Failed to initialize Rapier or create physics world:', error);
			this.setGameOver(true);
		}
	}

	stepPhysics(): void {
		if (!this.physicsWorld || !this.eventQueue) {
			// Don't step if world or event queue doesn't exist
			return;
		}

		const currentTime = performance.now();
		const physicsStepMs = this.physicsWorld.integrationParameters.dt * 1000;

		this.physicsAccumulator += currentTime - (this.lastTime || 0);
		while (this.physicsAccumulator >= physicsStepMs) {
			this.physicsAccumulator -= physicsStepMs;
			this.physicsWorld.step(this.eventQueue);
			this.checkCollisions();
		}

		this.lastTime = currentTime;

		// --- Step 3: Update Rendering State and Effects (mostly unchanged) ---
		const updatedFruitStates: FruitState[] = this.fruits
			.map((fruit) => {
				if (!fruit.body.isValid()) return null;
				return {
					x: fruit.body.translation().x,
					y: fruit.body.translation().y,
					rotation: fruit.body.rotation(),
					fruitIndex: fruit.fruitIndex
				};
			})
			.filter((state): state is FruitState => state !== null);
		this.setFruitsState(updatedFruitStates);

		const newMergeEffects = this.mergeEffects
			.map((effect: MergeEffectData) => {
				const progress = (currentTime - effect.startTime) / effect.duration;

				if (progress >= 1) return null;
				return effect;
			})
			.filter((effect): effect is MergeEffectData => effect !== null);
		this.setMergeEffects(newMergeEffects);
	}

	checkCollisions() {
		if (!this.eventQueue) {
			return;
		}

		const currentTime = performance.now();
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
					this.audioManager.playSound('pop', { volume: 1, rate });
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
						// Check global time-based cooldown first

						// Map velocity to volume
						const volume = mapRange(
							relVelMag,
							MIN_VELOCITY_FOR_SOUND,
							MAX_VELOCITY_FOR_MAX_VOL,
							MIN_COLLISION_VOLUME,
							MAX_COLLISION_VOLUME
						);

						// Play the sound using AudioManager

						this.audioManager.playSound('bump', { volume, rate });

						// Update the last play time
						this.lastBumpSoundTime = currentTime;
					}
				}
			}

			// Avoid processing if either collider is already part of a merge this step
			if (mergedHandlesThisStep.has(handle1) || mergedHandlesThisStep.has(handle2)) {
				return;
			}

			let fruitA;
			let fruitB;
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

			// Check if fruits are the same type and not the largest
			if (fruitA.fruitIndex === fruitB.fruitIndex && fruitA.fruitIndex < FRUITS.length - 1) {
				// Queue this pair for merging
				console.log(
					`Collision Event: Queueing merge for type ${fruitA.fruitIndex} (handles ${handle1}, ${handle2})`
				);
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
			console.log(`Processing ${mergePairs.length} merge pairs from events...`);
			mergePairs.forEach(({ fruitA, fruitB }) => {
				// mergeFruits will handle validity checks internally now
				this.mergeFruits(fruitA, fruitB);
			});
			console.log(`Finished processing merges. Current fruits count: ${this.fruits.length}`);
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

		// --- Rest of the merge logic is similar, using bodyAData/bodyBData ---
		const posA = fruitA.body.translation();
		const posB = fruitB.body.translation();
		const midpoint = {
			x: (posA.x + posB.x) / 2,
			y: (posA.y + posB.y) / 2
		};

		const nextIndex = fruitA.fruitIndex + 1;
		const nextFruitType = FRUITS[nextIndex];
		if (!nextFruitType) {
			console.error(`Invalid next fruit index during merge: ${nextIndex}`);
			return;
		}
		const newFruitRadius = nextFruitType.radius;

		// 1. Remove the old bodies from the physics world *first*
		fruitA.destroy();
		fruitB.destroy();

		// 2. Remove from collider map
		this.colliderMap.delete(fruitA.body.handle);
		this.colliderMap.delete(fruitB.body.handle);

		// 3. Filter the local fruits array *immediately* using handles
		this.fruits = this.fruits.filter((fruit) => {
			return fruit !== fruitA && fruit !== fruitB;
		});

		// Add merge visual effect
		const newMergeEffects = [
			...this.mergeEffects,
			{
				id: this.mergeEffectIdCounter++,
				x: midpoint.x,
				y: midpoint.y,
				radius: newFruitRadius,
				startTime: performance.now(),
				duration: 1000
			}
		];
		this.setMergeEffects(newMergeEffects);

		// 4. Add the new, larger fruit (addFruit will update map and array)
		this.addFruit(nextIndex, midpoint.x, midpoint.y);

		// Update the score
		this.setScore(this.score + (nextFruitType.points || 0));

		console.log(
			`Merged handles ${fruitA.body.handle}, ${fruitB.body.handle}. New fruits count: ${this.fruits.length}`
		);
	}

	addFruit(fruitIndex: number, x: number, y: number): void {
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
	}

	dropFruit(fruitIndex: number, x: number, y: number): void {
		this.addFruit(fruitIndex, x, y);
		this.setCurrentFruitIndex(this.nextFruitIndex);
		this.setNextFruitIndex(this.getRandomFruitIndex());
		this.setDropCount(this.dropCount + 1);
	}

	checkGameOver(): void {
		if (this.gameOver) return;

		for (const fruit of this.fruits) {
			if (fruit.isOutOfBounds()) {
				console.log('Game Over condition met!');
				this.setGameOver(true);
				break;
			}
		}
	}

	/** Resets the game state, physics world, and clears the map */
	resetGame(): void {
		if (this.physicsWorld) {
			this.fruits.forEach((fruit) => fruit.destroy());
		}

		// Clear internal state
		this.fruits = [];
		this.lastTime = null;
		this.mergeEffectIdCounter = 0;
		this.dropCount = 0;

		// Reset Svelte stores
		this.setFruitsState([]);
		this.setMergeEffects([]);
		this.setScore(0);
		this.setGameOver(false);
		this.setCurrentFruitIndex(this.getRandomFruitIndex());
		this.setNextFruitIndex(this.getRandomFruitIndex());
	}

	restartGame(): void {
		this.resetGame();
		// start the loop again
		this.update();
	}

	getRandomFruitIndex(limit: number = 5) {
		return Math.floor(Math.random() * limit);
	}

	setScore(newScore: number) {
		this.score = newScore;
	}

	setGameOver(newGameOver: boolean) {
		this.gameOver = newGameOver;
	}

	setCurrentFruitIndex(newCurrentFruitIndex: number) {
		this.currentFruitIndex = newCurrentFruitIndex;
	}

	setNextFruitIndex(newNextFruitIndex: number) {
		this.nextFruitIndex = newNextFruitIndex;
	}

	setFruitsState(newFruits: FruitState[]) {
		this.fruitsState = newFruits;
	}

	setDropCount(newDropCount: number) {
		this.dropCount = newDropCount;
	}

	setMergeEffects(newMergeEffects: MergeEffectData[]) {
		this.mergeEffects = newMergeEffects;
	}

	destroy() {
		console.log('destroy Game State');
	}
}
