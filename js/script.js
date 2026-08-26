const STORAGE_RESET_VERSION = '2026-04-27-reset-1';
const API_BASE_URL_STORAGE_KEY = 'ascend.api.baseUrl';
const AUTH_TOKEN_KEY = 'ascend.auth.token.' + STORAGE_RESET_VERSION;
const VAULT_HISTORY_KEY = 'ascend.vault.history.' + STORAGE_RESET_VERSION;
const SHOP_PURCHASES_KEY = 'ascend.shop.purchases.' + STORAGE_RESET_VERSION;
const INVENTORY_ITEMS_KEY = 'ascend.inventory.items.' + STORAGE_RESET_VERSION;
const ACTIVE_REWARDS_KEY = 'ascend.active.rewards.' + STORAGE_RESET_VERSION;
const THEME_STORAGE_KEY = 'ascend.theme';
const ROUTINE_PROFILE_KEY = 'ascend.routine.profile.' + STORAGE_RESET_VERSION;
const APP_TIME_ZONE = 'America/Sao_Paulo';
const DEFAULT_WORKOUT_DAYS = ['segunda', 'quarta', 'sexta'];
const WORKOUT_DAY_ORDER = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
const WORKOUT_DAY_LABELS = {
  segunda: 'Segunda',
  terca: 'Terca',
  quarta: 'Quarta',
  quinta: 'Quinta',
  sexta: 'Sexta',
  sabado: 'Sabado',
  domingo: 'Domingo'
};

let timerInterval = null;
let rewardInterval = null;
let dailyRefreshInterval = null;
let lastDailyDateKey = null;
let popupShowTimeout = null;
let popupHideTimeout = null;
let popupDisplayTimeout = null;
let rewardRenderSignature = '';
let inventoryActiveSignature = '';
let totalSeconds = 25 * 60;
let remaining = 25 * 60;
let cycles = 0;
let running = false;
let currentPlayerStatus = null;
let currentStorageScope = 'guest';
let currentRoutineProfile = null;
let currentAdaptivePlan = null;
let currentCalendarMonth = new Date();
let selectedCalendarDateKey = null;
let aiConversation = [];
const LEGENDARY_SHOP_ITEM_ID = 'reliquia-ascendente';

const circumference = 2 * Math.PI * 60;
const SHOP_ITEM_POOL = [
  {
    id: 'pausa-estrategica',
    categoria: 'RECOMPENSA',
    nome: 'Pausa estrategica',
    descricao: 'Troque moedas por 30 minutos de descanso planejado.',
    custo: 120
  },
  {
    id: 'equipamento-treino',
    categoria: 'UPGRADE',
    nome: 'Equipamento de treino',
    descricao: 'Registre uma melhoria real para sua rotina fisica.',
    custo: 300
  },
  {
    id: 'sessao-premium',
    categoria: 'FOCO',
    nome: 'Sessao premium',
    descricao: 'Reserve um bloco especial para estudo profundo.',
    custo: 200
  },
  {
    id: 'combo-hidratacao',
    categoria: 'SUPORTE',
    nome: 'Combo de hidratacao',
    descricao: 'Garanta agua, isotonico ou frutas para sustentar o treino.',
    custo: 90
  },
  {
    id: 'almoco-livre',
    categoria: 'RECOMPENSA',
    nome: 'Almoco livre',
    descricao: 'Libere uma refeicao especial sem culpa dentro do planejamento.',
    custo: 240
  },
  {
    id: 'kit-estudos',
    categoria: 'UPGRADE',
    nome: 'Kit de estudos',
    descricao: 'Invista em caderno, canetas ou materiais para elevar o foco.',
    custo: 180
  },
  {
    id: 'cinema-noturno',
    categoria: 'RECOMPENSA',
    nome: 'Cinema noturno',
    descricao: 'Transforme moedas em uma noite de lazer programado.',
    custo: 260
  },
  {
    id: 'playlist-foco',
    categoria: 'FOCO',
    nome: 'Playlist de foco',
    descricao: 'Monte um ritual premium para estudar ou trabalhar sem distracoes.',
    custo: 110
  },
  {
    id: 'micro-upgrade-setup',
    categoria: 'UPGRADE',
    nome: 'Micro upgrade no setup',
    descricao: 'Ajuste ergonomia, mousepad, apoio ou luz para render melhor.',
    custo: 320
  },
  {
    id: 'dia-social',
    categoria: 'SOCIAL',
    nome: 'Encontro social',
    descricao: 'Use moedas para bancar um momento de conexao com amigos ou familia.',
    custo: 170
  },
  {
    id: 'lanche-pos-treino',
    categoria: 'SUPORTE',
    nome: 'Lanche pos-treino',
    descricao: 'Converta moedas em uma refeicao simples para acelerar sua recuperacao.',
    custo: 140
  },
  {
    id: 'cafe-deep-work',
    categoria: 'FOCO',
    nome: 'Cafe deep work',
    descricao: 'Banca um cafe especial para um bloco serio de concentracao.',
    custo: 95
  },
  {
    id: 'livro-novo',
    categoria: 'UPGRADE',
    nome: 'Livro novo',
    descricao: 'Reserve moedas para adquirir um livro que fortalece sua evolucao.',
    custo: 280
  },
  {
    id: 'acessorio-academia',
    categoria: 'UPGRADE',
    nome: 'Acessorio de academia',
    descricao: 'Invista em strap, munhequeira, faixa ou outro detalhe util para treinar melhor.',
    custo: 260
  },
  {
    id: 'sobremesa-planejada',
    categoria: 'RECOMPENSA',
    nome: 'Sobremesa planejada',
    descricao: 'Libere uma recompensa doce sem sair do controle da rotina.',
    custo: 130
  },
  {
    id: 'bloco-criativo',
    categoria: 'FOCO',
    nome: 'Bloco criativo',
    descricao: 'Troque moedas por um periodo reservado para criar, escrever ou montar ideias.',
    custo: 150
  },
  {
    id: 'upgrade-escrivaninha',
    categoria: 'UPGRADE',
    nome: 'Upgrade na escrivaninha',
    descricao: 'Melhore conforto e organizacao com um pequeno ajuste no seu espaco.',
    custo: 340
  },
  {
    id: 'role-curto',
    categoria: 'SOCIAL',
    nome: 'Role curto',
    descricao: 'Use moedas para um passeio rapido que renova a energia sem baguncar o dia.',
    custo: 160
  },
  {
    id: 'kit-recuperacao',
    categoria: 'SUPORTE',
    nome: 'Kit recuperacao',
    descricao: 'Monte um combo com agua, frutas ou itens simples para cuidar do corpo.',
    custo: 145
  },
  {
    id: 'noite-game',
    categoria: 'RECOMPENSA',
    nome: 'Noite game',
    descricao: 'Resgate uma sessao de lazer controlada para descansar a mente.',
    custo: 220
  },
  {
    id: 'mentoria-pessoal',
    categoria: 'FOCO',
    nome: 'Mentoria pessoal',
    descricao: 'Compre um momento intencional para revisar metas, progresso e proximo passo.',
    custo: 175
  },
  {
    id: 'camiseta-treino',
    categoria: 'UPGRADE',
    nome: 'Camiseta de treino',
    descricao: 'Junte moedas para um item que aumente conforto e identidade no treino.',
    custo: 310
  },
  {
    id: 'saida-com-amigos',
    categoria: 'SOCIAL',
    nome: 'Saida com amigos',
    descricao: 'Transforme desempenho da rotina em um momento social planejado.',
    custo: 290
  },
  {
    id: LEGENDARY_SHOP_ITEM_ID,
    categoria: 'LENDARIO',
    raridade: 'LENDARIO',
    nome: 'Reliquia ascendente',
    descricao: 'Desbloqueie 90 minutos de foco absoluto para atacar sua meta mais importante do dia.',
    custo: 777
  }
];
const SHOP_ITEM_EFFECTS = {
  'pausa-estrategica': {
    rewardType: 'timer',
    durationMinutes: 30,
    effectLabel: 'Pausa guiada de 30 minutos'
  },
  'sessao-premium': {
    rewardType: 'timer',
    durationMinutes: 45,
    effectLabel: 'Sessao premium de foco'
  },
  'playlist-foco': {
    rewardType: 'timer',
    durationMinutes: 20,
    effectLabel: 'Ritual de foco ativo'
  },
  'cafe-deep-work': {
    rewardType: 'timer',
    durationMinutes: 25,
    effectLabel: 'Bloco deep work'
  },
  'bloco-criativo': {
    rewardType: 'timer',
    durationMinutes: 40,
    effectLabel: 'Bloco criativo'
  },
  'mentoria-pessoal': {
    rewardType: 'timer',
    durationMinutes: 35,
    effectLabel: 'Revisao pessoal orientada'
  },
  [LEGENDARY_SHOP_ITEM_ID]: {
    rewardType: 'timer',
    durationMinutes: 90,
    effectLabel: 'Estado ascendente lendario'
  }
};
const ACHIEVEMENTS = [
  {
    titulo: 'Primeira sequencia',
    descricao: 'Mantenha uma rotina ativa por 3 dias.',
    icone: 'bi-fire',
    unlocked: (status) => status.streakDays >= 3
  },
  {
    titulo: 'Streak blindada',
    descricao: 'Alcance 7 dias seguidos de consistencia.',
    icone: 'bi-shield-check',
    unlocked: (status) => status.streakDays >= 7
  },
  {
    titulo: 'Mente afiada',
    descricao: 'Acumule 500 pontos de experiencia.',
    icone: 'bi-book',
    unlocked: (status) => status.experience >= 500 || status.level >= 4
  },
  {
    titulo: 'Veterano do sistema',
    descricao: 'Chegue ao nivel 5.',
    icone: 'bi-stars',
    unlocked: (status) => status.level >= 5
  },
  {
    titulo: 'Corpo em evolucao',
    descricao: 'Chegue ao nivel 2.',
    icone: 'bi-lightning-charge',
    unlocked: (status) => status.level >= 2
  },
  {
    titulo: 'Caixa em ordem',
    descricao: 'Acumule 300 moedas no Vault.',
    icone: 'bi-safe2',
    unlocked: (status) => status.coins >= 300
  },
  {
    titulo: 'Mercador do dia',
    descricao: 'Resgate seu primeiro item da loja.',
    icone: 'bi-shop',
    unlocked: () => getShopPurchases().length >= 1
  },
  {
    titulo: 'Hunter disciplinado',
    descricao: 'Complete 10 missoes no total.',
    icone: 'bi-check2-square',
    unlocked: (status) => getStatValue(status, 'missions') >= 10
  },
  {
    titulo: 'Lenda em ascensao',
    descricao: 'Complete 25 missoes no total.',
    icone: 'bi-trophy',
    unlocked: (status) => getStatValue(status, 'missions') >= 25
  }
];

function getDateKeyInTimeZone() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function getDailyRotationItems(pool, count, salt) {
  const dateKey = getDateKeyInTimeZone();
  const baseSeed = Number(dateKey.replaceAll('-', '')) + salt * 97;
  const sorted = pool
    .map((item, index) => ({
      item,
      weight: Math.abs(((baseSeed * 31) + (index * 17) + (salt * 13) + hashCode(item.id) * 19) % 997)
    }))
    .sort((left, right) => left.weight - right.weight);

  return sorted.slice(0, Math.min(count, sorted.length)).map(({ item }) => ({
    ...item,
    dailyId: item.id + '-' + dateKey
  }));
}

function getDailyShopItems() {
  const featuredItem = SHOP_ITEM_POOL.find((item) => item.id === LEGENDARY_SHOP_ITEM_ID);
  const rotationPool = SHOP_ITEM_POOL.filter((item) => item.id !== LEGENDARY_SHOP_ITEM_ID);
  const items = getDailyRotationItems(rotationPool, 8, 7);

  if (!featuredItem) {
    return items;
  }

  return [
    {
      ...featuredItem,
      dailyId: featuredItem.id + '-' + getDateKeyInTimeZone()
    },
    ...items
  ];
}

function isTodayDailyId(value) {
  return typeof value === 'string' && value.endsWith('-' + getDateKeyInTimeZone());
}

function hashCode(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return hash;
}

function getStatValue(status, key) {
  if (!status || !Array.isArray(status.stats)) {
    return 0;
  }

  const stat = status.stats.find((entry) => entry.key === key);
  return stat ? Number(stat.value) || 0 : 0;
}
function normalizeApiBaseUrl(value) {
  if (!value) return '';
  return value.trim().replace(/\/+$/, '');
}

function resolveApiBaseUrl() {
  const viteValue = typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_API_URL
    : '';
  const queryValue = new URLSearchParams(window.location.search).get('apiBase');
  const storedValue = localStorage.getItem(API_BASE_URL_STORAGE_KEY);
  const configuredValue = normalizeApiBaseUrl(queryValue || viteValue || storedValue);

  if (configuredValue) {
    if (queryValue || viteValue) {
      localStorage.setItem(API_BASE_URL_STORAGE_KEY, configuredValue);
    }
    return configuredValue;
  }

  return '';
}

const apiBaseUrl = resolveApiBaseUrl();
let activeApiBaseUrl = null;
let apiDiscoveryPromise = null;

function buildApiBaseUrlCandidates() {
  return apiBaseUrl ? [apiBaseUrl] : [];
}

const apiBaseUrlCandidates = buildApiBaseUrlCandidates();

async function discoverApiBaseUrl() {
  for (const baseUrl of apiBaseUrlCandidates) {
    try {
      const response = await fetch(baseUrl + '/health');
      if (!response.ok) {
        continue;
      }

      const health = await response.json();
      if (health && health.status === 'UP' && health.application === 'ascend-api') {
        activeApiBaseUrl = baseUrl;
        localStorage.setItem(API_BASE_URL_STORAGE_KEY, baseUrl);
        return baseUrl;
      }
    } catch (error) {
      // Continua procurando outra instancia valida da API.
    }
  }

  throw new Error(
    'URL da API ASCEND nao configurada. Defina VITE_API_URL ou use ?apiBase=https://seu-backend.com/api.'
  );
}

