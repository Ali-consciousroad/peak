import { test, expect } from '@playwright/test';

test.describe.skip('SIWE flow (mocked wallet)', () => {
  test('connect -> sign -> protected OK -> disconnect -> blocked', async ({ request }) => {
    // This test is a placeholder. To enable, run the app and mock wallet/signature in the UI.
    // Here we only exercise API as smoke checks when server runs.
    const nonce = await request.get('/api/siwe/nonce');
    expect(nonce.ok()).toBeTruthy();
  });
});


