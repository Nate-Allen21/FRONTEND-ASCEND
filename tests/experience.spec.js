import { test, expect } from '@playwright/test';

const missions = [
  { id: 'study', title: 'Revisão de matemática', description: 'Revise um capítulo.', type: 'estudo', experienceReward: 25, coinReward: 15, actionable: true, cadence: 'DAILY' },
  { id: 'training', title: 'Treino de força', description: 'Complete seu treino.', type: 'treino', experienceReward: 30, coinReward: 20, actionable: true, cadence: 'DAILY' },
];

test('AI replies render readable Markdown and reject executable HTML', async ({ page }) => {
  const errors = await setup(page);
  await page.route('**/api/ai/chat', (route) => route.fulfill({ json: {
    reply: '**Calendário de hoje**\n\n| Atividade | Status |\n| --- | --- |\n| Estudar matemática | Pendente |\n\n- Reserve 25 minutos.\n- Faça uma pausa.\n\nPrimeira linha\nSegunda linha\n\n<img src=x onerror="window.chatInjected=true"><script>window.chatInjected=true</script>[link](javascript:alert(1))',
  } }));
  await page.locator('#app-sidebar .sidebar-link[data-view=ai]').click();
  await page.locator('#ai-external-consent').check();
  await page.locator('#ai-chat-input').fill('O que tenho no calendário hoje?');
  await page.locator('#ai-chat-form button[type=submit]').click();
  const reply = page.locator('.chat-bubble--assistant').last();
  await expect(reply.locator('strong')).toHaveText('Calendário de hoje');
  await expect(reply.locator('table tbody tr')).toHaveCount(1);
  await expect(reply.locator('li')).toHaveCount(2);
  await expect(reply.locator('br')).toHaveCount(1);
  await expect(reply.locator('img, script, [onerror], a[href^="javascript:"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.chatInjected)).toBeUndefined();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.locator('.main-content').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await reply.screenshot({ path: 'test-results/ai-markdown.png', animations: 'disabled' });
  expect(errors).toEqual([]);
});

async function navigateOnMobile(page, view) {
  const mobileLink = page.locator(`.mobile-tabbar .mobile-nav-link[data-view=${view}]`);
  if (await mobileLink.count()) {
    await mobileLink.click();
    return;
  }

  const commandLabels = {
    vault: 'The Vault',
    shop: 'Loja',
    ai: 'Assistente IA',
    inventory: 'Inventario',
    achievements: 'Conquistas',
    ranking: 'Ranking',
  };
  await page.locator('#btn-command').click();
  await page.locator('#command-search').fill(commandLabels[view] || view);
  await page.locator('.command-result').first().click();
}

async function setup(page, authenticated = true, onboardingCompleted = true) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  if (authenticated) await page.addInitScript(() => localStorage.setItem('ascend.auth.token.2026-04-27-reset-1', 'test-token'));
  let user = { id: 1, name: 'Hunter Teste', email: 'hunter@example.com', avatar: null, onboardingCompleted };
  let completed = ['training'];
  const status = () => ({ name: 'Hunter Teste', handle: '@hunter', level: 3, rank: 'E', experience: 250, nextLevelExperience: 500, streakDays: 4, coins: 300, stats: [], dailyMissions: missions, completedMissionIds: completed });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data;
    if (path.endsWith('/health')) data = { status: 'UP', application: 'ascend-api' };
    else if (path.endsWith('/auth/me')) data = user;
    else if (path.endsWith('/auth/avatar')) {
      user = { ...user, avatar: route.request().postDataJSON().avatar, onboardingCompleted: true };
      data = user;
    }
    else if (path.endsWith('/auth/login') || path.endsWith('/auth/register')) data = { token: 'test-token', user };
    else if (path.endsWith('/complete')) { completed = ['training', 'study']; data = status(); }
    else if (path.endsWith('/player/status')) data = status();
    else if (path.endsWith('/planner')) data = { headline: 'Seu plano de evolução', summary: 'Um passo por dia.', insights: [], dailyMissions: missions, weeklyMissions: [], monthlyMissions: [], completedMissionIds: completed };
    else if (path.endsWith('/shop')) data = { coins: 300, purchases: [], offers: [] };
    else if (path.endsWith('/ranking')) data = { players: [] };
    else if (path.endsWith('/ai/chat')) data = { reply: 'Comece com uma missão de estudo.', provider: 'local' };
    else data = {};
    await route.fulfill({ json: data });
  });
  await page.goto('/');
  await expect(page.locator(authenticated ? '#app-shell' : '#auth-screen')).toBeVisible();
  return errors;
}