async function resolveWorkingApiBaseUrl() {
  if (activeApiBaseUrl) {
    return activeApiBaseUrl;
  }

  if (!apiDiscoveryPromise) {
    apiDiscoveryPromise = discoverApiBaseUrl()
      .finally(() => {
        apiDiscoveryPromise = null;
      });
  }

  return apiDiscoveryPromise;
}

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

function buildScopedStorageKey(baseKey) {
  return baseKey + '.' + currentStorageScope;
}

function readJsonStorage(baseKey) {
  try {
    return JSON.parse(localStorage.getItem(buildScopedStorageKey(baseKey))) || [];
  } catch (error) {
    return [];
  }
}

function writeJsonStorage(baseKey, value) {
  localStorage.setItem(buildScopedStorageKey(baseKey), JSON.stringify(value));
}

function getDefaultRoutineProfile() {
  return {
    primaryGoals: 'Criar consistencia entre trabalho, estudos e saude.',
    currentPriorities: 'Disciplina diaria e progresso nas metas principais.',
    routineSummary: 'Quero uma rotina mais organizada, com menos dispersao e mais execucao intencional.',
    studyFocus: '',
    workFocus: '',
    healthFocus: '',
    projectFocus: '',
    habitFocus: 'Manter constancia mesmo nos dias mais pesados.',
    obstacles: 'Procrastinacao e excesso de contexto.',
    availableMinutesPerDay: 90,
    energyPattern: 'Energia media, melhor no inicio do dia.',
    motivationStyle: 'Progresso visivel e missoes claras.',
    workoutDays: [...DEFAULT_WORKOUT_DAYS],
    bodyType: 'mesomorfo',
    trainingGoal: 'hipertrofia',
    trainingLevel: 'iniciante'
  };
}

function sanitizeRoutineProfile(profile = {}) {
  const defaults = getDefaultRoutineProfile();
  const safeMinutes = Number(profile.availableMinutesPerDay);
  const safeWorkoutDays = sanitizeWorkoutDays(profile.workoutDays || defaults.workoutDays);

  return {
    primaryGoals: String(profile.primaryGoals || defaults.primaryGoals).trim(),
    currentPriorities: String(profile.currentPriorities || defaults.currentPriorities).trim(),
    routineSummary: String(profile.routineSummary || defaults.routineSummary).trim(),
    studyFocus: String(profile.studyFocus || '').trim(),
    workFocus: String(profile.workFocus || '').trim(),
    healthFocus: String(profile.healthFocus || '').trim(),
    projectFocus: String(profile.projectFocus || '').trim(),
    habitFocus: String(profile.habitFocus || defaults.habitFocus).trim(),
    obstacles: String(profile.obstacles || defaults.obstacles).trim(),
    availableMinutesPerDay: Number.isFinite(safeMinutes) && safeMinutes > 0 ? safeMinutes : defaults.availableMinutesPerDay,
    energyPattern: String(profile.energyPattern || defaults.energyPattern).trim(),
    motivationStyle: String(profile.motivationStyle || defaults.motivationStyle).trim(),
    workoutDays: safeWorkoutDays.length ? safeWorkoutDays : [...defaults.workoutDays],
    bodyType: sanitizeBodyType(profile.bodyType || defaults.bodyType),
    trainingGoal: sanitizeTrainingGoal(profile.trainingGoal || defaults.trainingGoal),
    trainingLevel: sanitizeTrainingLevel(profile.trainingLevel || defaults.trainingLevel)
  };
}

function getRoutineProfile() {
  try {
    return sanitizeRoutineProfile(JSON.parse(localStorage.getItem(buildScopedStorageKey(ROUTINE_PROFILE_KEY))) || {});
  } catch (error) {
    return getDefaultRoutineProfile();
  }
}

function saveRoutineProfile(profile) {
  currentRoutineProfile = sanitizeRoutineProfile(profile);
  localStorage.setItem(buildScopedStorageKey(ROUTINE_PROFILE_KEY), JSON.stringify(currentRoutineProfile));
}

function sanitizeWorkoutDays(workoutDays) {
  const values = Array.isArray(workoutDays)
    ? workoutDays
    : String(workoutDays || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

  const normalized = values
    .map((value) => String(value || '').toLowerCase().trim())
    .filter((value) => WORKOUT_DAY_ORDER.includes(value));

  return [...new Set(normalized)].sort((left, right) => WORKOUT_DAY_ORDER.indexOf(left) - WORKOUT_DAY_ORDER.indexOf(right));
}

function sanitizeBodyType(value) {
  const normalized = String(value || '').toLowerCase().trim();
  if (['ectomorfo', 'mesomorfo', 'endomorfo'].includes(normalized)) {
    return normalized;
  }
  return 'mesomorfo';
}

function sanitizeTrainingGoal(value) {
  const normalized = String(value || '').toLowerCase().trim();
  if (['hipertrofia', 'emagrecimento', 'condicionamento', 'forca'].includes(normalized)) {
    return normalized;
  }
  return 'hipertrofia';
}

function sanitizeTrainingLevel(value) {
  const normalized = String(value || '').toLowerCase().trim();
  if (['iniciante', 'intermediario', 'avancado'].includes(normalized)) {
    return normalized;
  }
  return 'iniciante';
}

function formatCurrencyValue(value) {
  return value.toLocaleString('pt-BR');
}

function formatDurationLabel(totalSecondsValue) {
  const totalMinutes = Math.max(1, Math.round(totalSecondsValue / 60));
  if (totalMinutes % 60 === 0) {
    const hours = totalMinutes / 60;
    return hours + 'h';
  }
  return totalMinutes + ' min';
}

function formatCountdown(remainingSecondsValue) {
  const safeValue = Math.max(0, remainingSecondsValue);
  const hours = Math.floor(safeValue / 3600);
  const minutes = Math.floor((safeValue % 3600) / 60);
  const seconds = safeValue % 60;

  if (hours > 0) {
    return String(hours).padStart(2, '0') + ':' +
      String(minutes).padStart(2, '0') + ':' +
      String(seconds).padStart(2, '0');
  }

  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

function getShopItemDefinition(itemId) {
  const baseItem = SHOP_ITEM_POOL.find((item) => item.id === itemId);
  if (!baseItem) return null;

  return {
    ...baseItem,
    rewardType: 'stored',
    ...SHOP_ITEM_EFFECTS[itemId]
  };
}

function getRankClassName(rank) {
  const normalizedRank = String(rank || 'e').toLowerCase().replace(/\+/g, '-plus');
  return 'rank-' + normalizedRank;
}

function getElement(id) {
  return document.getElementById(id);
}

function getStoredTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);

  const toggleButton = getElement('btn-theme-toggle');
  if (!toggleButton) return;

  const isLight = theme === 'light';
  toggleButton.classList.toggle('active', isLight);
  toggleButton.setAttribute('aria-pressed', String(isLight));
  toggleButton.setAttribute('aria-label', isLight ? 'Ativar modo escuro' : 'Ativar modo claro');

  const icon = toggleButton.querySelector('i');
  if (icon) {
    icon.className = 'bi ' + (isLight ? 'bi-moon-stars' : 'bi-sun');
  }
}

function toggleTheme() {
  const nextTheme = getStoredTheme() === 'light' ? 'dark' : 'light';
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  applyTheme(nextTheme);
}

function setText(id, value) {
  const element = getElement(id);
  if (element) {
    element.textContent = value;
  }
  return element;
}

function setAria(id, name, value) {
  const element = getElement(id);
  if (element) {
    element.setAttribute(name, value);
  }
  return element;
}

async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }

  const baseUrl = await resolveWorkingApiBaseUrl();
  let response;

  try {
    response = await fetch(baseUrl + path, {
      ...options,
      headers
    });
  } catch (error) {
    activeApiBaseUrl = null;
    throw new Error(
      'Perdi a conexao com a API ASCEND em ' + baseUrl +
      '. Verifique se o backend continua ativo.'
    );
  }

  if (!response.ok) {
    let message = 'Nao foi possivel concluir a operacao.';
    try {
      const error = await response.json();
      message = error.message || message;
    } catch (ignored) {
      // Mantem a mensagem padrao quando a resposta nao tem JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function setAuthMessage(message) {
  setText('auth-message', message);
}

function getFormValue(form, fieldName) {
  return form.elements[fieldName].value.trim();
}

function showAuthScreen() {
  const authScreen = getElement('auth-screen');
  const appShell = getElement('app-shell');
  if (authScreen) authScreen.classList.remove('d-none');
  if (authScreen) authScreen.setAttribute('aria-hidden', 'false');
  if (appShell) appShell.classList.add('d-none');
  if (appShell) appShell.setAttribute('aria-hidden', 'true');
}

function showAppShell() {
  const authScreen = getElement('auth-screen');
  const appShell = getElement('app-shell');
  if (authScreen) authScreen.classList.add('d-none');
  if (authScreen) authScreen.setAttribute('aria-hidden', 'true');
  if (appShell) appShell.classList.remove('d-none');
  if (appShell) appShell.setAttribute('aria-hidden', 'false');
}

function showView(viewName, activeLink = null) {
  document.querySelectorAll('[data-view-panel]').forEach((panel) => {
    const isActive = panel.dataset.viewPanel === viewName;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
    panel.setAttribute('aria-hidden', String(!isActive));
  });

  document.querySelectorAll('.sidebar-link[data-view]').forEach((link) => {
    const isActive = activeLink ? link === activeLink : link.dataset.view === viewName;
    link.classList.toggle('active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  const mainContent = getElement('conteudo-principal');
  if (mainContent) {
    mainContent.focus();
  }
}

function openSidebar() {
  const sidebar = getElement('app-sidebar');
  const backdrop = getElement('sidebar-backdrop');
  const toggleBtn = getElement('btn-sidebar-toggle');
  if (sidebar) sidebar.classList.add('is-open');
  if (backdrop) backdrop.classList.add('is-open');
  if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
  document.body.classList.add('sidebar-open');
}

function closeSidebar() {
  const sidebar = getElement('app-sidebar');
  const backdrop = getElement('sidebar-backdrop');
  const toggleBtn = getElement('btn-sidebar-toggle');
  if (sidebar) sidebar.classList.remove('is-open');
  if (backdrop) backdrop.classList.remove('is-open');
  if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('sidebar-open');
}

function toggleSidebar() {
  const sidebar = getElement('app-sidebar');
  if (sidebar && sidebar.classList.contains('is-open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

function initSidebarDrawer() {
  const toggleBtn = getElement('btn-sidebar-toggle');
  const closeBtn = getElement('btn-sidebar-close');
  const backdrop = getElement('sidebar-backdrop');

  if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSidebar();
  });
}

function switchAuthTab(tabName) {
  const isLogin = tabName === 'login';
  const loginForm = getElement('login-form');
  const registerForm = getElement('register-form');
  const tabLogin = getElement('tab-login');
  const tabRegister = getElement('tab-register');
  if (loginForm) loginForm.classList.toggle('d-none', !isLogin);
  if (loginForm) loginForm.hidden = !isLogin;
  if (loginForm) loginForm.setAttribute('aria-hidden', String(!isLogin));
  if (registerForm) registerForm.classList.toggle('d-none', isLogin);
  if (registerForm) registerForm.hidden = isLogin;
  if (registerForm) registerForm.setAttribute('aria-hidden', String(isLogin));
  if (tabLogin) tabLogin.classList.toggle('active', isLogin);
  if (tabRegister) tabRegister.classList.toggle('active', !isLogin);
  if (tabLogin) tabLogin.setAttribute('aria-selected', String(isLogin));
  if (tabRegister) tabRegister.setAttribute('aria-selected', String(!isLogin));
  if (tabLogin) tabLogin.setAttribute('tabindex', isLogin ? '0' : '-1');
  if (tabRegister) tabRegister.setAttribute('tabindex', isLogin ? '-1' : '0');
  setAuthMessage('');
}

function handleAuthTabKeydown(event) {
  const tabs = ['tab-login', 'tab-register']
    .map((id) => getElement(id))
    .filter(Boolean);
  const currentIndex = tabs.indexOf(event.currentTarget);

  if (currentIndex === -1) return;

  let nextIndex = null;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    nextIndex = (currentIndex + 1) % tabs.length;
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  } else if (event.key === 'Home') {
    nextIndex = 0;
  } else if (event.key === 'End') {
    nextIndex = tabs.length - 1;
  }

  if (nextIndex === null) return;

  event.preventDefault();
  const nextTab = tabs[nextIndex];
  nextTab.focus();
  switchAuthTab(nextTab.id === 'tab-login' ? 'login' : 'register');
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');

  submitButton.disabled = true;
  setAuthMessage('Entrando...');

  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: getFormValue(form, 'email'),
        password: form.elements.password.value
      })
    });

    setAuthToken(data.token);
    await loadRoutine();
  } catch (error) {
    setAuthMessage(error.message);
  } finally {
    submitButton.disabled = false;
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');

  submitButton.disabled = true;
  setAuthMessage('Criando conta...');

  try {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: getFormValue(form, 'name'),
        email: getFormValue(form, 'email'),
        password: form.elements.password.value
      })
    });

    setAuthToken(data.token);
    await loadRoutine();
  } catch (error) {
    setAuthMessage(error.message);
  } finally {
    submitButton.disabled = false;
  }
}

async function handleLogout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } catch (ignored) {
    // O logout local ainda deve acontecer se a sessao ja tiver expirado.
  }

  clearAuthToken();
  currentPlayerStatus = null;
  currentStorageScope = 'guest';
  currentRoutineProfile = null;
  currentAdaptivePlan = null;
  if (rewardInterval) {
    clearInterval(rewardInterval);
    rewardInterval = null;
  }
  if (dailyRefreshInterval) {
    clearInterval(dailyRefreshInterval);
    dailyRefreshInterval = null;
  }
  resetTimer();
  showAuthScreen();
  setAuthMessage('Sessao encerrada.');
}

