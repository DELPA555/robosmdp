import { escapeHtml as esc } from './noticias-firebase.mjs';

const root = document.getElementById('news-comments');
if (root) {
  const slug = root.dataset.slug;
  const form = document.getElementById('news-comment-form');
  const list = document.getElementById('news-comments-list');
  const count = document.getElementById('news-comments-count');
  const status = document.getElementById('news-comment-status');
  const submit = document.getElementById('news-comment-submit');

  const date = value => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? '' : parsed.toLocaleDateString('es-AR', {
      day:'numeric',month:'short',year:'numeric',timeZone:'America/Argentina/Buenos_Aires'
    });
  };
  async function request(method, data) {
    const url = '/api/noticias-comentarios' + (method === 'GET' ? '?slug=' + encodeURIComponent(slug) : '');
    const res = await fetch(url, {
      method,
      headers:method === 'POST' ? {'content-type':'application/json'} : {},
      body:method === 'POST' ? JSON.stringify(data) : undefined,
      cache:method === 'GET' ? 'default' : 'no-store'
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'No se pudo conectar con los comentarios.');
    return result;
  }
  async function load() {
    try {
      const result = await request('GET');
      const comments = Array.isArray(result.comentarios) ? result.comentarios : [];
      count.textContent = comments.length === 1 ? '1 comentario publicado' : `${comments.length} comentarios publicados`;
      list.innerHTML = comments.length ? comments.map(comment => `
        <article class="news-comment"><div class="news-comment-top"><strong>${esc(comment.nombre)}</strong><time>${esc(date(comment.fecha))}</time></div><p>${esc(comment.texto).replace(/\n/g,'<br>')}</p></article>
      `).join('') : '<p class="news-comments-empty">Todavía no hay comentarios aprobados. Sé el primero en participar.</p>';
    } catch (error) {
      list.textContent = 'Por ahora no se pudieron cargar los comentarios. Intentá más tarde.';
      count.textContent = '';
      console.warn('Comentarios de noticias:',error.message);
    }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const nombre = document.getElementById('news-comment-name').value.trim();
    const texto = document.getElementById('news-comment-text').value.trim();
    if (nombre.length < 2 || nombre.length > 50 || texto.length < 10 || texto.length > 1500) {
      status.textContent = 'Ingresá un apodo de 2 a 50 caracteres y un comentario de 10 a 1500.';
      status.className = 'news-comment-message error';
      return;
    }
    submit.disabled = true;
    status.className = 'news-comment-message';
    status.textContent = 'Enviando comentario…';
    try {
      await request('POST', {
        slug,nombre,texto,website:document.getElementById('news-comment-website').value
      });
      document.getElementById('news-comment-text').value = '';
      status.className = 'news-comment-message success';
      status.textContent = 'Gracias! Tu comentario se recibió y aparecerá cuando sea aprobado por la redacción.';
    } catch (error) {
      status.className = 'news-comment-message error';
      status.textContent = error.message || 'No se pudo enviar el comentario.';
    } finally {
      submit.disabled = false;
    }
  });
  load();
}
