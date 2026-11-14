import { ARCHIVO, CATEGORIAS } from './noticias-data.mjs';
import { initNewsFirebase, escapeHtml as esc, publicImage, articleDate, newsHref } from './noticias-firebase.mjs';

const labelFor = id => CATEGORIAS.find(([k]) => k === id)?.[1] || 'Actualidad';
const format = dt => articleDate(dt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });
const artIcon = a => ({ cine:'◉', ciudad:'MDP', documentos:'§' })[a.arte] || 'MDP';
function art(a) {
  const img = publicImage(a.imagen);
  if (img) return `<div class="news-art"><img loading="lazy" src="${esc(img)}" alt="${esc(a.alt_imagen || 'Imagen de la noticia')}"></div>`;
  return `<div class="news-art news-art--${esc(a.arte || 'documentos')}"><span class="art-label">ROBOS MDP · ILUSTRACIÓN EDITORIAL</span><span class="art-icon">${esc(artIcon(a))}</span><span class="art-footer">MAR DEL PLATA / NOTICIAS</span></div>`;
}
function card(a) {
  return `<a class="news-card" href="${newsHref(a)}">${art(a)}<div class="news-card-body"><span class="cat">${esc(labelFor(a.categoria))}</span><h3>${esc(a.titulo)}</h3><p>${esc(a.bajada)}</p><div class="news-card-foot"><span>${esc(format(a.fecha))}</span><span>↗</span></div></div></a>`;
}

let all = ARCHIVO.slice().sort((a,b) => articleDate(b.fecha) - articleDate(a.fecha));
let filter = new URLSearchParams(location.search).get('categoria') || 'todas';
let query = '';
const results = document.getElementById('news-results');
const featured = document.getElementById('news-featured');
const filters = document.getElementById('news-filters');
document.getElementById('fecha-hoy').textContent = ' / ' + new Date().toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long', timeZone:'America/Argentina/Buenos_Aires' });

function render() {
  const visible = all.filter(a => (filter === 'todas' || a.categoria === filter) && (!query || [a.titulo,a.bajada,a.texto].join(' ').toLowerCase().includes(query)));
  document.getElementById('news-total').textContent = visible.length + (visible.length === 1 ? ' NOTICIA' : ' NOTICIAS');
  results.innerHTML = visible.map(card).join('');
  document.getElementById('news-empty').hidden = Boolean(visible.length);
  filters.innerHTML = CATEGORIAS.map(([key,label]) => `<button type="button" class="${key === filter ? 'active' : ''}" data-category="${key}">${esc(label)}</button>`).join('');
  filters.querySelectorAll('button').forEach(el => el.addEventListener('click', () => {
    filter = el.dataset.category;
    const url = new URL(location.href);
    filter === 'todas' ? url.searchParams.delete('categoria') : url.searchParams.set('categoria', filter);
    history.replaceState({}, '', url.pathname + url.search);
    render();
  }));

  const lead = all.find(a => a.destacada) || all[0];
  const side = all.filter(a => a.id !== lead?.id).slice(0,2);
  if (!lead) { featured.innerHTML = '<div class="loading-card">Todavía no hay noticias publicadas.</div>'; return; }
  featured.innerHTML = `<a class="feature-primary" href="${newsHref(lead)}">${art(lead)}<div class="feature-shade"></div><div class="feature-content"><span class="pill">INFORME ESPECIAL</span><h2>${esc(lead.titulo)}</h2><p>${esc(lead.bajada)}</p><div class="feature-foot"><span>REDACCIÓN ROBOS MDP · ${esc(format(lead.fecha))}</span><span>↗</span></div></div></a>
    <div class="feature-side"><div class="side-heading"><span>EN PORTADA</span><span>01 — 02</span></div>${side.map((a,i) => `<a class="side-item" href="${newsHref(a)}"><span class="side-number">0${i+1}</span><div><span class="cat">${esc(labelFor(a.categoria))}</span><h3>${esc(a.titulo)}</h3><time>${esc(format(a.fecha))}</time></div></a>`).join('')}<a href="/enviar-noticia" class="side-promo"><strong>Tenés algo para contar? ↗</strong><p>La próxima noticia puede comenzar en tu barrio.</p><span>ENVIAR INFORMACIÓN</span></a></div>`;
}
document.getElementById('news-search').addEventListener('input', ev => { query = ev.target.value.toLowerCase().trim(); render(); });
render();

try {
  const fb = initNewsFirebase();
  const snapshot = await fb.firestore().collection('noticias').where('estado', '==', 'publicado').limit(100).get();
  const docs = snapshot.docs.map(doc => ({ ...doc.data(), id:doc.id })).filter(a => a.titulo && a.bajada && a.fecha);
  const byId = new Map([...ARCHIVO, ...docs].map(a => [a.id,a]));
  all = [...byId.values()].sort((a,b) => articleDate(b.fecha) - articleDate(a.fecha));
  render();
} catch (error) {
  // El archivo documental está disponible incluso sin conexión a Firebase.
  console.info('Noticias: mostrando archivo local', error?.message || error);
}
