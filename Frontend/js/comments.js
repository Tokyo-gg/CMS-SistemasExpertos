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
  confirmAction,
  pager
} from './apiClient.js';
import { ready, currentUser } from './auth.js';

if (document.body.dataset.page === 'post') {
  const slug = new URLSearchParams(location.search).get('slug');
  let post;
  let current = 1;
  let revision = 0;

  async function comments(page = 1) {
    current = page;
    const rev = ++revision;

    $('#comment-pages').replaceChildren();
    loading($('#comments-list'));

    try {
      const d = await api('/posts/' + encodeURIComponent(idOf(post)) + '/comments?page=' + page + '&limit=10');
      if (rev !== revision) return;

      const list = items(d);
      if (!list.length) {
        empty($('#comments-list'), 'Sé la primera persona en compartir una idea.');
      } else {
        $('#comments-list').innerHTML = list.map(c =>
          '<article class="comment"><div class="d-flex justify-content-between gap-3"><strong>' +
          e(c.author?.name || 'Usuario') +
          '</strong><time>' +
          e(date(c.createdAt)) +
          '</time></div><p class="mt-3 preserve">' +
          e(c.body) +
          '</p>' +
          (currentUser() && (
            ['admin', 'administrador'].includes(currentUser().role) ||
            String(idOf(currentUser())) === String(post.authorId?._id || post.authorId || idOf(post.author))
          )
            ? '<button class="btn btn-sm btn-outline-danger" data-moderate="' + e(idOf(c)) + '">Ocultar comentario</button>'
            : '') +
          '</article>'
        ).join('');
      }

      pager($('#comment-pages'), d, page, comments);
    } catch (err) {
      if (rev === revision) failure($('#comments-list'), err, () => comments(page));
    }
  }

  async function load() {
    loading($('#article-load'));

    try {
      if (!slug) throw new Error('Falta la URL del artículo.');

      post = payload(await api('/posts/' + encodeURIComponent(slug)));
      await ready;

      $('#article-title').textContent = post.title;
      document.title = post.title + ' · Punto';
      $('#article-meta').textContent = (post.author?.name || 'Autor') + ' · ' + date(post.publishedAt);
      $('#article-category').textContent = post.category?.name || 'Publicación';
      $('#article-content').textContent = post.content || '';
      $('#article-tags').textContent = (post.tags || []).map(t => '#' + t).join('  ');

      const url = safeURL(post.coverUrl);
      $('#article-cover').hidden = !url;
      if (url) {
        $('#article-cover').src = url;
        $('#article-cover').onerror = () => {
          $('#article-cover').hidden = true;
        };
      }

      if (post.blog?.slug) {
        $('#article-blog').href = 'blog.html?slug=' + encodeURIComponent(post.blog.slug);
        $('#article-blog').textContent = post.blog.name || 'Ver blog';
        $('#article-blog').hidden = false;
      }

      $('#like').textContent = (post.reacted ? 'Quitar me gusta' : 'Me gusta') + ' · ' + (post.reactionCount ?? 0);
      $('#like').setAttribute('aria-pressed', String(!!post.reacted));
      $('#like').disabled = !currentUser();

      $('#comment-form').hidden = !currentUser();
      $('#comment-login').hidden = !!currentUser();
      $('#comment-login a').href = 'auth.html?next=' + encodeURIComponent('post.html?slug=' + encodeURIComponent(slug));

      $('#article').hidden = false;
      $('#article-load').replaceChildren();
      comments();
    } catch (err) {
      failure($('#article-load'), err, load);
    }
  }

  $('#like').onclick = async () => {
    const b = $('#like');
    b.disabled = true;

    try {
      const d = payload(await api('/posts/' + encodeURIComponent(idOf(post)) + '/reactions', {
        method: 'POST',
        body: { type: 'like' }
      }));
      b.textContent = (d.reacted ? 'Quitar me gusta' : 'Me gusta') + ' · ' + d.count;
      b.setAttribute('aria-pressed', String(!!d.reacted));
      notice($('#interaction-status'), 'Reacción actualizada.', 'success');
    } catch (err) {
      notice($('#interaction-status'), err.message);
    } finally {
      b.disabled = !currentUser();
    }
  };

  $('#comment-form').onsubmit = ev => {
    ev.preventDefault();
    submit(ev.target, async values => {
      await api('/posts/' + encodeURIComponent(idOf(post)) + '/comments', {
        method: 'POST',
        body: values
      });
      ev.target.reset();
      await comments();
    }, 'Comentario publicado.');
  };

  $('#comments-list').onclick = async ev => {
    const b = ev.target.closest('[data-moderate]');
    if (!b || !await confirmAction('Ocultar comentario', 'El comentario dejará de mostrarse públicamente.')) return;

    b.disabled = true;
    try {
      await api('/comments/' + encodeURIComponent(b.dataset.moderate), {
        method: 'PATCH',
        body: { status: 'oculto' }
      });
      await comments(current);
    } catch (err) {
      notice($('#interaction-status'), err.message);
      b.disabled = false;
    }
  };

  document.addEventListener('session-expired', () => {
    $('#like').disabled = true;
    $('#comment-form').hidden = true;
    $('#comment-login').hidden = false;
  });

  load();
}
