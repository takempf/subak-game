import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioManager } from '../AudioManager.svelte';
import { Howler } from 'howler';

// ---------------------------------------------------------------------------
// Howler mock
//
// Design goals:
//   1. Each `new Howl()` returns a distinct spy object so per-sound state
//      (e.g. `_customCooldown`) never bleeds across sounds.
//   2. `onload` is stored synchronously and drained via `flushHowl()` so
//      there are no timer-based race conditions.
//   3. `resetHowl()` clears state between tests.
// ---------------------------------------------------------------------------
type MockHowlInstance = {
	play: ReturnType<typeof vi.fn>;
	volume: ReturnType<typeof vi.fn>;
	rate: ReturnType<typeof vi.fn>;
	_customCooldown?: number;
};

const createMockHowlInstance = (): MockHowlInstance => ({
	play: vi.fn().mockReturnValue(1),
	volume: vi.fn(),
	rate: vi.fn()
});

// Instances indexed by the order Howl is constructed — reset between tests
let howlInstances: MockHowlInstance[] = [];
let howlConstructionCount = 0;
const pendingOnloads: Array<() => void> = [];

vi.mock('howler', () => {
	const HowlMock = vi.fn((config: { onload?: () => void }) => {
		const instance = howlInstances[howlConstructionCount++];
		if (config.onload) pendingOnloads.push(config.onload);
		return instance;
	});

	const controls = HowlMock as typeof HowlMock & {
		_flush: () => void;
		_reset: () => void;
	};
	controls._flush = () => {
		while (pendingOnloads.length) pendingOnloads.shift()?.();
	};
	controls._reset = () => {
		pendingOnloads.length = 0;
	};

	const HowlerMock = {
		mute: vi.fn(),
		ctx: { state: 'running', resume: vi.fn() },
		_muted: false
	};

	return { Howl: HowlMock, Howler: HowlerMock };
});

type HowlWithControls = typeof import('howler').Howl & {
	_flush: () => void;
	_reset: () => void;
};

const flushHowl = async (): Promise<void> => {
	const { Howl } = await import('howler');
	(Howl as unknown as HowlWithControls)._flush();
};

const resetHowl = async (): Promise<void> => {
	const { Howl } = await import('howler');
	(Howl as unknown as HowlWithControls)._reset();
};

/** Helper: instance that was registered for a given constructor call index (0-based). */
const getInstance = (callIndex: number): MockHowlInstance => howlInstances[callIndex];

// Constructor loads: 0 = bump, 1 = pop (matching AudioManager constructor order)
const BUMP_IDX = 0;
const POP_IDX = 1;

