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
  let profilePosts = [];
  let publicFollowing = true;
  let publicFriendStatus = 'INCOMING';
  const profile = {
    id: 1, name: 'Hunter Teste', username: 'hunter', avatar: 'male',
    bio: 'Uma jornada por dia.', tags: ['consistência'], visibility: 'PUBLIC',
    joinedAt: '2026-01-01T12:00:00Z', level: 3, rank: 'E', xp: 250,
    nextLevelXp: 500, streakDays: 4, followers: 12, following: 8
  };
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
    else if (path.endsWith('/profile/follow/2')) {
      publicFollowing = route.request().method() === 'POST';
      data = {};
    }
    else if (path.endsWith('/profile/friends/2')) {
      if (route.request().method() === 'PUT') publicFriendStatus = 'ACCEPTED';
      else if (route.request().method() === 'DELETE') publicFriendStatus = 'NONE';
      else publicFriendStatus = 'OUTGOING';
      data = { status: publicFriendStatus };
    }
    else if (path.endsWith('/profile/players/2')) {
      const { xp, nextLevelXp, streakDays, ...publicProfile } = profile;
      data = {
        ...publicProfile,
        id: 2,
        name: 'Aliada ASCEND',
        username: 'aliada',
        followingCount: 3,
        following: publicFollowing,
        friendStatus: publicFriendStatus,
        posts: []
      };
    }
    else if (path.endsWith('/profile/posts') && route.request().method() === 'POST') {
      profilePosts.unshift({
        id: profilePosts.length + 1,
        content: route.request().postDataJSON().content,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        liked: false
      });
      data = profilePosts[0];
    }
    else if (path.endsWith('/profile') && route.request().method() === 'PUT') {
      const updates = route.request().postDataJSON();
      profile.bio = updates.bio;
      profile.tags = updates.tags;
      profile.visibility = updates.visibility;
      if (Object.hasOwn(updates, 'profileImage')) profile.profileImage = updates.profileImage || null;
      data = { ...profile, posts: profilePosts };
    }
    else if (path.endsWith('/profile') && route.request().method() === 'GET') data = { ...profile, posts: profilePosts };
    else if (path.endsWith('/profile/friends')) data = [{ id: 2, name: 'Aliada ASCEND', username: 'aliada', avatar: 'female' }];
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

test('Google login button forwards clicks to the rendered sign-in control', async ({ page }) => {
  await page.route('https://accounts.google.com/gsi/client', (route) => route.abort());
  await page.addInitScript(() => {
    window.googleButtonClicked = false;
    window.google = {
      accounts: {
        id: {
          initialize: () => {},
          renderButton: (container) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = 'Google iframe button mock';
            button.addEventListener('click', () => { window.googleButtonClicked = true; });
            container.appendChild(button);
          }
        }
      }
    };
  });
  await setup(page, false);
  const login = page.locator('.google-login-wrap');
  await expect(login).toHaveClass(/is-configured/);
  await login.click();
  await expect.poll(() => page.evaluate(() => window.googleButtonClicked)).toBe(true);
});

test('status and progress overview are visible without the extra dashboard banner', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 768 });
  await setup(page);
  await expect(page.locator('.system-banner')).toHaveCount(0);
  await expect(page.locator('#status-title')).toBeInViewport();
  await expect(page.locator('#status-overview-title')).toBeInViewport();
  expect(await page.locator('.evolution-hero').evaluate((hero) => hero.offsetHeight)).toBeLessThan(260);
});

