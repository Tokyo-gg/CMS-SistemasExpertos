import {
  api,
  $,
  payload,
  items,
  idOf,
  escapeHTML as e,
  loading,
  empty,
  failure,
  notice,
  submit,
  pager,
  confirmAction,
  query
} from './apiClient.js';
import { requireUser } from './auth.js';

(async () => {
  if (!await requireUser(true)) return;

  let resource = 'users';
  let page = 1;
  let revision = 0;

  const labels = {
    users: 'Usuarios',
    blogs: 'Blogs',
    categories: 'Categorías',
    posts: 'Publicaciones',
    comments: 'Comentarios'
  };

  async function load(p = 1) {
    page = p;
    const rev = ++revision;
    const kind = resource;

    $('#pagination').replaceChildren();
    loading($('#admin-results'));
    $('#resource-title').textContent = labels[resource];
    $('#category-form').hidden = resource !== 'categories';

    try {
      const d = await api('/admin/' + resource + '?' + query({
        page: p,
        limit: 10,
        q: $('#admin-search').value
      }));
      if (rev !== revision) return;

      const list = items(d);
      if (!list.length) {
        empty($('#admin-results'), 'No hay registros que coincidan.');
      } else {
        $('#admin-results').innerHTML =
          '<div class="table-responsive"><table class="table align-middle"><caption class="visually-hidden">' +
          labels[resource] +
          '</caption><thead><tr><th>Registro</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>' +
          list.map(x =>
            '<tr><td><strong>' +
            e(x.name || x.title || x.body || x.username) +
            '</strong><div class="small text-secondary">' +
            e(x.email || x.slug || '') +
            '</div></td><td>' +
            e(x.status || 'activo') +
            '</td><td><button class="btn btn-sm btn-outline-danger" data-id="' +
            e(idOf(x)) +
            '" data-action="disable">' +
            (resource === 'categories' ? 'Eliminar' : resource === 'posts' || resource === 'comments' ? 'Ocultar' : 'Desactivar') +
            '</button>' +
            (resource === 'categories' ? ' <button class="btn btn-sm btn-outline-primary" data-id="' + e(idOf(x)) + '" data-action="edit">Editar</button>' : '') +
            '</td></tr>'
          ).join('') +
          '</tbody></table></div>';
      }

      $('#admin-results').onclick = async ev => {
        const b = ev.target.closest('[data-id]');
        if (!b) return;

        const x = list.find(x => String(idOf(x)) === b.dataset.id);
        if (b.dataset.action === 'edit') {
          for (const key of ['name', 'slug', 'description']) {
            $('#category-form').elements[key].value = x[key] || '';
          }
          $('#category-form').dataset.id = b.dataset.id;
          $('#category-form').elements.name.focus();
          return;
        }

        if (!await confirmAction('Confirmar acción', 'Se retirará este registro de las vistas públicas.')) return;

        b.disabled = true;
        try {
          const status = kind === 'posts' ? 'archivado' : kind === 'comments' ? 'oculto' : 'inactivo';
          await api('/admin/' + kind + '/' + encodeURIComponent(b.dataset.id) + (kind === 'categories' ? '' : '/status'), {
            method: kind === 'categories' ? 'DELETE' : 'PATCH',
            body: kind === 'categories' ? undefined : { status }
          });
          notice($('#page-status'), 'Registro actualizado.', 'success');
          await load(page);
        } catch (err) {
          notice($('#page-status'), err.message);
          b.disabled = false;
        }
      };

      pager($('#pagination'), d, p, load);
    } catch (err) {
      if (rev === revision) failure($('#admin-results'), err, () => load(page));
    }
  }

  $('#admin-tabs').onclick = ev => {
    const b = ev.target.closest('[data-resource]');
    if (!b) return;

    resource = b.dataset.resource;
    $('#admin-tabs').querySelectorAll('button').forEach(x => {
      x.classList.toggle('active', x === b);
      x.setAttribute('aria-pressed', String(x === b));
    });
    load();
  };

  $('#admin-filter').onsubmit = ev => {
    ev.preventDefault();
    load();
  };

  $('#category-form').onsubmit = ev => {
    ev.preventDefault();
    const f = ev.target;
    submit(f, async values => {
      await api('/admin/categories' + (f.dataset.id ? '/' + encodeURIComponent(f.dataset.id) : ''), {
        method: f.dataset.id ? 'PUT' : 'POST',
        body: values
      });
      f.reset();
      delete f.dataset.id;
      await load();
    });
  };

  $('#category-form').onreset = () => delete $('#category-form').dataset.id;

  async function stats() {
    try {
      const d = payload(await api('/admin/stats'));
      $('#admin-metrics').innerHTML = ['users', 'blogs', 'posts'].map(k =>
        '<div class="col-md-4"><div class="metric card"><span>' +
        labels[k] +
        '</span><strong>' +
        e(d[k] ?? '—') +
        '</strong></div></div>'
      ).join('');
    } catch (err) {
      failure($('#admin-metrics'), err, stats);
    }
  }

  stats();
  load();
})();
