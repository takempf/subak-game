class Connectivity {
	online: boolean = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);

	private onlineCallbacks = new Set<() => void>();

	constructor() {
		if (typeof window === 'undefined') return;
		window.addEventListener('online', (): void => {
			this.online = true;
			for (const callback of this.onlineCallbacks) {
				callback();
			}
		});
		window.addEventListener('offline', (): void => {
			this.online = false;
		});
	}

	// Registers a callback fired on each offline→online transition. Returns an unsubscribe.
	onOnline(callback: () => void): () => void {
		this.onlineCallbacks.add(callback);
		return (): void => {
			this.onlineCallbacks.delete(callback);
		};
	}
}

export const connectivity = new Connectivity();
