const byId = id => document.getElementById(id);
const requestForm = byId('request-form');
const resetForm = byId('reset-form');
const password = byId('password');
const confirmation = byId('confirmation');
const isReset = new URLSearchParams(location.search).has('redefinir');
let token = location.hash.slice(1);
history.replaceState(null, '', location.pathname + (isReset ? '?redefinir' : ''));

// Credentials go only to the API selected at build time, including in the APK.
const api = (import.meta.env.VITE_API_URL || 'https://backend-ascend.onrender.com/api').replace(/\/+$/, '');
const invalid = 'Este link é inválido ou expirou. Solicite um novo link.';

function feedback(message, error = false) {
  byId('feedback').textContent = message;
  byId('feedback').classList.toggle('error', error);
}

function finish(title, message, retry = false) {
  token = '';
  for (const form of [requestForm, resetForm]) {
    form.reset();
    form.hidden = true;
  }
  byId('title').textContent = title;
  byId('description').textContent = message;
  byId('again').hidden = !retry;
  feedback('');
  byId('title').focus();
}

if (isReset && !/^[\w-]{43}$/.test(token)) {
  finish('Link indisponível', invalid, true);
} else if (isReset) {
  openReset();
} else {
  token = '';
  requestForm.hidden = false;
}

for (const button of resetForm.querySelectorAll('[aria-controls]')) {
  button.addEventListener('click', () => {
    const field = byId(button.getAttribute('aria-controls'));
    const show = field.type === 'password';
    field.type = show ? 'text' : 'password';
    button.textContent = show ? 'Ocultar' : 'Mostrar';
    button.setAttribute('aria-pressed', String(show));
    button.setAttribute('aria-label', button.textContent + (field === password ? ' nova senha' : ' confirmação'));
  });
}

function validateMatch() {
  confirmation.setCustomValidity(confirmation.value && password.value !== confirmation.value ? 'As senhas devem ser iguais.' : '');
}
password.addEventListener('input', () => {
  const value = password.value;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter(re => re.test(value)).length;
  const score = !value ? 0 : value.length < 8 ? 1 : Math.min(4, 1 + Number(value.length >= 12)
    + Number(value.length >= 18) + Number(kinds >= 3));
  byId('strength').value = score;
  byId('strength-label').textContent = ['Use entre 8 e 128 caracteres.', 'Segurança baixa', 'Segurança moderada',
    'Segurança boa', 'Segurança alta'][score];
  password.setCustomValidity(value && !value.trim() ? 'Informe uma senha com pelo menos um caractere visível.' : '');
  validateMatch();
});
confirmation.addEventListener('input', validateMatch);

async function post(path, data) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    return await fetch(api + '/auth/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      redirect: 'error',
      cache: 'no-store',
      signal: controller.signal,
      body: JSON.stringify(data),
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function openReset() {
  byId('title').textContent = 'Redefina sua senha';
  byId('description').textContent = 'Verificando seu link…';
  try {
    const response = await post('reset-password/validate', { token });
    if (response.status === 400) {
      finish('Link indisponível', invalid, true);
      return;
    }
    if (response.status === 429) feedback('Muitas tentativas. Tente novamente em 15 minutos.', true);
  } catch {
    feedback('Não foi possível verificar o link agora. Confira sua conexão antes de salvar.', true);
  }
  if (!token) return;
  byId('description').textContent = 'Escolha uma nova senha para acessar sua conta.';
  resetForm.hidden = false;
}

async function submit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type=submit]');
  if (button.disabled || !form.reportValidity()) return;
  const reset = form === resetForm;
  button.disabled = true;
  form.setAttribute('aria-busy', 'true');
  feedback(reset ? 'Salvando sua nova senha…' : 'Solicitando instruções…');
  try {
    const response = reset
      ? await post('reset-password', { token, newPassword: password.value, confirmPassword: confirmation.value })
      : await post('forgot-password', { email: byId('email').value.trim() });
    if (response.status === 400 && reset) {
      finish('Link indisponível', invalid, true);
    } else if (reset && response.status === 204) {
      finish('Senha redefinida', 'Sua nova senha foi salva. Volte ao login para entrar na sua conta.');
    } else if (!reset && response.status === 202) {
      finish('Confira seu e-mail', 'Se existir uma conta associada a este e-mail, você receberá as instruções para redefinir sua senha.', true);
    } else {
      feedback(response.status === 429 ? 'Muitas tentativas. Tente novamente em 15 minutos.'
        : 'O serviço está indisponível. Tente novamente mais tarde.', true);
    }
  } catch {
    feedback('Não foi possível conectar ao ASCEND. Verifique sua conexão e tente novamente.', true);
  } finally {
    button.disabled = false;
    form.removeAttribute('aria-busy');
  }
}

requestForm.addEventListener('submit', submit);
resetForm.addEventListener('submit', submit);
window.addEventListener('pagehide', () => {
  token = '';
  resetForm.reset();
});
window.addEventListener('pageshow', event => {
  if (event.persisted && isReset) finish('Link indisponível', 'Abra novamente o link recebido por e-mail.', true);
});
