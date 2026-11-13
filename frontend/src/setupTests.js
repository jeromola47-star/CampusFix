import '@testing-library/jest-dom/vitest';

// Newer Node versions ship their own incomplete global localStorage that hides the one from jsdom.
// Replace it with a simple in-memory version so the tests behave the same on every machine.
const makeStorage = () => {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  };
};

const storage = makeStorage();
for (const target of [globalThis, typeof window !== 'undefined' ? window : null]) {
  if (!target) continue;
  try {
    Object.defineProperty(target, 'localStorage', { value: storage, configurable: true, writable: true });
  } catch (e) {
    // ignore: the other target is enough
  }
}