async function handlePlannerSubmit(event) {
  event.preventDefault();

  try {
    const profile = collectRoutineProfileFromForm();
    saveRoutineProfile(profile);
    await loadAdaptivePlan(profile, false);
    showPopup('Plano atualizado!', 0, 0);
    setText('popup-body', 'As missoes agora refletem sua rotina, prioridades e objetivos atuais.');
    setText('popup-exp', 'ASCEND AI');
    setText('popup-coins', 'PERSONALIZADO');
  } catch (error) {
    showPopup('Falha ao gerar plano', 0, 0);
    setText('popup-body', error.message);
    setText('popup-exp', 'ERRO');
    setText('popup-coins', 'TENTE NOVAMENTE');
  }
}

async function handlePlannerReset() {
  const profile = getDefaultRoutineProfile();
  hydratePlannerForm(profile);

  try {
    saveRoutineProfile(profile);
    await loadAdaptivePlan(profile, false);
    showPopup('Perfil restaurado', 0, 0);
    setText('popup-body', 'O assistente voltou para a configuracao base e recalculou as missoes.');
    setText('popup-exp', 'BASE');
    setText('popup-coins', 'REGERADO');
  } catch (error) {
    showPopup('Falha ao restaurar perfil', 0, 0);
    setText('popup-body', error.message);
  }
}

async function loadRoutine() {
  try {
    ensureDailyRefreshWatcher();
    cleanupDailyShopPurchases();
    const status = await apiRequest('/player/status');
    renderPlayerStatus(status);
    const profile = getRoutineProfile();
    hydratePlannerForm(profile);
    renderTrainingPlan(profile);
    try {
      await loadAdaptivePlan();
    } catch (plannerError) {
      renderMissions([], []);
      renderRoadmap('weekly-missions-list', []);
      renderRoadmap('monthly-missions-list', []);
      setText('planner-summary', plannerError.message);
    }
    showAppShell();
  } catch (error) {
    clearAuthToken();
    showAuthScreen();
    setAuthMessage(error.message);
  }
}

function renderPlayerStatus(status) {
  cleanupDailyShopPurchases();
  lastDailyDateKey = getDateKeyInTimeZone();
  currentPlayerStatus = status;
  currentStorageScope = status.handle || getAuthToken() || 'guest';
  setText('player-name', status.name);

  const playerHandle = getElement('player-handle');
  if (playerHandle) {
    const playerLevel = document.createElement('span');
    playerLevel.id = 'player-level';
    playerLevel.textContent = status.level;
    playerHandle.textContent = status.handle + ' | Nivel ';
    playerHandle.appendChild(playerLevel);
  }

  const rankBadge = getElement('rank-badge');
  if (rankBadge) {
    rankBadge.textContent = status.rank;
    rankBadge.className = 'rank-badge ' + getRankClassName(status.rank);
    rankBadge.setAttribute('aria-label', 'Rank ' + status.rank);
  }

  setText('streak-val', status.streakDays);
  setText('banner-rank', status.rank);
  setText('banner-streak', status.streakDays);
  setText('banner-coins', formatCurrencyValue(status.coins));
  setText('status-rank-overview', 'Hunter ' + status.rank);
  setText('status-streak-overview', status.streakDays);
  setText('status-coins-overview', formatCurrencyValue(status.coins));
  setAria('streak-badge', 'aria-label', 'Sequencia atual: ' + status.streakDays + ' dias');
  setText('coins-val', formatCurrencyValue(status.coins));
  setAria('coins-badge', 'aria-label', 'Moedas atuais: ' + formatCurrencyValue(status.coins));
  setText('vault-balance', formatCurrencyValue(status.coins));
  updateExperience(status.level, status.experience, status.nextLevelExperience);
  renderStats(status.stats || []);
  renderVault(status.coins);
  renderShop();
  renderInventory();
  renderActiveRewards();
  ensureRewardInterval();
  renderAchievements(status);
  loadRanking();
}

function hydratePlannerForm(profile) {
  const form = getElement('planner-form');
  if (!form) return;

  const normalizedProfile = sanitizeRoutineProfile(profile);

  Object.entries(normalizedProfile).forEach(([key, value]) => {
    if (!form.elements[key]) return;
    if (key === 'workoutDays') return;
    form.elements[key].value = value;
  });

  Array.from(form.querySelectorAll('input[name="workoutDays"]')).forEach((input) => {
    input.checked = normalizedProfile.workoutDays.includes(input.value);
  });
}

function collectRoutineProfileFromForm() {
  const form = getElement('planner-form');
  if (!form) {
    return getRoutineProfile();
  }

  return sanitizeRoutineProfile({
    primaryGoals: form.elements.primaryGoals.value,
    currentPriorities: form.elements.currentPriorities.value,
    routineSummary: form.elements.routineSummary.value,
    studyFocus: form.elements.studyFocus.value,
    workFocus: form.elements.workFocus.value,
    healthFocus: form.elements.healthFocus.value,
    projectFocus: form.elements.projectFocus.value,
    habitFocus: form.elements.habitFocus.value,
    obstacles: form.elements.obstacles.value,
    availableMinutesPerDay: Number(form.elements.availableMinutesPerDay.value),
    energyPattern: form.elements.energyPattern.value,
    motivationStyle: form.elements.motivationStyle.value,
    workoutDays: Array.from(form.querySelectorAll('input[name="workoutDays"]:checked')).map((input) => input.value),
    bodyType: form.elements.bodyType.value,
    trainingGoal: form.elements.trainingGoal.value,
    trainingLevel: form.elements.trainingLevel.value
  });
}

function setPlannerLoadingState(isLoading, label = 'ANALISANDO') {
  const submitButton = getElement('planner-submit');
  const statusChip = getElement('planner-status-chip');

  if (submitButton) {
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading ? 'Gerando plano...' : 'Gerar plano inteligente';
  }

  if (statusChip) {
    statusChip.textContent = label;
    statusChip.classList.toggle('planner-status-chip--ready', !isLoading && label === 'PRONTO');
  }
}

async function loadAdaptivePlan(profileOverride = null, persistProfile = false) {
  const profile = sanitizeRoutineProfile(profileOverride || currentRoutineProfile || getRoutineProfile());

  if (persistProfile || !currentRoutineProfile) {
    saveRoutineProfile(profile);
  } else {
    currentRoutineProfile = profile;
  }

  setPlannerLoadingState(true);

  try {
    const plan = await apiRequest('/player/status/planner', {
      method: 'POST',
      body: JSON.stringify(profile)
    });

    currentAdaptivePlan = plan;
    renderAdaptivePlan(plan);
    setPlannerLoadingState(false, 'PRONTO');
  } catch (error) {
    const fallbackPlan = buildLocalAdaptivePlan(profile);
    fallbackPlan.adaptationNote = 'Modo local ativado: o backend falhou, entao o plano foi gerado no navegador para manter o sistema funcionando.';
    fallbackPlan.summary = 'O servidor nao respondeu ao planner, mas o ASCEND continuou gerando missoes com base no seu perfil salvo localmente.';
    currentAdaptivePlan = fallbackPlan;
    renderAdaptivePlan(fallbackPlan);
    setPlannerLoadingState(false, 'PRONTO');
  }
}

function renderAdaptivePlan(plan) {
  currentAdaptivePlan = plan;
  setText('planner-assistant-name', plan.assistantName || 'ASCEND AI');
  setText('planner-headline', plan.headline || 'Plano inteligente carregado.');
  setText('planner-summary', plan.summary || 'O assistente montou um novo roteiro.');
  setText('planner-adaptation', plan.adaptationNote || '');
  renderAssistantPresence(plan);
  renderPlannerInsights(plan.insights || []);
  renderMissions(plan.dailyMissions || [], plan.completedMissionIds || []);
  renderRoadmap('weekly-missions-list', plan.weeklyMissions || []);
  renderRoadmap('monthly-missions-list', plan.monthlyMissions || []);
  renderTrainingPlan(currentRoutineProfile || getRoutineProfile());
  renderCalendar(plan, currentRoutineProfile || getRoutineProfile());
  renderSamsungCalendar(plan, currentRoutineProfile || getRoutineProfile());
  renderAiChat();
}

function renderCalendar(plan, profile) {
  const container = getElement('calendar-grid');
  const summary = getElement('calendar-summary');
  if (!container) return;

  const normalizedProfile = sanitizeRoutineProfile(profile);
  const dailyMissions = Array.isArray(plan?.dailyMissions) ? plan.dailyMissions : [];
  const workoutDays = new Set(sanitizeWorkoutDays(normalizedProfile.workoutDays));
  const priorityText = truncatePlannerText(normalizedProfile.currentPriorities, 72);
  const today = new Date();

  container.textContent = '';

  if (summary) {
    const missionCount = dailyMissions.length;
    summary.textContent = missionCount
      ? 'Linha do tempo montada com ' + missionCount + ' missões diárias, treino em ' + normalizedProfile.workoutDays.length + ' dias e foco em ' + priorityText + '.'
      : 'Aguardando o plano inteligente para montar sua linha do tempo.';
  }

  for (let index = 0; index < 7; index++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + index);

    const dateLabel = new Intl.DateTimeFormat('pt-BR', {
      timeZone: APP_TIME_ZONE,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    }).format(currentDate);

    const card = document.createElement('article');
    card.className = 'calendar-day' + (index === 0 ? ' calendar-day--today' : '');
    card.setAttribute('role', 'listitem');

    const head = document.createElement('div');
    head.className = 'calendar-day-head';

    const name = document.createElement('div');
    name.className = 'calendar-day-name';
    name.textContent = index === 0 ? 'Hoje' : index === 1 ? 'Amanha' : 'Dia ' + (index + 1);

    const date = document.createElement('div');
    date.className = 'calendar-day-date';
    date.textContent = dateLabel;

    head.append(name, date);

    const list = document.createElement('div');
    list.className = 'calendar-task-list';

    const mission = dailyMissions[index] || dailyMissions[index % Math.max(dailyMissions.length, 1)];
    const tasks = [];
    const dayKey = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][currentDate.getDay()];

    if (mission) {
      tasks.push({
        title: mission.title,
        meta: mission.pillar + ' | ' + buildMissionMeta(mission)
      });
    }

    if (index === 0 || workoutDays.has(dayKey)) {
      tasks.push({
        title: 'Treino programado',
        meta: normalizedProfile.bodyType + ' | ' + normalizedProfile.trainingGoal
      });
    }

    tasks.push({
      title: 'Bloco de foco',
      meta: priorityText || normalizedProfile.primaryGoals
    });

    tasks.slice(0, 3).forEach((task) => {
      const item = document.createElement('div');
      item.className = 'calendar-task';

      const taskTitle = document.createElement('div');
      taskTitle.className = 'calendar-task-title';
      taskTitle.textContent = task.title;

      const taskMeta = document.createElement('div');
      taskMeta.className = 'calendar-task-meta';
      taskMeta.textContent = task.meta;

      item.append(taskTitle, taskMeta);
      list.appendChild(item);
    });

    if (!tasks.length) {
      const empty = document.createElement('div');
      empty.className = 'calendar-empty';
      empty.textContent = 'Sem tarefas definidas para este dia.';
      list.appendChild(empty);
    }

    card.append(head, list);
    container.appendChild(card);
  }
}

function renderSamsungCalendar(plan, profile) {
  const monthGrid = getElement('calendar-month-grid');
  const monthTitle = getElement('calendar-month-title');
  const agendaList = getElement('calendar-agenda-list');
  const agendaDate = getElement('calendar-agenda-date');
  if (!monthGrid || !monthTitle || !agendaList || !agendaDate) return;

  const normalizedProfile = sanitizeRoutineProfile(profile);
  const monthDate = new Date(currentCalendarMonth);
  monthDate.setDate(1);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: APP_TIME_ZONE }).format(monthDate);

  monthTitle.textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  monthGrid.textContent = '';

  const events = buildCalendarEvents(plan, normalizedProfile);
  const selectedDate = selectedCalendarDateKey || getDateKeyForDate(new Date());

  for (let index = 0; index < firstDayOfWeek; index++) {
    const filler = document.createElement('button');
    filler.className = 'calendar-day-cell calendar-day-cell--muted';
    filler.type = 'button';
    filler.setAttribute('aria-hidden', 'true');
    monthGrid.appendChild(filler);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = getDateKeyForDate(date);
    const dayEvents = events.filter((event) => event.dateKey === dateKey);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'calendar-day-cell';
    cell.dataset.dateKey = dateKey;
    cell.setAttribute('role', 'gridcell');
    cell.classList.toggle('calendar-day-cell--selected', dateKey === selectedDate);

    const number = document.createElement('div');
    number.className = 'calendar-day-number';
    number.textContent = String(day);

    const dots = document.createElement('div');
    dots.className = 'calendar-day-dot-row';

    dayEvents.slice(0, 3).forEach((event) => {
      const dot = document.createElement('span');
      dot.className = 'calendar-day-dot calendar-day-dot--' + event.kind;
      dots.appendChild(dot);
    });

    cell.append(number, dots);
    cell.addEventListener('click', () => {
      selectedCalendarDateKey = dateKey;
      renderSamsungCalendar(currentAdaptivePlan || plan, normalizedProfile);
    });
    monthGrid.appendChild(cell);
  }

  renderAgendaForDate(selectedDate, events, agendaList, agendaDate);
}

