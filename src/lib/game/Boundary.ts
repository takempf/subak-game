import {
  ActiveEvents,
  Collider,
  ColliderDesc,
  RigidBody,
  RigidBodyDesc,
  World
} from '@dimforge/rapier2d-compat';

export class Boundary {
  public readonly body: RigidBody; // Reference to the physics body
  public readonly collider: Collider;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    physicsWorld: World
  ) {
    const bodyDesc = RigidBodyDesc.fixed().setTranslation(x, y);
    this.body = physicsWorld.createRigidBody(bodyDesc);
    const colliderDesc = ColliderDesc.cuboid(width / 2, height / 2);
    colliderDesc.setActiveEvents(ActiveEvents.COLLISION_EVENTS);
    this.collider = physicsWorld.createCollider(colliderDesc, this.body);
  }
}
