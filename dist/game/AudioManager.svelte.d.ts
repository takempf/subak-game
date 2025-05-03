interface SoundConfig {
    volume?: number;
    loop?: boolean;
    preload?: boolean;
}
interface PlayOptions {
    volume?: number;
    rate?: number;
}
interface AudioManagerProps {
    soundsPath?: string;
}
export declare class AudioManager {
    private sounds;
    private soundCooldowns;
    isMuted: boolean;
    get isAudioContextReady(): boolean;
    constructor({ soundsPath }: AudioManagerProps);
    /**
     * Loads a sound effect.
     * @param name - A unique identifier for the sound.
     * @param path - The path to the sound file.
     * @param config - Optional configuration (volume, loop, preload).
     * @param specificCooldownMs - Optional cooldown override for this sound.
     */
    loadSound(name: string, path: string, config?: SoundConfig, specificCooldownMs?: number): Promise<void>;
    /**
     * Plays a loaded sound effect by its name, respecting cooldowns.
     * @param name - The name of the sound to play.
     * @param options - Optional playback overrides (volume, rate).
     * @returns The sound ID if played, or null if on cooldown or not found/ready.
     */
    playSound(name: string, options?: PlayOptions): number | null;
    playSoundWithPitchVariation(name: string, minRate?: number, maxRate?: number, baseVolume?: number): number | null;
    toggleMute(): void;
}
export {};
