interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
	interface WindowEventMap {
		beforeinstallprompt: BeforeInstallPromptEvent;
	}
}

class InstallPrompt {
	available: boolean = $state(false);
	private deferred: BeforeInstallPromptEvent | null = null;

	constructor() {
		if (typeof window === 'undefined') return;

		window.addEventListener('beforeinstallprompt', (e: BeforeInstallPromptEvent): void => {
			e.preventDefault(); // suppress the default mini-infobar
			this.deferred = e;
			this.available = true;
		});

		window.addEventListener('appinstalled', (): void => {
			this.available = false;
			this.deferred = null;
		});
	}

	async promptInstall(): Promise<void> {
		// Capture the event locally before awaiting: the `appinstalled` handler can null
		// this.deferred across the awaits, and a deferred prompt can only be used once, so
		// consume it (hide the button) up front regardless of how the prompt resolves.
		const deferred = this.deferred;
		if (!deferred) return;
		this.deferred = null;
		this.available = false;

		try {
			await deferred.prompt();
			await deferred.userChoice;
		} catch (err) {
			console.error('Install prompt failed', err);
		}
	}
}

export const installPrompt = new InstallPrompt();