function renderAgendaForDate(dateKey, events, agendaList, agendaDate) {
  agendaList.textContent = '';
  const date = parseDateKey(dateKey);
  agendaDate.textContent = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: APP_TIME_ZONE
  }).format(date);

  const dayEvents = events.filter((event) => event.dateKey === dateKey);
  if (!dayEvents.length) {
    const empty = document.createElement('div');
    empty.className = 'calendar-empty';
    empty.textContent = 'Sem eventos para este dia.';
    agendaList.appendChild(empty);
    return;
  }

  dayEvents.forEach((event) => {
    const item = document.createElement('article');
    item.className = 'agenda-item';
    const title = document.createElement('div');
    title.className = 'agenda-item-title';
    title.textContent = event.title;
    const meta = document.createElement('div');
    meta.className = 'agenda-item-meta';
    meta.textContent = event.meta;
    item.append(title, meta);
    agendaList.appendChild(item);
  });
}

function buildCalendarEvents(plan, profile) {
  const normalizedProfile = sanitizeRoutineProfile(profile);
  const events = [];
  const baseDate = new Date(currentCalendarMonth);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dailyMissions = Array.isArray(plan?.dailyMissions) ? plan.dailyMissions : [];
  const workoutDays = new Set(sanitizeWorkoutDays(normalizedProfile.workoutDays));

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = getDateKeyForDate(date);
    const weekdayKey = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][date.getDay()];
    const mission = dailyMissions[(day - 1) % Math.max(dailyMissions.length, 1)];

    if (mission) {
      events.push({
        dateKey,
        kind: mission.type === 'penalidade' ? 'focus' : mission.type === 'treino' ? 'training' : 'mission',
        title: mission.title,
        meta: mission.rationale || mission.description
      });
    }

    if (workoutDays.has(weekdayKey)) {
      events.push({
        dateKey,
        kind: 'training',
        title: 'Treino programado',
        meta: normalizedProfile.trainingGoal + ' | ' + normalizedProfile.bodyType
      });
    }

    events.push({
      dateKey,
      kind: 'focus',
      title: 'Bloco de foco',
      meta: truncatePlannerText(normalizedProfile.currentPriorities || normalizedProfile.primaryGoals, 64)
    });
  }

  return events;
}

function getDateKeyForDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey || '').split('-').map((value) => Number(value));
  return new Date(year, (month || 1) - 1, day || 1);
}

function renderAiChat() {
  const history = getElement('ai-chat-history');
  if (!history) return;

  history.textContent = '';
  if (aiConversation.length === 0) {
    aiConversation.push({
      role: 'assistant',
      content: 'Eu sou a ASCEND AI. Pergunte sobre seu calendário, rotina, estudo, treino ou próximas ações.'
    });
  }

  aiConversation.forEach((message) => {
    const bubble = document.createElement('article');
    bubble.className = 'chat-bubble chat-bubble--' + (message.role === 'user' ? 'user' : 'assistant');
    const title = document.createElement('div');
    title.className = 'chat-bubble-title';
    title.textContent = message.role === 'user' ? 'Você' : 'ASCEND AI';
    const meta = document.createElement('div');
    meta.className = 'chat-bubble-meta';
    meta.textContent = message.content;
    bubble.append(title, meta);
    history.appendChild(bubble);
  });
}

function renderAssistantPresence(plan) {
  const state = inferAssistantPresence(plan);
  setText('planner-assistant-mode', state.mode);
  setText('planner-assistant-focus', state.focus);
  setText('planner-assistant-trace', state.trace);
}

function inferAssistantPresence(plan) {
  const adaptation = String(plan?.adaptationNote || '').toLowerCase();
  const insights = Array.isArray(plan?.insights) ? plan.insights : [];
  const dailyMissions = Array.isArray(plan?.dailyMissions) ? plan.dailyMissions : [];
  const firstMission = dailyMissions.find((mission) => mission && mission.actionable) || dailyMissions[0];
  const rhythmInsight = insights.find((entry) => String(entry).startsWith('Ritmo tatico:'));
  const trainingInsight = insights.find((entry) => String(entry).startsWith('Treino lido pela IA:'));

  let mode = 'MODO ADAPTIVO';
  if (adaptation.includes('desgaste')) {
    mode = 'MODO RECOVERY';
  } else if (adaptation.includes('sequencia forte')) {
    mode = 'MODO OVERCLOCK';
  } else if (adaptation.includes('desafios curtos')) {
    mode = 'MODO CHALLENGE';
  }

  return {
    mode,
    focus: firstMission
      ? 'Foco atual: ' + firstMission.title + '.'
      : 'Foco atual: calibrando a proxima melhor missao.',
    trace: (rhythmInsight || trainingInsight || 'Monitorando energia, motivacao e carga semanal.')
      .replace('Ritmo tatico: ', '')
      .replace('Treino lido pela IA: ', '')
  };
}

function renderPlannerInsights(insights) {
  const container = getElement('planner-insights');
  if (!container) return;

  container.textContent = '';

  insights.forEach((insight) => {
    const pill = document.createElement('span');
    pill.className = 'planner-insight-pill';
    pill.textContent = insight;
    container.appendChild(pill);
  });
}

function renderRoadmap(elementId, missions) {
  const container = getElement(elementId);
  if (!container) return;

  container.textContent = '';

  if (missions.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'reward-empty';
    empty.textContent = 'Sem roadmap gerado ainda.';
    container.appendChild(empty);
    return;
  }

  missions.forEach((mission) => {
    const card = document.createElement('article');
    card.className = 'roadmap-card roadmap-card--' + mission.type;
    card.setAttribute('role', 'listitem');

    const top = document.createElement('div');
    top.className = 'roadmap-topline';

    const pillar = document.createElement('span');
    pillar.className = 'roadmap-pill';
    pillar.textContent = (mission.pillar || mission.cadence || '').toUpperCase();

    const difficulty = document.createElement('span');
    difficulty.className = 'roadmap-difficulty';
    difficulty.textContent = (mission.difficulty || 'base').toUpperCase();

    top.append(pillar, difficulty);

    const title = document.createElement('h3');
    title.className = 'feature-title';
    title.textContent = mission.title;

    const description = document.createElement('p');
    description.className = 'feature-copy';
    description.textContent = mission.description;

    const rationale = document.createElement('p');
    rationale.className = 'roadmap-rationale';
    rationale.textContent = mission.rationale;

    const reward = document.createElement('div');
    reward.className = 'roadmap-reward';
    reward.textContent = '+' + mission.experienceReward + ' EXP | +' + mission.coinReward + ' moedas';

    card.append(top, title, description, rationale, reward);
    container.appendChild(card);
  });
}

function buildLocalAdaptivePlan(profile) {
  const normalizedProfile = sanitizeRoutineProfile(profile);
  const areas = getPlannerAreas(normalizedProfile);
  const daily = [];
  const weekly = [];
  const monthly = [];
  const dateKey = getDateKeyInTimeZone();
  const completedMissionIds = currentAdaptivePlan && Array.isArray(currentAdaptivePlan.completedMissionIds)
    ? currentAdaptivePlan.completedMissionIds
    : [];

  daily.push(buildLocalMission(areas[0], 'daily', normalizedProfile, true, dateKey, 1));

  areas.slice(1, 3).forEach((area, index) => {
    daily.push(buildLocalMission(area, 'daily', normalizedProfile, false, dateKey, index + 2));
  });

  daily.push({
    id: 'adaptive-focus-local-' + dateKey,
    type: 'foco',
    title: 'Dungeon de foco profundo',
    description: 'Diaria - execute ' + Math.max(25, Math.round(normalizedProfile.availableMinutesPerDay / 2)) + ' min na sua prioridade principal sem interrupcoes.',
    experienceReward: 48,
    coinReward: 12,
    required: true,
    cadence: 'daily',
    pillar: 'Foco',
    difficulty: 'leve',
    rationale: 'Cria tracao imediata na frente mais importante do dia.',
    actionable: true
  });

  if ((normalizedProfile.obstacles || '').trim()) {
    daily.push({
      id: 'adaptive-recovery-local-' + dateKey,
      type: 'penalidade',
      title: 'Penalty Quest: recuperar consistencia',
      description: 'Diaria - feche um bloco curto mesmo nos dias ruins para neutralizar ' + normalizedProfile.obstacles + '.',
      experienceReward: 28,
      coinReward: 0,
      required: true,
      cadence: 'daily',
      pillar: 'Recuperacao',
      difficulty: 'leve',
      rationale: 'Funciona como missao de seguranca para nao quebrar o ritmo.',
      actionable: true
    });
  }

  areas.slice(0, 3).forEach((area, index) => {
    weekly.push(buildLocalMission(area, 'weekly', normalizedProfile, index === 0, dateKey, index + 10));
    monthly.push(buildLocalMission(area, 'monthly', normalizedProfile, index === 0, dateKey, index + 20));
  });

  return {
    assistantName: 'ASCEND AI',
    headline: 'Missoes inteligentes para ' + truncatePlannerText(normalizedProfile.primaryGoals, 64),
    summary: 'Plano gerado a partir das metas, prioridades e rotina informadas no seu perfil.',
    adaptationNote: 'O plano foi calibrado para manter constancia antes de escalar dificuldade.',
    insights: [
      'Prioridade central: ' + truncatePlannerText(normalizedProfile.currentPriorities, 52) + '.',
      'Janela diaria sugerida: ' + normalizedProfile.availableMinutesPerDay + ' min.',
      'Estilo de motivacao: ' + truncatePlannerText(normalizedProfile.motivationStyle, 42) + '.'
    ],
    dailyMissions: daily,
    weeklyMissions: weekly,
    monthlyMissions: monthly,
    completedMissionIds
  };
}

function getPlannerAreas(profile) {
  const areas = [];
  if (profile.studyFocus || /estud|curso|prova|mater/i.test(profile.primaryGoals + ' ' + profile.currentPriorities)) {
    areas.push('estudo');
  }
  if (profile.workFocus || /trabalho|carreira|ti|emprego|cliente/i.test(profile.primaryGoals + ' ' + profile.currentPriorities)) {
    areas.push('trabalho');
  }
  if (profile.healthFocus || /treino|academ|saude|sono|corpo/i.test(profile.primaryGoals + ' ' + profile.currentPriorities)) {
    areas.push('saude');
  }
  if (profile.projectFocus || /projeto|empresa|negocio|portfolio/i.test(profile.primaryGoals + ' ' + profile.currentPriorities)) {
    areas.push('projeto');
  }
  if (profile.habitFocus || /habito|rotina|disciplina|constancia/i.test(profile.primaryGoals + ' ' + profile.currentPriorities)) {
    areas.push('habito');
  }

  if (!areas.length) {
    return ['estudo', 'trabalho', 'saude'];
  }

  return [...new Set(areas)];
}

function buildLocalMission(area, cadence, profile, required, dateKey, salt) {
  const cadenceLabel = cadence === 'monthly' ? 'Mensal' : cadence === 'weekly' ? 'Semanal' : 'Diaria';
  const rewardBase = cadence === 'monthly' ? 210 : cadence === 'weekly' ? 115 : 48;
  const coinBase = cadence === 'monthly' ? 84 : cadence === 'weekly' ? 40 : 12;
  const difficulty = cadence === 'monthly' ? 'alto' : cadence === 'weekly' ? 'medio' : 'leve';
  const areaText = getPlannerAreaText(area, profile);
  const titleMap = {
    estudo: cadence === 'daily' ? 'Sprint de estudo' : cadence === 'weekly' ? 'Semana de consolidacao' : 'Marco mensal de estudo',
    trabalho: cadence === 'daily' ? 'Entrega de trabalho prioritario' : cadence === 'weekly' ? 'Avanco semanal da frente profissional' : 'Marco mensal profissional',
    saude: cadence === 'daily' ? 'Bloco de saude e energia' : cadence === 'weekly' ? 'Checkpoint fisico da semana' : 'Meta mensal de condicionamento',
    projeto: cadence === 'daily' ? 'Mover projeto pessoal um passo' : cadence === 'weekly' ? 'Entrega semanal do projeto' : 'Marco mensal do projeto',
    habito: cadence === 'daily' ? 'Habit loop: disciplina de base' : cadence === 'weekly' ? 'Consolidar habito-chave' : 'Instalar rotina de longo prazo'
  };
  const descriptionMap = {
    estudo: cadenceLabel + ' - estudar com foco em ' + areaText + '.',
    trabalho: cadenceLabel + ' - fechar uma entrega ligada a ' + areaText + '.',
    saude: cadenceLabel + ' - proteger treino, energia e recuperacao em ' + areaText + '.',
    projeto: cadenceLabel + ' - avancar uma etapa objetiva em ' + areaText + '.',
    habito: cadenceLabel + ' - repetir a rotina-base ligada a ' + areaText + '.'
  };
  const rationaleMap = {
    estudo: 'Aprofunda conhecimento sem perder consistencia.',
    trabalho: 'Gera progresso profissional claro e reduz dispersao.',
    saude: 'Sustenta energia para as outras frentes da vida.',
    projeto: 'Transforma ambicao em entrega real.',
    habito: 'Consolida disciplina em dias bons e ruins.'
  };
  const pillarMap = {
    estudo: 'Estudos',
    trabalho: 'Trabalho',
    saude: 'Saude',
    projeto: 'Projetos',
    habito: 'Habitos'
  };

  return {
    id: 'adaptive-' + area + '-local-' + cadence + '-' + salt + '-' + dateKey,
    type: area,
    title: titleMap[area] + ': ' + truncatePlannerText(areaText, 46),
    description: descriptionMap[area],
    experienceReward: rewardBase + (required ? 12 : 0),
    coinReward: coinBase + (required ? 6 : 0),
    required,
    cadence,
    pillar: pillarMap[area],
    difficulty,
    rationale: rationaleMap[area],
    actionable: cadence === 'daily'
  };
}

