import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Fruit } from '../Fruit';
import { RigidBodyDesc, ColliderDesc, ActiveEvents, type World } from '@dimforge/rapier2d-compat';

vi.mock('../../constants', () => ({
	FRUITS: [
		{ name: 'Cherry', radius: 10, points: 5 },
		{ name: 'Strawberry', radius: 15, points: 15 }
	],
	GAME_OVER_HEIGHT: -100
}));

// The factory runs once. The mock objects must hold fresh vi.fn() per test —
// we reassign them in beforeEach and keep the module mock referencing them
// via closures.
let mockRigidBodyDesc: {
	setTranslation: ReturnType<typeof vi.fn>;
	setLinearDamping: ReturnType<typeof vi.fn>;
	setAngularDamping: ReturnType<typeof vi.fn>;
};

let mockColliderDesc: {
	setRestitution: ReturnType<typeof vi.fn>;
	setFriction: ReturnType<typeof vi.fn>;
	setMass: ReturnType<typeof vi.fn>;
	setActiveEvents: ReturnType<typeof vi.fn>;
};

vi.mock('@dimforge/rapier2d-compat', () => ({
	ActiveEvents: { COLLISION_EVENTS: 1 },
	// factory fns delegate to the outer-scope mocks so beforeEach can refresh them
	RigidBodyDesc: {
		dynamic: vi.fn(() => mockRigidBodyDesc)
	},
	ColliderDesc: {
		ball: vi.fn(() => mockColliderDesc)
	},
	World: vi.fn()
}));

describe('Fruit', () => {
	let mockWorld: {
		createRigidBody: ReturnType<typeof vi.fn>;
		createCollider: ReturnType<typeof vi.fn>;
		removeCollider: ReturnType<typeof vi.fn>;
		removeRigidBody: ReturnType<typeof vi.fn>;
	};
	let mockRigidBody: {
		userData: unknown;
		translation: ReturnType<typeof vi.fn>;
		rotation: ReturnType<typeof vi.fn>;
		isValid: ReturnType<typeof vi.fn>;
	};
	let mockCollider: { testId: string };

	beforeEach(() => {
		// Rebuild descriptor mocks each time so chains work after clearAllMocks
		mockRigidBodyDesc = {
			setTranslation: vi.fn().mockReturnThis(),
			setLinearDamping: vi.fn().mockReturnThis(),
			setAngularDamping: vi.fn().mockReturnThis()
		};

		mockColliderDesc = {
			setRestitution: vi.fn().mockReturnThis(),
			setFriction: vi.fn().mockReturnThis(),
			setMass: vi.fn().mockReturnThis(),
			setActiveEvents: vi.fn().mockReturnThis()
		};

		mockRigidBody = {
			userData: undefined,
			translation: vi.fn(() => ({ x: 0, y: 0 })),
			rotation: vi.fn(() => 0),
			isValid: vi.fn(() => true)
		};
		mockCollider = { testId: 'mock-collider' };

		mockWorld = {
			createRigidBody: vi.fn().mockReturnValue(mockRigidBody),
			createCollider: vi.fn().mockReturnValue(mockCollider),
			removeCollider: vi.fn(),
			removeRigidBody: vi.fn()
		};

		vi.mocked(RigidBodyDesc.dynamic).mockReturnValue(
			mockRigidBodyDesc as unknown as ReturnType<typeof RigidBodyDesc.dynamic>
		);
		vi.mocked(ColliderDesc.ball).mockReturnValue(
			mockColliderDesc as unknown as ReturnType<typeof ColliderDesc.ball>
		);
	});

	it('creates a fruit and initializes physical properties correctly', () => {
		const fruit = new Fruit(0, 50, 60, mockWorld as unknown as World);

		expect(fruit.name).toBe('Cherry');
		expect(fruit.radius).toBe(10);
		expect(fruit.points).toBe(5);
		expect(fruit.fruitIndex).toBe(0);

		expect(RigidBodyDesc.dynamic).toHaveBeenCalled();
		expect(mockRigidBodyDesc.setTranslation).toHaveBeenCalledWith(50, 60);
		expect(mockRigidBodyDesc.setLinearDamping).toHaveBeenCalledWith(0.2);
		expect(mockRigidBodyDesc.setAngularDamping).toHaveBeenCalledWith(0.4);
		expect(mockWorld.createRigidBody).toHaveBeenCalledWith(mockRigidBodyDesc);

		expect(ColliderDesc.ball).toHaveBeenCalledWith(10);
		expect(mockColliderDesc.setRestitution).toHaveBeenCalledWith(0.25);
		expect(mockColliderDesc.setFriction).toHaveBeenCalledWith(0.35);
		expect(mockColliderDesc.setMass).toHaveBeenCalledWith(0.1);
		expect(mockColliderDesc.setActiveEvents).toHaveBeenCalledWith(ActiveEvents.COLLISION_EVENTS);

		expect(fruit.body.userData).toEqual({ fruitInstance: fruit });
	});

	it('throws for an invalid fruit index', () => {
		expect(() => new Fruit(999, 0, 0, mockWorld as unknown as World)).toThrow(
			'Invalid fruitIndex: 999'
		);
	});

	it('assigns unique ids to each fruit instance', () => {
		const a = new Fruit(0, 0, 0, mockWorld as unknown as World);
		const b = new Fruit(1, 0, 0, mockWorld as unknown as World);
		expect(a.id).not.toBe(b.id);
	});

	it('isOutOfBounds: returns false, tracks timer, then true after 1s', () => {
		let now = 1000;
		vi.spyOn(window.performance, 'now').mockImplementation(() => now);

		// y=0 → topOfFruitY = 0 - 10 = -10, which is > GAME_OVER_HEIGHT (-100) → in bounds
		const fruit = new Fruit(0, 0, 0, mockWorld as unknown as World);
		mockRigidBody.translation.mockReturnValue({ x: 0, y: 0 });

		expect(fruit.isOutOfBounds()).toBe(false);
		expect(fruit.startOutOfBounds).toBeNull();

		// Move out of bounds: y = -200 → top = -200 - 10 = -210 < -100
		mockRigidBody.translation.mockReturnValue({ x: 0, y: -200 });

		// First check: starts the timer
		expect(fruit.isOutOfBounds()).toBe(false);
		expect(fruit.startOutOfBounds).toBe(1000);

		// 500ms later: still within 1s grace
		now = 1500;
		expect(fruit.isOutOfBounds()).toBe(false);

		// 1001ms later: exceeds threshold
		now = 2001;
		expect(fruit.isOutOfBounds()).toBe(true);

		// Move back in bounds: timer resets
		mockRigidBody.translation.mockReturnValue({ x: 0, y: 0 });
		expect(fruit.isOutOfBounds()).toBe(false);
		expect(fruit.startOutOfBounds).toBeNull();
	});
	it('destroy removes collider and rigid body from the physics world', () => {
		const fruit = new Fruit(0, 0, 0, mockWorld as unknown as World);
		fruit.destroy();

		expect(mockWorld.removeCollider).toHaveBeenCalledWith(mockCollider, false);
		expect(mockWorld.removeRigidBody).toHaveBeenCalledWith(mockRigidBody);
	});
});