test('authentication, password visibility and login', async ({ page }) => {
  const errors = await setup(page, false);
  await page.locator('#login-email').fill('hunter@example.com');
  await page.locator('#login-password').fill('test-password');
  await page.getByRole('button', { name: 'Mostrar senha' }).first().click();
  await expect(page.locator('#login-password')).toHaveAttribute('type', 'text');
  await page.locator('#login-form button[type=submit]').click();
  await expect(page.locator('.evolution-hero')).toBeVisible();
  await expect(page.locator('#daily-progress-label')).toHaveText('1/2 missões concluídas');
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('new accounts choose an avatar before dashboard and can change it later', async ({ page }) => {
  const errors = await setup(page, false, false);
  await page.locator('#login-email').fill('new-hunter@example.com');
  await page.locator('#login-password').fill('test-password');
  await page.locator('#login-form button[type=submit]').click();

  await expect(page.locator('#avatar-onboarding')).toBeVisible();
  await expect(page.locator('#app-shell')).toBeHidden();
  await expect(page.locator('#avatar-confirm')).toBeDisabled();
  await expect(page.locator('#avatar-title')).toHaveText('ESCOLHA SUA ESSÊNCIA');
  const aether = page.locator('[data-avatar-choice="male"] img');
  await expect(aether).toHaveAttribute('src', 'assets/aether.png');
  const aetherBackgroundAlpha = await aether.evaluate(async (image) => {
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparentPixels = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparentPixels += 1;
    }
    return transparentPixels;
  });
  expect(aetherBackgroundAlpha).toBeGreaterThan(500000);
  await expect(page.locator('[data-avatar-choice="female"] img')).toHaveAttribute('src', 'assets/astra.png');

  await page.locator('[data-avatar-choice="male"]').click();
  await expect(page.locator('#avatar-confirm')).toBeEnabled();
  const firstSave = page.waitForRequest((request) => request.url().endsWith('/auth/avatar') && request.method() === 'PUT');
  await page.locator('#avatar-confirm').click();
  expect((await firstSave).postDataJSON()).toEqual({ avatar: 'male' });
  await expect(page.locator('#app-shell')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.player-avatar img')).toHaveAttribute('src', 'assets/aether.png');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#btn-edit-avatar').click();
  await expect(page.locator('#avatar-onboarding')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const femaleChoiceBounds = await page.locator('[data-avatar-choice="female"]').boundingBox();
  expect(femaleChoiceBounds.x).toBeGreaterThanOrEqual(0);
  expect(femaleChoiceBounds.x + femaleChoiceBounds.width).toBeLessThanOrEqual(390);
  await expect(page.locator('[data-avatar-choice="male"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-avatar-choice="female"]').click();
  const secondSave = page.waitForRequest((request) => request.url().endsWith('/auth/avatar') && request.method() === 'PUT');
  await page.locator('#avatar-confirm').click();
  expect((await secondSave).postDataJSON()).toEqual({ avatar: 'female' });
  await expect(page.locator('#avatar-onboarding')).toBeHidden();
  await expect(page.locator('.player-avatar img')).toHaveAttribute('src', 'assets/astra.png');
  await expect(page.locator('.user-avatar--topbar img')).toHaveAttribute('src', 'assets/astra.png');
  await page.reload();
  await expect(page.locator('#app-shell')).toBeVisible();
  await expect(page.locator('#avatar-onboarding')).toBeHidden();
  await expect(page.locator('.player-avatar img')).toHaveAttribute('src', 'assets/astra.png');
  expect(errors).toEqual([]);
});

test('mission filters, empty state and confirmed completion', async ({ page }) => {
  const errors = await setup(page);
  await page.locator('[data-navigate=missions]').click();
  await page.locator('#mission-search').fill('revisao');
  await expect(page.locator('#missions-list .mission-card:visible')).toHaveCount(1);
  await page.locator('#mission-search').fill('not-found');
  await expect(page.locator('#mission-empty')).toBeVisible();
  await page.locator('#mission-clear').click();
  await page.locator('#mission-filter').selectOption('pending');
  await expect(page.locator('#missions-list .mission-card:visible')).toHaveCount(1);
  await page.locator('#missions-list .mission-card:visible button').click();
  await expect(page.locator('#mission-results')).toHaveText('0 de 2 missões · 2 concluídas');
  await page.locator('#mission-filter').selectOption('done');
  await expect(page.locator('#missions-list .mission-card:visible')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('command palette, history and all screens', async ({ page }) => {
  const errors = await setup(page);
  await page.keyboard.press('Control+k');
  await expect(page.locator('#command-dialog')).toBeVisible();
  await page.locator('#command-search').fill('calendario');
  await page.keyboard.press('Enter');
  await expect(page.locator('#view-calendar')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#view-status')).toBeVisible();
  await page.goForward();
  await expect(page.locator('#view-calendar')).toBeVisible();
  for (const view of ['missions', 'training', 'studies', 'calendar', 'vault', 'shop', 'ai', 'inventory', 'achievements', 'ranking']) {
    await page.locator(`#app-sidebar .sidebar-link[data-view=${view}]`).click();
    await expect(page.locator(`#view-${view}`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator('#btn-theme-toggle').click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');
  await page.locator('#app-sidebar .sidebar-link[data-view=calendar]').click();
  await page.screenshot({ path: 'test-results/calendar-light.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('timer follows elapsed time, pauses and separates breaks from focus', async ({ page }) => {
  await setup(page);
  await page.locator('[data-navigate=studies]').click();
  await page.clock.install();
  await page.locator('[data-focus-minutes="50"]').click();
  await expect(page.locator('#timer-display')).toHaveText('50:00');
  await page.locator('#btn-start').click();
  await page.clock.fastForward(61000);
  await expect(page.locator('#timer-display')).toHaveText('48:59');
  await page.locator('#btn-start').click();
  await page.clock.fastForward(120000);
  await expect(page.locator('#timer-display')).toHaveText('48:59');
  await page.locator('#btn-start').click();
  await page.clock.fastForward(50 * 60000);
  await expect(page.locator('#cycle-count')).toHaveText('1');
  await page.locator('[data-focus-minutes="5"]').click();
  await page.locator('#btn-start').click();
  await page.clock.fastForward(5 * 60000);
  await expect(page.locator('#cycle-count')).toHaveText('1');
  await expect(page.locator('#focus-feedback')).toContainText('Pausa concluída');
});

test('mobile drawer, search and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = await setup(page);
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
  await page.locator('.mobile-tabbar .mobile-nav-link[data-view=missions]').click();
  await expect(page.locator('#view-missions')).toBeVisible();
  await page.locator('#btn-command').click();
  await page.locator('#command-search').fill('estudos');
  await page.locator('.command-result').first().click();
  await expect(page.locator('#view-studies')).toBeVisible();
  for (const view of ['training', 'calendar', 'vault', 'shop', 'ai', 'inventory', 'achievements', 'ranking']) {
    await navigateOnMobile(page, view);
    await expect(page.locator(`#view-${view}`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.app-view.active').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  expect(errors).toEqual([]);
});

test('offline indicator and session cleanup', async ({ page, context }) => {
  await setup(page);
  await context.setOffline(true);
  await expect(page.locator('#connection-notice')).toBeVisible();
  await context.setOffline(false);
  await expect(page.locator('#connection-notice')).toBeHidden();
  await page.locator('#btn-logout').click();
  await expect(page.locator('#auth-screen')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('ascend.auth.token.2026-04-27-reset-1'))).toBeNull();
});

test('unavailable configured API shows connection error without switching servers', async ({ page }) => {
  const requestedOrigins = [];
  await page.route('**/api/**', async (route) => {
    requestedOrigins.push(new URL(route.request().url()).origin);
    await route.fulfill({ status: 503, json: { message: 'Unavailable' } });
  });
  await page.goto('/?apiBase=http://127.0.0.1:8081/api');
  await page.locator('#login-email').fill('connection-test@example.invalid');
  await page.locator('#login-password').fill('not-a-real-password');
  await page.locator('#login-form button[type=submit]').click();
  await expect(page.locator('#auth-message')).toContainText('Não foi possível conectar ao servidor');
  await expect(page.locator('#login-form button[type=submit]')).toBeEnabled();
  expect(requestedOrigins).toEqual(['http://127.0.0.1:8081']);
});

test('compact layouts keep settings usable and cards free of internal overflow', async ({ page }) => {
  const errors = await setup(page);
  for (const width of [1440, 390, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of ['training', 'studies', 'shop']) {
      if (width <= 560) await navigateOnMobile(page, view);
      else await page.locator(`#app-sidebar .sidebar-link[data-view=${view}]`).click();
      const dimensions = await page.locator('.main-content').evaluate((el) => ({
        scroll: el.scrollWidth, client: el.clientWidth, overflow: getComputedStyle(el).overflowY,
      }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
      expect(dimensions.overflow).toBe('visible');
      if (view === 'shop') {
        const card = page.locator('.shop-item').first();
        expect(await card.evaluate((el) => getComputedStyle(el).flexDirection)).toBe('column');
        expect((await card.boundingBox()).width).toBeGreaterThan(240);
      }
      if (width === 1440 || width === 390) await page.screenshot({ path: `test-results/${view}-${width}.png`, fullPage: true, animations: 'disabled' });
    }
  }
  await page.locator('#app-sidebar .sidebar-link[data-view=training]').click();
  await expect(page.locator('#planner-form')).toBeHidden();
  await page.locator('#planner-title').click();
  await expect(page.locator('#planner-goals')).toBeVisible();
  await page.locator('#planner-goals').fill('Treinar com constância');
  await page.locator('.routine-extra summary').click();
  await expect(page.locator('#planner-available')).toBeVisible();
  await page.locator('#planner-available').fill('60');
  const request = page.waitForRequest((r) => r.url().endsWith('/planner') && r.method() === 'POST');
  await page.locator('#planner-submit').click();
  expect((await request).postDataJSON().primaryGoals).toBe('Treinar com constância');
  await expect(page.locator('#planner-status-chip')).toHaveText('PRONTO');
  expect(errors).toEqual([]);
});
