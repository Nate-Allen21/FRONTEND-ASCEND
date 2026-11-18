import { test, expect } from '@playwright/test';

const api = process.env.CONNECT_E2E_API;
test.skip(!api, 'Defina CONNECT_E2E_API para executar com um backend de teste isolado.');

test('duas contas trocam mensagens, recuperam conexão e usam o layout móvel', async ({ browser, request }) => {
  test.setTimeout(90000);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  async function register(name, email) {
    const response = await request.post(`${api}/auth/register`, { data: { name, email, password: 'Password123!' } });
    expect(response.ok()).toBeTruthy();
    const user = await response.json();
    expect((await request.put(`${api}/auth/avatar`, { headers: { Authorization: `Bearer ${user.token}` }, data: { avatar: 'male' } })).ok()).toBeTruthy();
    return user;
  }
  const alice = await register('Alice Connect', `alice-${suffix}@example.com`);
  const bob = await register('Bruno Connect', `bruno-${suffix}@example.com`);
  async function openUser(user, viewport) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(({ token, url }) => {
      localStorage.setItem('ascend.auth.token.2026-04-27-reset-1', token);
      localStorage.setItem('ascend.api.baseUrl', url);
    }, { token: user.token, url: api });
    const page = await context.newPage();
    await page.goto(`/?apiBase=${encodeURIComponent(api)}`);
    await expect(page.locator('#app-shell')).toBeVisible();
    return { page, context };
  }
  const a = await openUser(alice, { width: 1440, height: 900 });
  const b = await openUser(bob, { width: 390, height: 844 });
  try {
    await a.page.bringToFront();
    await a.page.locator('#connect-navbar').click();
    await a.page.locator('#connect-search').fill(`@bruno-connect-${bob.user.id}`);
    await a.page.locator('#connect-search-results button').click();
    await expect(a.page.locator('#connect-recipient')).toHaveText('Bruno Connect');
    await expect(a.page.locator('#connect-details')).toContainText('Bruno Connect');
    await a.page.locator('#connect-input').fill('Olá, Bruno!');
    await a.page.locator('#connect-form button').click();
    await expect(a.page.locator('#connect-messages')).toContainText('Olá, Bruno!');
    await a.page.locator('#app-sidebar [data-view="status"]').click();

    await b.page.bringToFront();
    await b.page.locator('#connect-navbar').click();
    await expect(b.page.locator('#connect-list')).toContainText('Alice Connect', { timeout: 15000 });
    await expect(b.page.locator('#connect-list .connect-meta b')).toHaveText('1');
    await b.page.locator('#connect-list button').click();
    await expect(b.page.locator('#connect-messages')).toContainText('Olá, Bruno!');
    await expect(b.page.locator('#connect-back')).toBeVisible();
    expect(await b.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await b.page.locator('#connect-input').fill('Vamos evoluir!');
    await b.page.locator('#connect-form button').click();
    await expect(b.page.locator('#connect-messages')).toContainText('Vamos evoluir!');

    await a.page.bringToFront();
    await expect(a.page.locator('#connect-toast')).toContainText('Bruno Connect', { timeout: 15000 });
    await expect(a.page.locator('#connect-navbar-unread')).toHaveText('1');
    await a.page.locator('#connect-toast').click();
    await expect(a.page.locator('#connect-messages')).toContainText('Vamos evoluir!', { timeout: 15000 });
    await expect(a.page.locator('#connect-messages')).toContainText('Lida');
    await a.page.locator('#connect-notifications').uncheck();
    expect(await a.page.evaluate((id) => localStorage.getItem(`ascend.connect.notifications.${id}`), alice.user.id)).toBe('off');
    await a.page.reload();
    await a.page.locator('#connect-navbar').click();
    await a.page.locator('#connect-list button').click();
    await expect(a.page.locator('#connect-messages')).toContainText('Vamos evoluir!');

    await a.page.route('**/api/connect/**', route => route.abort());
    await expect(a.page.locator('#connect-status')).toContainText('Tentando reconectar', { timeout: 15000 });
    await a.page.unroute('**/api/connect/**');
    await expect(a.page.locator('#connect-status')).toHaveText('', { timeout: 15000 });
    await a.page.locator('#btn-theme-toggle').click();
    await expect(a.page.locator('body')).toHaveAttribute('data-theme', 'light');
    await expect(a.page.locator('#connect-messages')).toContainText('Vamos evoluir!');
  } finally {
    await a.context.close();
    await b.context.close();
  }
});
