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
export declare function useCursorPosition(): {
    ref: HTMLElement | null;
    x: number;
    y: number;
};