function getPlannerAreaText(area, profile) {
  switch (area) {
    case 'estudo':
      return profile.studyFocus || profile.primaryGoals;
    case 'trabalho':
      return profile.workFocus || profile.currentPriorities;
    case 'saude':
      return profile.healthFocus || profile.primaryGoals;
    case 'projeto':
      return profile.projectFocus || profile.primaryGoals;
    default:
      return profile.habitFocus || profile.currentPriorities;
  }
}

function truncatePlannerText(value, maxLength) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength).trim();
}

function renderTrainingPlan(profile) {
  const normalizedProfile = sanitizeRoutineProfile(profile);
  const plan = buildTrainingPlan(normalizedProfile);
  const container = getElement('training-days-list');
  const guideNotes = getElement('training-guide-notes');

  setText('training-split-badge', plan.days.length + ' dias');
  setText('training-split-summary', plan.summary);
  setText('training-bodytype-title', plan.bodyTypeLabel);
  setText('training-bodytype-copy', plan.bodyTypeCopy);
  setText('training-goal-title', plan.goalLabel);
  setText('training-goal-copy', plan.goalCopy);
  setText('training-plan-copy', plan.planCopy);

  if (container) {
    container.textContent = '';
    plan.days.forEach((dayPlan) => {
      const card = document.createElement('article');
      card.className = 'training-day-card';
      card.setAttribute('role', 'listitem');

      const dayHeader = document.createElement('div');
      dayHeader.className = 'training-day-header';

      const dayLabel = document.createElement('div');
      dayLabel.className = 'training-day-name';
      dayLabel.textContent = dayPlan.dayLabel;

      const splitLabel = document.createElement('span');
      splitLabel.className = 'training-day-split';
      splitLabel.textContent = dayPlan.splitLabel;

      dayHeader.append(dayLabel, splitLabel);

      const focus = document.createElement('p');
      focus.className = 'training-day-focus';
      focus.textContent = dayPlan.focus;

      const prescription = document.createElement('p');
      prescription.className = 'training-day-prescription';
      prescription.textContent = dayPlan.prescription;

      const exerciseList = document.createElement('div');
      exerciseList.className = 'training-exercise-list';
      dayPlan.exercises.forEach((exercise) => {
        const chip = document.createElement('span');
        chip.className = 'training-exercise-chip';
        chip.textContent = exercise;
        exerciseList.appendChild(chip);
      });

      const notes = document.createElement('p');
      notes.className = 'training-day-notes';
      notes.textContent = dayPlan.notes;

      card.append(dayHeader, focus, prescription, exerciseList, notes);
      container.appendChild(card);
    });
  }

  if (guideNotes) {
    guideNotes.textContent = '';
    plan.guideNotes.forEach((note) => {
      const pill = document.createElement('p');
      pill.className = 'training-guide-pill';
      pill.textContent = note;
      guideNotes.appendChild(pill);
    });
  }
}

function buildTrainingPlan(profile) {
  const workoutDays = sanitizeWorkoutDays(profile.workoutDays);
  const days = workoutDays.length ? workoutDays : [...DEFAULT_WORKOUT_DAYS];
  const bodyTypeMeta = getBodyTypeMeta(profile.bodyType);
  const goalMeta = getTrainingGoalMeta(profile.trainingGoal);
  const template = buildTrainingSplitTemplate(days.length, goalMeta.key);

  return {
    days: days.map((dayKey, index) => buildTrainingDayPlan(dayKey, template[index], bodyTypeMeta, goalMeta, profile.trainingLevel)),
    summary: 'Divisao montada para ' + days.map((day) => WORKOUT_DAY_LABELS[day]).join(', ') + '.',
    bodyTypeLabel: bodyTypeMeta.label,
    bodyTypeCopy: bodyTypeMeta.copy,
    goalLabel: goalMeta.label,
    goalCopy: goalMeta.copy,
    planCopy: 'Estrutura pensada para ' + goalMeta.label.toLowerCase() + ', com ajuste de volume para perfil ' + bodyTypeMeta.label.toLowerCase() + ' e nivel ' + profile.trainingLevel + '.',
    guideNotes: bodyTypeMeta.guideNotes
  };
}

function buildTrainingDayPlan(dayKey, template, bodyTypeMeta, goalMeta, trainingLevel) {
  const levelMeta = getTrainingLevelMeta(trainingLevel);

  return {
    dayLabel: WORKOUT_DAY_LABELS[dayKey] || dayKey,
    splitLabel: template.name,
    focus: template.focus,
    prescription: levelMeta.series + ' | ' + goalMeta.repRange + ' | descanso ' + bodyTypeMeta.rest + '.',
    exercises: template.exercises.concat(bodyTypeMeta.finishers).slice(0, 6),
    notes: bodyTypeMeta.notePrefix + ' ' + goalMeta.note + ' ' + levelMeta.note
  };
}

function buildTrainingSplitTemplate(dayCount, goalKey) {
  if (dayCount <= 1) {
    return [
      createTrainingTemplate('Full Body', 'Corpo inteiro com base nos padroes fundamentais.', [
        'Agachamento livre ou guiado',
        'Supino reto com halteres',
        'Remada curvada ou baixa',
        'Levantamento terra romeno',
        'Desenvolvimento de ombros',
        'Prancha abdominal'
      ])
    ];
  }

  if (dayCount === 2) {
    return [
      createTrainingTemplate('Upper', 'Peito, costas, ombros e bracos com foco em base forte.', [
        'Supino reto',
        'Remada fechada',
        'Desenvolvimento militar',
        'Puxada alta',
        'Rosca direta',
        'Triceps pulley'
      ]),
      createTrainingTemplate('Lower', 'Pernas completas e core para sustentar progresso global.', [
        'Agachamento',
        'Leg press',
        'Cadeira extensora',
        'Mesa flexora',
        'Panturrilha em pe',
        'Abdominal infra'
      ])
    ];
  }

  if (dayCount === 3) {
    return [
      createTrainingTemplate('Push', 'Empurrar: peito, ombros e triceps.', [
        'Supino inclinado',
        'Crucifixo maquina',
        'Desenvolvimento halteres',
        'Elevacao lateral',
        'Triceps corda'
      ]),
      createTrainingTemplate('Pull', 'Puxar: costas, deltoide posterior e biceps.', [
        'Puxada frontal',
        'Remada baixa',
        'Remada unilateral',
        'Face pull',
        'Rosca alternada'
      ]),
      createTrainingTemplate('Legs', 'Pernas e core com prioridade em base e estabilidade.', [
        'Agachamento hack',
        'Stiff',
        'Avanco',
        'Mesa flexora',
        'Panturrilha sentada',
        'Prancha com carga'
      ])
    ];
  }

  if (dayCount === 4) {
    return [
      createTrainingTemplate('Upper A', 'Peito e costas pesados com acessorios curtos.', [
        'Supino reto',
        'Puxada neutra',
        'Remada curvada',
        'Crucifixo inclinado',
        'Rosca scott'
      ]),
      createTrainingTemplate('Lower A', 'Quadriceps dominante com core.', [
        'Agachamento frontal',
        'Leg press',
        'Afundo bulgaro',
        'Cadeira extensora',
        'Abdominal cable'
      ]),
      createTrainingTemplate('Upper B', 'Ombros, dorsais e bracos em volume complementar.', [
        'Desenvolvimento maquina',
        'Remada articulada',
        'Puxada aberta',
        'Elevacao lateral',
        'Triceps frances'
      ]),
      createTrainingTemplate('Lower B', 'Posterior, gluteos e panturrilhas.', [
        'Terra romeno',
        'Mesa flexora',
        'Hip thrust',
        'Passada andando',
        'Panturrilha em leg press'
      ])
    ];
  }

  if (dayCount === 5) {
    return [
      createTrainingTemplate('Push', 'Peito, ombros e triceps com bloco principal.', [
        'Supino reto',
        'Supino inclinado',
        'Desenvolvimento halteres',
        'Elevacao lateral',
        'Triceps testa'
      ]),
      createTrainingTemplate('Pull', 'Costas e biceps com enfase em espessura.', [
        'Barra guiada ou puxada',
        'Remada cavalinho',
        'Remada unilateral',
        'Pulldown',
        'Rosca martelo'
      ]),
      createTrainingTemplate('Legs', 'Pernas completas com foco em progressao.', [
        'Agachamento livre',
        'Stiff',
        'Leg press',
        'Flexora',
        'Panturrilhas'
      ]),
      createTrainingTemplate(goalKey === 'forca' ? 'Upper Strength' : 'Upper Focus', 'Refino do tronco com intensidade controlada.', [
        'Supino com pausa',
        'Remada fechada',
        'Desenvolvimento sentado',
        'Face pull',
        'Rosca direta'
      ]),
      createTrainingTemplate(goalKey === 'emagrecimento' ? 'Metabolico Lower' : 'Lower Focus', 'Complemento de pernas, gluteos e estabilidade.', [
        'Agachamento goblet',
        'Passada alternada',
        'Cadeira abdutora',
        'Levantamento romeno',
        'Prancha lateral'
      ])
    ];
  }

  return [
    createTrainingTemplate('Push A', 'Primeiro bloco de empurrar com foco tecnico.', ['Supino reto', 'Desenvolvimento', 'Crucifixo', 'Elevacao lateral', 'Triceps corda']),
    createTrainingTemplate('Pull A', 'Primeiro bloco de puxar com dorsais e biceps.', ['Puxada frontal', 'Remada curvada', 'Pulldown', 'Face pull', 'Rosca direta']),
    createTrainingTemplate('Legs A', 'Pernas base com quadriceps e core.', ['Agachamento', 'Leg press', 'Extensora', 'Panturrilha', 'Prancha']),
    createTrainingTemplate('Push B', 'Variacao de peito e ombros para repetir estimulo sem saturar.', ['Supino inclinado', 'Desenvolvimento halteres', 'Cross over', 'Elevacao frontal', 'Triceps frances']),
    createTrainingTemplate('Pull B', 'Variacao de costas e bracos com volume complementar.', ['Remada baixa', 'Puxada neutra', 'Remada unilateral', 'Encolhimento', 'Rosca martelo']),
    createTrainingTemplate('Legs B', 'Posterior, gluteos e panturrilhas em segundo estimulo.', ['Terra romeno', 'Mesa flexora', 'Hip thrust', 'Passada', 'Panturrilha sentada']),
    createTrainingTemplate('Recuperacao Ativa', 'Dia leve para mobilidade, caminhada e restauracao.', ['Mobilidade quadril', 'Mobilidade toracica', 'Caminhada inclinada', 'Alongamento posterior', 'Respiracao diafragmatica'])
  ];
}

function createTrainingTemplate(name, focus, exercises) {
  return { name, focus, exercises };
}

function getBodyTypeMeta(bodyType) {
  switch (bodyType) {
    case 'ectomorfo':
      return {
        label: 'Ectomorfo',
        copy: 'Estrutura mais fina, metabolismo acelerado e melhor resposta com progressao de carga, compostos e cardio controlado.',
        rest: '75-90s',
        finishers: ['Mobilidade escapular'],
        notePrefix: 'Priorize exercicios compostos, pouco cardio extra e alimentacao suficiente para recuperar.',
        guideNotes: [
          'Ectomorfo: punhos e ombros mais estreitos, dificuldade maior para ganhar peso e massa.',
          'Se voce seca facil e demora para encher a musculatura, esse perfil pode fazer sentido.',
          'A referencia visual ajuda, mas avaliacao profissional e composicao corporal sao mais confiaveis.'
        ]
      };
    case 'endomorfo':
      return {
        label: 'Endomorfo',
        copy: 'Estrutura mais larga, maior facilidade para ganhar peso e boa resposta com musculacao consistente mais blocos metabolicos.',
        rest: '45-60s',
        finishers: ['Finalizador cardio 10-15 min'],
        notePrefix: 'Mantenha ritmo entre series, use boa amplitude e adicione gasto energetico controlado ao final.',
        guideNotes: [
          'Endomorfo: tronco e quadril mais largos, facilidade maior para acumular peso.',
          'Se voce ganha massa e gordura com facilidade, tende a se aproximar desse perfil.',
          'Treino, sono e alimentacao contam mais que o rotulo isolado do biotipo.'
        ]
      };
    default:
      return {
        label: 'Mesomorfo',
        copy: 'Estrutura atletica e resposta equilibrada ao treino, permitindo combinar carga, volume e progresso semanal.',
        rest: '60-75s',
        finishers: ['Core anti-rotacao'],
        notePrefix: 'Trabalhe progressao de carga sem sacrificar tecnica e mantenha volume moderado para evoluir com consistencia.',
        guideNotes: [
          'Mesomorfo: estrutura naturalmente mais atletica, com facilidade moderada para ganhar massa.',
          'Se seu corpo responde relativamente bem a treino e dieta, esse perfil costuma se encaixar.',
          'Biotipo serve como orientacao inicial, nao como regra fixa de treino.'
        ]
      };
  }
}

function getTrainingGoalMeta(goal) {
  switch (goal) {
    case 'emagrecimento':
      return {
        key: 'emagrecimento',
        label: 'Emagrecimento',
        copy: 'Sessoes com musculacao base, menor descanso e finalizadores para aumentar gasto energetico sem perder massa.',
        repRange: '10-15 reps',
        note: 'Feche cada treino com intensidade sustentavel e regularidade semanal.'
      };
    case 'condicionamento':
      return {
        key: 'condicionamento',
        label: 'Condicionamento',
        copy: 'Estrutura focada em resistencia muscular, tecnica e capacidade de manter rendimento ao longo da semana.',
        repRange: '12-15 reps',
        note: 'Controle pausas e mantenha boa densidade de treino.'
      };
    case 'forca':
      return {
        key: 'forca',
        label: 'Forca',
        copy: 'Mais prioridade para multiarticulares, descansos um pouco maiores e foco em progressao objetiva.',
        repRange: '4-8 reps',
        note: 'Busque carga progressiva com execucao limpa nos movimentos base.'
      };
    default:
      return {
        key: 'hipertrofia',
        label: 'Hipertrofia',
        copy: 'Volume bem distribuido para estimular crescimento muscular com recuperacao coerente entre os grupos.',
        repRange: '8-12 reps',
        note: 'Aproxime-se da falha com tecnica boa nas ultimas series.'
      };
  }
}

