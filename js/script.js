import { genesisViews } from './genesis.js';
import { applyFrame, cosmeticAvatar } from './cosmetic-avatar.js';
import { initExperience } from './experience.js';
import { renderAssistantMessage } from './chat-format.js';
import { supportsCalendarReminders, syncCalendarReminders, clearCalendarReminders, requestCalendarReminderPermission, listenForCalendarReminder } from './calendar-reminders.js';
import aetherImage from '../assets/aether.png';
import astraImage from '../assets/astra.png';
import notificationSoundUrl from '../assets/notificacao-ascend.mp3';

const STORAGE_RESET_VERSION = '2026-04-27-reset-1';
const API_BASE_URL_STORAGE_KEY = 'ascend.api.baseUrl';
const DEFAULT_PUBLIC_API_BASE_URL = 'https://backend-ascend.onrender.com/api';
const AUTH_TOKEN_KEY = 'ascend.auth.token.' + STORAGE_RESET_VERSION;
const VAULT_HISTORY_KEY = 'ascend.vault.history.' + STORAGE_RESET_VERSION;
const SHOP_PURCHASES_KEY = 'ascend.shop.purchases.' + STORAGE_RESET_VERSION;
const INVENTORY_ITEMS_KEY = 'ascend.inventory.items.' + STORAGE_RESET_VERSION;
const ACTIVE_REWARDS_KEY = 'ascend.active.rewards.' + STORAGE_RESET_VERSION;
const THEME_STORAGE_KEY = 'ascend.theme';
const CUSTOMIZATION_STORAGE_KEY = 'ascend.customization.v1';
const ACCENT_STORAGE_KEY = 'ascend.accent';
const THEME_PRESETS = {
  crimson: { label: 'Crimson', accent: '#df2531', secondary: '#ffffff', bg: '#000000', panel: '#202020', panelRgb: '32, 32, 32', ambient: '#df2531' },
  lime: { label: 'Lime', accent: '#5dd62c', secondary: '#337418', bg: '#0f0f0f', panel: '#202020', panelRgb: '32, 32, 32', ambient: '#5dd62c' },
  purple: { label: 'Purple', accent: '#b900ff', secondary: '#00d9ff', bg: '#07030f', panel: '#160d2c', panelRgb: '22, 13, 44', ambient: '#7400c8' },
  blue: { label: 'Blue', accent: '#1266ff', secondary: '#00ceff', bg: '#080d19', panel: '#111e27', panelRgb: '17, 30, 39', ambient: '#1266ff' },
  gold: { label: 'Gold', accent: '#e6b84c', secondary: '#fff0bd', bg: '#100d08', panel: '#302719', panelRgb: '48, 39, 25', ambient: '#d8a638' }
};
const ROUTINE_PROFILE_KEY = 'ascend.routine.profile.' + STORAGE_RESET_VERSION;
const APP_TIME_ZONE = 'America/Sao_Paulo';
function appendFounderBadge(host){const b=document.createElement('span');b.className='founder-badge';b.title='Fundador do ASCEND — Reconhecimento exclusivo aos responsáveis pela criação e evolução do ASCEND.';b.setAttribute('role','img');b.setAttribute('aria-label','Fundador do ASCEND');const i=document.createElement('img');i.src='/founder/ascend-fundador-20.svg';i.alt='';i.width=20;i.height=20;b.append(i);host.append(b)}
function setFounderName(id,name,founder){const h=getElement(id);if(!h)return;h.textContent=name;if(founder)appendFounderBadge(h)}
const AVATAR_OPTIONS = {
  male: { image: aetherImage, label: 'AETHER — Guardião da evolução' },
  female: { image: astraImage, label: 'ASTRA — Ambição, força e inteligência' }
};
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
let timerDeadline = null;
let currentPlayerStatus = null;
let currentUser = null;
let viewingProfileId = null;
let profileImageDraft = null;
let profileImageChanged = false;
let playerSearchTimer = null;
let currentStorageScope = 'guest';
let currentRoutineProfile = null;
let currentAdaptivePlan = null;
let currentCalendarMonth = new Date();
let selectedCalendarDateKey = null;
let savedCalendarEvents = [];
let calendarView = 'day';
let editingCalendarEvent = null;
let calendarLoadSequence = 0;
let calendarLoadPromise = null;
let pendingCalendarNotification = null;
let aiConversation = [];
let shopPurchasePending = false;
let activeStoreCategory = 'TODAS';
let inspectedStoreItem = null;
let cosmeticStoreState = null;
function ownFrames(item){
  document.querySelectorAll('[data-user-avatar], #profile-edit-preview').forEach(img=>applyFrame(img.parentElement,item,img.closest('.player-avatar') !== null));
}
function acceptGenesis(state){
  cosmeticStoreState=state;
  if(currentPlayerStatus)currentPlayerStatus.coins=state.coins;
  for(const id of ['store-balance','vault-balance','status-coins-overview','coins-val'])setText(id,formatCurrencyValue(state.coins));
  applyEquippedCosmeticTheme(state);
}
const genesis=genesisViews({api:apiRequest,token:getAuthToken,portrait:()=>currentUser?.profileImage || AVATAR_OPTIONS[currentUser?.avatar]?.image || aetherImage,commit:acceptGenesis,navigate:showView});
let activeCosmeticCategory = 'TODAS';
let cosmeticActionPending = false;
let aiChatPending = false;
let selectedAvatar = null;
let avatarSelectionMode = 'onboarding';
let avatarSavePending = false;
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
  // An explicitly selected server owns this account's data. Do not silently
  // send credentials to a different environment when that server is offline.
  const queryValue = new URLSearchParams(window.location.search).get('apiBase');
  const viteValue = typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_API_URL
    : '';
  const storedValue = normalizeApiBaseUrl(localStorage.getItem(API_BASE_URL_STORAGE_KEY));
  const candidates = [apiBaseUrl || DEFAULT_PUBLIC_API_BASE_URL];

  // A stale value left by a previous local session should not brick the app.
  // Explicit query/env configuration still remains isolated to its own server.
  const isStalePersistedValue = Boolean(storedValue && !queryValue && !viteValue && storedValue === apiBaseUrl);
  if (isStalePersistedValue && storedValue !== DEFAULT_PUBLIC_API_BASE_URL) {
    candidates.push(DEFAULT_PUBLIC_API_BASE_URL);
  }

  return [...new Set(candidates)];
}

const apiBaseUrlCandidates = buildApiBaseUrlCandidates();

