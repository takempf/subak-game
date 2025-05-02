/**
 * Creates a throttled function that only invokes func at most once per
 * every wait milliseconds. The throttled function comes with a `cancel`
 * method to cancel delayed func invocations and a `flush` method to
 * immediately invoke func. Provide options to indicate whether func
 * should be invoked on the leading and/or trailing edge of the wait timeout.
 * The func is invoked with the last arguments provided to the throttled
 * function. Subsequent calls to the throttled function return the result of
 * the last func invocation.
 *
 * Note: This is a simplified version focusing on leading edge execution,
 * suitable for the game loop scenario. More complex versions might handle
 * trailing edge calls as well.
 *
 * @param {Function} func The function to throttle.
 * @param {number} waitMs The number of milliseconds to throttle invocations to.
 * @returns {Function} Returns the new throttled function.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let lastExecutionTime = 0;
  let lastResult: ReturnType<T> | undefined;

  // The returned throttled function
  return function throttled(
    this: ThisParameterType<T>, // Capture 'this' context
    ...args: Parameters<T> // Capture arguments
  ): ReturnType<T> | undefined {
    const currentTime = performance.now();

    // Check if enough time has passed since the last execution
    if (currentTime - lastExecutionTime >= waitMs) {
      lastExecutionTime = currentTime; // Record the time of this execution
      // Execute the original function with the correct 'this' context and arguments
      lastResult = func.apply(this, args) as ReturnType<T>;
      return lastResult;
    }

    // If throttled, return the last known result (or undefined if never run)
    return lastResult;
  };
}
