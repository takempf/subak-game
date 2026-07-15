import {
	ActiveEvents,
	type Collider,
	ColliderDesc,
	type RigidBody,
	RigidBodyDesc,
	type World
} from '@dimforge/rapier2d-compat'; // Or @dimforge/rapier3d

import { FRUITS, GAME_OVER_HEIGHT } from '../constants';

interface FruitBodyUserData {
	fruitInstance: Fruit;
}

let currentIdNumber = 1;

export class Fruit {
	public readonly id: number;
	public readonly name: string;
	public readonly radius: number;
	public readonly points: number;
	public readonly fruitIndex: number; // Index in FRUIT_CATALOG
	public readonly body: RigidBody; // Reference to the physics body
	public readonly collider: Collider;
	public readonly physicsWorld: World; // Reference to the physics body
	public startOutOfBounds: DOMHighResTimeStamp | null = null;
	public outOfBounds: boolean = false;
	public prevX: number;
	public prevY: number;
	public prevRotation: number;

	constructor(fruitIndex: number, x: number, y: number, physicsWorld: World) {
		const fruitData = FRUITS[fruitIndex];

		if (!fruitData) {
			throw new Error(`Invalid fruitIndex: ${fruitIndex}`);
		}

		this.id = currentIdNumber++;
		this.fruitIndex = fruitIndex;
		this.name = fruitData.name;
		this.radius = fruitData.radius;
		this.points = fruitData.points;
		this.physicsWorld = physicsWorld;
		this.prevX = x;
		this.prevY = y;
		this.prevRotation = 0;

		const bodyDesc = RigidBodyDesc.dynamic()
			.setTranslation(x, y)
			.setLinearDamping(0.2)
			.setAngularDamping(0.4);
		this.body = this.physicsWorld.createRigidBody(bodyDesc);

		const colliderDesc = ColliderDesc.ball(this.radius)
			.setRestitution(0.25)
			.setFriction(0.35)
			.setMass(0.1)
			// *** Enable collision events for this collider ***
			.setActiveEvents(ActiveEvents.COLLISION_EVENTS);
		this.collider = this.physicsWorld.createCollider(colliderDesc, this.body);

		// --- CRUCIAL STEP ---
		// Store a reference to this Fruit instance in the RigidBody's userData.
		// This allows us to easily get the Fruit object from a RigidBody/Collider handle.
		// Ensure userData is initialized if not done during body creation.
		if (!this.body.userData) {
			this.body.userData = {};
		}
		// Use a specific key like 'fruitInstance' to avoid potential conflicts
		// if userData is used for other things.
		(this.body.userData as FruitBodyUserData).fruitInstance = this;
	}

	isOutOfBounds(): boolean {
		// otherwise, set the out of bounds flags
		const topOfFruitY = this.body.translation().y - this.radius;

		if (this.body.isValid() && topOfFruitY < GAME_OVER_HEIGHT) {
			// we've been out of bounds for a while.
			if (this.startOutOfBounds && performance.now() - this.startOutOfBounds > 1000) {
				return true;
			}

			// mark that we have begun being out of bounds
			// if not already marked
			if (!this.startOutOfBounds) {
				this.startOutOfBounds = performance.now();
			}
		} else {
			this.startOutOfBounds = null;
		}

		return false;
	}

	// Method to handle cleanup when the fruit is removed
	destroy(): void {
		if (this.body && this.collider) {
			this.physicsWorld.removeCollider(this.collider, false);
			// Remove the associated rigid body from the physics world
			this.physicsWorld.removeRigidBody(this.body);
		}

		// The Fruit instance itself will be removed from the fruitsInPlay array separately.
		// We don't nullify this.body here as the instance might be briefly
		// held elsewhere before garbage collection.
	}
}
