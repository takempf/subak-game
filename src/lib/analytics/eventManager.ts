export type EventListener = (data?: any) => void;

interface EventListeners {
  [eventName: string]: EventListener[];
}

const listeners: EventListeners = {};

export const eventNames = {
  GAME_START: 'GAME_START',
  FRUIT_DROP: 'FRUIT_DROP',
  FRUIT_MERGE: 'FRUIT_MERGE',
  SCORE_CHANGE: 'SCORE_CHANGE',
  GAME_OVER: 'GAME_OVER',
} as const;

export type GameEventName = typeof eventNames[keyof typeof eventNames];

/**
 * Registers a listener for a specific event.
 * @param eventName The name of the event to listen for.
 * @param listener The callback function to execute when the event is dispatched.
 */
export function on(eventName: GameEventName, listener: EventListener): void {
  if (!listeners[eventName]) {
    listeners[eventName] = [];
  }
  listeners[eventName].push(listener);
}

/**
 * Removes a listener for a specific event.
 * @param eventName The name of the event.
 * @param listenerToRemove The listener function to remove.
 */
export function off(eventName: GameEventName, listenerToRemove: EventListener): void {
  if (!listeners[eventName]) {
    return;
  }
  listeners[eventName] = listeners[eventName].filter(
    (listener) => listener !== listenerToRemove
  );
}

/**
 * Dispatches an event, calling all registered listeners for that event.
 * @param eventName The name of the event to dispatch.
 * @param data Optional data to pass to the listeners.
 */
export function dispatch(eventName: GameEventName, data?: any): void {
  if (!listeners[eventName]) {
    return;
  }
  listeners[eventName].forEach((listener) => {
    try {
      listener(data);
    } catch (error) {
      console.error(`Error in event listener for ${eventName}:`, error);
    }
  });
}
