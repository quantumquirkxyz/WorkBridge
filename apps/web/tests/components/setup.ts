import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import { setupServer } from 'msw/node';
import '@testing-library/jest-dom/vitest';
import 'vitest-axe/extend-expect';

expect.extend(axeMatchers);

export const server = setupServer();
export { userEvent };

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  cleanup();
});

afterAll(() => {
  server.close();
});