describe('AudioManager', () => {
	const soundsPath = '/sounds';

	beforeEach(async () => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
		await resetHowl();

		// Reset tracked instances and provide fresh ones for this test
		howlConstructionCount = 0;
		howlInstances = [
			createMockHowlInstance(), // bump (index 0)
			createMockHowlInstance(), // pop  (index 1)
			createMockHowlInstance(), // spare for any extra loadSound() in the test
			createMockHowlInstance()
		];

		(Howler as unknown as { mute: ReturnType<typeof vi.fn> }).mute = vi.fn();
		(Howler as unknown as { ctx: { state: string; resume: ReturnType<typeof vi.fn> } }).ctx = {
			state: 'running',
			resume: vi.fn()
		};
		(Howler as unknown as { _muted: boolean })._muted = false;
	});

	// -------------------------------------------------------------------------
	// isAudioContextReady
	// -------------------------------------------------------------------------
	describe('isAudioContextReady', () => {
		it('returns true when Howler context is running', () => {
			const manager = new AudioManager({ soundsPath, poolSize: 1 });
			expect(manager.isAudioContextReady).toBe(true);
		});

		it('returns false when Howler context is suspended', () => {
			(Howler as unknown as { ctx: { state: string } }).ctx.state = 'suspended';
			const manager = new AudioManager({ soundsPath, poolSize: 1 });
			expect(manager.isAudioContextReady).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// loadSound
	// -------------------------------------------------------------------------
	describe('loadSound', () => {
		it('resolves once Howl fires onload', async () => {
			const manager = new AudioManager({ soundsPath, poolSize: 1 });
			const p = manager.loadSound('test', '/sounds/test.wav');
			await flushHowl();
			await expect(p).resolves.toBeUndefined();
		});

		it('skips creating a second Howl instance for an already-loaded name', async () => {
			const { Howl } = await import('howler');
			const manager = new AudioManager({ soundsPath, poolSize: 1 });
			await flushHowl();
			const countAfterConstructor = vi.mocked(Howl).mock.calls.length;
			await manager.loadSound('bump', '/sounds/bump.wav');
			expect(vi.mocked(Howl).mock.calls.length).toBe(countAfterConstructor);
		});

		it('stores a custom cooldown on the Howl instance when specified', async () => {
			const manager = new AudioManager({ soundsPath, poolSize: 1 });
			const p = manager.loadSound('sfx', '/sounds/sfx.wav', {}, 200);
			await flushHowl();
			await p;
			// 'sfx' is the 3rd sound loaded (index 2)
			expect(getInstance(2)._customCooldown).toBe(200);
		});
	});

	// -------------------------------------------------------------------------
	// playSound
	// -------------------------------------------------------------------------
	describe('playSound', () => {
		it('returns null for an unknown sound name', async () => {
			const manager = new AudioManager({ soundsPath, poolSize: 1 });
			await flushHowl();
			expect(manager.playSound('nonexistent')).toBeNull();
		});

		it('returns null when audio context is not ready', async () => {
			const manager = new AudioManager({ soundsPath, poolSize: 1 });
			await flushHowl();
			(Howler as unknown as { ctx: { state: string } }).ctx.state = 'suspended';
			expect(manager.playSound('pop')).toBeNull();
		});

		it('calls Howl.play() and returns a sound id', async () => {
			const manager = new AudioManager({ soundsPath, poolSize: 1 });
			await flushHowl();
			const id = manager.playSound('pop');
			expect(getInstance(POP_IDX).play).toHaveBeenCalled();
			expect(id).toBe(1);
		});

		it('applies volume and rate play options', async () => {
			const manager = new AudioManager({ soundsPath, poolSize: 1 });
			await flushHowl();
			manager.playSound('pop', { volume: 0.5, rate: 1.2 });
			expect(getInstance(POP_IDX).volume).toHaveBeenCalledWith(0.5, 1);
			expect(getInstance(POP_IDX).rate).toHaveBeenCalledWith(1.2, 1);
		});

		it('respects per-sound cooldowns', async () => {
			let now = 1000;
			vi.spyOn(window.performance, 'now').mockImplementation(() => now);

			const manager = new AudioManager({ soundsPath, poolSize: 1 });
			await flushHowl();

			// bump (index 0) has a 50ms cooldown set by the constructor
			manager.playSound('bump');
			expect(getInstance(BUMP_IDX).play).toHaveBeenCalledTimes(1);

			now = 1030; // within the 50ms window
			manager.playSound('bump');
			expect(getInstance(BUMP_IDX).play).toHaveBeenCalledTimes(1);

			now = 1060; // cooldown expired
			manager.playSound('bump');
			expect(getInstance(BUMP_IDX).play).toHaveBeenCalledTimes(2);
		});

		it('plays on consecutive calls when no cooldown is set', async () => {
			const manager = new AudioManager({ soundsPath, poolSize: 1 });
			await flushHowl();
			// pop has no cooldown — both calls must go through
			manager.playSound('pop');
			manager.playSound('pop');
			expect(getInstance(POP_IDX).play).toHaveBeenCalledTimes(2);
		});
	});

	// -------------------------------------------------------------------------
	// toggleMute
	// -------------------------------------------------------------------------
	describe('toggleMute', () => {
		it('mutes when currently unmuted', () => {
			const manager = new AudioManager({ soundsPath, poolSize: 1 });
			expect(manager.isMuted).toBe(false);
			manager.toggleMute();
			expect((Howler as unknown as { mute: ReturnType<typeof vi.fn> }).mute).toHaveBeenCalledWith(
				true
			);
			expect(manager.isMuted).toBe(true);
		});

		it('unmutes when currently muted', () => {
			(Howler as unknown as { _muted: boolean })._muted = true;
			const manager = new AudioManager({ soundsPath, poolSize: 1 });
			manager.toggleMute();
			expect((Howler as unknown as { mute: ReturnType<typeof vi.fn> }).mute).toHaveBeenCalledWith(
				false
			);
			expect(manager.isMuted).toBe(false);
		});

		it('toggles state correctly across multiple calls', () => {
			const manager = new AudioManager({ soundsPath, poolSize: 1 });
			manager.toggleMute();
			manager.toggleMute();
			expect(manager.isMuted).toBe(false);
		});
	});
});