function getTrainingLevelMeta(level) {
  switch (level) {
    case 'avancado':
      return {
        series: '4-5 series por exercicio',
        note: 'Use progressao de carga ou repeticoes semanalmente e acompanhe fadiga.'
      };
    case 'intermediario':
      return {
        series: '3-4 series por exercicio',
        note: 'Mantenha 1 a 2 repeticoes em reserva na maior parte do treino.'
      };
    default:
      return {
        series: '2-3 series por exercicio',
        note: 'Comece consolidando tecnica, amplitude e regularidade antes de escalar carga.'
      };
  }
}

function ensureDailyRefreshWatcher() {
  if (dailyRefreshInterval) {
    return;
  }

  lastDailyDateKey = getDateKeyInTimeZone();
  dailyRefreshInterval = setInterval(() => {
    const currentDateKey = getDateKeyInTimeZone();
    if (currentDateKey === lastDailyDateKey) {
      return;
    }

    lastDailyDateKey = currentDateKey;
    cleanupDailyShopPurchases();

    if (getAuthToken()) {
      loadRoutine();
      showPopup('Rotacao diaria atualizada!', 0, 0);
      setText('popup-body', 'As missoes e os itens da loja foram atualizados para o novo dia.');
      setText('popup-exp', 'NOVO DIA');
      setText('popup-coins', currentDateKey);
    } else {
      renderShop();
    }
  }, 60 * 1000);
}

async function loadRanking() {
  try {
    const leaderboard = await apiRequest('/player/status/ranking');
    renderRanking(leaderboard.players || []);
  } catch (error) {
    renderRanking([]);
  }
}

function getLevelStartExperience(level) {
  if (!level || level <= 1) {
    return 0;
  }

  let totalExperience = 0;
  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    totalExperience += getNextLevelRequirement(currentLevel);
  }

  return totalExperience;
}

function getNextLevelRequirement(level) {
  if (!level || level <= 1) {
    return 1000;
  }
  if (level <= 3) {
    return 2000;
  }
  if (level <= 5) {
    return 5000;
  }
  if (level <= 7) {
    return 10000;
  }
  if (level <= 9) {
    return 20000;
  }
  if (level <= 29) {
    return 11250;
  }
  return 35000;
}

function updateExperience(level, experience, nextLevelExperience) {
  const currentLevelStart = getLevelStartExperience(level);
  const currentLevelGoal = Math.max(nextLevelExperience - currentLevelStart, 0);
  const currentLevelProgress = Math.max(experience - currentLevelStart, 0);
  const progress = currentLevelGoal > 0 ? Math.round((currentLevelProgress / currentLevelGoal) * 100) : 0;
  const boundedProgress = Math.min(100, Math.max(0, progress));
  const bar = getElement('exp-bar');
  const progressBar = getElement('exp-progress');

  setText('exp-label', formatCurrencyValue(experience) + ' / ' + formatCurrencyValue(nextLevelExperience));
  if (bar) {
    bar.dataset.progress = boundedProgress;
    bar.style.width = boundedProgress + '%';
  }
  if (progressBar) {
    progressBar.setAttribute('aria-valuenow', String(currentLevelProgress));
    progressBar.setAttribute('aria-valuemax', String(currentLevelGoal));
  }
}

function renderStats(stats) {
  const fieldMap = {
    strength: 'stat-forca',
    agility: 'stat-agilidade',
    vitality: 'stat-vitalidade',
    intelligence: 'stat-int',
    spirit: 'stat-espirito',
    missions: 'stat-missoes'
  };

  stats.forEach((stat) => {
    const elementId = fieldMap[stat.key];
    if (elementId) {
      setText(elementId, stat.value);
    }
  });
}

function renderMissions(missions, completedMissionIds = []) {
  const missionsList = getElement('missions-list');
  const completedIds = new Set(completedMissionIds);
  if (!missionsList) return;

  missionsList.textContent = '';

  if (missions.length === 0) {
    const empty = document.createElement('article');
    empty.className = 'feature-panel reward-card';
    const title = document.createElement('h2');
    title.className = 'feature-title';
    title.textContent = 'Nenhuma missao gerada ainda';
    const copy = document.createElement('p');
    copy.className = 'reward-empty';
    copy.textContent = 'Preencha seu perfil para o ASCEND AI montar suas proximas missoes.';
    empty.append(title, copy);
    missionsList.appendChild(empty);
    return;
  }

  missions.forEach((mission) => {
    const card = document.createElement('article');
    card.className = 'mission-card ' + mission.type;
    card.dataset.exp = mission.experienceReward;
    card.dataset.coins = mission.coinReward;
    card.dataset.missionId = mission.id;
    card.dataset.source = 'adaptive';
    card.setAttribute('role', 'listitem');

    const icon = document.createElement('div');
    icon.className = 'mission-icon ' + mission.type;
    icon.setAttribute('aria-hidden', 'true');
    icon.appendChild(createMissionIcon(mission.type));

    const content = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'mission-title';
    title.textContent = mission.title;
    const meta = document.createElement('p');
    meta.className = 'mission-meta';
    meta.textContent = buildMissionMeta(mission);
    const rationale = document.createElement('p');
    rationale.className = 'mission-rationale';
    rationale.textContent = mission.rationale || mission.description;
    content.append(title, meta, rationale);

    const reward = document.createElement('div');
    reward.className = 'mission-reward';
    reward.setAttribute(
      'aria-label',
      mission.type === 'penalidade'
        ? 'Recompensa: ' + mission.experienceReward + ' de experiencia. Se falhar, perde 50 EXP e 200 moedas.'
        : 'Recompensa: ' + mission.experienceReward + ' de experiencia e ' + mission.coinReward + ' moedas'
    );
    const exp = document.createElement('div');
    exp.className = 'mission-exp';
    exp.textContent = '+' + mission.experienceReward + ' EXP';
    const coins = document.createElement('div');
    coins.className = 'mission-coins';
    coins.textContent = mission.type === 'penalidade'
      ? 'EVITA -200'
      : mission.coinReward > 0 ? '+' + mission.coinReward + ' moedas' : 'RESGATE';
    if (mission.type === 'penalidade') {
      exp.classList.add('reward-danger');
      coins.classList.add('reward-danger');
    }
    reward.append(exp, coins);

    const button = document.createElement('button');
    button.className = 'btn-complete';
    button.type = 'button';
    button.textContent = mission.type === 'penalidade' ? 'CUMPRIR' : 'CONCLUIR';
    if (mission.type === 'penalidade') {
      button.classList.add('btn-danger-accent');
    }

    card.append(icon, content, reward, button);

    if (completedIds.has(mission.id)) {
      markMissionAsCompleted(card);
    }

    missionsList.appendChild(card);
  });
}

function createMissionIcon(type) {
  const icon = document.createElement('i');
  const iconMap = {
    treino: 'bi-lightning-charge',
    estudo: 'bi-book',
    financeiro: 'bi-coin',
    lendaria: 'bi-gem',
    penalidade: 'bi-exclamation-triangle',
    trabalho: 'bi-briefcase',
    saude: 'bi-heart-pulse',
    projeto: 'bi-kanban',
    habito: 'bi-arrow-repeat',
    foco: 'bi-bullseye'
  };

  icon.className = 'bi ' + (iconMap[type] || 'bi-check2-circle');
  return icon;
}

function buildMissionMeta(mission) {
  const metaParts = [];
  if (mission.pillar) metaParts.push(String(mission.pillar).toUpperCase());
  if (mission.cadence) metaParts.push(String(mission.cadence).toUpperCase());
  if (mission.required) metaParts.push('PRIORITARIA');
  if (mission.difficulty) metaParts.push(String(mission.difficulty).toUpperCase());
  return metaParts.join(' | ') || mission.description || 'MISSAO';
}

function markMissionAsCompleted(card) {
  const button = card.querySelector('.btn-complete');
  const title = card.querySelector('.mission-title').textContent;

  card.classList.add('concluida');
  card.setAttribute('aria-label', title + ' concluida');

  if (button) {
    button.textContent = 'CONCLUIDA';
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
  }
}

async function completeMission(card) {
  if (card.classList.contains('concluida')) return;

  const exp = Number(card.dataset.exp);
  const coins = Number(card.dataset.coins);
  const missionId = card.dataset.missionId;
  const title = card.querySelector('.mission-title').textContent;
  const button = card.querySelector('.btn-complete');

  try {
    if (button) {
      button.disabled = true;
      button.textContent = 'SALVANDO...';
    }

    const isAdaptiveMission = card.dataset.source === 'adaptive';
    const requestPath = isAdaptiveMission
      ? '/player/status/planner/missions/' + encodeURIComponent(missionId) + '/complete'
      : '/player/status/missions/' + encodeURIComponent(missionId) + '/complete';
    const requestOptions = {
      method: 'POST'
    };

    if (isAdaptiveMission) {
      requestOptions.body = JSON.stringify(currentRoutineProfile || getRoutineProfile());
    }

    const status = await apiRequest(requestPath, requestOptions);

    if (coins > 0) {
      registerVaultTransaction('entrada', 'Missao: ' + title, coins);
    }

    renderPlayerStatus(status);
    if (isAdaptiveMission) {
      await loadAdaptivePlan(currentRoutineProfile || getRoutineProfile(), false);
    }
    showPopup(title, exp, coins);
  } catch (error) {
    if (button) {
      button.disabled = false;
      button.textContent = card.classList.contains('penalidade') ? 'CUMPRIR' : 'CONCLUIR';
    }
    showPopup('Erro ao salvar missao', 0, 0);
    setText('popup-body', error.message);
  }
}

function updateExperienceProgress(increment) {
  const bar = getElement('exp-bar');
  if (!bar) return;
  const currentProgress = Number(bar.dataset.progress || 0);
  const nextProgress = Math.min(100, currentProgress + increment);

  bar.dataset.progress = nextProgress;
  bar.style.width = nextProgress + '%';
}

function getVaultHistory() {
  return readJsonStorage(VAULT_HISTORY_KEY);
}

function saveVaultHistory(history) {
  writeJsonStorage(VAULT_HISTORY_KEY, history);
}

function registerVaultTransaction(type, description, value) {
  const history = getVaultHistory();
  history.unshift({
    type,
    description,
    value,
    createdAt: new Date().toISOString()
  });

  if (history.length > 50) {
    history.length = 50;
  }

  saveVaultHistory(history);
}

function renderVault(coins) {
  const history = getVaultHistory();
  const today = new Date().toDateString();
  const dailyTransactions = history.filter((item) => new Date(item.createdAt).toDateString() === today);
  const dailyIncome = dailyTransactions
    .filter((item) => item.type === 'entrada')
    .reduce((total, item) => total + item.value, 0);
  const dailyOutcome = dailyTransactions
    .filter((item) => item.type === 'saida')
    .reduce((total, item) => total + item.value, 0);

  setText('vault-balance', formatCurrencyValue(coins));

  const panels = document.querySelectorAll('#view-vault .dashboard-grid .feature-panel .feature-value');
  if (panels[1]) {
    panels[1].textContent = '+' + formatCurrencyValue(dailyIncome);
  }
  if (panels[2]) {
    panels[2].textContent = formatCurrencyValue(dailyOutcome);
  }

  renderVaultHistory(history);
}

function renderVaultHistory(history) {
  const container = document.getElementById('vault-history-list');
  if (!container) return;

  container.textContent = '';

  if (history.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'vault-empty';
    empty.textContent = 'Nenhuma transacao ainda. Complete missoes para movimentar o Vault.';
    container.appendChild(empty);
    return;
  }

  history.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'vault-row';

    const description = document.createElement('span');
    description.className = 'vault-row-desc';
    description.textContent = item.description;

    const date = document.createElement('span');
    date.className = 'vault-row-date';
    date.textContent = new Date(item.createdAt).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const value = document.createElement('span');
    value.className = 'vault-row-value vault-row-value--' + item.type;
    value.textContent = (item.type === 'entrada' ? '+' : '-') + formatCurrencyValue(item.value) + ' moedas';

    row.append(description, date, value);
    container.appendChild(row);
  });
}

function getShopPurchases() {
  return readJsonStorage(SHOP_PURCHASES_KEY);
}

function saveShopPurchases(purchases) {
  writeJsonStorage(SHOP_PURCHASES_KEY, purchases);
}

function cleanupDailyShopPurchases() {
  const purchases = getShopPurchases();
  const todayPurchases = purchases.filter((entry) => isTodayDailyId(entry.itemId));

  if (todayPurchases.length !== purchases.length) {
    saveShopPurchases(todayPurchases);
  }
}

function getInventoryItems() {
  return readJsonStorage(INVENTORY_ITEMS_KEY);
}

function saveInventoryItems(items) {
  writeJsonStorage(INVENTORY_ITEMS_KEY, items);
}

function getActiveRewards() {
  return readJsonStorage(ACTIVE_REWARDS_KEY);
}

function saveActiveRewards(rewards) {
  writeJsonStorage(ACTIVE_REWARDS_KEY, rewards);
}

function createInventoryEntry(item) {
  const definition = getShopItemDefinition(item.id) || item;
  const now = new Date().toISOString();

  return {
    instanceId: item.dailyId + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    itemId: definition.id,
    dailyId: item.dailyId,
    categoria: definition.categoria,
    nome: definition.nome,
    descricao: definition.descricao,
    custo: definition.custo,
    rewardType: definition.rewardType || 'stored',
    durationMinutes: definition.durationMinutes || 0,
    effectLabel: definition.effectLabel || definition.nome,
    purchasedAt: now,
    status: 'stored'
  };
}

