/**
 * Tracks the mouse cursor's or primary touch point's position relative
 * to a target HTML element, optimizing by caching the element's
 * bounding rectangle.
 *
 * @returns An object containing:
 *   - `ref`: A property to bind to the target element (`bind:this={hook.ref}`).
 *   - `x`: A reactive state variable for the relative horizontal coordinate.
 *   - `y`: A reactive state variable for the relative vertical coordinate.
 *     (Coordinates are 0 if the element isn't set or interaction hasn't occurred).
 */
export function useCursorPosition(): {
	ref: HTMLElement | null;
	x: number;
	y: number;
} {
	let ref = $state<HTMLElement | null>(null);
	let x = $state<number>(0);
	let y = $state<number>(0);

	// Cache the element's bounding rectangle
	let cachedRect: DOMRect | null = $state(null);

	// Effect to manage all listeners and update cache
	$effect(() => {
		const element = ref; // Capture current value

		if (!element) {
			// Reset position and cache if element is removed or not yet set
			x = 0;
			y = 0;
			cachedRect = null;
			return; // No element, nothing to listen to
		}

		// --- Function to update the cached rectangle ---
		const updateRect = () => {
			cachedRect = element.getBoundingClientRect();
			// console.log("Updated Rect Cache:", cachedRect); // For debugging
		};

		// --- Initial cache update ---
		updateRect();

		// --- Shared Position Update Logic ---
		const updatePosition = (clientX: number, clientY: number) => {
			if (!cachedRect) {
				// Should ideally not happen if element exists, but safety check
				updateRect(); // Update if somehow null
				if (!cachedRect) return; // Still null? Bail.
			}
			// Calculate position relative to the element's cached top-left corner
			x = clientX - cachedRect.left;
			y = clientY - cachedRect.top;
		};

		// --- Mouse Move Handler ---
		const handleMouseMove = (event: MouseEvent) => {
			updatePosition(event.clientX, event.clientY);
		};

		// --- Touch Start Handler (updates position immediately on touch) ---
		const handleTouchStart = (event: TouchEvent) => {
			if (event.touches.length > 0) {
				const touch = event.touches[0];
				updatePosition(touch.clientX, touch.clientY);
			}
		};

		// --- Touch Move Handler ---
		const handleTouchMove = (event: TouchEvent) => {
			// Prevent default scroll/zoom behavior while tracking inside the element
			event.preventDefault();

			if (event.touches.length > 0) {
				const touch = event.touches[0];
				updatePosition(touch.clientX, touch.clientY);
			}
		};

		// --- Add Listeners ---
		element.addEventListener('mousemove', handleMouseMove);
		element.addEventListener('touchstart', handleTouchStart, {
			passive: false
		}); // Can be passive
		element.addEventListener('touchmove', handleTouchMove, { passive: false }); // Must be active to preventDefault

		// Listen to window scroll and resize to update the cached rect
		// Use { passive: true } for scroll/resize for better performance
		window.addEventListener('scroll', updateRect, { passive: true });
		window.addEventListener('resize', updateRect, { passive: true });

		// --- Cleanup Function ---
		return () => {
			// console.log("Cleaning up listeners for:", element); // For debugging
			element.removeEventListener('mousemove', handleMouseMove);
			element.removeEventListener('touchstart', handleTouchStart);
			element.removeEventListener('touchmove', handleTouchMove);
			window.removeEventListener('scroll', updateRect);
			window.removeEventListener('resize', updateRect);
			// Reset cache on cleanup as well
			cachedRect = null;
		};
	}); // Dependencies: ref

	// Return reactive getters and a setter for the ref
	return {
		get ref() {
			return ref;
		},
		set ref(el: HTMLElement | null) {
			ref = el;
		},
		get x() {
			return x;
		},
		get y() {
			return y;
		}
	};
}
