import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import { setupServer } from 'msw/node';
import '@testing-library/jest-dom/vitest';
import 'vitest-axe/extend-expect';

// Node 22+ exposes a global localStorage that stays undefined unless
// --localstorage-file is set, which hides jsdom's Storage from window.
const memory = new Map<string, string>();
const storage: Storage = {
  get length() {
    return memory.size;
  },
  clear() {
    memory.clear();
  },
  getItem(key) {
    return memory.get(key) ?? null;
  },
  key(index) {
    return [...memory.keys()][index] ?? null;
  },
  removeItem(key) {
    memory.delete(key);
  },
  setItem(key, value) {
    memory.set(key, String(value));
  },
};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
}

expect.extend(axeMatchers);

export const server = setupServer();
export { userEvent };

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  memory.clear();
  server.resetHandlers();
  cleanup();
});

afterAll(() => {
  server.close();
});
