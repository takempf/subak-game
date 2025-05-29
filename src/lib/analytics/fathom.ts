// Declare the Fathom object and its methods for TypeScript
declare global {
  interface Window {
    fathom?: {
      trackEvent: (eventName: string, opts?: { _value?: number }) => void;
      // Add other Fathom methods here if needed, e.g., trackPageview
    };
  }
}

/**
 * Tracks an event using Fathom Analytics.
 *
 * @param eventName The name of the event to track.
 *                 This should be a string that Fathom will recognize.
 * @param data Optional data object. If it contains a 'valueInCents' property,
 *             it will be passed to Fathom as '_value'.
 *             Fathom custom event values are typically passed in cents (integers).
 */
export function trackFathomEvent(eventName: string, data?: { valueInCents?: number }): void {
  if (typeof window.fathom === 'object' && typeof window.fathom.trackEvent === 'function') {
    if (data && typeof data.valueInCents === 'number') {
      window.fathom.trackEvent(eventName, { _value: data.valueInCents });
    } else {
      window.fathom.trackEvent(eventName);
    }
  } else {
    console.warn(
      `Fathom Analytics not found (window.fathom.trackEvent is not a function). Event "${eventName}" was not tracked.`
    );
    // Optionally, you could queue events here and try again later,
    // or provide more robust error handling/logging.
  }
}

/**
 * Helper function to create a more specific Fathom event tracker if needed,
 * especially if you have standard ways of deriving event names or values.
 * For example, prefixing all game events:
 */
export function trackGameEvent(gameEventName: string, details?: { valueInCents?: number }): void {
    // Example: You might want to prefix all game events
    const fathomEventName = `Game: ${gameEventName}`;
    trackFathomEvent(fathomEventName, details);
}
