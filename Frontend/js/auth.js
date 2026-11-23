import {
  api,
  payload,
  $,
  token,
  saveToken,
  submit,
  notice,
  escapeHTML,
  failure
} from './apiClient.js';

let user = null;
let sessionError = null;

export const currentUser = () => user;

export function setCurrentUser(profile) {
  user = profile;
  nav();
}

function nav() {
  const auth = $('#nav-account');
  const roles = $('#nav-private');

  if (!user) {
    auth.innerHTML =
      '<a class="btn btn-outline-primary" href="auth.html">Iniciar sesión</a>' +
      '<a class="btn btn-primary" href="auth.html#register">Crear cuenta</a>';
    roles.hidden = true;
    return;
  }

  roles.hidden = false;
  auth.innerHTML =
    '<span class="small text-secondary">' + escapeHTML(user.name) + '</span>' +
    '<button class="btn btn-outline-secondary" id="logout">Salir</button>';

  $('#admin-link').hidden = !['admin', 'administrador'].includes(user.role);

  $('#logout').onclick = () => {
    try {
      saveToken(null);
      user = null;
      location.assign('index.html');
    } catch (e) {
      notice($('#page-status'), e.message);
    }
  };
}

export const ready = (async () => {
  try {
    user = payload(await api('/auth/me'));
  } catch (e) {
    if (e.status !== 401) {
      sessionError = e;
      $('#session-info').textContent = 'No se pudo comprobar la sesión.';
    }
  }
  nav();
  return user;
})();

document.addEventListener('session-expired', () => {
  user = null;
  nav();
  const area = $('#protected');
  if (area) {
    area.hidden = true;
    notice($('#page-status'), 'Tu sesión terminó. Vuelve a iniciar sesión.', 'warning');
    const a = document.createElement('a');
    a.href = 'auth.html';
    a.className = 'btn btn-primary';
    a.textContent = 'Iniciar sesión';
    $('#page-status').append(a);
  }
});

window.addEventListener('storage', e => {
  if (e.key === 'punto_token') location.reload();
});

export async function requireUser(admin = false) {
  await ready;

  if (sessionError) {
    failure(
      $('#page-status'),
      new Error('No se pudo comprobar tu sesión. Intenta conectarte de nuevo.'),
      () => location.reload()
    );
    return null;
  }

  if (!user) {
    const area = $('#protected');
    if (area) area.hidden = true;

    const s = $('#page-status');
    notice(s, 'Necesitas iniciar sesión para acceder a esta sección.', 'warning');

    const a = document.createElement('a');
    a.href = 'auth.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search);
    a.className = 'btn btn-primary';
    a.textContent = 'Iniciar sesión';
    s.append(a);
    return null;
  }

  if (admin && !['admin', 'administrador'].includes(user.role)) {
    notice($('#page-status'), 'Esta sección está reservada para administradores.');
    return null;
  }

  $('#protected').hidden = false;
  return user;
}

function destination() {
  const next = new URLSearchParams(location.search).get('next');
  if (next && /^(dashboard|my-posts|blog-settings|editor|post|admin)\.html(\?[^#]*)?$/.test(next)) {
    return next;
  }
  return 'dashboard.html';
}

if (document.body.dataset.page === 'auth') {
  const choose = () => {
    const reg = location.hash === '#register';
    $('#login-form').hidden = reg;
    $('#register-form').hidden = !reg;
    $('#login-tab').classList.toggle('active', !reg);
    $('#register-tab').classList.toggle('active', reg);
    $('#login-tab').setAttribute('aria-current', reg ? 'false' : 'page');
    $('#register-tab').setAttribute('aria-current', reg ? 'page' : 'false');
  };

  window.addEventListener('hashchange', choose);
  choose();

  $('#login-form').addEventListener('submit', e => {
    e.preventDefault();
    submit(e.target, async values => {
      await ready;
      const data = payload(await api('/auth/login', { method: 'POST', body: values }));
      if (data?.token) saveToken(data.token);
      user = payload(await api('/auth/me'));
      location.assign(destination());
    }, 'Sesión iniciada.');
  });

  $('#register-form').addEventListener('submit', e => {
    e.preventDefault();
    submit(e.target, async values => {
      await api('/auth/register', { method: 'POST', body: values });
      location.hash = 'login';
      notice($('[data-form-status]', $('#login-form')), 'Cuenta creada. Ya puedes iniciar sesión.', 'success');
    }, 'Cuenta creada.');
  });
}
