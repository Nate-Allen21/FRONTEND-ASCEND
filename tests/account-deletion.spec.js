import { test, expect } from '@playwright/test';

async function signedIn(page) {
  await page.addInitScript(() => {
    localStorage.setItem('ascend.auth.token.2026-04-27-reset-1', 'synthetic-session');
    localStorage.setItem('ascend.routine.profile.2026-04-27-reset-1.41', 'synthetic-user-data');
    localStorage.setItem('ascend.api.baseUrl', location.origin + '/api');
  });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/health')) return route.fulfill({ json: { status: 'UP', application: 'ascend-api' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 41, name: 'Conta sintética', email: 'synthetic@example.invalid', avatar: 'male', onboardingCompleted: true } });
    if (path.endsWith('/profile')) return route.fulfill({ json: { id: 41, name: 'Conta sintética', username: 'synthetic-41', posts: [], tags: [], equippedCosmetics: [] } });
    if (path.endsWith('/player/status')) return route.fulfill({ json: { name: 'Conta sintética', handle: '@synthetic', level: 1, rank: 'E', experience: 0, nextLevelExperience: 1000, streakDays: 0, coins: 0, stats: [], dailyMissions: [], completedMissionIds: [] } });
    if (route.request().method() === 'DELETE' && path.endsWith('/users/me')) return route.fulfill({ status: 204, body: '' });
    return route.fulfill({ json: {} });
  });
  await page.goto('/');
  await expect(page.locator('#app-shell')).toBeVisible();
  await page.locator('#app-sidebar .sidebar-link[data-view=profile]').click();
  await expect(page.locator('#account-delete-open')).toBeVisible();
}

test('account deletion requires all four steps and clears local account data only after server success', async ({ page }) => {
  await signedIn(page);
  await page.locator('#account-delete-open').click();
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = page.locator('#account-delete-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Cópias de segurança');
  await page.locator('#account-delete-next').click();
  await expect(page.locator('[data-delete-step="2"]')).toBeVisible();
  await page.locator('#account-delete-next').click();
  await expect(page.locator('[data-delete-step="3"]')).toBeVisible();
  await page.locator('#account-delete-password').fill('SyntheticPassword123!');
  await page.locator('#account-delete-next').click();
  await expect(page.locator('[data-delete-step="4"]')).toBeVisible();
  const submit = page.waitForRequest((request) => request.url().endsWith('/users/me') && request.method() === 'DELETE');
  await expect(page.locator('#account-delete-confirm')).toBeDisabled();
  await page.locator('#account-delete-phrase').fill('EXCLUIR MINHA CONTA');
  await page.locator('#account-delete-ack').check();
  await expect(page.locator('#account-delete-confirm')).toBeEnabled();
  await page.locator('#account-delete-confirm').click();
  expect((await submit).postDataJSON()).toMatchObject({ password: 'SyntheticPassword123!', confirmation: 'EXCLUIR MINHA CONTA', acknowledged: true });
  await expect(page.locator('#auth-message')).toHaveText('Sua conta ASCEND foi excluída. Obrigado por ter feito parte da nossa jornada.');
  expect(await page.evaluate(() => localStorage.getItem('ascend.auth.token.2026-04-27-reset-1'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('ascend.routine.profile.2026-04-27-reset-1.41'))).toBeNull();
});

test('deletion failure leaves the session and user data intact', async ({ page }) => {
  await signedIn(page);
  await page.route('**/api/users/me', (route) => route.fulfill({ status: 401, json: { message: 'Senha incorreta.' } }));
  await page.locator('#account-delete-open').click();
  for (let step = 1; step < 4; step++) {
    if (step === 3) await page.locator('#account-delete-password').fill('wrong');
    await page.locator('#account-delete-next').click();
  }
  await page.locator('#account-delete-phrase').fill('EXCLUIR MINHA CONTA');
  await page.locator('#account-delete-ack').check();
  await page.locator('#account-delete-confirm').click();
  await expect(page.locator('#account-delete-feedback')).toHaveText('Senha incorreta.');
  expect(await page.evaluate(() => localStorage.getItem('ascend.auth.token.2026-04-27-reset-1'))).toBe('synthetic-session');
  expect(await page.evaluate(() => localStorage.getItem('ascend.routine.profile.2026-04-27-reset-1.41'))).toBe('synthetic-user-data');
});
