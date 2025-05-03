// AudioManager.ts
import { Howl, Howler } from 'howler';
export class AudioManager {
    sounds = {};
    soundCooldowns = {}; // Tracks last play time
    isMuted = $state(Howler?._muted);
    get isAudioContextReady() {
        return Howler.ctx?.state === 'running';
    }
    constructor({ soundsPath }) {
        this.loadSound('bump', `${soundsPath}/bump.wav`, { volume: 0.8, preload: true }, 50 // Specific cooldown for bump sound (50ms)
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
    loadSound(name, path, config, specificCooldownMs) {
        return new Promise((resolve, reject) => {
            if (this.sounds[name]) {
                console.warn(`Sound "${name}" already loaded.`);
                resolve();
                return;
            }
            const sound = new Howl({
                src: [path],
                volume: config?.volume ?? 1.0,
                loop: config?.loop ?? false,
                preload: config?.preload ?? true,
                onload: () => {
                    console.log(`Sound "${name}" loaded successfully from ${path}`);
                    this.sounds[name] = sound;
                    // Initialize cooldown tracking for this sound
                    this.soundCooldowns[name] = 0;
                    // Store specific cooldown if provided
                    if (specificCooldownMs !== undefined) {
                        // Use a convention, e.g., store cooldown on the Howl object
                        // (be mindful this isn't a standard Howler property)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        sound._customCooldown = specificCooldownMs;
                    }
                    resolve();
                },
                onloaderror: (id, error) => {
                    console.error(`Failed to load sound "${name}" from ${path}:`, error);
                    reject(error);
                }
            });
        });
    }
    /**
     * Plays a loaded sound effect by its name, respecting cooldowns.
     * @param name - The name of the sound to play.
     * @param options - Optional playback overrides (volume, rate).
     * @returns The sound ID if played, or null if on cooldown or not found/ready.
     */
    playSound(name, options) {
        const sound = this.sounds[name];
        if (!sound) {
            console.warn(`Sound "${name}" not found or not loaded yet.`);
            return null;
        }
        // Although Howler handles context unlocking, we double-check for safety.
        // The first play *must* happen after user interaction for browsers.
        if (!this.isAudioContextReady) {
            console.warn(`Cannot play sound "${name}" - Audio Context not ready.` +
                ` Ensure initializeAudioContext() or the first playSound()` +
                ` call happens after user interaction.`);
            // Attempt to resume context - might work if interaction happened recently
            Howler.ctx?.resume();
            return null;
        }
        const now = performance.now();
        const lastPlayTime = this.soundCooldowns[name] ?? 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cooldown = sound._customCooldown;
        if (typeof cooldown === 'undefined' || now - lastPlayTime > cooldown) {
            try {
                const soundId = sound.play();
                // Apply options if provided
                if (options) {
                    if (options.volume !== undefined) {
                        sound.volume(options.volume, soundId);
                    }
                    if (options.rate !== undefined) {
                        sound.rate(options.rate, soundId);
                    }
                    // Reset to default volume/rate after play if needed, or manage instances
                }
                this.soundCooldowns[name] = now; // Update last play time
                return soundId;
            }
            catch (error) {
                console.error(`Error playing sound "${name}":`, error);
                return null;
            }
        }
        else {
            // Sound is on cooldown
            return null;
        }
    }
    // Optional: Method to apply pitch variation easily
    playSoundWithPitchVariation(name, minRate = 0.9, maxRate = 1.1, baseVolume) {
        const rate = minRate + Math.random() * (maxRate - minRate);
        return this.playSound(name, { rate: rate, volume: baseVolume });
    }
    toggleMute() {
        const newIsMuted = !this.isMuted;
        Howler.mute(newIsMuted);
        this.isMuted = newIsMuted;
    }
}
