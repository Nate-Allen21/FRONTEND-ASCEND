// Shared interaction layer. Progress and purchases remain owned by the API.
export function initExperience({ navigate, setFocusDuration }) {
  const $ = (id) => document.getElementById(id);
  const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  document.querySelectorAll('[data-navigate]').forEach((button) => {
    button.addEventListener('click', () => navigate(button.dataset.navigate));
  });

  document.querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.closest('.auth-field')) return;
    const wrap = document.createElement('div');
    wrap.className = 'password-wrap';
    input.before(wrap);
    wrap.append(input);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'password-toggle';
    button.textContent = 'Mostrar';
    button.setAttribute('aria-label', 'Mostrar senha');
    button.setAttribute('aria-controls', input.id);
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      const visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      button.textContent = visible ? 'Ocultar' : 'Mostrar';
      button.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
      button.setAttribute('aria-pressed', String(visible));
    });
    wrap.append(button);
  });

  const filterMissions = () => {
    const cards = [...document.querySelectorAll('#missions-list .mission-card')];
    const query = normalize($('mission-search').value.trim());
    const state = $('mission-filter').value;
    let visible = 0;
    let completed = 0;
    cards.forEach((card) => {
      const done = card.classList.contains('concluida');
      if (done) completed++;
      const matches = normalize(card.textContent).includes(query) &&
        (state === 'all' || (state === 'done' ? done : !done));
      card.hidden = !matches;
      if (matches) visible++;
    });
    $('mission-results').textContent = `${visible} de ${cards.length} missões · ${completed} concluídas`;
    $('mission-empty').hidden = !cards.length || visible > 0;
    $('daily-progress-label').textContent = cards.length ? `${completed}/${cards.length} missões concluídas` : 'Seu próximo nível começa com uma missão.';
    $('daily-progress').value = completed;
    $('daily-progress').max = cards.length || 1;
  };
  $('mission-search').addEventListener('input', filterMissions);
  $('mission-filter').addEventListener('change', filterMissions);
  $('mission-clear').addEventListener('click', () => {
    $('mission-search').value = '';
    $('mission-filter').value = 'all';
    filterMissions();
    $('mission-search').focus();
  });
  new MutationObserver(filterMissions).observe($('missions-list'), { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  filterMissions();

  document.querySelectorAll('[data-focus-minutes]').forEach((button) => {
    button.addEventListener('click', () => {
      setFocusDuration(Number(button.dataset.focusMinutes));
      document.querySelectorAll('[data-focus-minutes]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    });
  });

  const updateConnection = () => {
    $('connection-notice').hidden = navigator.onLine;
  };
  window.addEventListener('online', updateConnection);
  window.addEventListener('offline', updateConnection);
  updateConnection();

  // Native dialog supplies focus trapping, Escape dismissal and a modal backdrop.
  const dialog = $('command-dialog');
  const search = $('command-search');
  const links = [...document.querySelectorAll('.sidebar-link[data-view]')];
  const renderCommands = () => {
    const results = $('command-results');
    results.replaceChildren();
    links.filter((link) => normalize(link.textContent).includes(normalize(search.value))).forEach((link) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'command-result';
      button.textContent = link.textContent.trim();
      button.addEventListener('click', () => {
        dialog.close();
        navigate(link.dataset.view);
      });
      results.append(button);
    });
    $('command-empty').hidden = results.childElementCount > 0;
  };
  const openCommands = () => {
    if ($('app-shell').classList.contains('d-none') || dialog.open) return;
    search.value = '';
    renderCommands();
    dialog.showModal();
    search.focus();
  };
  $('btn-command').addEventListener('click', openCommands);
  $('command-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  search.addEventListener('input', renderCommands);
  dialog.addEventListener('keydown', (event) => {
    const results = [...dialog.querySelectorAll('.command-result')];
    const index = results.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = event.key === 'ArrowDown' ? index + 1 : (index < 0 ? results.length - 1 : index - 1);
      results[(next + results.length) % results.length]?.focus();
    } else if (event.key === 'Enter' && event.target === search) {
      event.preventDefault();
      results[0]?.click();
    }
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open) dialog.close(); else openCommands();
    }
  });

  const date = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });
  const updateDate = () => { $('dashboard-date').textContent = date.format(new Date()); };
  updateDate();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateDate(); });
}
