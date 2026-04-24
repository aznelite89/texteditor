import '@testing-library/jest-dom/vitest';

// Node 25 ships an experimental global `localStorage` that shadows jsdom's
// Storage. When not started with --localstorage-file, it's a non-functional
// empty object. Install a simple in-memory polyfill for tests so code that
// calls setItem/getItem/removeItem/clear behaves as expected.
if (typeof window.localStorage.setItem !== 'function') {
  const makeStorage = (): Storage => {
    const store = new Map<string, string>();
    return {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
    };
  };
  Object.defineProperty(window, 'localStorage', {
    value: makeStorage(),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: window.localStorage,
    writable: true,
    configurable: true,
  });
}