async function discoverApiBaseUrl() {
  for (const baseUrl of apiBaseUrlCandidates) {
    try {
      const response = await fetch(baseUrl + '/health', { signal: AbortSignal.timeout(90000) });
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
    'Não foi possível conectar ao servidor ASCEND. Verifique sua conexão e se o backend está em execução; depois tente novamente.'
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
  resetConnect();
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function clearAuthToken() {
  resetConnect();
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

function normalizeAccent(value) {
  const candidate = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : '#70e6d3';
}

function hexToRgb(hex) {
  const normalized = normalizeAccent(hex).slice(1);
  return [parseInt(normalized.slice(0, 2), 16), parseInt(normalized.slice(2, 4), 16), parseInt(normalized.slice(4, 6), 16)];
}

function applyAccent(value, options = {}) {
  const accent = normalizeAccent(value);
  const [red, green, blue] = hexToRgb(accent);
  const root = document.documentElement;
  const perceivedBrightness = (red * 299 + green * 587 + blue * 114) / 1000;
  const contrast = perceivedBrightness > 155 ? '#241b20' : '#fff8f0';
  const accentRgb = `${red}, ${green}, ${blue}`;
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-rgb', accentRgb);
  root.style.setProperty('--accent-soft', `rgba(${accentRgb}, .10)`);
  root.style.setProperty('--accent-medium', `rgba(${accentRgb}, .18)`);
  root.style.setProperty('--accent-border', `rgba(${accentRgb}, .38)`);
  root.style.setProperty('--accent-glow', `rgba(${accentRgb}, .28)`);
  root.style.setProperty('--accent-contrast', contrast);
  root.style.setProperty('--accent-gradient', `linear-gradient(120deg, ${accent}, rgba(${accentRgb}, .72))`);
  root.style.setProperty('--neon-cyan', accent);
  root.style.setProperty('--neon-blue', accent);
  root.style.setProperty('--neon-purple', accent);
  root.style.setProperty('--neon-gold', accent);
  root.style.setProperty('--mobile-pink', accent);
  root.style.setProperty('--mobile-purple', accent);
  root.style.setProperty('--mobile-blue', accent);
  root.style.setProperty('--mobile-blue-soft', accent);
  root.style.setProperty('--mobile-blue-glow', accent);
  root.style.setProperty('--border-glow', `rgba(${accentRgb}, .46)`);
  root.style.setProperty('--surface-tint', `rgba(${accentRgb}, .10)`);
  const favicon = getElement('brand-favicon');
  if (favicon) {
    const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80"><path fill="${accent}" d="M2 72 43 8h15l40 64H80L50 25 20 72H2ZM39 55h22l8 12H31z"/></svg>`;
    favicon.href = `data:image/svg+xml,${encodeURIComponent(icon)}`;
  }
  const picker = getElement('accent-color');
  if (picker) picker.value = accent;
  const trigger = getElement('btn-accent-picker');
  if (trigger) trigger.style.setProperty('--picker-color', accent);
}

function getStoredCustomization() {
  try {
    const stored = JSON.parse(localStorage.getItem(CUSTOMIZATION_STORAGE_KEY));
    if (stored && THEME_PRESETS[stored.preset]) return { preset: stored.preset, glow: Number(stored.glow ?? 72), glass: Number(stored.glass) || 58, ambient: stored.ambient !== false };
  } catch (error) { /* Usa o padrão abaixo. */ }
  const legacyAccent = localStorage.getItem(ACCENT_STORAGE_KEY);
  return { preset: 'blue', glow: 72, glass: 58, ambient: true, legacyAccent: legacyAccent || '' };
}

function saveCustomization(customization) {
  localStorage.setItem(CUSTOMIZATION_STORAGE_KEY, JSON.stringify(customization));
}

function applyCustomization(customization) {
  const presetKey = THEME_PRESETS[customization.preset] ? customization.preset : 'blue';
  const preset = THEME_PRESETS[presetKey];
  const glow = Math.max(0, Math.min(100, Number(customization.glow ?? 72)));
  const glass = Math.max(25, Math.min(85, Number(customization.glass) || 58));
  const ambient = customization.ambient !== false;
  const root = document.documentElement;
  const [red, green, blue] = hexToRgb(preset.accent);
  const rgb = `${red}, ${green}, ${blue}`;
  root.style.setProperty('--accent', preset.accent);
  root.style.setProperty('--accent-rgb', rgb);
  root.style.setProperty('--accent-secondary', preset.secondary);
  root.style.setProperty('--custom-bg', preset.bg);
  root.style.setProperty('--custom-panel', preset.panel);
  root.style.setProperty('--custom-panel-rgb', preset.panelRgb);
  root.style.setProperty('--custom-ambient', preset.ambient);
  root.style.setProperty('--custom-glow', String(glow / 100));
  root.style.setProperty('--custom-glass-alpha', String(glass / 100));
  root.style.setProperty('--custom-blur', `${Math.round(10 + (glass / 100) * 24)}px`);
  root.style.setProperty('--custom-ambient-opacity', ambient ? String(.12 + glow / 1000) : '0');
  applyAccent(preset.accent);

  document.body.dataset.customSkin = presetKey;
  const glowInput = getElement('customization-glow');
  const glassInput = getElement('customization-glass');
  const ambientInput = getElement('customization-ambient');
  if (glowInput) glowInput.value = String(glow);
  if (glassInput) glassInput.value = String(glass);
  if (ambientInput) ambientInput.checked = ambient;
  document.querySelectorAll('[data-theme-preset]').forEach((button) => {
    const selected = button.dataset.themePreset === presetKey;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  setText('customization-theme-label', preset.label);
  setText('customization-preview-theme', preset.label);
  return { preset: presetKey, glow, glass, ambient };
}

function updateCustomization() {
  const current = getStoredCustomization();
  const next = {
    preset: document.querySelector('[data-theme-preset].is-selected')?.dataset.themePreset || current.preset,
    glow: Number(getElement('customization-glow')?.value ?? current.glow),
    glass: Number(getElement('customization-glass')?.value || current.glass),
    ambient: Boolean(getElement('customization-ambient')?.checked)
  };
  saveCustomization(next);
  applyCustomization(next);
}

function getStoredAccent() {
  return normalizeAccent(localStorage.getItem(ACCENT_STORAGE_KEY));
}

function chooseAccent() {
  const picker = getElement('accent-color');
  if (picker) picker.click();
}

function toggleCustomization(force) {
  const panel = getElement('customization-panel');
  const trigger = getElement('btn-customize');
  if (!panel) return;
  const shouldOpen = typeof force === 'boolean' ? force : panel.hidden;
  panel.hidden = !shouldOpen;
  if (trigger) trigger.setAttribute('aria-expanded', String(shouldOpen));
  document.body.classList.toggle('customization-open', shouldOpen);
  if (shouldOpen) getElement('customization-glow')?.focus();
}

function updateAccent(event) {
  const accent = normalizeAccent(event.target.value);
  localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  applyAccent(accent);
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

function setStatusMessage(id, value, loading = false) {
  const element = setText(id, value);
  element?.classList.toggle('is-loading', loading);
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    response = await fetch(baseUrl + path, {
      ...options,
      headers,
      signal: options.signal || controller.signal
    });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('O servidor demorou para responder. Tente novamente em instantes.');
    activeApiBaseUrl = null;
    throw new Error(
      'Perdi a conexao com a API ASCEND em ' + baseUrl +
      '. Verifique se o backend continua ativo.'
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let message = 'Nao foi possivel concluir a operacao.';
    try {
      const error = await response.json();
      message = error.message || message;
    } catch (ignored) {
      // Mantem a mensagem padrao quando a resposta nao tem JSON.
    }
    const apiError = new Error(message);
    apiError.status = response.status;
    throw apiError;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function setAuthMessage(message) {
  const isLoading = /(conectando|criando|validando|carregando|sincronizando|salvando|preparando)/i.test(message);
  setStatusMessage('auth-message', message, isLoading);
}

function getFormValue(form, fieldName) {
  return form.elements[fieldName].value.trim();
}

function showAuthScreen() {
  genesis.reset(); ownFrames(null); cosmeticStoreState=null;
  closeSidebar();
  const avatarScreen = getElement('avatar-onboarding');
  if (avatarScreen) {
    avatarScreen.hidden = true;
    avatarScreen.setAttribute('aria-hidden', 'true');
    avatarScreen.classList.remove('is-editing', 'is-committing');
  }
  const authScreen = getElement('auth-screen');
  const appShell = getElement('app-shell');
  if (authScreen) authScreen.classList.remove('d-none');
  if (authScreen) authScreen.setAttribute('aria-hidden', 'false');
  if (appShell) appShell.classList.add('d-none');
  if (appShell) appShell.setAttribute('aria-hidden', 'true');
}

function showAppShell() {
  const avatarScreen = getElement('avatar-onboarding');
  if (avatarScreen) {
    avatarScreen.hidden = true;
    avatarScreen.setAttribute('aria-hidden', 'true');
    avatarScreen.classList.remove('is-editing', 'is-committing');
  }
  const authScreen = getElement('auth-screen');
  const appShell = getElement('app-shell');
  if (authScreen) authScreen.classList.add('d-none');
  if (authScreen) authScreen.setAttribute('aria-hidden', 'true');
  if (appShell) appShell.classList.remove('d-none');
  if (appShell) appShell.setAttribute('aria-hidden', 'false');
  const view = location.hash.replace('#view-', '') || 'status';
  showView(document.getElementById('view-' + view) ? view : 'status', null, false);
}

function renderUserIdentity(user) {
  currentUser = user;
  const avatar = AVATAR_OPTIONS[user?.avatar] ? user.avatar : null;
  document.querySelectorAll('[data-user-avatar]').forEach((image) => {
    const source = user?.profileImage || (avatar ? AVATAR_OPTIONS[avatar].image : null);
    const fallback = image.nextElementSibling;
    if (source) {
      let avatarFallbackApplied = false;
      image.onerror = () => {
        const fallbackSource = avatar ? AVATAR_OPTIONS[avatar].image : null;
        if (fallbackSource && !avatarFallbackApplied) {
          avatarFallbackApplied = true;
          image.src = fallbackSource;
          return;
        }
        image.hidden = true;
        if (fallback) fallback.hidden = false;
      };
      image.src = source;
      image.alt = user?.profileImage ? 'Foto de perfil de ' + (user.name || 'jogador') : AVATAR_OPTIONS[avatar].label;
      image.hidden = false;
      if (fallback) fallback.hidden = true;
    } else {
      image.removeAttribute('src');
      image.alt = '';
      image.hidden = true;
      if (fallback) fallback.hidden = false;
    }
  });
  setFounderName('sidebar-user-name', user?.name || 'Sua jornada',user?.isAscendFounder);
}

function updateAvatarConfirmButton() {
  const confirmButton = getElement('avatar-confirm');
  if (!confirmButton) return;
  const validSelection = Boolean(AVATAR_OPTIONS[selectedAvatar]);
  const unchanged = avatarSelectionMode === 'profile' && selectedAvatar === currentUser?.avatar;
  confirmButton.disabled = avatarSavePending || !validSelection || unchanged;
  confirmButton.classList.toggle('is-loading', avatarSavePending);
  const label = confirmButton.querySelector('.avatar-confirm__label');
  if (label) {
    label.textContent = avatarSavePending
      ? 'SALVANDO...'
      : avatarSelectionMode === 'profile' ? 'CONFIRMAR ALTERAÇÃO' : 'CONFIRMAR ESCOLHA';
  }
}

function selectAvatar(avatar) {
  if (!AVATAR_OPTIONS[avatar] || avatarSavePending) return;
  selectedAvatar = avatar;
  document.querySelectorAll('[data-avatar-choice]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.avatarChoice === avatar));
  });
  setStatusMessage('avatar-message', '');
  updateAvatarConfirmButton();
}

let avatarReturnToProfileEditor = false;

function openAvatarOnboarding(mode = 'onboarding') {
  const avatarScreen = getElement('avatar-onboarding');
  if (!avatarScreen) return;
  avatarSelectionMode = mode;
  selectedAvatar = mode === 'profile' && AVATAR_OPTIONS[currentUser?.avatar] ? currentUser.avatar : null;
  avatarSavePending = false;
  avatarScreen.hidden = false;
  avatarScreen.setAttribute('aria-hidden', 'false');
  avatarScreen.classList.toggle('is-editing', mode === 'profile');
  avatarScreen.classList.remove('is-committing');
  if (mode === 'onboarding') {
    const authScreen = getElement('auth-screen');
    const appShell = getElement('app-shell');
    if (authScreen) {
      authScreen.classList.add('d-none');
      authScreen.setAttribute('aria-hidden', 'true');
    }
    if (appShell) {
      appShell.classList.add('d-none');
      appShell.setAttribute('aria-hidden', 'true');
    }
  }

  setText('avatar-eyebrow', mode === 'profile' ? 'CONFIGURAÇÃO DE PERFIL' : 'SEU PRIMEIRO PASSO');
  setText('avatar-title', mode === 'profile' ? 'MUDE SUA ESSÊNCIA' : 'ESCOLHA SUA ESSÊNCIA');
  setText('avatar-subtitle', mode === 'profile'
    ? 'Sua jornada pode mudar. Escolha o personagem que representa você agora.'
    : 'Todo grande progresso começa com uma escolha. Selecione o personagem que representará sua jornada.');
  const cancelButton = getElement('avatar-cancel');
  if (cancelButton) cancelButton.hidden = mode !== 'profile';
  document.querySelectorAll('[data-avatar-choice]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.avatarChoice === selectedAvatar));
  });
  setStatusMessage('avatar-message', '');
  updateAvatarConfirmButton();
  document.querySelector(`[data-avatar-choice="${selectedAvatar || 'male'}"]`)?.focus({ preventScroll: true });
}

function closeAvatarEditor() {
  const screen = getElement('avatar-onboarding');
  screen.hidden = true;
  screen.setAttribute('aria-hidden', 'true');
  screen.classList.remove('is-editing');
  if (avatarReturnToProfileEditor) {
    avatarReturnToProfileEditor = false;
    const dialog = getElement('profile-edit-dialog');
    if (!dialog.open) dialog.showModal();
    getElement('profile-change-character')?.focus({ preventScroll: true });
  } else {
    getElement('btn-edit-avatar-dashboard')?.focus({ preventScroll: true });
  }
}

async function handleAvatarConfirm() {
  if (avatarSavePending || !AVATAR_OPTIONS[selectedAvatar]) {
    setStatusMessage('avatar-message', 'Selecione um dos personagens para continuar.');
    return;
  }

  const confirmButton = getElement('avatar-confirm');
  avatarSavePending = true;
  updateAvatarConfirmButton();
  setStatusMessage('avatar-message', 'Salvando sua identidade com segurança...', true);

  try {
    const savedUser = await apiRequest('/auth/avatar', {
      method: 'PUT',
      body: JSON.stringify({ avatar: selectedAvatar })
    });
    if (savedUser?.avatar !== selectedAvatar || savedUser?.onboardingCompleted !== true) {
      throw new Error('Não foi possível confirmar o salvamento do avatar. Tente novamente.');
    }

    renderUserIdentity(savedUser);
    if (avatarSelectionMode === 'profile') {
      if (avatarReturnToProfileEditor) setProfileEditPreview(profileImageDraft || AVATAR_OPTIONS[savedUser.avatar]?.image || null);
      closeAvatarEditor();
      if (!getElement('view-profile').hidden && !viewingProfileId) loadProfileView();
      showPopup('Avatar atualizado', 0, 0);
      setText('popup-body', 'Sua identidade ASCEND foi atualizada em toda a plataforma.');
      return;
    }

    setStatusMessage('avatar-message', 'Sua escolha foi registrada. Preparando sua jornada...', true);
    getElement('avatar-onboarding').classList.add('is-committing');
    await new Promise((resolve) => window.setTimeout(resolve, 2700));
    await loadRoutine();
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearAuthToken();
      currentUser = null;
      currentPlayerStatus = null;
      currentStorageScope = 'guest';
      showAuthScreen();
      setAuthMessage(error.message);
      return;
    }
    setStatusMessage('avatar-message', error.message || 'Não foi possível salvar seu avatar. Tente novamente.');
  } finally {
    avatarSavePending = false;
    if (confirmButton && !getElement('avatar-onboarding')?.hidden) updateAvatarConfirmButton();
  }
}

function showView(viewName, activeLink = null, updateHistory = true) {
  const target = document.getElementById('view-' + viewName);
  if (!target?.matches('[data-view-panel]')) return;
  if (['market','studio','cosmetics-admin'].includes(viewName)) genesis.open(viewName);
  else genesis.leave();
  if (viewName === 'calendar' && getAuthToken()) calendarLoadPromise = loadCalendarEvents();
  if (viewName === 'connect') { connectEl('connect-notifications').checked = localStorage.getItem(connectPreferenceKey()) !== 'off'; connectRefresh(); }
  if (viewName === 'profile') {
    viewingProfileId = null;
    loadProfileView();
  }
  if (updateHistory && location.hash !== '#view-' + viewName) history.pushState(null, '', '#view-' + viewName);
  const label = document.querySelector('.sidebar-link[data-view="' + viewName + '"]')?.textContent.trim();
  document.title = 'ASCEND · ' + (label || 'Sua evolução');
  closeSidebar();
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
    mainContent.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

async function loadProfileView(profileId = viewingProfileId) {
  const postsContainer = getElement('profile-posts');
  if (!postsContainer) return;
  postsContainer.textContent = 'Carregando perfil...';
  postsContainer.classList.add('is-loading');

  try {
    const endpoint = profileId
      ? '/profile/players/' + encodeURIComponent(profileId)
      : '/profile';
    const profile = await apiRequest(endpoint);
    postsContainer.classList.remove('is-loading');
    viewingProfileId = profileId || null;
    const ownProfile = !profileId || String(profile.id) === String(currentUser?.id);
    const status = ownProfile ? currentPlayerStatus : null;
    const unlockedAchievements = status
      ? ACHIEVEMENTS.filter((achievement) => achievement.unlocked(status))
      : [];

    getElement('profile-edit').hidden = !ownProfile;
    getElement('profile-post-form').hidden = !ownProfile;
    getElement('profile-message-button').hidden = ownProfile;
    getElement('profile-follow-button').hidden = ownProfile;
    getElement('profile-friend-button').hidden = ownProfile;
    setFounderName('profile-title', profile.name || 'Meu perfil',profile.isAscendFounder);
    setText('profile-handle', '@' + (profile.username || 'player') + ' · ID ' + profile.id);
    setText('profile-bio', profile.bio || 'Adicione uma bio para contar sua jornada.');
    const joinedDate = profile.joinedAt ? new Date(profile.joinedAt) : null;
    setText('profile-joined', joinedDate && !Number.isNaN(joinedDate.getTime())
      ? 'No ASCEND desde ' + joinedDate.toLocaleDateString('pt-BR')
      : '');

    const avatar = getElement('profile-avatar');
    const avatarOption = AVATAR_OPTIONS[profile.avatar];
    const profileImageSource = profile.profileImage || avatarOption?.image;
    if (avatar && profileImageSource) {
      avatar.src = profileImageSource;
      avatar.alt = profile.profileImage ? 'Foto de perfil de ' + profile.name : avatarOption.label;
      avatar.hidden = false;
      avatar.nextElementSibling.hidden = true;
    } else if (avatar) {
      avatar.removeAttribute('src');
      avatar.alt = '';
      avatar.hidden = true;
      avatar.nextElementSibling.hidden = false;
    }
    renderEquippedProfileCosmetics(profile.equippedCosmetics || []);
    if (ownProfile) applyEquippedCosmeticTheme({ items: profile.equippedCosmetics || [] });

    const tags = getElement('profile-tags');
    tags.replaceChildren();
    (profile.tags || []).forEach((tag) => {
      const chip = document.createElement('span');
      chip.textContent = tag;
      tags.appendChild(chip);
    });

    renderProfileMetrics(profile, ownProfile);
    renderProfileLevel(profile, ownProfile);
    renderProfileOverview(profile, ownProfile, status);
    renderProfileAchievements(ownProfile, unlockedAchievements);
    renderProfileDetails(profile, ownProfile, status);
    configureProfileActions(profile, ownProfile);
    setText('profile-social-feedback', '');

    postsContainer.replaceChildren();
    const posts = profile.posts || [];
    if (!posts.length) {
      const empty = document.createElement('p');
      empty.className = 'feature-copy';
      empty.textContent = 'Suas publicações aparecerão aqui.';
      postsContainer.appendChild(empty);
    }
    posts.forEach((post) => {
      const article = document.createElement('article');
      article.className = 'ascend-profile-post';
      const header = document.createElement('div');
      header.className = 'ascend-profile-post-meta';
      const author = document.createElement('strong');
      author.textContent = profile.name + ' · @' + profile.username;
      const date = document.createElement('time');
      date.dateTime = post.createdAt;
      date.textContent = new Date(post.createdAt).toLocaleString('pt-BR');
      header.append(author, date);
      const content = document.createElement('p');
      content.textContent = post.content;
      const actions = document.createElement('div');
      actions.className = 'ascend-social-actions';

      const like = document.createElement('button');
      like.type = 'button';
      like.className = 'btn-timer';
      like.textContent = (post.liked ? '♥ ' : '♡ ') + post.likes;
      like.setAttribute('aria-label', 'Curtir publicação');
      like.addEventListener('click', async () => {
        try {
          await apiRequest('/profile/posts/' + encodeURIComponent(post.id) + '/like', { method: 'POST' });
          await loadProfileView(profileId);
        } catch (error) {
          setText('profile-feedback', error.message);
        }
      });

      const comments = document.createElement('button');
      comments.type = 'button';
      comments.className = 'btn-timer';
      comments.textContent = 'Comentários (' + post.comments + ')';
      comments.addEventListener('click', async () => {
        try {
          const rows = await apiRequest('/profile/posts/' + encodeURIComponent(post.id) + '/comments');
          const current = rows.map((comment) =>
            '#' + comment.id + (comment.parentId ? ' ↳ #' + comment.parentId : '') +
            ' ' + comment.name + ': ' + comment.content
          ).join('\n');
          const parentText = rows.length
            ? window.prompt((current || '') + '\n\nID para responder (vazio cria comentário):', '')
            : '';
          if (parentText === null) return;
          const content = window.prompt('Escreva seu comentário ou resposta:');
          if (content === null || !content.trim()) return;
          const parentId = parentText?.trim() ? Number(parentText.replace(/^#/, '')) : null;
          if (parentId && !rows.some((comment) => comment.id === parentId)) {
            setText('profile-feedback', 'Esse comentário não foi encontrado.');
            return;
          }
          await apiRequest('/profile/posts/' + encodeURIComponent(post.id) + '/comments', {
            method: 'POST',
            body: JSON.stringify({ content, parentId })
          });
          await loadProfileView(profileId);
        } catch (error) {
          setText('profile-feedback', error.message);
        }
      });
      actions.append(like, comments);
      article.append(header, content, actions);

      if (ownProfile) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn-timer';
        remove.textContent = 'Excluir';
        remove.addEventListener('click', async () => {
          try {
            await apiRequest('/profile/posts/' + encodeURIComponent(post.id), { method: 'DELETE' });
            await loadProfileView();
          } catch (error) {
            setText('profile-feedback', error.message);
          }
        });
        actions.appendChild(remove);
      }
      postsContainer.appendChild(article);
    });
    openProfileTab('posts');
    if (ownProfile) {
      loadProfileFriends();
    } else {
      getElement('profile-friends').textContent = 'A lista de amigos não é exibida neste perfil.';
      setText('profile-friend-count', profile.friendStatus === 'ACCEPTED' ? 'Amigo' : '');
    }
  } catch (error) {
    postsContainer.classList.remove('is-loading');
    postsContainer.textContent = 'Não foi possível carregar o perfil: ' + error.message;
  }
}

function renderProfileMetrics(profile, ownProfile) {
  const metrics = getElement('profile-progression');
  metrics.replaceChildren();
  const posts = Array.isArray(profile.posts) ? profile.posts.length : 0;
  const following = ownProfile ? profile.following : profile.followingCount;
  [
    ['NÍVEL', profile.level, 'bi-bar-chart-line'],
    ['PUBLICAÇÕES', posts, 'bi-chat-square-text'],
    ['SEGUIDORES', profile.followers ?? 0, 'bi-people'],
    ['SEGUINDO', following ?? 0, 'bi-person-plus']
  ].forEach(([label, value, icon]) => {
    const card = document.createElement('div');
    card.className = 'ascend-profile-metric';
    const mark = document.createElement('i');
    mark.className = 'bi ' + icon;
    mark.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('span');
    copy.className = 'ascend-profile-metric-copy';
    const caption = document.createElement('small');
    caption.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = String(value ?? 0);
    copy.append(caption, strong);
    card.append(mark, copy);
    metrics.appendChild(card);
  });
}

function renderProfileLevel(profile, ownProfile) {
  const level = getElement('profile-level');
  level.replaceChildren();
  const badge = document.createElement('strong');
  badge.textContent = 'NÍVEL ' + (profile.level ?? 1) + ' · ' + (profile.rank || 'E');
  level.appendChild(badge);
  if (!ownProfile) {
    const note = document.createElement('small');
    note.textContent = 'Progresso detalhado disponível apenas no seu perfil.';
    level.appendChild(note);
    return;
  }

  const xp = Math.max(0, Number(profile.xp) || 0);
  const nextLevelXp = Math.max(xp + 1, Number(profile.nextLevelXp) || xp + 1);
  const progress = document.createElement('progress');
  progress.max = nextLevelXp;
  progress.value = Math.min(xp, nextLevelXp);
  progress.setAttribute('aria-label', 'Progresso de XP');
  const caption = document.createElement('small');
  caption.textContent = xp.toLocaleString('pt-BR') + ' / ' + nextLevelXp.toLocaleString('pt-BR') + ' XP';
  level.append(progress, caption);
}

function renderProfileOverview(profile, ownProfile, status) {
  const node = getElement('profile-overview-stats');
  node.replaceChildren();
  const entries = ownProfile
    ? [
        ['MISSÕES CONCLUÍDAS', getStatValue(status, 'missions'), 'bi-check2-circle'],
        ['XP ACUMULADO', Number(profile.xp || 0).toLocaleString('pt-BR'), 'bi-stars'],
        ['DIAS DE ATIVIDADE', Number(profile.streakDays || 0), 'bi-fire'],
        ['ATRIBUTO MAIS FORTE', getStrongestAttribute(status), 'bi-lightning-charge']
      ]
    : [
        ['NÍVEL', profile.level, 'bi-bar-chart-line'],
        ['PATENTE', profile.rank, 'bi-shield-check'],
        ['PUBLICAÇÕES', Array.isArray(profile.posts) ? profile.posts.length : 0, 'bi-chat-square-text'],
        ['SEGUIDORES', profile.followers ?? 0, 'bi-people']
      ];

  entries.forEach(([label, value, icon]) => {
    const card = document.createElement('article');
    card.className = 'ascend-profile-overview-card';
    const mark = document.createElement('i');
    mark.className = 'bi ' + icon;
    mark.setAttribute('aria-hidden', 'true');
    const caption = document.createElement('small');
    caption.textContent = label;
    const amount = document.createElement('strong');
    amount.textContent = String(value ?? '—');
    card.append(mark, caption, amount);
    node.appendChild(card);
  });
}

function renderProfileAchievements(ownProfile, unlocked) {
  ['profile-achievements', 'profile-side-achievements'].forEach((id) => {
    const node = getElement(id);
    node.replaceChildren();
    if (!ownProfile) {
      node.textContent = 'As conquistas não são exibidas neste perfil.';
      return;
    }
    if (!unlocked.length) {
      node.textContent = 'Complete missões para desbloquear conquistas.';
      return;
    }
    const achievements = id === 'profile-side-achievements'
      ? unlocked.slice(-3).reverse()
      : unlocked.slice().reverse();
    achievements.forEach((achievement) => {
      node.appendChild(createProfileAchievementCard(achievement));
    });
  });
}

function createProfileAchievementCard(achievement) {
  const card = document.createElement('article');
  card.className = 'ascend-profile-achievement';
  const icon = document.createElement('span');
  icon.className = 'ascend-profile-achievement-icon';
  const mark = document.createElement('i');
  mark.className = 'bi ' + achievement.icone;
  mark.setAttribute('aria-hidden', 'true');
  icon.appendChild(mark);
  const copy = document.createElement('span');
  copy.className = 'ascend-profile-achievement-copy';
  const title = document.createElement('strong');
  title.textContent = achievement.titulo;
  const description = document.createElement('small');
  description.textContent = achievement.descricao;
  copy.append(title, description);
  card.append(icon, copy);
  return card;
}

function getStrongestAttribute(status) {
  const attributes = (status?.stats || [])
    .filter((entry) => entry.key !== 'missions' && Number.isFinite(Number(entry.value)))
    .sort((left, right) => Number(right.value) - Number(left.value));
  return attributes.length
    ? attributes[0].name + ' · ' + attributes[0].value
    : 'Sem dados';
}

function renderProfileDetails(profile, ownProfile, status) {
  const node = getElement('profile-detail-stats');
  node.replaceChildren();
  const stats = Array.isArray(status?.stats)
    ? status.stats.filter((entry) => entry.key !== 'missions')
    : [];
  const entries = ownProfile
    ? [
        ['Missões concluídas', getStatValue(status, 'missions')],
        ['XP acumulado', Number(profile.xp || 0).toLocaleString('pt-BR')],
        ['Nível atual', profile.level],
        ['Patente', profile.rank],
        ['Dias consecutivos', Number(profile.streakDays || 0)],
        ...stats.map((entry) => [entry.name, entry.value])
      ]
    : [
        ['Nível atual', profile.level],
        ['Patente', profile.rank],
        ['Publicações', Array.isArray(profile.posts) ? profile.posts.length : 0],
        ['Seguidores', profile.followers ?? 0]
      ];
  entries.forEach(([name, value]) => {
    const row = document.createElement('div');
    row.className = 'ascend-profile-detail-row';
    const label = document.createElement('span');
    label.textContent = name;
    const amount = document.createElement('strong');
    amount.textContent = String(value ?? '—');
    row.append(label, amount);
    node.appendChild(row);
  });
}

function configureProfileActions(profile, ownProfile) {
  const followButton = getElement('profile-follow-button');
  followButton.textContent = profile.following ? 'Deixar de seguir' : 'Seguir jogador';
  followButton.dataset.following = String(Boolean(profile.following));
  followButton.setAttribute('aria-pressed', String(Boolean(profile.following)));

  const friendButton = getElement('profile-friend-button');
  const friendStatus = profile.friendStatus || 'NONE';
  const labels = {
    ACCEPTED: 'Remover amizade',
    OUTGOING: 'Cancelar solicitação',
    INCOMING: 'Aceitar amizade',
    NONE: 'Adicionar amigo'
  };
  friendButton.textContent = labels[friendStatus] || labels.NONE;
  friendButton.dataset.friendStatus = friendStatus;
  setText('profile-friend-count', ownProfile ? '' : friendStatus === 'ACCEPTED' ? 'Amigo' : '');
}

function openProfileTab(name) {
  const profileView = getElement('view-profile');
  profileView.querySelectorAll('[data-profile-tab]').forEach((button) => {
    const active = button.dataset.profileTab === name;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  profileView.querySelectorAll('[data-profile-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.profilePanel !== name;
  });
}

function handleProfileTabClick(event) {
  const control = event.target.closest('[data-profile-tab], [data-profile-tab-link]');
  if (!control) return;
  const name = control.dataset.profileTab || control.dataset.profileTabLink;
  if (name) openProfileTab(name);
}

function handleProfileTabKeydown(event) {
  const activeTab = event.target.closest('[data-profile-tab]');
  if (!activeTab) return;
  const tabs = [...getElement('view-profile').querySelectorAll('[data-profile-tab]')];
  const currentIndex = tabs.indexOf(activeTab);
  const nextIndex = event.key === 'ArrowRight'
    ? (currentIndex + 1) % tabs.length
    : event.key === 'ArrowLeft'
      ? (currentIndex - 1 + tabs.length) % tabs.length
      : event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : -1;
  if (nextIndex < 0) return;
  event.preventDefault();
  const nextTab = tabs[nextIndex];
  openProfileTab(nextTab.dataset.profileTab);
  nextTab.focus();
}

async function loadProfileFriends() {
  const profileId = viewingProfileId;
  const node = getElement('profile-friends');
  node.textContent = 'Carregando amigos...';
  node.classList.add('is-loading');
  try {
    const friends = await apiRequest('/profile/friends');
    if (profileId !== viewingProfileId) return;
    node.classList.remove('is-loading');
    node.replaceChildren();
    setText('profile-friend-count', friends.length + (friends.length === 1 ? ' amigo' : ' amigos'));
    if (!friends.length) {
      node.textContent = 'Sua lista de amigos aparecerá aqui.';
      return;
    }
    friends.slice(0, 8).forEach((friend) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ascend-profile-friend';
      button.title = 'Ver perfil de ' + friend.name;
      const avatar = document.createElement('span');
      avatar.className = 'ascend-profile-friend-avatar';
      const avatarOption = AVATAR_OPTIONS[friend.avatar];
      if (avatarOption) {
        const image = document.createElement('img');
        image.src = avatarOption.image;
        image.alt = '';
        avatar.appendChild(image);
      } else {
        const icon = document.createElement('i');
        icon.className = 'bi bi-person';
        icon.setAttribute('aria-hidden', 'true');
        avatar.appendChild(icon);
      }
      const name = document.createElement('small');
      applyFrame(avatar,friend.frame,false);
      name.textContent = friend.name;
      button.append(avatar, name);
      button.addEventListener('click', () => loadProfileView(friend.id));
      node.appendChild(button);
    });
  } catch (error) {
    if (profileId !== viewingProfileId) return;
    node.textContent = 'Não foi possível carregar os amigos: ' + error.message;
  }
}

async function handleProfileFollow() {
  if (!viewingProfileId) return;
  const button = getElement('profile-follow-button');
  const following = button.dataset.following === 'true';
  try {
    await apiRequest('/profile/follow/' + encodeURIComponent(viewingProfileId), {
      method: following ? 'DELETE' : 'POST'
    });
    await loadProfileView(viewingProfileId);
  } catch (error) {
    node.classList.remove('is-loading');
    setText('profile-social-feedback', error.message);
  }
}

async function handleProfileFriend() {
  if (!viewingProfileId) return;
  const status = getElement('profile-friend-button').dataset.friendStatus || 'NONE';
  const method = status === 'INCOMING'
    ? 'PUT'
    : status === 'ACCEPTED' || status === 'OUTGOING'
      ? 'DELETE'
      : 'POST';
  try {
    await apiRequest('/profile/friends/' + encodeURIComponent(viewingProfileId), { method });
    await loadProfileView(viewingProfileId);
  } catch (error) {
    setText('profile-social-feedback', error.message);
  }
}

async function saveProfilePost(event) {
  event.preventDefault();
  const input = getElement('profile-post-content');
  const feedback = getElement('profile-feedback');
  try {
    await apiRequest('/profile/posts', {
      method: 'POST',
      body: JSON.stringify({ content: input.value })
    });
    input.value = '';
    feedback.textContent = 'Publicação salva.';
    await loadProfileView();
  } catch (error) {
    feedback.textContent = error.message;
  }
}

async function editProfile() {
  const dialog = getElement('profile-edit-dialog');
  try {
    const current = await apiRequest('/profile');
    getElement('profile-edit-name').value = current.name || '';
    getElement('profile-edit-bio').value = current.bio || '';
    getElement('profile-edit-tags').value = (current.tags || []).join(', ');
    getElement('profile-edit-visibility').value = current.visibility || 'PUBLIC';
    profileImageDraft = current.profileImage || null;
    profileImageChanged = false;
    setProfileEditPreview(profileImageDraft || AVATAR_OPTIONS[current.avatar]?.image || null);
    setStatusMessage('profile-edit-feedback', '');
    if (!dialog.open) dialog.showModal();
    getElement('profile-edit-name').focus();
  } catch (error) {
    setText('profile-feedback', 'Não foi possível abrir a edição: ' + error.message);
  }
}

function setProfileEditPreview(source) {
  const preview = getElement('profile-edit-preview');
  const fallback = preview.nextElementSibling;
  if (source) {
    preview.src = source;
    preview.hidden = false;
    fallback.hidden = true;
  } else {
    preview.removeAttribute('src');
    preview.hidden = true;
    fallback.hidden = false;
  }
}

async function optimizeProfileImage(file) {
  const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!acceptedTypes.includes(file.type)) {
    throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('A imagem deve ter no máximo 8 MB.');
  }

  const bitmap = await createImageBitmap(file);
  try {
    for (const maxDimension of [512, 384, 256]) {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Não foi possível preparar a imagem neste navegador.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.82, 0.68, 0.54, 0.4]) {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (blob && blob.size <= 96 * 1024) {
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => resolve(reader.result), { once: true });
            reader.addEventListener('error', () => reject(new Error('Não foi possível ler a imagem preparada.')), { once: true });
            reader.readAsDataURL(blob);
          });
        }
      }
    }
    throw new Error('Não foi possível reduzir a imagem abaixo de 96 KB. Escolha uma imagem menor.');
  } finally {
    bitmap.close();
  }
}

async function handleProfileImageSelection(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  setStatusMessage('profile-edit-feedback', 'Preparando sua foto...', true);
  try {
    profileImageDraft = await optimizeProfileImage(file);
    profileImageChanged = true;
    setProfileEditPreview(profileImageDraft);
    setStatusMessage('profile-edit-feedback', '');
  } catch (error) {
    setStatusMessage('profile-edit-feedback', error.message);
  } finally {
    event.target.value = '';
  }
}

function handleProfileImageRemove() {
  profileImageDraft = null;
  profileImageChanged = true;
  setProfileEditPreview(null);
  setStatusMessage('profile-edit-feedback', '');
}

async function saveProfileEdits(event) {
  event.preventDefault();
  const saveButton = getElement('profile-edit-save');
  const name = getElement('profile-edit-name').value.trim();
  const tags = getElement('profile-edit-tags').value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (tags.length > 5) {
    setStatusMessage('profile-edit-feedback', 'Você pode escolher no máximo 5 tags.');
    return;
  }
  if (name.length < 2 || name.length > 80) {
    setStatusMessage('profile-edit-feedback', 'O nome deve ter entre 2 e 80 caracteres.');
    return;
  }

  saveButton.disabled = true;
  setStatusMessage('profile-edit-feedback', 'Salvando alterações...', true);
  try {
    const savedProfile = await apiRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name,
        bio: getElement('profile-edit-bio').value,
        tags,
        visibility: getElement('profile-edit-visibility').value,
        ...(profileImageChanged ? { profileImage: profileImageDraft || '' } : {})
      })
    });
    renderUserIdentity({ ...currentUser, name: savedProfile.name, profileImage: savedProfile.profileImage });
    if (currentPlayerStatus) currentPlayerStatus.name = savedProfile.name;
    setText('player-name', savedProfile.name);
    getElement('profile-edit-dialog').close();
    await Promise.all([loadProfileView(), loadRanking()]);
    setText('profile-feedback', 'Perfil atualizado.');
  } catch (error) {
    setStatusMessage('profile-edit-feedback', error.message);
  } finally {
    saveButton.disabled = false;
  }
}