function confirmItemActivation(item) {
  return window.confirm(
    'Deseja utilizar "' + item.nome + '" agora?' +
    (item.durationMinutes ? '\n\nDuracao: ' + formatDurationLabel(item.durationMinutes * 60) + '.' : '')
  );
}

function cleanupExpiredRewards() {
  const now = Date.now();
  const activeRewards = getActiveRewards();
  const inventoryItems = getInventoryItems();

  const validRewards = activeRewards.filter((reward) => new Date(reward.endsAt).getTime() > now);
  if (validRewards.length !== activeRewards.length) {
    const validIds = new Set(validRewards.map((reward) => reward.instanceId));
    saveActiveRewards(validRewards);
    saveInventoryItems(
      inventoryItems.map((item) => {
        if (!validIds.has(item.instanceId) && item.status === 'active') {
          return {
            ...item,
            status: 'used'
          };
        }
        return item;
      })
    );
  }
}

function activateInventoryItem(instanceId) {
  cleanupExpiredRewards();
  const inventoryItems = getInventoryItems();
  const item = inventoryItems.find((entry) => entry.instanceId === instanceId);

  if (!item || item.rewardType !== 'timer' || item.status !== 'stored') {
    return false;
  }

  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + item.durationMinutes * 60 * 1000);
  const activeRewards = getActiveRewards();

  activeRewards.unshift({
    instanceId: item.instanceId,
    itemId: item.itemId,
    nome: item.nome,
    categoria: item.categoria,
    effectLabel: item.effectLabel,
    startedAt: startedAt.toISOString(),
    endsAt: endsAt.toISOString(),
    durationMinutes: item.durationMinutes
  });

  saveActiveRewards(activeRewards);
  saveInventoryItems(
    inventoryItems.map((entry) => entry.instanceId === instanceId
      ? {
        ...entry,
        status: 'active',
        activatedAt: startedAt.toISOString(),
        endsAt: endsAt.toISOString()
      }
      : entry)
  );

  ensureRewardInterval();
  renderActiveRewards();
  renderInventory();
  return true;
}

function storePurchasedItem(item) {
  const entry = createInventoryEntry(item);
  const inventoryItems = getInventoryItems();
  inventoryItems.unshift(entry);
  saveInventoryItems(inventoryItems);

  return {
    entry,
    activated: false
  };
}

function getRewardRemainingSeconds(reward) {
  return Math.max(0, Math.ceil((new Date(reward.endsAt).getTime() - Date.now()) / 1000));
}

function buildRewardSignature(rewards = getActiveRewards()) {
  return rewards
    .map((reward) => reward.instanceId + ':' + reward.endsAt)
    .join('|');
}

function buildInventoryActiveSignature(items = getInventoryItems()) {
  return items
    .filter((item) => item.status === 'active' && item.endsAt)
    .map((item) => item.instanceId + ':' + item.endsAt)
    .join('|');
}

function updateRewardCountdownDisplays() {
  const activeRewards = getActiveRewards();
  const rewardMap = new Map(activeRewards.map((reward) => [reward.instanceId, reward]));

  document.querySelectorAll('[data-reward-instance-id]').forEach((card) => {
    const reward = rewardMap.get(card.dataset.rewardInstanceId);
    if (!reward) return;

    const timer = card.querySelector('[data-reward-countdown]');
    const meta = card.querySelector('[data-reward-endtime]');

    if (timer) {
      timer.textContent = formatCountdown(getRewardRemainingSeconds(reward));
    }

    if (meta) {
      meta.textContent = 'Termina em ' + new Date(reward.endsAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  });
}

function updateInventoryCountdownDisplays() {
  const inventoryItems = getInventoryItems();
  const inventoryMap = new Map(inventoryItems.map((item) => [item.instanceId, item]));

  document.querySelectorAll('[data-inventory-instance-id]').forEach((card) => {
    const item = inventoryMap.get(card.dataset.inventoryInstanceId);
    if (!item || item.status !== 'active' || !item.endsAt) return;

    const timer = card.querySelector('[data-inventory-countdown]');
    if (timer) {
      timer.textContent = formatCountdown(Math.max(0, Math.ceil((new Date(item.endsAt).getTime() - Date.now()) / 1000)));
    }
  });
}

function ensureRewardInterval() {
  if (rewardInterval) {
    clearInterval(rewardInterval);
    rewardInterval = null;
  }

  cleanupExpiredRewards();
  rewardRenderSignature = buildRewardSignature();
  inventoryActiveSignature = buildInventoryActiveSignature();

  if (getActiveRewards().length === 0) {
    renderActiveRewards();
    renderInventory();
    return;
  }

  rewardInterval = setInterval(() => {
    cleanupExpiredRewards();
    const nextRewardSignature = buildRewardSignature();
    const nextInventorySignature = buildInventoryActiveSignature();

    if (nextRewardSignature !== rewardRenderSignature) {
      rewardRenderSignature = nextRewardSignature;
      renderActiveRewards();
    } else {
      updateRewardCountdownDisplays();
    }

    if (nextInventorySignature !== inventoryActiveSignature) {
      inventoryActiveSignature = nextInventorySignature;
      renderInventory();
    } else {
      updateInventoryCountdownDisplays();
    }

    if (getActiveRewards().length === 0) {
      clearInterval(rewardInterval);
      rewardInterval = null;
    }
  }, 1000);
}

function renderActiveRewards() {
  cleanupExpiredRewards();
  const grid = getElement('active-rewards-grid');
  if (!grid) return;

  const activeRewards = getActiveRewards();
  setText('inventory-active-items', activeRewards.length);
  grid.textContent = '';

  if (activeRewards.length === 0) {
    const empty = document.createElement('article');
    empty.className = 'feature-panel reward-card';
    const title = document.createElement('h2');
    title.className = 'feature-title';
    title.textContent = 'Nenhuma recompensa em andamento';
    const copy = document.createElement('p');
    copy.className = 'reward-empty';
    copy.textContent = 'Compre itens temporarios na loja para acompanhar pausas e blocos especiais em tempo real.';
    empty.append(title, copy);
    grid.appendChild(empty);
    return;
  }

  activeRewards.forEach((reward) => {
    const article = document.createElement('article');
    article.className = 'feature-panel reward-card';
    article.dataset.rewardInstanceId = reward.instanceId;

    const header = document.createElement('div');
    header.className = 'reward-card-header';

    const left = document.createElement('div');
    const tag = document.createElement('span');
    tag.className = 'reward-tag';
    tag.textContent = reward.categoria;
    const title = document.createElement('h2');
    title.className = 'feature-title';
    title.textContent = reward.nome;
    left.append(tag, title);

    const timer = document.createElement('div');
    timer.className = 'reward-timer';
    timer.dataset.rewardCountdown = 'true';
    timer.textContent = formatCountdown(getRewardRemainingSeconds(reward));

    header.append(left, timer);

    const copy = document.createElement('p');
    copy.className = 'feature-copy';
    copy.textContent = reward.effectLabel;

    const meta = document.createElement('div');
    meta.className = 'reward-meta';
    meta.dataset.rewardEndtime = 'true';
    meta.textContent = 'Termina em ' + new Date(reward.endsAt).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    article.append(header, copy, meta);
    grid.appendChild(article);
  });
}

function renderInventory() {
  cleanupExpiredRewards();
  const grid = getElement('inventory-grid');
  if (!grid) return;

  const inventoryItems = getInventoryItems();
  setText('inventory-total-items', inventoryItems.length);
  setText('inventory-active-items', getActiveRewards().length);
  grid.textContent = '';

  if (inventoryItems.length === 0) {
    const empty = document.createElement('article');
    empty.className = 'feature-panel inventory-item';
    const title = document.createElement('h2');
    title.className = 'feature-title';
    title.textContent = 'Inventario vazio';
    const copy = document.createElement('p');
    copy.className = 'inventory-empty';
    copy.textContent = 'Os itens comprados na loja vao aparecer aqui automaticamente.';
    empty.append(title, copy);
    grid.appendChild(empty);
    return;
  }

  inventoryItems.forEach((item) => {
    const article = document.createElement('article');
    article.className = 'feature-panel inventory-item';
    article.dataset.inventoryInstanceId = item.instanceId;

    const header = document.createElement('div');
    header.className = 'inventory-item-header';

    const left = document.createElement('div');
    const tag = document.createElement('span');
    tag.className = 'inventory-tag';
    tag.textContent = item.categoria;
    const title = document.createElement('h2');
    title.className = 'feature-title';
    title.textContent = item.nome;
    left.append(tag, title);

    const status = document.createElement('span');
    status.className = 'inventory-status inventory-status--' + item.status;
    status.textContent = item.status === 'active'
      ? 'ATIVO'
      : item.status === 'stored'
        ? 'PRONTO'
        : 'USADO';

    header.append(left, status);

    const copy = document.createElement('p');
    copy.className = 'feature-copy';
    copy.textContent = item.descricao;

    const meta = document.createElement('div');
    meta.className = 'inventory-meta';
    const purchasedAt = document.createElement('span');
    purchasedAt.textContent = 'Comprado em ' + new Date(item.purchasedAt).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    meta.appendChild(purchasedAt);

    if (item.rewardType === 'timer') {
      const duration = document.createElement('span');
      duration.textContent = 'Duracao: ' + formatDurationLabel(item.durationMinutes * 60);
      meta.appendChild(duration);
    }

    if (item.status === 'active' && item.endsAt) {
      const timer = document.createElement('div');
      timer.className = 'inventory-timer';
      timer.dataset.inventoryCountdown = 'true';
      timer.textContent = formatCountdown(Math.max(0, Math.ceil((new Date(item.endsAt).getTime() - Date.now()) / 1000)));
      meta.appendChild(timer);
    }

    const actions = document.createElement('div');
    actions.className = 'inventory-actions';

    if (item.rewardType === 'timer' && item.status === 'stored') {
      const activateButton = document.createElement('button');
      activateButton.className = 'btn-complete';
      activateButton.type = 'button';
      activateButton.textContent = 'USAR';
      activateButton.addEventListener('click', () => {
        if (confirmItemActivation(item) && activateInventoryItem(item.instanceId)) {
          showPopup('Recompensa ativada!', 0, 0);
          setText('popup-body', '"' + item.nome + '" agora esta em andamento no painel de recompensas ativas.');
          setText('popup-exp', 'INVENTARIO');
          setText('popup-coins', formatDurationLabel(item.durationMinutes * 60));
        }
      });
      actions.appendChild(activateButton);
    }

    if (item.status === 'active') {
      const activeInfo = document.createElement('button');
      activeInfo.className = 'btn-complete btn-secondary-action';
      activeInfo.type = 'button';
      activeInfo.disabled = true;
      activeInfo.textContent = 'EM USO';
      actions.appendChild(activeInfo);
    }

    article.append(header, copy, meta);
    if (actions.childElementCount > 0) {
      article.appendChild(actions);
    }
    grid.appendChild(article);
  });
}

function getCurrentCoins() {
  return currentPlayerStatus ? currentPlayerStatus.coins : 0;
}

function handleShopPurchase(itemId) {
  const item = getDailyShopItems().find((entry) => entry.dailyId === itemId);
  const purchasedIds = new Set(getShopPurchases().map((entry) => entry.itemId));

  if (!item || !currentPlayerStatus) {
    return;
  }

  if (purchasedIds.has(item.dailyId)) {
    showPopup('Item ja resgatado', 0, 0);
    setText('popup-body', 'Esse item ja foi resgatado na rotacao de hoje para este perfil.');
    setText('popup-exp', 'LOJA');
    setText('popup-coins', 'SEM ALTERACAO');
    return;
  }

  if (getCurrentCoins() < item.custo) {
    showPopup('Moedas insuficientes', 0, 0);
    setText('popup-body', 'Voce precisa de ' + formatCurrencyValue(item.custo) + ' moedas para resgatar este item.');
    setText('popup-exp', 'LOJA');
    setText('popup-coins', 'SALDO BAIXO');
    return;
  }

  const purchases = getShopPurchases();
  purchases.unshift({
    itemId: item.dailyId,
    createdAt: new Date().toISOString()
  });
  saveShopPurchases(purchases);

  const purchaseResult = storePurchasedItem(item);
  let activatedNow = false;

  if (purchaseResult.entry.rewardType === 'timer' && confirmItemActivation(purchaseResult.entry)) {
    activatedNow = activateInventoryItem(purchaseResult.entry.instanceId);
  }

  currentPlayerStatus = {
    ...currentPlayerStatus,
    coins: currentPlayerStatus.coins - item.custo
  };

  registerVaultTransaction('saida', 'Loja: ' + item.nome, item.custo);
  renderPlayerStatus(currentPlayerStatus);

  showPopup('Compra realizada!', 0, item.custo);
  setText(
    'popup-body',
    activatedNow
      ? '"' + item.nome + '" foi ativado e agora aparece no painel de recompensas ativas.'
      : '"' + item.nome + '" foi enviado para o seu inventario para uso posterior.'
  );
  setText('popup-exp', activatedNow ? 'ATIVO' : 'INVENTARIO');
  setText('popup-coins', '-' + formatCurrencyValue(item.custo) + ' moedas');
}

function renderShop() {
  const grid = document.querySelector('#view-shop .dashboard-grid');
  if (!grid) return;

  const items = getDailyShopItems();
  grid.textContent = '';

  items.forEach((item) => {
    const article = document.createElement('article');
    article.className = 'feature-panel shop-item' + (item.raridade === 'LENDARIO' ? ' shop-item--legendary' : '');

    const content = document.createElement('div');
    const kicker = document.createElement('div');
    kicker.className = 'feature-kicker' + (item.raridade === 'LENDARIO' ? ' feature-kicker--legendary' : '');
    kicker.textContent = item.raridade ? item.categoria + ' | ' + item.raridade : item.categoria;
    const title = document.createElement('h2');
    title.className = 'feature-title';
    title.textContent = item.nome;
    const description = document.createElement('p');
    description.className = 'feature-copy';
    description.textContent = item.descricao;

    const definition = getShopItemDefinition(item.id);
    if (definition && definition.rewardType === 'timer') {
      const duration = document.createElement('p');
      duration.className = 'feature-copy';
      duration.textContent = 'Ativa um contador visivel de ' + formatDurationLabel(definition.durationMinutes * 60) + '.';
      content.append(kicker, title, description, duration);
    } else {
      content.append(kicker, title, description);
    }

    const button = document.createElement('button');
    button.className = 'btn-complete';
    button.type = 'button';
    button.dataset.shopItem = item.dailyId;
    button.addEventListener('click', () => handleShopPurchase(item.dailyId));

    article.append(content, button);
    grid.appendChild(article);
  });

  renderShopState(items);
}

function renderShopState(items = getDailyShopItems()) {
  const purchasedIds = new Set(getShopPurchases().map((entry) => entry.itemId));

  document.querySelectorAll('#view-shop [data-shop-item]').forEach((button) => {
    const item = items.find((entry) => entry.dailyId === button.dataset.shopItem);
    if (!item) return;

    button.classList.remove('btn-purchased');
    button.disabled = false;

    if (purchasedIds.has(item.dailyId)) {
      button.textContent = 'RESGATADO';
      button.disabled = true;
      button.classList.add('btn-purchased');
      return;
    }

    button.textContent = formatCurrencyValue(item.custo) + ' moedas';
    if (getCurrentCoins() < item.custo) {
      button.classList.add('btn-purchased');
    }
  });
}

function renderAchievements(status) {
  const grid = document.querySelector('#view-achievements .dashboard-grid');
  if (!grid) return;

  grid.textContent = '';

  ACHIEVEMENTS.forEach((achievement) => {
    const article = document.createElement('article');
    article.className = 'feature-panel achievement' + (achievement.unlocked(status) ? ' unlocked' : '');

    const icon = document.createElement('i');
    icon.className = 'bi ' + achievement.icone;
    icon.setAttribute('aria-hidden', 'true');

    const content = document.createElement('div');
    const title = document.createElement('h2');
    title.className = 'feature-title';
    title.textContent = achievement.titulo;
    const description = document.createElement('p');
    description.className = 'feature-copy';
    description.textContent = achievement.descricao;
    const badge = document.createElement('span');
    badge.className = 'achievement-badge' + (achievement.unlocked(status) ? '' : ' achievement-badge--locked');
    badge.textContent = achievement.unlocked(status) ? 'DESBLOQUEADA' : 'BLOQUEADA';

    content.append(title, description, badge);
    article.append(icon, content);
    grid.appendChild(article);
  });
}

function renderRanking(players) {
  const rankingList = document.querySelector('#view-ranking .ranking-list');
  if (!rankingList) return;

  rankingList.textContent = '';

  if (players.length === 0) {
    const row = document.createElement('div');
    row.className = 'ranking-row';

    const empty = document.createElement('span');
    empty.className = 'ranking-name';
    empty.textContent = 'Ranking indisponivel no momento.';

    row.append(empty);
    rankingList.appendChild(row);
    return;
  }

  players.forEach((player) => {
    const row = document.createElement('div');
    row.className = 'ranking-row' + (player.currentUser ? ' current-user' : '');

    const position = document.createElement('span');
    position.className = 'ranking-position';
    position.textContent = '#' + player.position;

    const name = document.createElement('span');
    name.className = 'ranking-name';
    name.textContent = player.currentUser ? player.name + ' (voce)' : player.name;

    const level = document.createElement('span');
    level.className = 'ranking-nivel';
    level.textContent = 'Nv.' + player.level + ' | Rank ' + player.rank;

    const exp = document.createElement('span');
    exp.className = 'ranking-exp-value';
    exp.textContent = formatCurrencyValue(player.experience) + ' EXP';

    row.append(position, name, level, exp);
    rankingList.appendChild(row);
  });
}

function showPopup(title, exp, coins) {
  if (popupShowTimeout) {
    clearTimeout(popupShowTimeout);
    popupShowTimeout = null;
  }
  if (popupHideTimeout) {
    clearTimeout(popupHideTimeout);
    popupHideTimeout = null;
  }
  if (popupDisplayTimeout) {
    clearTimeout(popupDisplayTimeout);
    popupDisplayTimeout = null;
  }

  setText('popup-title', title);
  setText(
    'popup-body',
    exp > 0
      ? 'Missao concluida! Recompensas salvas no banco de dados.'
      : 'Sistema pronto para acompanhar sua rotina.'
  );
  setText('popup-exp', '+' + exp + ' EXP');
  setText('popup-coins', '+' + coins + ' moedas');

  const popup = getElement('system-popup');
  const toggleButton = getElement('btn-toggle-popup');
  if (!popup) return;

  popup.hidden = false;
  popup.style.display = 'block';
  if (toggleButton) toggleButton.setAttribute('aria-expanded', 'true');

  popupShowTimeout = setTimeout(() => {
    popup.classList.add('show');
    popupShowTimeout = null;
  }, 10);
  popupHideTimeout = setTimeout(hidePopup, 4000);
}

function hidePopup() {
  const popup = getElement('system-popup');
  const toggleButton = getElement('btn-toggle-popup');
  if (!popup) return;

  popup.classList.remove('show');
  if (toggleButton) toggleButton.setAttribute('aria-expanded', 'false');
  if (popupHideTimeout) {
    clearTimeout(popupHideTimeout);
    popupHideTimeout = null;
  }
  if (popupDisplayTimeout) {
    clearTimeout(popupDisplayTimeout);
  }
  popupDisplayTimeout = setTimeout(() => {
    popup.style.display = 'none';
    popup.hidden = true;
    popupDisplayTimeout = null;
  }, 400);
}

function togglePopup() {
  const popup = getElement('system-popup');
  if (!popup) return;

  if (popup.style.display === 'none' || !popup.style.display) {
    showPopup('Sistema ASCEND', 0, 0);
    return;
  }

  hidePopup();
}

function openAiAssistant() {
  showView('ai');
  renderAiChat();
}

function openCalendarScreen() {
  showView('calendar');
  renderSamsungCalendar(currentAdaptivePlan || buildLocalAdaptivePlan(currentRoutineProfile || getRoutineProfile()), currentRoutineProfile || getRoutineProfile());
}

async function handleAiChatSubmit(event) {
  event.preventDefault();
  const input = getElement('ai-chat-input');
  const message = input ? input.value.trim() : '';
  if (!message) return;

  aiConversation.push({ role: 'user', content: message });
  if (input) input.value = '';
  renderAiChat();

  const typingMessage = { role: 'assistant', content: 'Pensando...' };
  aiConversation.push(typingMessage);
  renderAiChat();

  try {
    const response = await apiRequest('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation: aiConversation.filter((entry) => entry !== typingMessage).slice(-10),
        profile: currentRoutineProfile || getRoutineProfile()
      })
    });

    aiConversation.pop();
    aiConversation.push({ role: 'assistant', content: response.reply || 'Sem resposta da IA.' });
  } catch (error) {
    aiConversation.pop();
    aiConversation.push({
      role: 'assistant',
      content: 'Não consegui falar com a IA agora. ' + error.message
    });
  }

  renderAiChat();
}

