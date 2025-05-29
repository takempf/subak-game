import { describe, it, expect, vi } from 'vitest';
import { on, off, dispatch, eventNames, GameEventName } from './eventManager';

describe('EventManager', () => {
  it('should register a listener and dispatch an event', () => {
    const mockListener = vi.fn();
    on(eventNames.GAME_START, mockListener);
    dispatch(eventNames.GAME_START, { data: 'test' });
    expect(mockListener).toHaveBeenCalledWith({ data: 'test' });
  });

  it('should allow multiple listeners for the same event', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    on(eventNames.SCORE_CHANGE, listener1);
    on(eventNames.SCORE_CHANGE, listener2);
    dispatch(eventNames.SCORE_CHANGE, 100);
    expect(listener1).toHaveBeenCalledWith(100);
    expect(listener2).toHaveBeenCalledWith(100);
  });

  it('should not call listeners for different events', () => {
    const gameStartListener = vi.fn();
    const fruitDropListener = vi.fn();
    on(eventNames.GAME_START, gameStartListener);
    on(eventNames.FRUIT_DROP, fruitDropListener);
    dispatch(eventNames.GAME_START, { data: 'test' });
    expect(gameStartListener).toHaveBeenCalledTimes(1);
    expect(fruitDropListener).not.toHaveBeenCalled();
  });

  it('should remove a listener correctly', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    on(eventNames.GAME_OVER, listener1);
    on(eventNames.GAME_OVER, listener2);
    off(eventNames.GAME_OVER, listener1);
    dispatch(eventNames.GAME_OVER, { score: 500 });
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledWith({ score: 500 });
  });

  it('should handle dispatching events with no listeners', () => {
    // No listeners registered for FRUIT_MERGE
    expect(() => dispatch(eventNames.FRUIT_MERGE, { fruitA: 'apple', fruitB: 'apple' })).not.toThrow();
  });

  it('should handle removing listeners that were never added', () => {
    const mockListener = vi.fn();
    expect(() => off(eventNames.GAME_START, mockListener)).not.toThrow();
  });
  
  it('should call listener with no data if none is provided', () => {
    const mockListener = vi.fn();
    on(eventNames.GAME_START, mockListener);
    dispatch(eventNames.GAME_START);
    expect(mockListener).toHaveBeenCalledWith(undefined);
  });

  it('should continue calling other listeners if one throws an error', () => {
    const errorListener = vi.fn(() => {
      throw new Error('Test error');
    });
    const healthyListener = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error output

    on(eventNames.SCORE_CHANGE, errorListener);
    on(eventNames.SCORE_CHANGE, healthyListener);

    dispatch(eventNames.SCORE_CHANGE, 200);

    expect(errorListener).toHaveBeenCalledTimes(1);
    expect(healthyListener).toHaveBeenCalledTimes(1);
    expect(healthyListener).toHaveBeenCalledWith(200);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore(); // Clean up spy
    // Clean up listeners for other tests
    off(eventNames.SCORE_CHANGE, errorListener);
    off(eventNames.SCORE_CHANGE, healthyListener);
  });
});
