import {
  api,
  $,
  payload,
  items,
  idOf,
  escapeHTML as e,
  safeURL,
  date,
  loading,
  empty,
  failure,
  submit,
  notice,
  query,
  pager,
  statusBadge,
  confirmAction
} from './apiClient.js';
import { ready, requireUser } from './auth.js';

export function cards(list, el, privateView = false) {
  if (!list.length) {
    empty(el, 'No encontramos publicaciones. Prueba con otros filtros.');
    return;
  }

  el.innerHTML =
    '<div class="row g-4">' +
    list.map(p => {
      const img = safeURL(p.coverUrl);
      return (
        '<div class="col-md-6 col-xl-4"><article class="card post-card h-100 shadow-sm">' +
        (img
          ? '<img class="post-cover" src="' + e(img) + '" alt="" loading="lazy">'
          : '<div class="post-cover cover-empty"><i class="bi bi-journal-richtext" aria-hidden="true"></i></div>') +
        '<div class="card-body"><span class="eyebrow">' +
        e(p.category?.name || 'Publicación') +
        '</span><h2 class="h4 mt-3"><a href="' +
        (privateView ? 'editor.html?id=' : 'post.html?slug=') +
        (privateView ? encodeURIComponent(idOf(p)) : encodeURIComponent(p.slug)) +
        '">' +
        e(p.title) +
        '</a></h2><p class="text-secondary">' +
        e(p.excerpt || '') +
        '</p><div class="small text-secondary mt-auto">' +
        e(p.author?.name || 'Autor') +
        ' · ' +
        e(date(p.publishedAt)) +
        '</div></div></article></div>'
      );
    }).join('') +
    '</div>';

  el.querySelectorAll('img').forEach(img =>
    img.addEventListener('error', () => {
      img.hidden = true;
    }, { once: true })
  );
}

export async function categories(select, selected = '') {
  const data = items(await api('/categories'));
  select.replaceChildren(new Option('Selecciona una categoría', ''));
  data.forEach(c => select.add(new Option(c.name, idOf(c))));
  select.value = selected;
}

const page = document.body.dataset.page;

if (page === 'index') {
  let current = 1;
  let revision = 0;
  const form = $('#filters');
  const results = $('#results');

  async function load(p = 1) {
    current = p;
    const v = ++revision;

    loading(results);
    $('#pagination').replaceChildren();
    const values = Object.fromEntries(new FormData(form));

    try {
      const data = await api('/posts?' + query({
        ...values,
        page: p,
        limit: 9,
        sort: '-publishedAt'
      }));
      if (v !== revision) return;

      cards(items(data), results);
      pager($('#pagination'), data, p, load);
    } catch (err) {
      if (v === revision) failure(results, err, () => load(current));
    }
  }

  form.onsubmit = ev => {
    ev.preventDefault();
    load();
  };

  form.onreset = () => setTimeout(() => load(), 0);

  async function loadCategories() {
    try {
      await categories(form.elements.category);
      form.elements.category.options[0].textContent = 'Todas las categorías';
      $('#filter-status').replaceChildren();
    } catch (err) {
      failure(
        $('#filter-status'),
        new Error('No se pudieron cargar las categorías. ' + err.message),
        loadCategories
      );
    }
  }

  loadCategories();
  load();
}

if (page === 'dashboard') {
  (async () => {
    if (!await requireUser()) return;

    async function loadMetrics() {
      loading($('#metrics'));
      try {
        const d = payload(await api('/me/stats'));
        $('#metrics').innerHTML = [
          ['Publicaciones', d.posts, 'journal-text'],
          ['Borradores', d.drafts, 'pencil-square'],
          ['Comentarios', d.comments, 'chat-left-text'],
          ['Me gusta', d.reactions, 'heart']
        ].map(([label, n, icon]) =>
          '<div class="col-6 col-lg-3"><section class="metric card shadow-sm"><i class="bi bi-' +
          icon +
          '" aria-hidden="true"></i><span>' +
          label +
          '</span><strong>' +
          e(n ?? '—') +
          '</strong></section></div>'
        ).join('');
      } catch (err) {
        failure($('#metrics'), err, loadMetrics);
      }
    }

    async function loadRecent() {
      loading($('#recent'));
      try {
        cards(items(await api('/me/posts?limit=3&sort=-updatedAt')), $('#recent'), true);
      } catch (err) {
        failure($('#recent'), err, loadRecent);
      }
    }

    await Promise.allSettled([loadMetrics(), loadRecent()]);
  })();
}