async function searchPlayers() {
  const input = getElement('player-search');
  const results = getElement('player-search-results');
  if (!input || !results) return;
  const query = input.value.trim();
  if (query.length < 2) {
    results.textContent = 'Digite ao menos 2 caracteres.';
    return;
  }
  results.textContent = 'Buscando...';

  try {
    const players = await apiRequest('/profile/discover?q=' + encodeURIComponent(query));
    results.replaceChildren();
    if (!players.length) {
      results.textContent = 'Nenhum jogador encontrado.';
      return;
    }
    players.forEach((player) => {
      const row = document.createElement('div');
      row.className = 'ascend-player-row';
      const name = document.createElement('button');
      name.type = 'button';
      name.className = 'btn-timer';
      name.textContent = player.name + ' · @' + player.username;
      name.addEventListener('click', () => loadProfileView(player.id));

      const action = (label, callback) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn-timer';
        button.textContent = label;
        button.addEventListener('click', callback);
        row.appendChild(button);
      };
      action(player.following ? 'Deixar de seguir' : 'Seguir', async () => {
        try {
          await apiRequest('/profile/follow/' + encodeURIComponent(player.id), {
            method: player.following ? 'DELETE' : 'POST'
          });
          await searchPlayers();
        } catch (error) {
          results.textContent = error.message;
        }
      });
      const friendAction = player.friendStatus === 'ACCEPTED'
        ? 'Remover amizade'
        : player.friendStatus === 'OUTGOING'
          ? 'Cancelar solicitação'
          : player.friendStatus === 'INCOMING'
            ? 'Aceitar amizade'
            : 'Adicionar amigo';
      action(friendAction, async () => {
        try {
          const method = player.friendStatus === 'INCOMING' ? 'PUT'
            : player.friendStatus === 'ACCEPTED' || player.friendStatus === 'OUTGOING' ? 'DELETE'
              : 'POST';
          await apiRequest('/profile/friends/' + encodeURIComponent(player.id), { method });
          await searchPlayers();
        } catch (error) {
          results.textContent = error.message;
        }
      });
      action('Bloquear', async () => {
        if (!window.confirm('Bloquear ' + player.name + '?')) return;
        try {
          await apiRequest('/profile/block/' + encodeURIComponent(player.id), { method: 'POST' });
          await searchPlayers();
        } catch (error) {
          results.textContent = error.message;
        }
      });
      row.prepend(name);
      results.appendChild(row);
    });
  } catch (error) {
    results.textContent = error.message;
  }
}

