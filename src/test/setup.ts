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

// Same shadowing happens with sessionStorage.
if (typeof window.sessionStorage.setItem !== 'function') {
  const store = new Map<string, string>();
  const sessionStorage: Storage = {
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
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: sessionStorage,
    writable: true,
    configurable: true,
  });
}

// jsdom does not implement Range.prototype.getClientRects. RemoteCursors and
// ReviewHighlights call it as a fallback when getBoundingClientRect is zero;
// without this stub the call throws and breaks any render that exercises them.
if (typeof Range.prototype.getClientRects !== 'function') {
  Range.prototype.getClientRects = function () {
    const list = [] as unknown as DOMRectList;
    (list as unknown as { length: number }).length = 0;
    return list;
  };
}

// In-process BroadcastChannel polyfill. Node's built-in BroadcastChannel only
// crosses Worker boundaries; jsdom doesn't expose one. Tests need cross-instance
// delivery within the same realm to verify the collab protocol.
{
  type Listener = (event: MessageEvent) => void;
  const registry = new Map<string, Set<MockBroadcastChannel>>();

  class MockBroadcastChannel extends EventTarget {
    readonly name: string;
    onmessage: Listener | null = null;
    private closed = false;

    constructor(name: string) {
      super();
      this.name = name;
      let set = registry.get(name);
      if (!set) {
        set = new Set();
        registry.set(name, set);
      }
      set.add(this);
    }

    postMessage(data: unknown): void {
      if (this.closed) return;
      const peers = registry.get(this.name);
      if (!peers) return;
      // Deliver asynchronously, excluding the sender, mirroring the real spec.
      queueMicrotask(() => {
        for (const peer of peers) {
          if (peer === this || peer.closed) continue;
          const event = new MessageEvent('message', { data });
          peer.dispatchEvent(event);
          peer.onmessage?.(event);
        }
      });
    }

    close(): void {
      if (this.closed) return;
      this.closed = true;
      registry.get(this.name)?.delete(this);
    }
  }

  Object.defineProperty(window, 'BroadcastChannel', {
    value: MockBroadcastChannel,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'BroadcastChannel', {
    value: MockBroadcastChannel,
    writable: true,
    configurable: true,
  });
}
