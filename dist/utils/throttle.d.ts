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
export declare function throttle<T extends (...args: unknown[]) => unknown>(func: T, waitMs: number): (...args: Parameters<T>) => ReturnType<T> | undefined;