test('profile loads account details and publishes a post', async ({ page }) => {
  const errors = await setup(page);
  await page.locator('#app-sidebar .sidebar-link[data-view=profile]').click();
  await expect(page.locator('#profile-title')).toHaveText('Hunter Teste');
  await expect(page.locator('#profile-bio')).toHaveText('Uma jornada por dia.');
  await expect(page.locator('#profile-avatar')).toBeVisible();
  await expect.poll(() => page.locator('#profile-avatar').evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('#profile-progression .ascend-profile-metric')).toHaveCount(4);
  await expect(page.locator('#profile-tab-posts')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#profile-friends .ascend-profile-friend')).toHaveCount(1);
  await page.locator('#profile-tab-overview').click();
  await expect(page.locator('#profile-panel-overview')).toBeVisible();
  await expect(page.locator('#profile-overview-stats .ascend-profile-overview-card')).toHaveCount(4);
  await page.locator('#profile-tab-achievements').click();
  await expect(page.locator('#profile-panel-achievements')).toBeVisible();
  await expect(page.locator('#profile-achievements')).not.toBeEmpty();
  await page.locator('#profile-tab-achievements').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#profile-tab-statistics')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#profile-tab-posts').click();
  const profileLayout = await page.locator('.ascend-profile-layout').evaluate((layout) => {
    const banner = layout.previousElementSibling.getBoundingClientRect();
    const main = layout.querySelector('.ascend-profile-main').getBoundingClientRect();
    const side = layout.querySelector('.ascend-profile-side').getBoundingClientRect();
    return { bannerHeight: banner.height, bannerBottom: banner.bottom, mainTop: main.top, sideTop: side.top };
  });
  expect(profileLayout.bannerHeight).toBeLessThan(110);
  expect(profileLayout.mainTop).toBeGreaterThan(profileLayout.bannerBottom);
  expect(Math.abs(profileLayout.mainTop - profileLayout.sideTop)).toBeLessThan(2);
  await page.screenshot({ path: 'test-results/profile-dashboard.png', fullPage: true, animations: 'disabled' });
  await page.locator('#profile-post-content').fill('Mais um passo na jornada.');
  await page.locator('#profile-post-form button[type=submit]').click();
  await expect(page.locator('#profile-posts')).toContainText('Mais um passo na jornada.');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.locator('#view-profile').evaluate((view) => view.scrollWidth <= view.clientWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test('profile editor updates the bio and a custom profile photo', async ({ page }) => {
  const errors = await setup(page);
  await page.locator('#app-sidebar .sidebar-link[data-view=profile]').click();
  await page.locator('#profile-edit').click();
  await expect(page.locator('#profile-edit-dialog')).toBeVisible();
  await expect(page.locator('#profile-edit-bio')).toHaveValue('Uma jornada por dia.');
  await page.locator('#profile-edit-bio').fill('Evoluindo um passo por vez.');

  const pngDataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const context = canvas.getContext('2d');
    context.fillStyle = '#36aaff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  });
  await page.locator('#profile-image-input').setInputFiles({
    name: 'profile.png',
    mimeType: 'image/png',
    buffer: Buffer.from(pngDataUrl.split(',')[1], 'base64')
  });
  await expect(page.locator('#profile-edit-preview')).toBeVisible();
  await expect(page.locator('#profile-edit-feedback')).toBeEmpty();
  await page.locator('#profile-edit-save').click();

  await expect(page.locator('#profile-edit-dialog')).toBeHidden();
  await expect(page.locator('#profile-bio')).toHaveText('Evoluindo um passo por vez.');
  await expect(page.locator('#profile-avatar')).toHaveAttribute('src', /^data:image\/jpeg;base64,/);

  await page.locator('#profile-edit').click();
  await expect(page.locator('#profile-edit-preview')).toBeVisible();
  await page.locator('#profile-image-remove').click();
  await expect(page.locator('#profile-edit-preview')).toBeHidden();
  await page.locator('#profile-edit-save').click();
  await expect(page.locator('#profile-avatar')).toHaveAttribute('src', /aether\.png/);
  expect(errors).toEqual([]);
});

test('public player profiles show social actions without exposing private progress', async ({ page }) => {
  const errors = await setup(page);
  await page.locator('#app-sidebar .sidebar-link[data-view=profile]').click();
  await page.locator('#profile-friends .ascend-profile-friend').click();
  await expect(page.locator('#profile-title')).toHaveText('Aliada ASCEND');
  await expect(page.locator('#profile-edit')).toBeHidden();
  await expect(page.locator('#profile-post-form')).toBeHidden();
  await expect(page.locator('#profile-follow-button')).toBeVisible();
  await expect(page.locator('#profile-follow-button')).toHaveText('Deixar de seguir');
  await expect(page.locator('#profile-friend-button')).toBeVisible();
  await expect(page.locator('#profile-friend-button')).toHaveText('Aceitar amizade');
  await expect(page.locator('#profile-level')).toContainText('disponível apenas no seu perfil');
  await page.locator('#profile-follow-button').click();
  await expect(page.locator('#profile-follow-button')).toHaveText('Seguir jogador');
  await page.locator('#profile-friend-button').click();
  await expect(page.locator('#profile-friend-button')).toHaveText('Remover amizade');
  await page.locator('#profile-tab-achievements').click();
  await expect(page.locator('#profile-achievements')).toContainText('não são exibidas neste perfil');
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
  await expect.poll(() => aether.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
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
  await expect(page.locator('.player-avatar img')).toHaveAttribute('src', /\/assets\/aether(?:-[\w-]+)?\.png(?:\?.*)?$/);
  await expect.poll(() => page.locator('.user-avatar--topbar img').evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);

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
  await expect(page.locator('.player-avatar img')).toHaveAttribute('src', /\/assets\/astra(?:-[\w-]+)?\.png(?:\?.*)?$/);
  await expect(page.locator('.user-avatar--topbar img')).toHaveAttribute('src', /\/assets\/astra(?:-[\w-]+)?\.png(?:\?.*)?$/);
  await page.reload();
  await expect(page.locator('#app-shell')).toBeVisible();
  await expect(page.locator('#avatar-onboarding')).toBeHidden();
  await expect(page.locator('.player-avatar img')).toHaveAttribute('src', /\/assets\/astra(?:-[\w-]+)?\.png(?:\?.*)?$/);
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
