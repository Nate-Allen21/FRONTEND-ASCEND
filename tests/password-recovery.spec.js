import { test, expect } from '@playwright/test';

const token = 'a'.repeat(43);
const resetPath = '/recuperar.html?redefinir#' + token;

for (const viewport of [{ width: 1280, height: 800 }, { width: 360, height: 760 }]) {
  test.describe(`recuperação em ${viewport.width}px`, () => {
    test.use({ viewport, reducedMotion: 'reduce' });

    test('solicita o e-mail pelo login e mostra a confirmação genérica', async ({ page }) => {
      await page.route('**/api/**', async route => {
        if (route.request().url().endsWith('/forgot-password')) {
          expect(route.request().postDataJSON()).toEqual({ email: 'conta@example.test' });
          return route.fulfill({ status: 202, json: {} });
        }
        return route.fulfill({ json: { status: 'UP', application: 'ascend-api' } });
      });
      await page.goto('/');
      await page.getByRole('link', { name: 'Esqueceu sua senha?' }).click();
      await page.getByLabel('E-mail cadastrado').fill('conta@example.test');
      await page.getByRole('button', { name: 'Enviar instruções' }).click();
      await expect(page.getByRole('heading', { name: 'Confira seu e-mail' })).toBeVisible();
      await expect(page.getByText(/Se existir uma conta associada/)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test('valida, confirma e volta ao login sem guardar o token', async ({ page }) => {
      const payloads = [];
      await page.route('**/api/auth/reset-password/**', route => route.fulfill({ status: 204 }));
      await page.route('**/api/auth/reset-password', route => {
        payloads.push(route.request().postDataJSON());
        return route.fulfill({ status: 204 });
      });
      await page.goto(resetPath);
      await expect(page.getByLabel('Nova senha', { exact: true })).toBeVisible();
      expect(new URL(page.url()).hash).toBe('');
      await page.getByLabel('Nova senha', { exact: true }).fill('Minha-nova-Senha123');
      await expect(page.locator('#strength')).toHaveJSProperty('value', 4);
      await page.getByRole('button', { name: 'Mostrar nova senha' }).click();
      await expect(page.locator('#password')).toHaveAttribute('type', 'text');
      await page.getByRole('button', { name: 'Ocultar nova senha' }).click();
      await page.getByLabel('Confirme a nova senha').fill('diferente');
      await page.getByRole('button', { name: 'Redefinir minha senha' }).click();
      expect(payloads).toHaveLength(0);
      await page.getByLabel('Confirme a nova senha').fill('Minha-nova-Senha123');
      await page.getByRole('button', { name: 'Redefinir minha senha' }).click();
      await expect(page.getByRole('heading', { name: 'Senha redefinida' })).toBeVisible();
      expect(payloads).toEqual([{ token, newPassword: 'Minha-nova-Senha123', confirmPassword: 'Minha-nova-Senha123' }]);
      expect(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]))).not.toContain(token);
      expect(await page.locator('#password').inputValue()).toBe('');
      await page.getByRole('link', { name: 'Voltar ao login' }).click();
      await expect(page.locator('#login-email')).toBeVisible();
    });
  });
}

test('link expirado, ausente e recusa por excesso têm ações de recuperação', async ({ page }) => {
  await page.route('**/reset-password/validate', route => route.fulfill({ status: 400, json: {} }));
  for (const path of [resetPath, '/recuperar.html?redefinir']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Link indisponível' })).toBeVisible();
    await expect(page.locator('#reset-form')).toBeHidden();
  }
  await page.getByRole('link', { name: 'Solicitar novo link' }).click();
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  await page.route('**/forgot-password', async route => {
    await waiting;
    await route.fulfill({ status: 429, json: {} });
  });
  await page.getByLabel('E-mail cadastrado').fill('conta@example.test');
  const submit = page.getByRole('button', { name: 'Enviar instruções' });
  await submit.click();
  await expect(submit).toBeDisabled();
  release();
  await expect(page.getByRole('status')).toContainText('15 minutos');
  await expect(submit).toBeEnabled();
});
