import { Collider, RigidBody, World } from '@dimforge/rapier2d-compat';
export declare class Boundary {
    readonly body: RigidBody;
    readonly collider: Collider;
    constructor(x: number, y: number, width: number, height: number, physicsWorld: World);
}
