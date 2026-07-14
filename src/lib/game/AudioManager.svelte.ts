// AudioManager.ts
import { Howl, Howler } from 'howler';

// Optional configuration for loading sounds
interface SoundConfig {
	volume?: number;
	loop?: boolean;
	preload?: boolean;
}

// Optional configuration for playing sounds
interface PlayOptions {
	volume?: number; // Override the default volume for this playback
	rate?: number; // Playback rate (affects pitch)
	// Add other Howler play options if needed
}

interface AudioManagerProps {
	soundsPath?: string;
	poolSize?: number;
}

export class AudioManager {
	private soundPools: Record<string, Howl[]> = {};
	private poolIndices: Record<string, number> = {};
	private soundCooldowns: Record<string, number> = {}; // Tracks last play time
	private poolSize: number;
	isMuted: boolean = $state((Howler as unknown as { _muted: boolean })?._muted ?? false);

	get isAudioContextReady() {
		return Howler.ctx?.state === 'running';
	}

	constructor({ soundsPath, poolSize = 6 }: AudioManagerProps) {
		this.poolSize = poolSize;
		this.loadSound(
			'bump',
			`${soundsPath}/bump.wav`,
			{ volume: 0.8, preload: true },
			50 // Specific cooldown for bump sound (50ms)
		);

		this.loadSound('pop', `${soundsPath}/pop.wav`, {
			volume: 0.8,
			preload: true
		});

		// Attempt to resume audio context if it was previously suspended
		// This might help in some scenarios but isn't a guaranteed fix for autoplay
		if (Howler.ctx && Howler.ctx.state === 'suspended') {
			Howler.ctx.resume();
		}
	}

	/**
	 * Loads a sound effect.
	 * @param name - A unique identifier for the sound.
	 * @param path - The path to the sound file.
	 * @param config - Optional configuration (volume, loop, preload).
	 * @param specificCooldownMs - Optional cooldown override for this sound.
	 */
	public loadSound(
		name: string,
		path: string,
		config?: SoundConfig,
		specificCooldownMs?: number
	): Promise<void> {
		if (this.soundPools[name]) {
			console.warn(`Sound "${name}" already loaded.`);
			return Promise.resolve();
		}

		this.soundPools[name] = [];
		this.poolIndices[name] = 0;
		this.soundCooldowns[name] = 0;

		const promises = Array.from({ length: this.poolSize }).map((_, i) => {
			return new Promise<void>((resolve, reject) => {
				const sound = new Howl({
					src: [path],
					volume: config?.volume ?? 1.0,
					loop: config?.loop ?? false,
					preload: config?.preload ?? true,
					onload: () => {
						this.soundPools[name].push(sound);
						// Store specific cooldown if provided
						if (specificCooldownMs !== undefined) {
							(sound as typeof sound & { _customCooldown?: number })._customCooldown =
								specificCooldownMs;
						}
						resolve();
					},
					onloaderror: (_id, error) => {
						console.error(`Failed to load sound "${name}" instance ${i} from ${path}:`, error);
						reject(error);
					}
				});
			});
		});

		return Promise.all(promises).then(() => {});
	}

	/**
	 * Plays a loaded sound effect by its name, respecting cooldowns.
	 * @param name - The name of the sound to play.
	 * @param options - Optional playback overrides (volume, rate).
	 * @returns The sound ID if played, or null if on cooldown or not found/ready.
	 */
	public playSound(name: string, options?: PlayOptions): number | null {
		const pool = this.soundPools[name];

		if (!pool || pool.length === 0) {
			console.warn(`Sound "${name}" not found or not loaded yet.`);
			return null;
		}

		// Although Howler handles context unlocking, we double-check for safety.
		// The first play *must* happen after user interaction for browsers.
		if (!this.isAudioContextReady) {
			console.warn(
				`Cannot play sound "${name}" - Audio Context not ready.` +
					` Ensure initializeAudioContext() or the first playSound()` +
					` call happens after user interaction.`
			);
			// Attempt to resume context - might work if interaction happened recently
			Howler.ctx?.resume();
			return null;
		}

		const now = performance.now();
		const lastPlayTime = this.soundCooldowns[name] ?? 0;
		const firstSound = pool[0];
		const cooldown = (firstSound as typeof firstSound & { _customCooldown?: number })
			._customCooldown;

		if (typeof cooldown === 'undefined' || now - lastPlayTime > cooldown) {
			try {
				const index = this.poolIndices[name];
				const sound = pool[index];
				this.poolIndices[name] = (index + 1) % pool.length;

				const soundId = sound.play();

				// Apply options if provided
				if (options) {
					if (options.volume !== undefined) {
						sound.volume(options.volume, soundId);
					}
					if (options.rate !== undefined) {
						sound.rate(options.rate, soundId);
					}
				}

				this.soundCooldowns[name] = now; // Update last play time
				return soundId;
			} catch (error) {
				console.error(`Error playing sound "${name}":`, error);
				return null;
			}
		} else {
			// Sound is on cooldown
			return null;
		}
	}

	public toggleMute(): void {
		const newIsMuted = !this.isMuted;
		Howler.mute(newIsMuted);
		this.isMuted = newIsMuted;
	}
}
