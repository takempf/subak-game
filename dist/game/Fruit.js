import { ActiveEvents, RigidBody, RigidBodyDesc, Collider, ColliderDesc, World } from '@dimforge/rapier2d-compat'; // Or @dimforge/rapier3d
import { FRUITS, GAME_OVER_HEIGHT } from '../constants';
let currentIdNumber = 1;
export class Fruit {
    id;
    name;
    radius;
    points;
    fruitIndex; // Index in FRUIT_CATALOG
    body; // Reference to the physics body
    collider;
    physicsWorld; // Reference to the physics body
    startOutOfBounds = null;
    outOfBounds = false;
    constructor(fruitIndex, x, y, physicsWorld) {
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
        const bodyDesc = RigidBodyDesc.dynamic()
            .setTranslation(x, y)
            .setLinearDamping(0.2)
            .setAngularDamping(0.4);
        this.body = this.physicsWorld.createRigidBody(bodyDesc);
        const colliderDesc = ColliderDesc.ball(this.radius)
            .setRestitution(0.25)
            .setFriction(0.5)
            .setMass(0.0125)
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
        this.body.userData.fruitInstance = this;
        // Optional: You might prefer attaching to the collider if you primarily
        // work with colliders in collision events. Assumes one collider per body.
        // const collider = body.collider(0); // Get the first collider
        // if (collider) {
        //   if (!collider.userData) collider.userData = {};
        //   collider.userData.fruitInstance = this;
        // } else {
        //   console.warn("Could not find collider to attach Fruit instance to userData");
        // }
    }
    isOutOfBounds() {
        // otherwise, set the out of bounds flags
        const topOfFruitY = this.body.translation().y - this.radius;
        if (this.body.isValid() && topOfFruitY < GAME_OVER_HEIGHT) {
            // we've been out of bounds for a while.
            if (this.startOutOfBounds &&
                performance.now() - this.startOutOfBounds > 1000) {
                return true;
            }
            // mark that we have begun being out of bounds
            // if not already marked
            if (!this.startOutOfBounds) {
                this.startOutOfBounds = performance.now();
            }
        }
        else {
            this.startOutOfBounds = null;
        }
        return false;
    }
    // Helper to get current position from the physics body
    getPosition() {
        // Use RAPIER.Vector2 or RAPIER.Vector3 based on your import
        return this.body.translation();
    }
    // Helper to get current rotation from the physics body
    getRotation() {
        // Return type depends on 2D (number) or 3D (RAPIER.Rotation)
        return this.body.rotation();
    }
    // Method to handle cleanup when the fruit is removed
    destroy() {
        console.log(`Destroying physics body for ${this.name}`);
        // Remove the associated rigid body from the physics world
        this.physicsWorld.removeRigidBody(this.body);
        // The Fruit instance itself will be removed from the fruitsInPlay array separately.
        // We don't nullify this.body here as the instance might be briefly
        // held elsewhere before garbage collection.
    }
}