if (page === 'my-posts') {
  (async () => {
    if (!await requireUser()) return;

    let current = 1;
    let revision = 0;

    async function load(p = 1) {
      current = p;
      const rev = ++revision;

      $('#pagination').replaceChildren();
      loading($('#own-posts'));

      try {
        const d = await api('/me/posts?' + query({
          ...Object.fromEntries(new FormData($('#own-filters'))),
          page: p,
          limit: 10
        }));
        if (rev !== revision) return;

        const list = items(d);
        if (!list.length) {
          empty($('#own-posts'), 'Aún no tienes publicaciones en este estado.');
        } else {
          $('#own-posts').innerHTML =
            '<div class="table-responsive"><table class="table align-middle"><caption class="visually-hidden">Tus publicaciones</caption><thead><tr><th>Título</th><th>Estado</th><th>Actualización</th><th>Acciones</th></tr></thead><tbody>' +
            list.map(p =>
              '<tr><td><a href="editor.html?id=' +
              encodeURIComponent(idOf(p)) +
              '">' +
              e(p.title || 'Sin título') +
              '</a></td><td>' +
              statusBadge(p.status) +
              '</td><td>' +
              e(date(p.updatedAt)) +
              '</td><td><a class="btn btn-sm btn-outline-primary" href="editor.html?id=' +
              encodeURIComponent(idOf(p)) +
              '">Editar</a> ' +
              (p.status !== 'archivado'
                ? '<button class="btn btn-sm btn-outline-danger" data-archive="' + e(idOf(p)) + '">Archivar</button>'
                : '') +
              '</td></tr>'
            ).join('') +
            '</tbody></table></div>';
        }

        pager($('#pagination'), d, p, load);
      } catch (err) {
        if (rev === revision) failure($('#own-posts'), err, () => load(current));
      }
    }

    $('#own-filters').onsubmit = ev => {
      ev.preventDefault();
      load();
    };

    $('#own-posts').onclick = async ev => {
      const b = ev.target.closest('[data-archive]');
      if (!b || !await confirmAction('Archivar publicación', 'Dejará de mostrarse en el sitio público.')) return;

      b.disabled = true;
      try {
        await api('/posts/' + encodeURIComponent(b.dataset.archive), { method: 'DELETE' });
        notice($('#page-status'), 'Publicación archivada.', 'success');
        await load(current);
      } catch (err) {
        notice($('#page-status'), err.message);
        b.disabled = false;
      }
    };

    load();
  })();
}

if (page === 'editor') {
  (async () => {
    if (!await requireUser()) return;

    const form = $('#editor-form');
    let id = new URLSearchParams(location.search).get('id');
    let dirty = false;
    const fieldset = $('fieldset', form);

    fieldset.disabled = true;

    async function load() {
      try {
        let post = id ? payload(await api('/me/posts/' + encodeURIComponent(id))) : null;
        await categories(
          form.elements.categoryId,
          post?.categoryId?._id || post?.categoryId || idOf(post?.category) || ''
        );

        if (post) {
          for (const key of ['title', 'content', 'coverUrl', 'slug']) {
            form.elements[key].value = post[key] || '';
          }
          form.elements.tags.value = (post.tags || []).join(', ');
          $('#editor-state').innerHTML = statusBadge(post.status);
          $('#unpublish').hidden = post.status !== 'publicado';
        }

        fieldset.disabled = false;
        $('#editor-load').replaceChildren();
      } catch (err) {
        failure($('#editor-load'), err, load);
      }
    }

    form.oninput = () => {
      dirty = true;
      $('#save-state').textContent = 'Cambios sin guardar';
    };

    window.addEventListener('beforeunload', ev => {
      if (dirty) {
        ev.preventDefault();
        ev.returnValue = '';
      }
    });

    form.onsubmit = ev => {
      ev.preventDefault();
      const publish = ev.submitter?.value === 'publish';

      submit(form, async values => {
        if (publish && (!values.title.trim() || !values.content.trim())) {
          throw new Error('Añade título y contenido antes de publicar.');
        }

        values.tags = values.tags.split(',').map(s => s.trim()).filter(Boolean);
        values.categoryId = values.categoryId || null;

        const saved = payload(await api(id ? '/posts/' + encodeURIComponent(id) : '/posts', {
          method: id ? 'PUT' : 'POST',
          body: values
        }));

        if (!id) {
          id = idOf(saved);
          if (!id) throw new Error('La API no devolvió el identificador de la publicación.');
          history.replaceState(null, '', 'editor.html?id=' + encodeURIComponent(id));
        }

        if (publish) {
          await api('/posts/' + encodeURIComponent(id) + '/publish', {
            method: 'PATCH',
            body: { status: 'publicado' }
          });
        }

        dirty = false;
        $('#save-state').textContent = 'Cambios guardados';

        if (publish) {
          $('#editor-state').innerHTML = statusBadge('publicado');
          $('#unpublish').hidden = false;
        }
      }, publish ? 'Publicación disponible para tus lectores.' : 'Cambios guardados.');
    };

    $('#unpublish').onclick = async () => {
      if (!await confirmAction('Despublicar artículo', 'Volverá a borrador y dejará de ser visible públicamente.')) return;

      const b = $('#unpublish');
      b.disabled = true;

      try {
        await api('/posts/' + encodeURIComponent(id) + '/publish', {
          method: 'PATCH',
          body: { status: 'borrador' }
        });
        b.hidden = true;
        $('#editor-state').innerHTML = statusBadge('borrador');
        notice($('#page-status'), 'Artículo despublicado.', 'success');
      } catch (err) {
        notice($('#page-status'), err.message);
      } finally {
        b.disabled = false;
      }
    };

    load();
  })();
}