async function loadFriendRequests() {
  const container = getElement('friend-requests');
  if (!container) return;
  container.textContent = 'Carregando...';
  container.classList.add('is-loading');
  try {
    const requests = await apiRequest('/profile/friends/requests');
    container.classList.remove('is-loading');
    container.replaceChildren();
    if (!requests.length) {
      container.textContent = 'Nenhuma solicitação pendente.';
      return;
    }
    requests.forEach((request) => {
      const row = document.createElement('div');
      row.className = 'ascend-player-row';
      const name = document.createElement('strong');
      name.textContent = request.name + ' · @' + request.username;
      const accept = document.createElement('button');
      accept.type = 'button';
      accept.className = 'btn-timer';
      accept.textContent = 'Aceitar';
      accept.addEventListener('click', async () => {
        try {
          await apiRequest('/profile/friends/' + encodeURIComponent(request.id), { method: 'PUT' });
          await loadFriendRequests();
        } catch (error) {
          container.textContent = error.message;
        }
      });
      row.append(name, accept);
      container.appendChild(row);
    });
  } catch (error) {
    container.classList.remove('is-loading');
    container.textContent = error.message;
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
  setAuthMessage('Conectando ao servidor... Se for a primeira tentativa em algum tempo, aguarde; não precisa clicar novamente.');

  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: getFormValue(form, 'email'),
        password: form.elements.password.value
      })
    });

    setAuthToken(data.token);
    setAuthMessage('Login confirmado. Carregando seu painel...');
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

async function handleGoogleCredential(response) {
  if (!response?.credential) {
    setAuthMessage('O Google não retornou uma credencial válida.');
    return;
  }
  const button = getElement('btn-google-login');
  if (button) button.disabled = true;
  setAuthMessage('Validando sua conta Google...');
  try {
    const data = await apiRequest('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential: response.credential })
    });
    setAuthToken(data.token);
    setAuthMessage('Login Google confirmado. Carregando seu painel...');
    await loadRoutine();
  } catch (error) {
    setAuthMessage(error.message);
  } finally {
    if (button) button.disabled = false;
  }
}

function initGoogleSignIn() {
  const button = getElement('btn-google-login');
  const container = getElement('google-signin-container');
  const wrapper = button?.closest('.google-login-wrap');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!button) return;
  if (!clientId) {
    button.addEventListener('click', () => setAuthMessage('Configure VITE_GOOGLE_CLIENT_ID para ativar o login Google.'));
    return;
  }
  button.addEventListener('click', () => {
    if (!wrapper?.classList.contains('is-configured')) {
      setAuthMessage('O Google ainda está carregando. Tente novamente em instantes.');
    }
  });
  const waitForGoogle = () => {
    if (!window.google?.accounts?.id) {
      window.setTimeout(waitForGoogle, 100);
      return;
    }
    window.google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleCredential });
    if (container && wrapper) {
      const width = Math.min(400, Math.max(120, Math.floor(button.getBoundingClientRect().width)));
      window.google.accounts.id.renderButton(container, { type: 'standard', theme: 'outline', size: 'large', width });
      wrapper.classList.add('is-configured');
    }
  };
  waitForGoogle();
}

async function handleLogout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } catch (ignored) {
    // O logout local ainda deve acontecer se a sessao ja tiver expirado.
  }

  clearAuthToken();
  clearCalendarReminders().catch(() => {});
  currentPlayerStatus = null;
  currentUser = null;
  currentStorageScope = 'guest';
  currentRoutineProfile = null;
  currentAdaptivePlan = null;
  savedCalendarEvents = [];
  calendarLoadSequence++;
  if (rewardInterval) {
    clearInterval(rewardInterval);
    rewardInterval = null;
  }
  if (dailyRefreshInterval) {
    clearInterval(dailyRefreshInterval);
    dailyRefreshInterval = null;
  }
  resetTimer();
  cycles = 0;
  setText('cycle-count', 0);
  aiConversation = [];
  renderAiChat();
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
    setText('popup-exp', 'ROTINA');
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
    setAuthMessage('Carregando seu status...');
    ensureDailyRefreshWatcher();
    cleanupDailyShopPurchases();
    const user = await apiRequest('/auth/me');
    renderUserIdentity(user);
    if (user.onboardingCompleted === false) {
      openAvatarOnboarding('onboarding');
      return;
    }
    const status = await apiRequest('/player/status');
    renderPlayerStatus(status);
    // A sessao e o status ja foram validados; a loja e o plano podem carregar
    // sem manter a interface autenticada bloqueada em conexoes lentas.
    showAppShell();
    const session=getAuthToken();
    if (!['#view-market','#view-studio'].includes(location.hash)) {
      apiRequest('/cosmetics/equipped').then(items=>{
        if(session===getAuthToken() && Array.isArray(items) && !cosmeticStoreState) ownFrames(items.find(i=>i.staticAsset && i.category==='PROFILE_FRAME'));
      }).catch(()=>{});
    }
    setAuthMessage('Sincronizando sua rotina...');
    try {
      await syncShopFromServer();
    } catch (shopError) {
      setShopMessage('A loja está temporariamente indisponível: ' + shopError.message);
    }
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
    if (supportsCalendarReminders()) {
      loadCalendarEvents();
      if (pendingCalendarNotification) openCalendarNotification(pendingCalendarNotification);
    }
  } catch (error) {
    // Não apaga a sessão por um erro temporário de rede/hosting.
    if (error.status === 401 || error.status === 403) {
      clearAuthToken();
      clearCalendarReminders().catch(() => {});
      savedCalendarEvents = [];
      calendarLoadSequence++;
      showAuthScreen();
      setAuthMessage(error.message);
    } else {
      showAuthScreen();
      setAuthMessage('Servidor indisponível: ' + error.message + ' Seus dados de login foram preservados; recarregue para tentar novamente.');
    }
  }
}

function renderPlayerStatus(status) {
  cleanupDailyShopPurchases();
  lastDailyDateKey = getDateKeyInTimeZone();
  const previousStatus = currentPlayerStatus;
  currentPlayerStatus = status;
  setText('store-balance', formatCurrencyValue(status.coins));
  if (cosmeticStoreState) cosmeticStoreState.coins = status.coins;
  currentStorageScope = status.handle || getAuthToken() || 'guest';
  if (currentUser) renderUserIdentity(currentUser);
  setFounderName('player-name', status.name,currentUser?.isAscendFounder);

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
  if (previousStatus && previousStatus.handle === status.handle && Number(status.level) > Number(previousStatus.level)) {
    showLevelUp(status.level);
  }
}

let levelUpTimer = null;
let levelUpPreviousFocus = null;

function closeLevelUp() {
  const overlay = getElement('level-up-overlay');
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  if (levelUpTimer) clearTimeout(levelUpTimer);
  levelUpTimer = null;
  levelUpPreviousFocus?.focus?.();
  levelUpPreviousFocus = null;
}

function showLevelUp(level) {
  const overlay = getElement('level-up-overlay');
  const levelNumber = getElement('level-up-number');
  if (!overlay || !levelNumber) return;
  levelUpPreviousFocus = document.activeElement;
  levelNumber.textContent = String(level);
  overlay.hidden = false;
  overlay.querySelector('.level-up-card')?.focus();
  if (levelUpTimer) clearTimeout(levelUpTimer);
  levelUpTimer = setTimeout(closeLevelUp, 7000);
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
    submitButton.classList.toggle('is-loading', isLoading);
  }

  if (statusChip) {
    statusChip.textContent = label;
    statusChip.classList.toggle('is-loading', isLoading);
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
  setText('planner-assistant-name', 'ASSISTENTE DE ROTINA');
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

  const events = mergeCalendarEvents(buildCalendarEvents(plan, normalizedProfile), year, month);
  const monthSummary = getElement('calendar-month-summary');
  if (monthSummary) {
    const activeDays = new Set(events.map((event) => event.dateKey)).size;
    monthSummary.textContent = activeDays + (activeDays === 1 ? ' dia planejado' : ' dias planejados');
  }
  const selectedDate = selectedCalendarDateKey || getDateKeyForDate(new Date());

  for (let index = 0; index < firstDayOfWeek; index++) {
    const filler = document.createElement('button');
    filler.className = 'calendar-day-cell calendar-day-cell--muted';
    filler.type = 'button';
    filler.setAttribute('aria-hidden', 'true');
    filler.tabIndex = -1;
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
    cell.classList.toggle('calendar-day-cell--today', dateKey === getDateKeyForDate(new Date()));
    cell.setAttribute('aria-selected', String(dateKey === selectedDate));
    cell.setAttribute('aria-label', new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date) + ', ' + dayEvents.length + (dayEvents.length === 1 ? ' evento' : ' eventos'));

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

  const selected = parseDateKey(dateKey);
  const weekStart = new Date(selected); weekStart.setDate(selected.getDate() - selected.getDay());
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
  const dayEvents = events.filter((event) => calendarView === 'month' ? event.dateKey.slice(0, 7) === dateKey.slice(0, 7) : calendarView === 'week' ? parseDateKey(event.dateKey) >= weekStart && parseDateKey(event.dateKey) < weekEnd : event.dateKey === dateKey).sort((a,b) => (a.dateKey + (a.startTime || '')).localeCompare(b.dateKey + (b.startTime || '')));
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
    const conflict = event.startTime && event.endTime && events.some(other => other !== event && other.dateKey === event.dateKey && other.startTime && other.endTime && event.startTime < other.endTime && other.startTime < event.endTime);
    if (conflict) meta.textContent += ' · Conflito de horário';
    if (calendarView !== 'day') meta.textContent = event.dateKey + ' · ' + meta.textContent;
    const actions = document.createElement('div'); actions.className = 'calendar-item-actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Editar'; edit.addEventListener('click', () => openCalendarEvent(event));
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Excluir'; remove.addEventListener('click', () => deleteCalendarEvent(event));
    actions.append(edit, remove); item.append(title, meta, actions);
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
        dateKey, sourceKey: dateKey + ':mission',
        kind: mission.type === 'penalidade' ? 'focus' : mission.type === 'treino' ? 'training' : 'mission',
        title: mission.title,
        meta: mission.rationale || mission.description
      });
    }

    if (workoutDays.has(weekdayKey)) {
      events.push({
        dateKey, sourceKey: dateKey + ':training',
        kind: 'training',
        title: 'Treino programado',
        meta: normalizedProfile.trainingGoal + ' | ' + normalizedProfile.bodyType
      });
    }

    events.push({
      dateKey, sourceKey: dateKey + ':focus',
      kind: 'focus',
      title: 'Bloco de foco',
      meta: truncatePlannerText(normalizedProfile.currentPriorities || normalizedProfile.primaryGoals, 64)
    });
  }

  return events;
}


