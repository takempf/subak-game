<script lang="ts">
	import { quadOut } from 'svelte/easing';
	import { fade, scale } from 'svelte/transition';
	import { onDestroy } from 'svelte';

	// --- Props ---
	// `open`: Controls the visibility of the modal (bindable)
	// `onClose`: Callback function triggered when the modal requests to be closed
	// `children`: Slot content for the modal body
	let { open = false, onClose = () => {}, children } = $props();

	// --- Effects ---
	// Effect to handle the ESC key press for closing the modal
	$effect(() => {
		// Only add listener if the modal is open
		if (!open) return;

		const handleKeydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				requestClose();
			}
		};

		// Add listener when modal opens
		window.addEventListener('keydown', handleKeydown);

		// Cleanup listener when the modal closes or component unmounts
		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});

	// --- Functions ---
	// Function to request closing the modal (used by button and backdrop)
	function requestClose() {
		// Call the provided callback; the parent component is responsible
		// for actually changing the `open` prop to false.
		onClose();
	}
</script>

<!-- Render the modal structure only when `open` is true -->
{#if open}
	<!-- 
    Modal Wrapper: Handles positioning (absolute) and centering.
    It sits above the backdrop.
  -->
	<div class="modal-wrapper" aria-modal="true" role="dialog">
		<!-- 
      Custom Backdrop: Sits behind the modal content but within the wrapper.
      Handles click-outside-to-close.
    -->
		<div
			class="custom-backdrop"
			onclick={requestClose}
			aria-hidden="true"
			in:fade={{ easing: quadOut, duration: 250 }}
			out:fade={{ easing: quadOut, duration: 250, delay: 100 }}>
		</div>

		<!-- 
      Modal Body: Contains the actual content and transitions.
      Sits visually on top of the backdrop.
      Needs `pointer-events: auto` to be interactive.
    -->
		<div
			class="modal-body"
			in:scale={{ easing: quadOut, duration: 400, delay: 100, start: 0.9 }}
			out:scale={{ easing: quadOut, duration: 400, start: 0.9 }}>
			<div class="modal-content">
				<!-- Close Button -->
				<button class="close-button" onclick={requestClose} aria-label="Close dialog">
					&times; <!-- Multiplication sign often used for 'close' -->
				</button>

				<!-- Slot for user content -->
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-wrapper {
		position: absolute; /* Cover the viewport */
		inset: 0;
		z-index: 1000; /* High z-index to be on top */
		display: flex; /* Use flexbox for centering */
		align-items: center;
		justify-content: center;
		/* Add padding to prevent modal touching edges */
		padding: 2em;
		/* Allow clicks to pass through the wrapper to the backdrop */
		pointer-events: none;
	}

	.custom-backdrop {
		position: absolute; /* Position relative to the wrapper */
		inset: 0; /* Cover the entire wrapper */
		background-color: var(--color-background); /* Or your backdrop color */
		opacity: 0.9;
		backdrop-filter: blur(10px);
		z-index: 1; /* Behind the modal body */
		pointer-events: auto; /* Make backdrop clickable */
	}

	.modal-body {
		/* Reset pointer events to make the modal interactive */
		pointer-events: auto;
		position: relative; /* Position relative to the wrapper, above backdrop */
		z-index: 2; /* Above the backdrop */

		/* Visual Styling */
		background: var(--color-background-light);
		color: var(--color-text);
		border-radius: 8px;
		box-shadow: hsla(0, 0%, 0%, 0.2) 0 2px 2px;

		/* Sizing and Scrolling */
		max-width: 100%; /* Respect wrapper padding */
		max-height: 100%; /* Respect wrapper padding */
		overflow: auto; /* Allow scrolling if content exceeds size */
	}

	.modal-content {
		padding: 1.5em; /* Internal padding for content */
		position: relative; /* Needed for absolute positioning of close button */
	}

	.close-button {
		position: absolute;
		top: 0.5em;
		right: 0.5em;
		background: none;
		border: none;
		font-size: 1.8em;
		line-height: 1;
		cursor: pointer;
		padding: 0.2em;
		color: #666;
		transition: color 0.2s;
		z-index: 3; /* Ensure button is clickable */
	}

	.close-button:hover {
		color: #000;
	}
</style>
