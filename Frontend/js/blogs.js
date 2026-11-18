import {
  api,
  $,
  payload,
  items,
  idOf,
  safeURL,
  loading,
  failure,
  submit,
  pager
} from './apiClient.js';
import { requireUser, setCurrentUser } from './auth.js';
import { cards } from './posts.js';

if (document.body.dataset.page === 'blog-settings') {
  (async () => {
    const user = await requireUser();
    if (!user) return;

    let blogId = null;
    const form = $('#blog-form');
    const profile = $('#profile-form');
    const slugField = form.elements.slug;

    $('fieldset', form).disabled = true;

    for (const key of ['name', 'bio', 'avatarUrl']) {
      profile.elements[key].value = user[key] || '';
    }

    async function load() {
      try {
        let blog;
        try {
          blog = payload(await api('/me/blog'));
        } catch (error) {
          if (error.status !== 404) throw error;
        }

        if (blog) {
          blogId = idOf(blog);
          for (const key of ['name', 'description', 'slug', 'logoUrl', 'coverUrl']) {
            form.elements[key].value = blog[key] || '';
          }
          slugField.readOnly = true;
          $('#slug-help').textContent = 'La dirección queda fija al crear el blog.';
          $('#view-blog').href = 'blog.html?slug=' + encodeURIComponent(blog.slug);
          $('#view-blog').hidden = false;
        }

        $('fieldset', form).disabled = false;
        $('#blog-load').replaceChildren();
      } catch (error) {
        failure($('#blog-load'), error, load);
      }
    }

    form.onsubmit = event => {
      event.preventDefault();
      submit(form, async values => {
        const blog = payload(await api(blogId ? '/blogs/' + encodeURIComponent(blogId) : '/blogs', {
          method: blogId ? 'PUT' : 'POST',
          body: values
        }));
        blogId = idOf(blog) || blogId;
        slugField.value = blog.slug;
        slugField.readOnly = true;
        $('#slug-help').textContent = 'La dirección queda fija al crear el blog.';
        $('#view-blog').href = 'blog.html?slug=' + encodeURIComponent(blog.slug);
        $('#view-blog').hidden = false;
      });
    };

    profile.onsubmit = event => {
      event.preventDefault();
      submit(
        profile,
        async values => setCurrentUser(payload(await api('/auth/me', { method: 'PUT', body: values }))),
        'Perfil actualizado.'
      );
    };

    load();
  })();
}

if (document.body.dataset.page === 'blog') {
  const slug = new URLSearchParams(location.search).get('slug');

  async function load(page = 1) {
    loading($('#blog-posts'));

    try {
      if (!slug) throw new Error('Falta la URL del blog. Abre un blog desde una publicación.');

      const blog = payload(await api('/blogs/' + encodeURIComponent(slug)));
      $('#blog-title').textContent = blog.name;
      document.title = blog.name + ' · Punto';

      for (const [selector, value] of [
        ['#blog-logo', blog.logoUrl],
        ['#blog-avatar', blog.owner?.avatarUrl]
      ]) {
        const img = $(selector);
        const url = safeURL(value);
        img.hidden = !url;
        if (url) {
          img.src = url;
          img.onerror = () => {
            img.hidden = true;
          };
        }
      }

      $('#blog-description').textContent = blog.description || '';
      $('#blog-author').textContent = blog.owner?.name || '';
      $('#blog-bio').textContent = blog.owner?.bio || '';

      const cover = safeURL(blog.coverUrl);
      $('#blog-cover').hidden = !cover;
      if (cover) {
        $('#blog-cover').src = cover;
        $('#blog-cover').onerror = () => {
          $('#blog-cover').hidden = true;
        };
      }

      const data = await api('/posts?blogId=' + encodeURIComponent(idOf(blog)) + '&page=' + page + '&limit=9');
      cards(items(data), $('#blog-posts'));
      pager($('#pagination'), data, page, load);
    } catch (error) {
      failure($('#blog-posts'), error, () => load(page));
    }
  }

  load();
}
