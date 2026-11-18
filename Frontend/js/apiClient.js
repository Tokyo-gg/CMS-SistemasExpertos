export const API_BASE = document.querySelector('meta[name="api-base"]').content.replace(/\/$/, '');

export const $ = (s, root = document) => root.querySelector(s);

export const escapeHTML = (value = '') =>
  String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

export const idOf = x => x?._id ?? x?.id ?? '';

export const payload = x => x?.data ?? x;

export const items = x => {
  const d = payload(x);
  return Array.isArray(d) ? d : (d?.items ?? []);
};

export const date = x =>
  x && !Number.isNaN(Date.parse(x))
    ? new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(x))
    : 'Sin fecha';

export function token() {
  try {
    return localStorage.getItem('punto_token');
  } catch {
    return null;
  }
}

export function saveToken(value) {
  try {
    if (value) {
      localStorage.setItem('punto_token', value);
    } else {
      localStorage.removeItem('punto_token');
    }
  } catch {
    if (value) {
      throw new Error('El navegador bloqueó el almacenamiento de la sesión. Habilítalo para iniciar sesión.');
    }
  }
}

export function safeURL(value) {
  if (!value) return '';
  try {
    const u = new URL(value, location.origin);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
}

export async function api(path, { method = 'GET', body, signal, ...rest } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const abort = () => controller.abort();

  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();

  try {
    const headers = { Accept: 'application/json', ...rest.headers };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token()) headers.Authorization = 'Bearer ' + token();

    const response = await fetch(API_BASE + path, {
      ...rest,
      method,
      headers,
      credentials: 'same-origin',
      signal: controller.signal,
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      if (response.ok) throw new Error('La API devolvió una respuesta no válida.');
    }

    if (!response.ok) {
      const e = new Error(({
        400: 'Revisa los datos introducidos.',
        401: 'Inicia sesión para continuar.',
        403: 'No tienes permiso para esta acción.',
        404: 'No encontramos el recurso solicitado.',
        409: 'Los datos entran en conflicto con un registro existente.',
        429: 'Hay demasiadas solicitudes. Intenta más tarde.'
      })[response.status] || 'El servidor no pudo completar la solicitud.');

      e.status = response.status;
      e.fields = data?.errors;

      if (response.status === 401) {
        saveToken(null);
        document.dispatchEvent(new Event('session-expired'));
      }
      throw e;
    }

    return data;
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado. Vuelve a intentarlo.');
    }
    if (e instanceof TypeError) {
      throw new Error('No se pudo conectar con la API. Comprueba que el servidor esté disponible.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export function notice(el, message, type = 'danger') {
  el.replaceChildren();
  const p = document.createElement('div');
  p.className = 'alert alert-' + type;
  p.setAttribute('role', type === 'danger' ? 'alert' : 'status');
  p.textContent = message;
  el.append(p);
}

export function loading(el) {
  el.innerHTML = '<div class="state" role="status"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Cargando…</div>';
}

export function empty(el, message = 'Todavía no hay contenido para mostrar.') {
  el.innerHTML = '<div class="state"><i class="bi bi-journal-text" aria-hidden="true"></i><p>' + escapeHTML(message) + '</p></div>';
}

export function failure(el, e, retry) {
  notice(el, e.message);
  if (retry) {
    const b = document.createElement('button');
    b.className = 'btn btn-outline-primary';
    b.textContent = 'Reintentar';
    b.onclick = retry;
    el.append(b);
  }
}

export async function submit(form, task, message = 'Cambios guardados.') {
  const status = $('[data-form-status]', form);
  if (!form.reportValidity()) return;
  if (form.dataset.submitting === 'true') return;

  const values = Object.fromEntries(new FormData(form));
  const controls = [...form.querySelectorAll('input,select,textarea,button')].map(el => [el, el.disabled]);

  form.dataset.submitting = 'true';
  controls.forEach(([el]) => el.disabled = true);
  notice(status, 'Guardando…', 'info');

  try {
    await task(values);
    notice(status, message, 'success');
  } catch (e) {
    notice(status, e.message);
    if (e.fields && typeof e.fields === 'object') {
      for (const [name, error] of Object.entries(e.fields)) {
        const field = form.elements.namedItem(name);
        if (field && 'setCustomValidity' in field) {
          field.setCustomValidity(String(error));
          field.addEventListener('input', () => field.setCustomValidity(''), { once: true });
        }
      }
    }
  } finally {
    controls.forEach(([el, disabled]) => el.disabled = disabled);
    delete form.dataset.submitting;
  }
}

export function confirmAction(title, message) {
  return new Promise(resolve => {
    const el = $('#confirm-modal');
    $('#confirm-title').textContent = title;
    $('#confirm-message').textContent = message;

    if (!window.bootstrap) {
      notice($('#page-status'), 'No se pudo cargar el diálogo. Recarga la página.');
      resolve(false);
      return;
    }

    let yes = false;
    const modal = bootstrap.Modal.getOrCreateInstance(el);
    const ok = $('#confirm-ok');

    ok.onclick = () => {
      yes = true;
      modal.hide();
    };

    el.addEventListener('hidden.bs.modal', () => {
      ok.onclick = null;
      resolve(yes);
    }, { once: true });

    modal.show();
  });
}

export function pager(el, data, page, onChange) {
  el.replaceChildren();
  const d = payload(data);
  const totalPages = Number(d?.pagination?.totalPages ?? 1);
  if (totalPages <= 1) return;

  for (const [label, target] of [
    ['Anterior', page - 1],
    [`Página ${page} de ${totalPages}`, 0],
    ['Siguiente', page + 1]
  ]) {
    const b = document.createElement('button');
    b.className = 'btn btn-outline-secondary';
    b.textContent = label;
    b.disabled = target < 1 || target > totalPages;
    b.onclick = () => onChange(target);
    el.append(b);
  }
}

export const statusBadge = s =>
  '<span class="badge status-' +
  escapeHTML(['borrador', 'publicado', 'archivado'].includes(s) ? s : 'neutral') +
  '">' +
  escapeHTML(s || 'Sin estado') +
  '</span>';

export function query(values) {
  const p = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => {
    if (v !== '' && v != null) p.set(k, v);
  });
  return p.toString();
}
