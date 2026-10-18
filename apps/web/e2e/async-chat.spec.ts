import { expect, test } from '@playwright/test';

test('submits, polls, and renders an asynchronous chat turn', async ({ page }) => {
  const jobId = 'chatjob-e2e';
  let requestHeaders: Record<string, string> = {};
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({ json: { transcript: [], slotState: {}, version: 0, phase: 'profile' } });
  });
  await page.route('**/api/v1/chat/turns', async (route) => {
    requestHeaders = route.request().headers();
    await route.fulfill({ status: 202, json: { jobId, status: 'queued', statusUrl: `/api/v1/chat/turns/${jobId}`, pollAfterMs: 10 } });
  });
  await page.route(`**/api/v1/chat/turns/${jobId}`, async (route) => {
    await route.fulfill({ json: { jobId, status: 'succeeded', sessionVersion: 1, result: {
      intent: 'ask_slot', reply: 'Respuesta async', pendingSlot: 'greeting', slotUpdates: [],
      chips: [], phase: 'profile', source: 'fallback',
    } } });
  });
  await page.goto('/chat');
  const input = page.getByRole('textbox', { name: 'Escribe tu respuesta' });
  await input.fill('hola');
  await input.press('Enter');
  await expect(page.getByText('Respuesta async')).toBeVisible();
  expect(requestHeaders['idempotency-key']).toBeTruthy();
  expect(requestHeaders['x-request-id']).toBeTruthy();
});

test('offers retry after a retryable async failure', async ({ page }) => {
  let attempts = 0;
  const requestIds: string[] = [];
  const idempotencyKeys: string[] = [];
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({ json: { transcript: [], slotState: {}, version: 0, phase: 'profile' } });
  });
  await page.route('**/api/v1/chat/turns', async (route) => {
    attempts += 1;
    requestIds.push(route.request().headers()['x-request-id'] ?? '');
    idempotencyKeys.push(route.request().headers()['idempotency-key'] ?? '');
    if (attempts === 1) {
      await route.fulfill({ status: 503, json: { error: { retryable: true, message: 'temporary failure' } } });
      return;
    }
    await route.fulfill({ status: 202, json: { jobId: 'retry-job', status: 'queued', pollAfterMs: 10 } });
  });
  await page.route('**/api/v1/chat/turns/retry-job', async (route) => {
    await route.fulfill({ json: { status: 'succeeded', sessionVersion: 1, result: {
      intent: 'ask_slot', reply: 'Respuesta reintentada', pendingSlot: 'greeting', slotUpdates: [], chips: [], phase: 'profile', source: 'fallback',
    } } });
  });
  await page.goto('/chat');
  const input = page.getByRole('textbox', { name: 'Escribe tu respuesta' });
  await input.fill('hola');
  await input.press('Enter');
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByText('Respuesta reintentada')).toBeVisible();
  expect(attempts).toBe(2);
  expect(requestIds[0]).toBeTruthy();
  expect(idempotencyKeys[0]).toBeTruthy();
  expect(requestIds[1]).toBeTruthy();
  expect(idempotencyKeys[1]).toBeTruthy();
  expect(requestIds[1]).not.toBe(requestIds[0]);
  expect(idempotencyKeys[1]).not.toBe(idempotencyKeys[0]);
});
