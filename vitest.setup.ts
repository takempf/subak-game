import { vi, beforeAll } from 'vitest';

beforeAll(() => {
  if (typeof window !== 'undefined' && !('matchMedia' in window)) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });
  }
  if (!HTMLElement.prototype.animate) {
    // minimal Web Animations API mock
    HTMLElement.prototype.animate = () => ({ finished: Promise.resolve(), cancel: () => {} });
  }
});

vi.mock('howler', () => {
  return {
    Howl: vi.fn(() => ({ play: vi.fn(), stop: vi.fn() })),
    Howler: { ctx: { state: 'running' }, _muted: false }
  };
});

vi.mock('svelte/motion', () => ({
  Tween: {
    of: (getter: () => number) => ({ current: getter() })
  }
}));
