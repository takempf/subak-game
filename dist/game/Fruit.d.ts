import { RigidBody, Collider, World, type Vector, type Rotation } from '@dimforge/rapier2d-compat';
export declare class Fruit {
    readonly id: number;
    readonly name: string;
    readonly radius: number;
    readonly points: number;
    readonly fruitIndex: number;
    readonly body: RigidBody;
    readonly collider: Collider;
    readonly physicsWorld: World;
    startOutOfBounds: DOMHighResTimeStamp | null;
    outOfBounds: boolean;
    constructor(fruitIndex: number, x: number, y: number, physicsWorld: World);
    isOutOfBounds(): boolean;
    getPosition(): Vector;
    getRotation(): number | Rotation;
    destroy(): void;
}
