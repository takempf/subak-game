import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/svelte';
import GameHeader from '../GameHeader.svelte';

const { mockInstallPrompt } = vi.hoisted(() => ({
	mockInstallPrompt: {
		available: false,
		promptInstall: vi.fn()
	}
}));

vi.mock('../../stores/install.svelte.js', () => ({
	installPrompt: mockInstallPrompt
}));

beforeEach(() => {
	vi.clearAllMocks();
	mockInstallPrompt.available = false;
});

afterEach(() => {
	cleanup();
});

describe('GameHeader', () => {
	it('toggles sound when mute button is clicked', async () => {
		const toggleMute = vi.fn();
		const gameState = {
			audioManager: {
				isMuted: false,
				toggleMute
			}
		} as any;

		const { getByRole } = render(GameHeader, {
			props: { gameState }
		});

		const toggleBtn = getByRole('button', { name: 'Toggle Sound' });
		await fireEvent.click(toggleBtn);

		expect(toggleMute).toHaveBeenCalled();
	});

	it('pauses game and opens IntroductionModal on About click', async () => {
		const setStatus = vi.fn();
		const gameState = {
			status: 'playing',
			setStatus,
			audioManager: { isMuted: false }
		} as any;

		const { getByRole } = render(GameHeader, {
			props: { gameState }
		});

		const aboutBtn = getByRole('button', { name: 'About' });
		await fireEvent.click(aboutBtn);

		expect(setStatus).toHaveBeenCalledWith('paused');
	});

	it('renders install button and triggers install when available', async () => {
		mockInstallPrompt.available = true;
		mockInstallPrompt.promptInstall = vi.fn();

		const gameState = {
			audioManager: { isMuted: false }
		} as any;

		const { getByRole } = render(GameHeader, {
			props: { gameState }
		});

		const installBtn = getByRole('button', { name: '📲 Install App' });
		await fireEvent.click(installBtn);

		expect(mockInstallPrompt.promptInstall).toHaveBeenCalled();
	});
});