function refreshEditableCalendar() {
  renderSamsungCalendar(currentAdaptivePlan || buildLocalAdaptivePlan(currentRoutineProfile || getRoutineProfile()), currentRoutineProfile || getRoutineProfile());
}
async function loadCalendarEvents() {
  const sequence = ++calendarLoadSequence;
  try {
    const data = await apiRequest('/calendar/events');
    if (sequence !== calendarLoadSequence) return;
    if (!Array.isArray(data)) throw new Error('Resposta inválida do calendário.');
    savedCalendarEvents = data; getElement('calendar-sync-status').textContent = ''; refreshEditableCalendar();
    if (supportsCalendarReminders() && currentUser?.id) {
      try {
        const result = await syncCalendarReminders(data, currentUser.id);
        if (sequence === calendarLoadSequence && result?.truncated) getElement('calendar-sync-status').textContent = 'Alguns lembretes não foram agendados: limite de 256 atingido.';
      } catch (reminderError) {
        if (sequence === calendarLoadSequence) getElement('calendar-sync-status').textContent = 'Não foi possível atualizar os lembretes neste aparelho.';
      }
    }
  } catch (error) {
    if (sequence === calendarLoadSequence) { getElement('calendar-sync-status').textContent = 'Não foi possível carregar as atividades salvas. Verifique a conexão e tente novamente.'; }
    console.warn('Não foi possível carregar atividades:', error.message);
  }
}
function mergeCalendarEvents(generated, year, month) {
  const overridden = new Set(savedCalendarEvents.filter(e => e.sourceKey).map(e => e.sourceKey));
  const result = generated.filter(e => !overridden.has(e.sourceKey));
  const days = new Date(year, month + 1, 0).getDate();
  for (const event of savedCalendarEvents.filter(e => !e.deleted)) {
    const start = parseDateKey(event.date);
    for (let day = 1; day <= days; day++) {
      const date = new Date(year, month, day); const dateKey = getDateKeyForDate(date);
      if (dateKey < event.date) continue;
      const delta = Math.round((Date.UTC(year, month, day) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000);
      if (!(dateKey === event.date || event.recurrence === 'daily' || event.recurrence === 'weekly' && delta % 7 === 0 || event.recurrence === 'monthly' && day === start.getDate())) continue;
      result.push({...event, dateKey, kind: 'mission', meta: [event.startTime && (event.startTime + (event.endTime ? '–' + event.endTime : '')), event.category, event.completed ? 'Concluída' : '', event.protectedEvent ? 'Protegida' : '', event.description].filter(Boolean).join(' · ')});
    }
  }
  return result;
}
function openCalendarEvent(event = null) {
  editingCalendarEvent = event;
  const form = getElement('calendar-event-form'); form.reset();
  const values = event ? {...event, date: event.date || event.dateKey} : {date: selectedCalendarDateKey || getDateKeyForDate(new Date()), recurrence: 'none'};
  for (const name of ['title','description','date','startTime','endTime','category','recurrence','reminderMinutes']) form.elements[name].value = values[name] ?? (name === 'description' ? values.meta || '' : '');
  form.elements.recurrence.value = values.recurrence || 'none';
  form.elements.completed.checked = !!values.completed; form.elements.protectedEvent.checked = !!values.protectedEvent;
  getElement('calendar-event-error').textContent = '';
  getElement('calendar-event-dialog').showModal();
}
async function deleteCalendarEvent(event) {
  if (!window.confirm('Excluir esta atividade? Em atividades recorrentes, toda a série será excluída.')) return;
  try {
    if (event.id) await apiRequest('/calendar/events/' + event.id, {method:'DELETE'});
    else { const created = await apiRequest('/calendar/events', {method:'POST', body:JSON.stringify({title:event.title, description:event.meta, date:event.dateKey, recurrence:'none', sourceKey:event.sourceKey})}); await apiRequest('/calendar/events/' + created.id, {method:'DELETE'}); }
    await loadCalendarEvents();
  } catch (error) { window.alert('Não foi possível excluir: ' + error.message); }
}
function setupEditableCalendar() {
  getElement('calendar-add').addEventListener('click', () => openCalendarEvent());
  const reminderButton = getElement('calendar-enable-reminders');
  if (supportsCalendarReminders()) {
    reminderButton.hidden = false;
    getElement('calendar-reminder-help').textContent = 'No Android, os próximos 60 dias são atualizados ao abrir o aplicativo; o sistema pode atrasar o aviso.';
    reminderButton.addEventListener('click', async () => {
      try {
        if (await requestCalendarReminderPermission()) await loadCalendarEvents();
        else getElement('calendar-sync-status').textContent = 'Permissão de notificações não concedida.';
      } catch (error) { getElement('calendar-sync-status').textContent = 'Não foi possível ativar os lembretes.'; }
    });
    listenForCalendarReminder(openCalendarNotification);
  }
  getElement('calendar-event-cancel').addEventListener('click', () => getElement('calendar-event-dialog').close());
  document.querySelectorAll('[data-calendar-view]').forEach(button => button.addEventListener('click', () => { calendarView = button.dataset.calendarView; refreshEditableCalendar(); }));
  getElement('calendar-event-form').addEventListener('submit', async (e) => {
    e.preventDefault(); const f=e.currentTarget;
    const data = Object.fromEntries(['title','description','date','startTime','endTime','category','recurrence'].map(name => [name, f.elements[name].value]));
    data.completed=f.elements.completed.checked; data.protectedEvent=f.elements.protectedEvent.checked;
    data.reminderMinutes=f.elements.reminderMinutes.value === '' ? null : Number(f.elements.reminderMinutes.value);
    data.sourceKey=editingCalendarEvent?.sourceKey || null;
    const id=editingCalendarEvent?.id;
    const submit=f.querySelector('[type=submit]'); submit.disabled=true;
    try { await apiRequest('/calendar/events' + (id ? '/' + id : ''), {method:id ? 'PUT' : 'POST', body:JSON.stringify(data)}); getElement('calendar-event-dialog').close(); await loadCalendarEvents(); }
    catch (error) { getElement('calendar-event-error').textContent = error.message; }
    finally { submit.disabled=false; }
  });
}
async function openCalendarNotification(data) {
  if (!currentUser?.id || !getAuthToken()) { pendingCalendarNotification = data; return; }
  pendingCalendarNotification = null;
  if (String(currentUser.id) !== String(data.ownerId) || !/^\d{4}-\d{2}-\d{2}$/.test(data.date || '')) return;
  selectedCalendarDateKey = data.date;
  currentCalendarMonth = parseDateKey(data.date);
  showView('calendar');
  refreshEditableCalendar();
  await calendarLoadPromise;
  if (String(currentUser?.id) !== String(data.ownerId) || selectedCalendarDateKey !== data.date) return;
  const event = savedCalendarEvents.find(item => String(item.id) === String(data.eventId) && !item.deleted);
  if (event) openCalendarEvent({...event, dateKey: data.date});
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
      content: 'Sou o assistente de rotina. Pergunte sobre seu calendário, rotina, estudo, treino ou próximas ações.'
    });
  }

  aiConversation.forEach((message) => {
    const bubble = document.createElement('article');
    bubble.className = 'chat-bubble chat-bubble--' + (message.role === 'user' ? 'user' : 'assistant');
    const title = document.createElement('div');
    title.className = 'chat-bubble-title';
    title.textContent = message.role === 'user' ? 'Você' : 'Assistente';
    const meta = document.createElement('div');
    meta.className = 'chat-bubble-meta';
    if (message.role === 'user') meta.textContent = message.content;
    else renderAssistantMessage(meta, message.content);
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
    assistantName: 'ASSISTENTE DE ROTINA',
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

      const guidance = document.createElement('details');
      guidance.className = 'training-guidance';
      const guidanceTitle = document.createElement('summary');
      guidanceTitle.textContent = 'Orientações';
      guidance.append(guidanceTitle, notes);
      card.append(dayHeader, focus, prescription, exerciseList, guidance);
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
    summary: 'Divisão montada para ' + days.map((day) => WORKOUT_DAY_LABELS[day]).join(', ') + '.',
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
      createTrainingTemplate('Full Body', 'Corpo inteiro com base nos padrões fundamentais.', [
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
      createTrainingTemplate('Upper', 'Peito, costas, ombros e braços com foco em base forte.', [
        'Supino reto',
        'Remada fechada',
        'Desenvolvimento militar',
        'Puxada alta',
        'Rosca direta',
        'Tríceps pulley'
      ]),
      createTrainingTemplate('Lower', 'Pernas completas e core para sustentar progresso global.', [
        'Agachamento',
        'Leg press',
        'Cadeira extensora',
        'Mesa flexora',
        'Panturrilha em pé',
        'Abdominal infra'
      ])
    ];
  }

  if (dayCount === 3) {
    return [
      createTrainingTemplate('Push', 'Empurrar: peito, ombros e tríceps.', [
        'Supino inclinado',
        'Crucifixo máquina',
        'Desenvolvimento halteres',
        'Elevação lateral',
        'Tríceps corda'
      ]),
      createTrainingTemplate('Pull', 'Puxar: costas, deltoide posterior e bíceps.', [
        'Puxada frontal',
        'Remada baixa',
        'Remada unilateral',
        'Face pull',
        'Rosca alternada'
      ]),
      createTrainingTemplate('Legs', 'Pernas e core com prioridade em base e estabilidade.', [
        'Agachamento hack',
        'Stiff',
        'Avanço',
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
      createTrainingTemplate('Upper B', 'Ombros, dorsais e braços em volume complementar.', [
        'Desenvolvimento máquina',
        'Remada articulada',
        'Puxada aberta',
        'Elevação lateral',
        'Tríceps frances'
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
      createTrainingTemplate('Push', 'Peito, ombros e tríceps com bloco principal.', [
        'Supino reto',
        'Supino inclinado',
        'Desenvolvimento halteres',
        'Elevação lateral',
        'Tríceps testa'
      ]),
      createTrainingTemplate('Pull', 'Costas e bíceps com enfase em espessura.', [
        'Barra guiada ou puxada',
        'Remada cavalinho',
        'Remada unilateral',
        'Pulldown',
        'Rosca martelo'
      ]),
      createTrainingTemplate('Legs', 'Pernas completas com foco em progressão.', [
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
    createTrainingTemplate('Push A', 'Primeiro bloco de empurrar com foco tecnico.', ['Supino reto', 'Desenvolvimento', 'Crucifixo', 'Elevação lateral', 'Tríceps corda']),
    createTrainingTemplate('Pull A', 'Primeiro bloco de puxar com dorsais e bíceps.', ['Puxada frontal', 'Remada curvada', 'Pulldown', 'Face pull', 'Rosca direta']),
    createTrainingTemplate('Legs A', 'Pernas base com quadriceps e core.', ['Agachamento', 'Leg press', 'Extensora', 'Panturrilha', 'Prancha']),
    createTrainingTemplate('Push B', 'Variacao de peito e ombros para repetir estimulo sem saturar.', ['Supino inclinado', 'Desenvolvimento halteres', 'Cross over', 'Elevação frontal', 'Tríceps frances']),
    createTrainingTemplate('Pull B', 'Variacao de costas e braços com volume complementar.', ['Remada baixa', 'Puxada neutra', 'Remada unilateral', 'Encolhimento', 'Rosca martelo']),
    createTrainingTemplate('Legs B', 'Posterior, gluteos e panturrilhas em segundo estimulo.', ['Terra romeno', 'Mesa flexora', 'Hip thrust', 'Passada', 'Panturrilha sentada']),
    createTrainingTemplate('Recuperação Ativa', 'Dia leve para mobilidade, caminhada e restauração.', ['Mobilidade quadril', 'Mobilidade torácica', 'Caminhada inclinada', 'Alongamento posterior', 'Respiração diafragmatica'])
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
        copy: 'Estrutura mais fina, metabolismo acelerado e melhor resposta com progressão de carga, compostos e cardio controlado.',
        rest: '75-90s',
        finishers: ['Mobilidade escapular'],
        notePrefix: 'Priorize exercícios compostos, pouco cardio extra e alimentação suficiente para recuperar.',
        guideNotes: [
          'Ectomorfo: punhos e ombros mais estreitos, dificuldade maior para ganhar peso e massa.',
          'Se você seca fácil e demora para encher a musculatura, esse perfil pode fazer sentido.',
          'A referência visual ajuda, mas avaliação profissional e composição corporal são mais confiáveis.'
        ]
      };
    case 'endomorfo':
      return {
        label: 'Endomorfo',
        copy: 'Estrutura mais larga, maior facilidade para ganhar peso e boa resposta com musculação consistente mais blocos metabólicos.',
        rest: '45-60s',
        finishers: ['Finalizador cardio 10-15 min'],
        notePrefix: 'Mantenha ritmo entre séries, use boa amplitude e adicione gasto energético controlado ao final.',
        guideNotes: [
          'Endomorfo: tronco e quadril mais largos, facilidade maior para acumular peso.',
          'Se você ganha massa e gordura com facilidade, tende a se aproximar desse perfil.',
          'Treino, sono e alimentação contam mais que o rótulo isolado do biotipo.'
        ]
      };
    default:
      return {
        label: 'Mesomorfo',
        copy: 'Estrutura atlética e resposta equilibrada ao treino, permitindo combinar carga, volume e progresso semanal.',
        rest: '60-75s',
        finishers: ['Core anti-rotação'],
        notePrefix: 'Trabalhe progressão de carga sem sacrificar técnica e mantenha volume moderado para evoluir com consistência.',
        guideNotes: [
          'Mesomorfo: estrutura naturalmente mais atlética, com facilidade moderada para ganhar massa.',
          'Se seu corpo responde relativamente bem a treino e dieta, esse perfil costuma se encaixar.',
          'Biotipo serve como orientação inicial, não como regra fixa de treino.'
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
        copy: 'Sessões com musculação base, menor descanso e finalizadores para aumentar gasto energético sem perder massa.',
        repRange: '10-15 reps',
        note: 'Feche cada treino com intensidade sustentável e regularidade semanal.'
      };
    case 'condicionamento':
      return {
        key: 'condicionamento',
        label: 'Condicionamento',
        copy: 'Estrutura focada em resistência muscular, técnica e capacidade de manter rendimento ao longo da semana.',
        repRange: '12-15 reps',
        note: 'Controle pausas e mantenha boa densidade de treino.'
      };
    case 'forca':
      return {
        key: 'forca',
        label: 'Força',
        copy: 'Mais prioridade para multiarticulares, descansos um pouco maiores e foco em progressão objetiva.',
        repRange: '4-8 reps',
        note: 'Busque carga progressiva com execução limpa nos movimentos base.'
      };
    default:
      return {
        key: 'hipertrofia',
        label: 'Hipertrofia',
        copy: 'Volume bem distribuído para estimular crescimento muscular com recuperação coerente entre os grupos.',
        repRange: '8-12 reps',
        note: 'Aproxime-se da falha com técnica boa nas últimas séries.'
      };
  }
}

function getTrainingLevelMeta(level) {
  switch (level) {
    case 'avancado':
      return {
        series: '4-5 séries por exercício',
        note: 'Use progressão de carga ou repetições semanalmente e acompanhe fadiga.'
      };
    case 'intermediario':
      return {
        series: '3-4 séries por exercício',
        note: 'Mantenha 1 a 2 repetições em reserva na maior parte do treino.'
      };
    default:
      return {
        series: '2-3 séries por exercício',
        note: 'Comece consolidando técnica, amplitude e regularidade antes de escalar carga.'
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

  Object.values(fieldMap).forEach((id) => setText(id, '0'));
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
    copy.textContent = 'Preencha seu perfil para o assistente montar suas proximas missoes.';
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
      'Recompensa: ' + mission.experienceReward + ' de experiencia e ' + mission.coinReward + ' moedas'
    );
    const exp = document.createElement('div');
    exp.className = 'mission-exp';
    exp.textContent = '+' + mission.experienceReward + ' EXP';
    const coins = document.createElement('div');
    coins.className = 'mission-coins';
    coins.textContent = mission.type === 'penalidade'
      ? 'RECUPERACAO'
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
      button.classList.add('is-loading');
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
      button.classList.remove('is-loading');
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

function setShopMessage(message) {
  setText('shop-feedback', message);
}

/** Compras confirmadas pelo servidor; o navegador nunca altera saldo por conta propria. */
function applyShopServerState(state) {
  if (!state || !Array.isArray(state.purchases)) throw new Error('Resposta invalida da loja.');
  saveShopPurchases(state.purchases.map((p) => ({ itemId: p.dailyId, createdAt: p.createdAt })));
  // Reconstrói recibos de compras de outros dispositivos no inventário local.
  const inventory = getInventoryItems();
  const knownDailyIds = new Set(inventory.map((entry) => entry.dailyId));
  for (const purchase of state.purchases) {
    if (knownDailyIds.has(purchase.dailyId)) continue;
    const definition = SHOP_ITEM_POOL.find((entry) => entry.id === purchase.itemId);
    if (!definition) continue;
    inventory.push(createInventoryEntry({ ...definition, dailyId: purchase.dailyId }));
    knownDailyIds.add(purchase.dailyId);
  }
  saveInventoryItems(inventory);
  if (currentPlayerStatus) {
    currentPlayerStatus = { ...currentPlayerStatus, coins: Number(state.coins) || 0 };
    renderPlayerStatus(currentPlayerStatus);
  }
}

async function syncShopFromServer() {
  const state = await apiRequest('/shop');
  applyShopServerState(state);
  setShopMessage('');
}

async function handleShopPurchase(itemId) {
  const item = getDailyShopItems().find((entry) => entry.dailyId === itemId);
  if (!item || !currentPlayerStatus || shopPurchasePending) return;
  const purchasedIds = new Set(getShopPurchases().map((entry) => entry.itemId));
  if (purchasedIds.has(item.dailyId)) {
    setShopMessage('Esse item já foi resgatado hoje.');
    return;
  }
  if (getCurrentCoins() < item.custo) {
    setShopMessage('Saldo insuficiente para resgatar ' + item.nome + '.');
    return;
  }

  shopPurchasePending = true;
  renderShopState();
  setShopMessage('Confirmando compra com o servidor...');
  try {
    const state = await apiRequest('/shop/purchase', {
      method: 'POST',
      body: JSON.stringify({ itemId: item.id })
    });
    // Registra inventário somente depois da confirmação do backend.
    applyShopServerState(state);
    registerVaultTransaction('saida', 'Loja: ' + item.nome, item.custo);
    renderVault(getCurrentCoins());
    const savedItem = getInventoryItems().find((entry) => entry.dailyId === item.dailyId);
    let activatedNow = false;
    if (savedItem && savedItem.rewardType === 'timer' && confirmItemActivation(savedItem)) {
      activatedNow = activateInventoryItem(savedItem.instanceId);
    }
    setShopMessage(item.nome + ' resgatado. ' + (activatedNow ? 'Recompensa ativada.' : 'Disponível no inventário.'));
    showPopup('Compra realizada!', 0, item.custo);
    setText('popup-body', 'Compra registrada no banco de dados.');
    setText('popup-exp', activatedNow ? 'ATIVO' : 'INVENTARIO');
    setText('popup-coins', '-' + formatCurrencyValue(item.custo) + ' moedas');
  } catch (error) {
    setShopMessage('Não foi possível comprar: ' + error.message);
    // Em respostas perdidas, consulta servidor: a compra pode ter sido concluída.
    try { await syncShopFromServer(); } catch (ignored) { /* preserva o erro original */ }
  } finally {
    shopPurchasePending = false;
    renderShopState();
  }
}

function renderShop() {
  const grid = document.querySelector('#daily-shop-panel .dashboard-grid');
  if (!grid) return;

  const items = getDailyShopItems();
  const categories = ['TODAS', ...new Set(items.map((item) => item.categoria || 'OUTRAS'))];
  const categoryNav = getElement('store-categories');
  if (categoryNav) {
    categoryNav.replaceChildren();
    categories.forEach((category) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'store-category' + (activeStoreCategory === category ? ' is-active' : '');
      button.setAttribute('aria-pressed', String(activeStoreCategory === category));
      button.textContent = category === 'TODAS' ? 'Todas as recompensas' : category;
      button.addEventListener('click', () => { activeStoreCategory = category; renderShop(); });
      categoryNav.appendChild(button);
    });
  }
  const visibleItems = activeStoreCategory === 'TODAS' ? items : items.filter((item) => item.categoria === activeStoreCategory);
  grid.textContent = '';

  visibleItems.forEach((item, index) => {
    const article = document.createElement('article');
    article.className = 'feature-panel shop-item store-card' + (item.raridade === 'LENDARIO' ? ' shop-item--legendary' : '');
    article.style.setProperty('--store-order', index);
    article.dataset.storeCategory = item.categoria;

    const content = document.createElement('div');
    content.className = 'store-card-copy';
    const artwork = document.createElement('button');
    artwork.className = 'store-artwork store-artwork--' + (item.categoria || 'reward').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    artwork.type = 'button';
    artwork.setAttribute('aria-label', 'Inspecionar ' + item.nome);
    const icon = document.createElement('i');
    icon.className = 'bi ' + storeIconForCategory(item.categoria);
    icon.setAttribute('aria-hidden', 'true');
    const artLabel = document.createElement('span');
    artLabel.textContent = item.raridade === 'LENDARIO' ? 'EDIÇÃO ESPECIAL' : 'ASCEND / DAILY';
    artwork.append(icon, artLabel);
    artwork.addEventListener('click', () => openStoreInspection(item));
    const kicker = document.createElement('div');
    kicker.className = 'feature-kicker' + (item.raridade === 'LENDARIO' ? ' feature-kicker--legendary' : '');
    kicker.textContent = item.raridade || item.categoria;
    const title = document.createElement('h2');
    title.className = 'feature-title';
    title.textContent = item.nome;
    const description = document.createElement('p');
    description.className = 'feature-copy';
    description.textContent = item.descricao;

    const definition = getShopItemDefinition(item.id);
    if (definition && definition.rewardType === 'timer') {
      const duration = document.createElement('p');
      duration.className = 'shop-duration';
      duration.textContent = formatDurationLabel(definition.durationMinutes * 60) + ' de duração';
      content.append(kicker, title, description, duration);
    } else {
      content.append(kicker, title, description);
    }

    const button = document.createElement('button');
    button.className = 'btn-complete';
    button.type = 'button';
    button.dataset.shopItem = item.dailyId;
    button.addEventListener('click', () => handleShopPurchase(item.dailyId));
    const inspect = document.createElement('button');
    inspect.type = 'button';
    inspect.className = 'store-inspect-link';
    inspect.textContent = 'Ver recompensa';
    inspect.addEventListener('click', () => openStoreInspection(item));

    article.append(artwork, content, inspect, button);
    grid.appendChild(article);
  });

  renderShopState(items);
}

async function loadCosmeticStore() {
  const status = getElement('cosmetic-store-status');
  if (status) {
    status.textContent = '· carregando';
    status.classList.add('is-loading');
  }
  try {
    cosmeticStoreState = await apiRequest('/cosmetics');
    if (status) status.classList.remove('is-loading');
    applyEquippedCosmeticTheme(cosmeticStoreState);
    setText('store-balance', formatCurrencyValue(cosmeticStoreState.coins));
    renderCosmeticStore();
  } catch (error) {
    if (status) {
      status.classList.remove('is-loading');
      status.textContent = '· catálogo indisponível';
    }
    const grid = getElement('cosmetic-grid');
    if (grid) {
      const message = document.createElement('p');
      message.className = 'feature-copy';
      message.textContent = 'Não foi possível carregar os cosméticos. Tente novamente em instantes.';
      grid.replaceChildren(message);
    }
    setShopMessage('Não foi possível carregar a loja de cosméticos: ' + error.message);
  }
}

function renderCosmeticStore() {
  const grid = getElement('cosmetic-grid');
  if (!grid || !cosmeticStoreState) return;
  setText('cosmetic-store-status', '· ' + formatCurrencyValue(cosmeticStoreState.coins) + ' AC disponíveis');
  const allItems = (cosmeticStoreState.items || []).filter(item=>!item.staticAsset);
  const categories = ['TODAS', 'MINHA COLEÇÃO', ...new Set(allItems.map((item) => item.category))];
  const nav = getElement('cosmetic-categories');
  if (nav) {
    nav.replaceChildren();
    categories.forEach((category) => {
      const control = document.createElement('button');
      control.type = 'button';
      control.className = 'store-category' + (activeCosmeticCategory === category ? ' is-active' : '');
      control.setAttribute('aria-pressed', String(activeCosmeticCategory === category));
      control.textContent = category.replaceAll('_', ' ');
      control.addEventListener('click', () => { activeCosmeticCategory = category; renderCosmeticStore(); });
      nav.appendChild(control);
    });
  }
  const visible = allItems.filter((item) => activeCosmeticCategory === 'TODAS' || (activeCosmeticCategory === 'MINHA COLEÇÃO' ? item.owned : item.category === activeCosmeticCategory));
  grid.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'feature-copy';
    empty.textContent = activeCosmeticCategory === 'MINHA COLEÇÃO' ? 'Sua coleção ainda está vazia. Resgate um item para começar.' : 'Não há itens nesta categoria.';
    grid.appendChild(empty);
    return;
  }
  visible.forEach((item, index) => {
    const card = document.createElement('article');
    card.className = 'feature-panel shop-item store-card store-cosmetic-card rarity-' + item.rarity.toLowerCase();
    card.style.setProperty('--store-order', index);
    const artwork = document.createElement('button');
    artwork.type = 'button';
    artwork.className = 'store-artwork';
    artwork.setAttribute('aria-label', 'Inspecionar ' + item.name);
    const icon = document.createElement('i');
    icon.className = 'bi ' + cosmeticIcon(item.category);
    icon.setAttribute('aria-hidden', 'true');
    const rarity = document.createElement('span');
    rarity.textContent = item.rarity;
    artwork.append(icon, rarity);
    const inspectionItem = { ...item, cosmetic: true, nome: item.name, categoria: item.category, raridade: item.rarity, custo: item.cost, descricao: item.description, dailyId: item.id };
    artwork.addEventListener('click', () => openStoreInspection(inspectionItem));
    const content = document.createElement('div');
    content.className = 'store-card-copy';
    const kicker = document.createElement('div');
    kicker.className = 'feature-kicker';
    kicker.textContent = item.category.replaceAll('_', ' ') + ' · ' + item.rarity;
    const title = document.createElement('h3');
    title.className = 'feature-title';
    title.textContent = item.name;
    const description = document.createElement('p');
    description.className = 'feature-copy';
    description.textContent = item.description;
    content.append(kicker, title, description);
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'btn-complete';
    action.disabled = cosmeticActionPending;
    if (item.equipped) {
      action.textContent = 'Equipado · remover';
      action.addEventListener('click', () => removeCosmetic(item.slot));
    } else if (item.owned) {
      action.textContent = 'Equipar';
      action.addEventListener('click', () => equipCosmetic(item.id));
    } else {
      action.textContent = formatCurrencyValue(item.cost) + ' AC';
      action.disabled = action.disabled || cosmeticStoreState.coins < item.cost;
      action.addEventListener('click', () => buyCosmetic(item.id));
    }
    card.append(artwork, content, action);
    grid.appendChild(card);
  });
}

function cosmeticIcon(category) {
  return ({ AVATAR_FRAME: 'bi-person-bounding-box', PROFILE_BANNER: 'bi-image', PROFILE_EFFECT: 'bi-stars', NAMEPLATE: 'bi-card-heading', TITLE: 'bi-award', BADGE: 'bi-patch-check', COMPANION: 'bi-robot', THEME: 'bi-palette' })[category] || 'bi-stars';
}

async function buyCosmetic(itemId) {
  if (cosmeticActionPending) return;
  cosmeticActionPending = true;
  renderCosmeticStore();
  try {
    cosmeticStoreState = await apiRequest('/cosmetics/purchase', { method: 'POST', body: JSON.stringify({ itemId }) });
    setText('store-balance', formatCurrencyValue(cosmeticStoreState.coins));
    if (currentPlayerStatus) {
      currentPlayerStatus = { ...currentPlayerStatus, coins: cosmeticStoreState.coins };
      renderPlayerStatus(currentPlayerStatus);
    }
    setShopMessage('Cosmético resgatado e adicionado permanentemente à sua coleção.');
    closeStoreInspection();
  } catch (error) {
    setShopMessage('Compra não concluída: ' + error.message);
  } finally {
    cosmeticActionPending = false;
    renderCosmeticStore();
  }
}

async function equipCosmetic(itemId) {
  if (cosmeticActionPending) return;
  cosmeticActionPending = true;
  renderCosmeticStore();
  try {
    cosmeticStoreState = await apiRequest('/cosmetics/equipped', { method: 'PUT', body: JSON.stringify({ itemId }) });
    applyEquippedCosmeticTheme(cosmeticStoreState);
    setShopMessage('Cosmético equipado.');
    closeStoreInspection();
  } catch (error) {
    setShopMessage('Não foi possível equipar: ' + error.message);
  } finally {
    cosmeticActionPending = false;
    renderCosmeticStore();
  }
}

async function removeCosmetic(slot) {
  if (cosmeticActionPending) return;
  cosmeticActionPending = true;
  renderCosmeticStore();
  try {
    cosmeticStoreState = await apiRequest('/cosmetics/equipped/' + encodeURIComponent(slot), { method: 'DELETE' });
    applyEquippedCosmeticTheme(cosmeticStoreState);
    setShopMessage('Cosmético removido do slot.');
    closeStoreInspection();
  } catch (error) {
    setShopMessage('Não foi possível remover: ' + error.message);
  } finally {
    cosmeticActionPending = false;
    renderCosmeticStore();
  }
}

function setStoreMode(mode) {
  const cosmetics = mode === 'cosmetics';
  const dailyPanel = getElement('daily-shop-panel');
  const cosmeticPanel = getElement('cosmetic-shop-panel');
  if (!dailyPanel || !cosmeticPanel) return;
  dailyPanel.hidden = cosmetics;
  cosmeticPanel.hidden = !cosmetics;
  document.querySelectorAll('[data-store-mode]').forEach((button) => {
    const active = button.dataset.storeMode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (cosmetics) loadCosmeticStore();
}

function applyEquippedCosmeticTheme(state) {
  ownFrames(state?.items?.find(i=>i.staticAsset && i.category==='PROFILE_FRAME' && i.equipped!==false));
  const theme = (state?.items || []).find((item) => item.category === 'THEME' && item.equipped);
  document.body.classList.toggle('cosmetic-theme-aurora', theme?.id === 'theme-aurora');
}

function storeIconForCategory(category = '') {
  const icons = { RECOMPENSA: 'bi-stars', UPGRADE: 'bi-arrow-up-circle', FOCO: 'bi-bullseye', SUPORTE: 'bi-heart-pulse', SOCIAL: 'bi-people', LENDARIO: 'bi-gem' };
  return icons[category] || 'bi-sparkles';
}

function openStoreInspection(item) {
  inspectedStoreItem = item;
  const modal = getElement('store-inspection');
  if (!modal) return;
  setText('inspection-category', item.raridade === 'LENDARIO' ? 'EDIÇÃO LENDÁRIA' : item.categoria.replaceAll('_', ' '));
  setText('inspection-title', item.nome);
  setText('inspection-description', item.descricao);
  const cost = item.cosmetic ? item.cost : item.custo;
  setText('inspection-value', item.owned ? (item.equipped ? 'Equipado no slot ' + item.slot : 'Na sua coleção') : formatCurrencyValue(cost) + ' AC');
  const art = getElement('inspection-art');
  if (art) {
    art.className = 'inspection-art' + (item.raridade === 'LENDARIO' ? ' inspection-art--legendary' : '');
    const symbol = art.querySelector('.inspection-symbol');
    if (symbol) symbol.className = 'inspection-symbol bi ' + (item.cosmetic ? cosmeticIcon(item.categoria) : storeIconForCategory(item.categoria));
  }
  const buy = getElement('inspection-buy');
  if (buy) {
    buy.hidden = false;
    if (item.cosmetic && item.owned) {
      buy.textContent = item.equipped ? 'Remover do perfil' : 'Equipar';
      buy.onclick = () => item.equipped ? removeCosmetic(item.slot) : equipCosmetic(item.id);
    } else if (item.cosmetic) {
      buy.textContent = 'Resgatar por ' + formatCurrencyValue(cost) + ' AC';
      buy.onclick = () => buyCosmetic(item.id);
    } else {
      buy.textContent = 'Resgatar por ' + formatCurrencyValue(cost) + ' AC';
      buy.onclick = () => handleShopPurchase(item.dailyId);
    }
  }
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('store-modal-open');
  buy?.focus();
}

function closeStoreInspection() {
  const modal = getElement('store-inspection');
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('store-modal-open');
  window.setTimeout(() => { if (modal.getAttribute('aria-hidden') === 'true') modal.hidden = true; }, 180);
  inspectedStoreItem = null;
}

function renderEquippedProfileCosmetics(items) {
  const container = getElement('profile-cosmetics');
  const avatar = getElement('profile-avatar');
  if (!container) return;
  container.replaceChildren();
  const equipped = items || [];
  applyFrame(avatar?.parentElement,equipped.find(i=>i.category==='PROFILE_FRAME'));
  const avatarFrame = equipped.find((item) => item.category === 'AVATAR_FRAME');
  avatar?.parentElement?.classList.toggle('has-cosmetic-frame', Boolean(avatarFrame));
  if (avatar?.parentElement) {
    if (avatarFrame?.rarity) avatar.parentElement.dataset.frameRarity = avatarFrame.rarity;
    else delete avatar.parentElement.dataset.frameRarity;
  }
  equipped.forEach((item) => {
    const chip = document.createElement('span');
    chip.className = 'profile-cosmetic-chip' + (item.rarity ? ' rarity-' + item.rarity.toLowerCase() : '');
    const icon = document.createElement('i');
    icon.className = 'bi ' + cosmeticIcon(item.category);
    icon.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.textContent = item.name;
    chip.append(icon, name);
    container.appendChild(chip);
  });
}

function renderShopState(items = getDailyShopItems()) {
  const purchasedIds = new Set(getShopPurchases().map((entry) => entry.itemId));

  document.querySelectorAll('#view-shop [data-shop-item]').forEach((button) => {
    const item = items.find((entry) => entry.dailyId === button.dataset.shopItem);
    if (!item) return;

    button.classList.remove('btn-purchased');
    button.disabled = shopPurchasePending;

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

    const avatar = document.createElement('span');
    avatar.className = 'user-avatar ranking-avatar';
    const avatarImage = document.createElement('img');
    avatarImage.className = 'user-avatar-img';
    avatarImage.alt = '';
    const avatarFallback = document.createElement('i');
    avatarFallback.className = 'bi bi-person-badge';
    avatarFallback.setAttribute('aria-hidden', 'true');
    const avatarOption = AVATAR_OPTIONS[player.avatar];
    const imageSource = player.profileImage || avatarOption?.image;
    if (imageSource) {
      let avatarFallbackApplied = false;
      avatarImage.onerror = () => {
        if (avatarOption && !avatarFallbackApplied) {
          avatarFallbackApplied = true;
          avatarImage.src = avatarOption.image;
          return;
        }
        avatarImage.hidden = true;
        avatarFallback.hidden = false;
      };
      avatarImage.src = imageSource;
      avatarFallback.hidden = true;
    } else {
      avatarImage.hidden = true;
    }
    avatar.append(avatarImage, avatarFallback);
    applyFrame(avatar,player.frame,false);

    const name = document.createElement('span');
    name.className = 'ranking-name';
    name.textContent = player.currentUser ? player.name + ' (você)' : player.name;if(player.isAscendFounder)appendFounderBadge(name);

    const level = document.createElement('span');
    level.className = 'ranking-nivel';
    level.textContent = 'Nv.' + player.level + ' | Rank ' + player.rank;

    const exp = document.createElement('span');
    exp.className = 'ranking-exp-value';
    exp.textContent = formatCurrencyValue(player.experience) + ' EXP';

    row.append(position, avatar, name, level, exp);
    rankingList.appendChild(row);
  });
}

let notificationAudio;
function playNotificationSound() {
  try {
    notificationAudio ||= new Audio(notificationSoundUrl);
    notificationAudio.currentTime = 0;
    const playback = notificationAudio.play();
    if (playback) playback.catch(() => {});
  } catch (error) {
    // A notificação visual continua funcionando se o navegador bloquear o áudio.
  }
}

function showPopup(title, exp, coins, playSound = true) {
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

  if (playSound) playNotificationSound();
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
    showPopup('Sistema ASCEND', 0, 0, false);
    return;
  }

  hidePopup();
}

function mountRoutinePlannerInTraining() {
  const plannerSection = getElement('routine-planner-section');
  const target = getElement('training-routine-config');
  if (!plannerSection || !target || target.contains(plannerSection)) return;

  target.appendChild(plannerSection);
}

function openAiAssistant() {
  mountRoutinePlannerInTraining();
  showView('training');
  const plannerSection = getElement('routine-planner-section');
  if (plannerSection) plannerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openCalendarScreen() {
  showView('calendar');
  renderSamsungCalendar(currentAdaptivePlan || buildLocalAdaptivePlan(currentRoutineProfile || getRoutineProfile()), currentRoutineProfile || getRoutineProfile());
}

async function handleAiChatSubmit(event) {
  event.preventDefault();
  const input = getElement('ai-chat-input');
  const message = input ? input.value.trim() : '';
  if (!message || aiChatPending) return;
  if (message.length > 2000) {
    input.setCustomValidity('Máximo de 2.000 caracteres.');
    input.reportValidity();
    return;
  }
  input.setCustomValidity('');
  aiChatPending = true;
  const sendButton = event.currentTarget.querySelector('button[type="submit"]');
  if (sendButton) sendButton.disabled = true;

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
        conversation: aiConversation.filter((entry) => entry !== typingMessage).slice(0, -1).slice(-10),
        profile: currentRoutineProfile || getRoutineProfile(),
        externalConsent: Boolean(getElement('ai-external-consent')?.checked)
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
  aiChatPending = false;
  if (sendButton) sendButton.disabled = false;
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

function tickTimer() {
  if (!running) return;
  remaining = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000));
  updateTimerUI();
  if (remaining > 0) return;
  const isBreak = totalSeconds === 5 * 60;
  clearInterval(timerInterval);
  running = false;
  timerDeadline = null;
  if (!isBreak) setText('cycle-count', ++cycles);
  setText('focus-feedback', isBreak ? 'Pausa concluída. Pronto para o próximo desafio?' : 'Ciclo concluído! Faça uma pausa e recupere a energia.');
  setText('btn-start', 'INICIAR');
  setAria('btn-start', 'aria-pressed', 'false');
  showPopup(isBreak ? 'Pausa concluída!' : 'Foco concluído!', 0, 0);
  setText('popup-body', isBreak ? 'Hora de escolher sua próxima missão.' : 'Mais um passo na sua evolução. Seu ciclo de foco foi concluído.');
  remaining = totalSeconds;
  updateTimerUI();
}

function startTimer() {
  if (running) {
    tickTimer();
    if (!running) return;
    clearInterval(timerInterval);
    running = false;
    timerDeadline = null;
    setText('btn-start', 'CONTINUAR');
    setAria('btn-start', 'aria-pressed', 'false');
    setText('focus-feedback', 'Sessão pausada. Continue quando estiver pronto.');
    return;
  }
  running = true;
  timerDeadline = Date.now() + remaining * 1000;
  setText('btn-start', 'PAUSAR');
  setAria('btn-start', 'aria-pressed', 'true');
  setText('focus-feedback', totalSeconds === 300 ? 'Respire. Este tempo é seu.' : 'Uma tarefa. Toda a sua atenção.');
  timerInterval = setInterval(tickTimer, 250);
}

function resetTimer() {
  clearInterval(timerInterval);
  running = false;
  timerDeadline = null;
  remaining = totalSeconds;
  setText('btn-start', 'INICIAR');
  setAria('btn-start', 'aria-pressed', 'false');
  setText('focus-feedback', 'Seu tempo de foco, no seu ritmo.');
  updateTimerUI();
}

function setFocusDuration(minutes) {
  totalSeconds = minutes * 60;
  resetTimer();
}


const ASCEND_FAQ = [
  { question: 'Como ganho moedas?', answer: 'Conclua missões do dia. O backend credita experiência e moedas ao confirmar cada missão.' },
  { question: 'Como funciona a loja?', answer: 'Cada compra custa moedas virtuais da sua conta. O preço é validado no backend e o item vai para seu inventário. Os itens diários podem ser resgatados uma vez por dia.' },
  { question: 'Minha compra sumiu?', answer: 'Atualize a página para sincronizar compras e moedas. Temporizadores ativados continuam armazenados neste dispositivo.' },
  { question: 'Como monto minha rotina?', answer: 'Abra Treino, configure horários, prioridades e dias disponíveis no planejador. Depois, gere o plano adaptativo.' },
  { question: 'A IA é gratuita?', answer: 'O ASCEND funciona sem chave, mas nesse caso o assistente oferece dicas locais. O administrador pode configurar a API Groq, com cota gratuita sujeita a limites.' },
  { question: 'Posso usar no celular?', answer: 'Sim. O site é responsivo e existe também um aplicativo Expo/React Native separado, conectado ao mesmo backend.' }
];

function toggleHelp(open) {
  const help = getElement('ascend-help');
  const button = getElement('btn-help');
  if (!help) return;
  const next = typeof open === 'boolean' ? open : help.hidden;
  help.hidden = !next;
  if (button) button.setAttribute('aria-expanded', String(next));
  if (next) {
    renderFaq('');
    const search = getElement('help-search');
    if (search) search.focus();
  } else if (button) button.focus();
}

function renderFaq(query) {
  const container = getElement('help-faq');
  if (!container) return;
  container.textContent = '';
  const term = String(query || '').trim().toLocaleLowerCase('pt-BR');
  const faqs = ASCEND_FAQ.filter((faq) => (faq.question + ' ' + faq.answer).toLocaleLowerCase('pt-BR').includes(term));
  if (!faqs.length) {
    const notice = document.createElement('p');
    notice.textContent = 'Não encontrei essa dúvida. Tente perguntar à IA.';
    container.appendChild(notice);
  }
  faqs.forEach((faq) => {
    const details = document.createElement('details');
    details.className = 'help-faq-item';
    const summary = document.createElement('summary');
    summary.textContent = faq.question;
    const p = document.createElement('p');
    p.textContent = faq.answer;
    details.append(summary, p);
    container.appendChild(details);
  });
}

function helpAskAi() {
  toggleHelp(false);
  showView('ai');
  renderAiChat();
  const chat = getElement('ai-chat-input');
  if (chat) {
    chat.scrollIntoView({ behavior: 'smooth', block: 'center' });
    chat.focus({ preventScroll: true });
  }
}

function bindEvents() {
  const tabLogin = getElement('tab-login');
  const tabRegister = getElement('tab-register');
  const loginForm = getElement('login-form');
  const registerForm = getElement('register-form');
  const themeToggleButton = getElement('btn-theme-toggle');
  const customizeButton = getElement('btn-customize');
  const customizeClose = getElement('customization-close');
  const customizationPanel = getElement('customization-panel');
  const customizationReset = getElement('customization-reset');
  const popupButton = getElement('btn-toggle-popup');
  const popupCloseButton = getElement('popup-close');
  const logoutButton = getElement('btn-logout');
  const startButton = getElement('btn-start');
  const resetButton = getElement('btn-reset');
  const missionsList = getElement('missions-list');
  const plannerForm = getElement('planner-form');
  const plannerResetButton = getElement('planner-reset');
  const aiCalendarButton = getElement('btn-open-ai-calendar');
  const calendarOpenAiButton = getElement('calendar-open-ai');
  const aiOpenCalendarButton = getElement('ai-open-calendar');
  const calendarPrevButton = getElement('calendar-prev-month');
  const calendarNextButton = getElement('calendar-next-month');
  const calendarTodayButton = getElement('calendar-today');
  const aiChatForm = getElement('ai-chat-form');
  const aiChatClear = getElement('ai-chat-clear');
  const helpButton = getElement('btn-help');
  const helpCloseButton = getElement('help-close');
  const helpSearch = getElement('help-search');
  const helpAiButton = getElement('help-ask-ai');
  const avatarConfirmButton = getElement('avatar-confirm');
  const avatarCancelButton = getElement('avatar-cancel');
  const avatarParticles = getElement('avatar-particles');

  if (avatarParticles && avatarParticles.childElementCount === 0) {
    for (let index = 0; index < 26; index += 1) {
      const particle = document.createElement('span');
      particle.style.setProperty('--x', `${(index * 47 + 13) % 100}%`);
      particle.style.setProperty('--size', `${2 + (index % 3)}px`);
      particle.style.setProperty('--delay', `${-((index * 7) % 19)}s`);
      particle.style.setProperty('--duration', `${13 + (index % 11)}s`);
      avatarParticles.appendChild(particle);
    }
  }

  document.querySelectorAll('[data-avatar-choice]').forEach((button) => {
    button.addEventListener('click', () => selectAvatar(button.dataset.avatarChoice));
  });
  if (avatarConfirmButton) avatarConfirmButton.addEventListener('click', handleAvatarConfirm);
  if (avatarCancelButton) avatarCancelButton.addEventListener('click', () => {
    const avatarScreen = getElement('avatar-onboarding');
    if (avatarSelectionMode !== 'profile' || !avatarScreen) return;
    closeAvatarEditor();
  });
  ['btn-edit-avatar', 'btn-edit-avatar-sidebar'].forEach((id) => {
    getElement(id)?.addEventListener('click', () => showView('profile'));
  });
  document.querySelector('.sidebar-identity__profile')?.addEventListener('click', event => {
    event.preventDefault();
    showView('profile');
  });
  getElement('btn-edit-avatar-dashboard')?.addEventListener('click', () => {
    avatarReturnToProfileEditor = false;
    openAvatarOnboarding('profile');
  });
  getElement('profile-change-character')?.addEventListener('click', () => {
    avatarReturnToProfileEditor = true;
    getElement('profile-edit-dialog').close();
    openAvatarOnboarding('profile');
  });

  document.querySelectorAll('.password-toggle').forEach((toggle) => toggle.addEventListener('click', () => {
    const input = toggle.closest('.auth-field')?.querySelector('input');
    if (!input) return;
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    toggle.setAttribute('aria-label', visible ? 'Mostrar senha' : 'Ocultar senha');
    toggle.innerHTML = `<i class="bi bi-eye${visible ? '-slash' : ''}" aria-hidden="true"></i>`;
  }));

  const authScreen = getElement('auth-screen');
  if (authScreen && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    authScreen.addEventListener('pointermove', (event) => {
      const x = (event.clientX / window.innerWidth - .5) * 2;
      const y = (event.clientY / window.innerHeight - .5) * 2;
      authScreen.style.setProperty('--pointer-x', `${x * 10}px`);
      authScreen.style.setProperty('--pointer-y', `${y * 10}px`);
    });
  }

  if (tabLogin) tabLogin.addEventListener('click', () => switchAuthTab('login'));
  if (tabRegister) tabRegister.addEventListener('click', () => switchAuthTab('register'));
  if (tabLogin) tabLogin.addEventListener('keydown', handleAuthTabKeydown);
  if (tabRegister) tabRegister.addEventListener('keydown', handleAuthTabKeydown);
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  initGoogleSignIn();
  if (themeToggleButton) themeToggleButton.addEventListener('click', toggleTheme);
  if (customizeButton) customizeButton.addEventListener('click', () => toggleCustomization());
  if (customizeClose) customizeClose.addEventListener('click', () => toggleCustomization(false));
  if (customizationPanel) customizationPanel.addEventListener('click', (event) => { if (event.target === customizationPanel) toggleCustomization(false); });
  document.querySelectorAll('[data-theme-preset]').forEach((button) => button.addEventListener('click', () => {
    const current = getStoredCustomization();
    const next = { ...current, preset: button.dataset.themePreset };
    saveCustomization(next);
    applyCustomization(next);
  }));
  ['customization-glow', 'customization-glass', 'customization-ambient'].forEach((id) => getElement(id)?.addEventListener('input', updateCustomization));
  if (customizationReset) customizationReset.addEventListener('click', () => {
    const defaults = { preset: 'blue', glow: 72, glass: 58, ambient: true };
    saveCustomization(defaults);
    applyCustomization(defaults);
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') toggleCustomization(false); });
  if (popupButton) popupButton.addEventListener('click', togglePopup);
  if (popupCloseButton) popupCloseButton.addEventListener('click', hidePopup);
  if (logoutButton) logoutButton.addEventListener('click', handleLogout);
  if (startButton) startButton.addEventListener('click', startTimer);
  if (resetButton) resetButton.addEventListener('click', resetTimer);
  if (plannerForm) plannerForm.addEventListener('submit', handlePlannerSubmit);
  if (plannerResetButton) plannerResetButton.addEventListener('click', handlePlannerReset);
  if (aiCalendarButton) aiCalendarButton.addEventListener('click', openAiAssistant);
  if (calendarOpenAiButton) calendarOpenAiButton.addEventListener('click', openAiAssistant);
  if (aiOpenCalendarButton) aiOpenCalendarButton.addEventListener('click', openCalendarScreen);
  setupEditableCalendar();
  if (calendarPrevButton) calendarPrevButton.addEventListener('click', () => changeCalendarMonth(-1));
  if (calendarNextButton) calendarNextButton.addEventListener('click', () => changeCalendarMonth(1));
  if (calendarTodayButton) calendarTodayButton.addEventListener('click', () => {
    currentCalendarMonth = new Date();
    selectedCalendarDateKey = getDateKeyForDate(currentCalendarMonth);
    renderSamsungCalendar(currentAdaptivePlan || buildLocalAdaptivePlan(currentRoutineProfile || getRoutineProfile()), currentRoutineProfile || getRoutineProfile());
  });
  getElement('level-up-close')?.addEventListener('click', closeLevelUp);
  getElement('level-up-continue')?.addEventListener('click', closeLevelUp);
  getElement('level-up-overlay')?.addEventListener('click', (event) => {
    if (event.target.id === 'level-up-overlay') closeLevelUp();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLevelUp();
  });
  if (aiChatForm) aiChatForm.addEventListener('submit', handleAiChatSubmit);
  if (aiChatClear) aiChatClear.addEventListener('click', clearAiChat);
  document.querySelectorAll('[data-ai-suggestion]').forEach((suggestion) => {
    suggestion.addEventListener('click', () => {
      const input = getElement('ai-chat-input');
      if (input) {input.value = suggestion.dataset.aiSuggestion; input.focus();}
    });
  });
  renderAiChat();
  if (helpButton) helpButton.addEventListener('click', () => toggleHelp());
  if (helpCloseButton) helpCloseButton.addEventListener('click', () => toggleHelp(false));
  if (helpSearch) helpSearch.addEventListener('input', () => renderFaq(helpSearch.value));
  if (helpAiButton) helpAiButton.addEventListener('click', helpAskAi);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleHelp(false); });
  const helpPanel = getElement('ascend-help');
  if (helpPanel) helpPanel.addEventListener('click', (e) => { if (e.target === helpPanel) toggleHelp(false); });

  document.querySelectorAll('.sidebar-link[data-view]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const viewName = link.dataset.view;
      if (!viewName) return;

      event.preventDefault();
      showView(viewName, link);
      closeSidebar();
    });
  });

  getElement('profile-post-form')?.addEventListener('submit', saveProfilePost);
  getElement('profile-edit')?.addEventListener('click', editProfile);
  getElement('profile-edit-form')?.addEventListener('submit', saveProfileEdits);
  getElement('profile-edit-close')?.addEventListener('click', () => getElement('profile-edit-dialog').close());
  getElement('profile-edit-cancel')?.addEventListener('click', () => getElement('profile-edit-dialog').close());
  getElement('profile-image-input')?.addEventListener('change', handleProfileImageSelection);
  getElement('profile-image-remove')?.addEventListener('click', handleProfileImageRemove);
  getElement('profile-edit-dialog')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
  getElement('view-profile')?.addEventListener('click', handleProfileTabClick);
  getElement('view-profile')?.addEventListener('keydown', handleProfileTabKeydown);
  getElement('profile-follow-button')?.addEventListener('click', handleProfileFollow);
  getElement('profile-friend-button')?.addEventListener('click', handleProfileFriend);
  getElement('player-search')?.addEventListener('input', () => {
    clearTimeout(playerSearchTimer);
    playerSearchTimer = window.setTimeout(searchPlayers, 250);
  });
  getElement('friend-requests-open')?.addEventListener('click', loadFriendRequests);

  initSidebarDrawer();
  mountRoutinePlannerInTraining();

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
  applyCustomization(getStoredCustomization());
  bindEvents();
  document.querySelectorAll('[data-close-inspection]').forEach((button) => button.addEventListener('click', closeStoreInspection));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeStoreInspection(); });
  document.querySelectorAll('[data-store-mode]').forEach((button) => button.addEventListener('click', () => setStoreMode(button.dataset.storeMode)));
  initExperience({ navigate: showView, setFocusDuration });
  window.addEventListener('popstate', () => showView(location.hash.replace('#view-', '') || 'status', null, false));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tickTimer(); });
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


// ASCEND Connect uses authenticated HTTP polling so a reconnect reloads persisted state.
let connectSelected = null, connectRows = [], connectHistory = [], connectBusy = false, connectSearchTimer, connectPending = null, connectSeen = null, connectToastTimer;
const connectEl = id => document.getElementById(id);
function resetConnect(){connectSelected=null;connectRows=[];connectHistory=[];connectPending=null;connectSeen=null;connectEl('connect-layout')?.classList.remove('has-selection');connectEl('connect-messages')?.replaceChildren();for(const id of ['connect-unread','connect-navbar-unread','connect-toast']){const el=connectEl(id);if(el)el.hidden=true;}}
function connectPreferenceKey(){return 'ascend.connect.notifications.' + currentUser?.id;}
function connectNotify(row){
 if(!currentUser || localStorage.getItem(connectPreferenceKey())==='off')return;
 playNotificationSound();
 const toast=connectEl('connect-toast');toast.textContent='Nova mensagem de '+row.name;toast.hidden=false;toast.onclick=()=>{toast.hidden=true;showView('connect');connectOpen(row.id);};clearTimeout(connectToastTimer);connectToastTimer=setTimeout(()=>{toast.hidden=true;},6000);
}
async function connectLoadDetails(row){
 const panel=connectEl('connect-details');panel.replaceChildren();
 try{const profile=await apiRequest('/profile/players/'+row.userId);if(connectSelected!==row.id)return;
  const image=document.createElement('img');image.className='connect-detail-avatar';image.alt='';image.src=profile.profileImage||AVATAR_OPTIONS[profile.avatar]?.image||aetherImage;
  const title=document.createElement('h2');title.textContent=profile.name;const handle=document.createElement('p');handle.textContent='@'+profile.username;
  const level=document.createElement('p');level.textContent='Nível '+profile.level+' · Rank '+profile.rank;
  const bio=document.createElement('p');bio.textContent=profile.bio || 'Este jogador ainda não adicionou uma bio.';
  const tags=document.createElement('p');tags.textContent=(profile.tags||[]).join(' · ');
  const button=document.createElement('button');button.type='button';button.className='btn-timer';button.textContent='Ver perfil';button.onclick=()=>{showView('profile');loadProfileView(row.userId);};panel.append(cosmeticAvatar(image.src,profile.equippedCosmetics?.find(i=>i.category==="PROFILE_FRAME"),{size:76,animated:false}),title,handle,level,bio,tags,button);
 }catch(error){if(connectSelected===row.id)panel.textContent='Perfil indisponível.';}
}
function connectTime(value) { return value ? new Date(value).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : ''; }
function connectRenderList() {
  const list = connectEl('connect-list'); list.replaceChildren();
  if (!connectRows.length) { list.textContent = 'Nenhuma conversa ainda. Busque um jogador para começar.'; return; }
  connectRows.forEach(row => {
    const button = document.createElement('button'); button.type='button'; button.className='connect-row' + (row.id === connectSelected ? ' selected' : '');
    const avatar=document.createElement('span'); avatar.className='connect-avatar';
    const img=document.createElement('img'); img.alt=''; img.src=row.profileImage || AVATAR_OPTIONS[row.avatar]?.image || aetherImage; avatar.append(img);applyFrame(avatar,row.frame,false);
    const text=document.createElement('span'); text.className='connect-row-text'; const name=document.createElement('strong'); name.textContent=row.name;if(row.isAscendFounder)appendFounderBadge(name); const preview=document.createElement('small'); preview.textContent=row.lastMessage?.content || 'Comece a conversa'; text.append(name,preview);
    const meta=document.createElement('span'); meta.className='connect-meta'; meta.textContent=connectTime(row.updatedAt); if(row.unread){const badge=document.createElement('b');badge.textContent=row.unread;meta.append(badge);} button.append(avatar,text,meta); button.addEventListener('click',()=>connectOpen(row.id)); list.append(button);
  });
}
function connectRenderMessages(scroll=false) {
 const box=connectEl('connect-messages'); const nearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<100; box.replaceChildren();
 if(!connectHistory.length){box.textContent='Nenhuma mensagem ainda. Diga olá!';return;}
 connectHistory.forEach(m=>{const bubble=document.createElement('div');bubble.className='connect-bubble'+(String(m.senderId)===String(currentUser?.id)?' own':''); const content=document.createElement('span');content.textContent=m.content; const meta=document.createElement('small');meta.textContent=connectTime(m.createdAt)+(String(m.senderId)===String(currentUser?.id)?(m.read?' · Lida':' · Enviada'):'');bubble.append(content,meta);box.append(bubble);});
 if(scroll||nearBottom)box.scrollTop=box.scrollHeight;
}
async function connectRefresh() {
 if(!getAuthToken()||connectBusy)return; connectBusy=true; const token=getAuthToken();
 try {const rows=await apiRequest('/connect/conversations'); if(token!==getAuthToken())return; if(connectSeen){for(const row of rows){const last=row.lastMessage;if(last && row.unread && String(last.senderId)!==String(currentUser?.id) && last.id>(connectSeen.get(row.id)||0) && !(connectSelected===row.id && !connectEl('view-connect').hidden && !document.hidden))connectNotify(row);}}connectSeen=new Map(rows.map(row=>[row.id,row.lastMessage?.id||0]));connectRows=rows; const total=connectRows.reduce((sum,r)=>sum+r.unread,0);for(const id of ['connect-unread','connect-navbar-unread']){const badge=connectEl(id);badge.hidden=!total;badge.textContent=total;}connectRenderList();
 if(connectSelected && !connectEl('view-connect').hidden){const selectedId=connectSelected;let latest=await apiRequest('/connect/conversations/'+selectedId+'/messages');if(selectedId!==connectSelected||token!==getAuthToken())return; const previous=connectHistory.length ? connectHistory[connectHistory.length-1].id : null; let batch=latest; while(previous && batch.length===50 && batch[0].id>previous){batch=await apiRequest('/connect/conversations/'+selectedId+'/messages?before='+batch[0].id); if(selectedId!==connectSelected||token!==getAuthToken())return; latest=[...batch,...latest];} const map=new Map(connectHistory.map(m=>[m.id,m]));latest.forEach(m=>map.set(m.id,m));connectHistory=[...map.values()].sort((a,b)=>a.id-b.id);connectRenderMessages(); if(latest.length)await apiRequest('/connect/conversations/'+selectedId+'/read',{method:'POST',body:JSON.stringify({messageId:latest[latest.length-1].id})});}connectEl('connect-status').textContent='';
 } catch(error){connectEl('connect-status').textContent='Conexão indisponível. Tentando reconectar...';} finally{connectBusy=false;}
}
async function connectOpen(id){connectSelected=id;connectHistory=[];connectEl('connect-layout').classList.add('has-selection');connectEl('connect-form').hidden=false;connectEl('connect-profile').hidden=false;const row=connectRows.find(r=>r.id===id);if(row)connectLoadDetails(row);connectEl('connect-recipient').textContent=row?.name || 'Conversa';connectEl('connect-messages').textContent='Carregando histórico...';connectRenderList();try{const data=await apiRequest('/connect/conversations/'+id+'/messages');if(connectSelected!==id)return;connectHistory=data;connectEl('connect-older').hidden=data.length<50;connectRenderMessages(true);if(data.length)await apiRequest('/connect/conversations/'+id+'/read',{method:'POST',body:JSON.stringify({messageId:data[data.length-1].id})});connectRefresh();}catch(e){connectEl('connect-status').textContent=e.message;}}
async function connectStart(userId){try{const row=await apiRequest('/connect/conversations/'+userId,{method:'POST'});connectRows=[row,...connectRows.filter(r=>r.id!==row.id)];showView('connect');connectOpen(row.id);}catch(e){connectEl('profile-social-feedback').textContent=e.message;connectEl('connect-status').textContent=e.message;}}
connectEl('profile-message-button').addEventListener('click',()=>{if(viewingProfileId)connectStart(viewingProfileId);});
connectEl('connect-profile').addEventListener('click',()=>{const row=connectRows.find(r=>r.id===connectSelected);if(row){showView('profile');loadProfileView(row.userId);}});
connectEl('connect-back').addEventListener('click',()=>{connectSelected=null;connectEl('connect-layout').classList.remove('has-selection');connectRefresh();});
connectEl('connect-search').addEventListener('input',e=>{clearTimeout(connectSearchTimer);const q=e.target.value.trim(), results=connectEl('connect-search-results');results.replaceChildren();if(q.length<2)return;connectSearchTimer=setTimeout(async()=>{try{const rows=await apiRequest('/connect/users?q='+encodeURIComponent(q));if(connectEl('connect-search').value.trim()!==q)return;results.replaceChildren();if(!rows.length)results.textContent='Nenhum jogador encontrado.';rows.forEach(row=>{const b=document.createElement('button');b.type='button';b.className='connect-search-result';b.textContent=row.name+' · @'+row.username;b.addEventListener('click',()=>{results.replaceChildren();connectEl('connect-search').value='';connectStart(row.id);});results.append(b);});}catch(error){results.textContent=error.message;}},300);});
connectEl('connect-navbar').addEventListener('click',()=>showView('connect'));
connectEl('connect-notifications').addEventListener('change',e=>localStorage.setItem(connectPreferenceKey(),e.target.checked?'on':'off'));
connectEl('connect-older').addEventListener('click',async()=>{if(!connectSelected||!connectHistory.length)return;try{const older=await apiRequest('/connect/conversations/'+connectSelected+'/messages?before='+connectHistory[0].id);connectHistory=[...older,...connectHistory];connectEl('connect-older').hidden=older.length<50;connectRenderMessages();}catch(e){connectEl('connect-status').textContent=e.message;}});
connectEl('connect-form').addEventListener('submit',async e=>{e.preventDefault();const input=connectEl('connect-input'), content=input.value.trim(), id=connectSelected;if(!content||!id)return;const button=e.currentTarget.querySelector('button');button.disabled=true;connectEl('connect-status').textContent='Enviando...';const clientId=connectPending?.id===id && connectPending.content===content ? connectPending.clientId : crypto.randomUUID();connectPending={id,content,clientId};try{await apiRequest('/connect/conversations/'+id+'/messages',{method:'POST',body:JSON.stringify({content,clientId})});if(input.value.trim()===content)input.value='';connectPending=null;connectEl('connect-status').textContent='';await connectRefresh();connectEl('connect-messages').scrollTop=connectEl('connect-messages').scrollHeight;}catch(error){connectEl('connect-status').textContent='Falha ao enviar: '+error.message;}finally{button.disabled=false;}});
setInterval(()=>{if(!document.hidden)connectRefresh();},5000);