function clearAiChat() {
  aiConversation = [];
  renderAiChat();
}

function changeCalendarMonth(offset) {
  currentCalendarMonth = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + offset, 1);
  selectedCalendarDateKey = getDateKeyForDate(currentCalendarMonth);
  renderSamsungCalendar(currentAdaptivePlan || buildLocalAdaptivePlan(currentRoutineProfile || getRoutineProfile()), currentRoutineProfile || getRoutineProfile());
}

function getTimerAriaLabel(minutes, seconds) {
  const minuteText = minutes === 1 ? 'minuto' : 'minutos';
  const secondText = seconds === 1 ? 'segundo' : 'segundos';
  return 'Tempo restante: ' + minutes + ' ' + minuteText + ' e ' + seconds + ' ' + secondText;
}

function updateTimerUI() {
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const m = String(minutes).padStart(2, '0');
  const s = String(seconds).padStart(2, '0');
  const timerDisplay = getElement('timer-display');

  if (!timerDisplay) return;

  const timerRegion = timerDisplay.closest('.timer-ring');
  const progress = remaining / totalSeconds;
  const offset = circumference * (1 - progress);
  const timerCircle = getElement('timer-circle');

  timerDisplay.textContent = m + ':' + s;
  if (timerRegion) {
    timerRegion.setAttribute('aria-label', getTimerAriaLabel(minutes, seconds));
  }
  if (timerCircle) {
    timerCircle.style.strokeDashoffset = offset;
    timerCircle.style.strokeDasharray = circumference;
  }
}

function startTimer() {
  const startButton = getElement('btn-start');
  if (!startButton) return;

  if (running) {
    clearInterval(timerInterval);
    running = false;
    startButton.textContent = 'INICIAR';
    startButton.setAttribute('aria-pressed', 'false');
    return;
  }

  running = true;
  startButton.textContent = 'PAUSAR';
  startButton.setAttribute('aria-pressed', 'true');

  timerInterval = setInterval(() => {
    remaining--;
    updateTimerUI();

    if (remaining <= 0) {
      clearInterval(timerInterval);
      running = false;
      cycles++;
      setText('cycle-count', cycles);
      startButton.textContent = 'INICIAR';
      startButton.setAttribute('aria-pressed', 'false');
      remaining = totalSeconds;
      updateTimerUI();
      showPopup('Ciclo Pomodoro completo!', 10, 0);
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(timerInterval);
  running = false;
  remaining = totalSeconds;

  const startButton = getElement('btn-start');
  if (startButton) {
    startButton.textContent = 'INICIAR';
    startButton.setAttribute('aria-pressed', 'false');
  }

  updateTimerUI();
}

function bindEvents() {
  const tabLogin = getElement('tab-login');
  const tabRegister = getElement('tab-register');
  const loginForm = getElement('login-form');
  const registerForm = getElement('register-form');
  const themeToggleButton = getElement('btn-theme-toggle');
  const popupButton = getElement('btn-toggle-popup');
  const logoutButton = getElement('btn-logout');
  const startButton = getElement('btn-start');
  const resetButton = getElement('btn-reset');
  const missionsList = getElement('missions-list');
  const plannerForm = getElement('planner-form');
  const plannerResetButton = getElement('planner-reset');
  const aiFabButton = getElement('ai-fab');
  const aiCalendarButton = getElement('btn-open-ai-calendar');
  const calendarOpenAiButton = getElement('calendar-open-ai');
  const aiOpenCalendarButton = getElement('ai-open-calendar');
  const calendarPrevButton = getElement('calendar-prev-month');
  const calendarNextButton = getElement('calendar-next-month');
  const calendarTodayButton = getElement('calendar-today');
  const aiChatForm = getElement('ai-chat-form');
  const aiChatClear = getElement('ai-chat-clear');

  if (tabLogin) tabLogin.addEventListener('click', () => switchAuthTab('login'));
  if (tabRegister) tabRegister.addEventListener('click', () => switchAuthTab('register'));
  if (tabLogin) tabLogin.addEventListener('keydown', handleAuthTabKeydown);
  if (tabRegister) tabRegister.addEventListener('keydown', handleAuthTabKeydown);
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (themeToggleButton) themeToggleButton.addEventListener('click', toggleTheme);
  if (popupButton) popupButton.addEventListener('click', togglePopup);
  if (logoutButton) logoutButton.addEventListener('click', handleLogout);
  if (startButton) startButton.addEventListener('click', startTimer);
  if (resetButton) resetButton.addEventListener('click', resetTimer);
  if (plannerForm) plannerForm.addEventListener('submit', handlePlannerSubmit);
  if (plannerResetButton) plannerResetButton.addEventListener('click', handlePlannerReset);
  if (aiFabButton) aiFabButton.addEventListener('click', openAiAssistant);
  if (aiCalendarButton) aiCalendarButton.addEventListener('click', openAiAssistant);
  if (calendarOpenAiButton) calendarOpenAiButton.addEventListener('click', openAiAssistant);
  if (aiOpenCalendarButton) aiOpenCalendarButton.addEventListener('click', openCalendarScreen);
  if (calendarPrevButton) calendarPrevButton.addEventListener('click', () => changeCalendarMonth(-1));
  if (calendarNextButton) calendarNextButton.addEventListener('click', () => changeCalendarMonth(1));
  if (calendarTodayButton) calendarTodayButton.addEventListener('click', () => {
    currentCalendarMonth = new Date();
    selectedCalendarDateKey = getDateKeyForDate(currentCalendarMonth);
    renderSamsungCalendar(currentAdaptivePlan || buildLocalAdaptivePlan(currentRoutineProfile || getRoutineProfile()), currentRoutineProfile || getRoutineProfile());
  });
  if (aiChatForm) aiChatForm.addEventListener('submit', handleAiChatSubmit);
  if (aiChatClear) aiChatClear.addEventListener('click', clearAiChat);

  document.querySelectorAll('.sidebar-link[data-view]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const viewName = link.dataset.view;
      if (!viewName) return;

      event.preventDefault();
      showView(viewName, link);
      closeSidebar();
    });
  });

  initSidebarDrawer();

  if (missionsList) {
    missionsList.addEventListener('click', (event) => {
      const button = event.target.closest('.btn-complete');
      if (!button) return;

      completeMission(button.closest('.mission-card'));
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getStoredTheme());
  bindEvents();
  selectedCalendarDateKey = getDateKeyForDate(new Date());
  currentCalendarMonth = new Date();
  updateTimerUI();
  ensureDailyRefreshWatcher();

  if (getAuthToken()) {
    loadRoutine();
  } else {
    showAuthScreen();
  }
});
