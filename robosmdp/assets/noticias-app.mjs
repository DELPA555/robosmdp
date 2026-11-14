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
const latestList = document.getElementById('news-latest');
const investigationList = document.getElementById('news-investigations');
const securityList = document.getElementById('news-security');
const cityList = document.getElementById('news-city');
document.getElementById('fecha-hoy').textContent = ' / ' + new Date().toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long', timeZone:'America/Argentina/Buenos_Aires' });

function renderEditorialSections() {
  const latest = all.slice(0,6);
  latestList.innerHTML = latest.map((a,i) => `<a class="latest-item" href="${newsHref(a)}"><div class="latest-meta"><span>${esc(format(a.fecha))}</span><span>0${i+1}</span></div><h3>${esc(a.titulo)}</h3><span class="cat">${esc(labelFor(a.categoria))}</span></a>`).join('');
  const ticker = document.getElementById('news-ticker-link');
  if (latest.length) { ticker.textContent = latest[0].titulo; ticker.href = newsHref(latest[0]); }

  const investigations = all.filter(a => a.categoria === 'investigaciones').slice(0,3);
  investigationList.innerHTML = investigations.length ? `<div class="investigation-lead"><a href="${newsHref(investigations[0])}">${art(investigations[0])}<div class="investigation-text"><span class="cat">INVESTIGACIÓN</span><h3>${esc(investigations[0].titulo)}</h3><p>${esc(investigations[0].bajada)}</p><small>${esc(format(investigations[0].fecha))} · DOCUMENTOS Y CONTEXTO</small></div></a></div><div class="investigation-side">${investigations.slice(1).map((a,i) => `<a href="${newsHref(a)}"><span class="investigation-n">0${i+2}</span><span class="cat">GASTOS PÚBLICOS</span><h3>${esc(a.titulo)}</h3><p>${esc(a.bajada)}</p><small>${esc(format(a.fecha))}</small></a>`).join('')}</div>` : '<p class="news-empty">Todavía no hay investigaciones publicadas.</p>';

  function beat(container, category, emptyText) {
    const list = all.filter(a => a.categoria === category).slice(0,2);
    container.innerHTML = list.length ? list.map(a => `<a class="beat-story" href="${newsHref(a)}"><span class="cat">${esc(labelFor(a.categoria))}</span><h3>${esc(a.titulo)}</h3><p>${esc(a.bajada)}</p><time>${esc(format(a.fecha))}</time></a>`).join('') : `<div class="beat-empty"><span>ROBOS MDP · INFORMACIÓN CIUDADANA</span><p>${esc(emptyText)}</p><a href="/enviar-noticia">ENVIAR INFORMACIÓN VERIFICABLE ↗</a></div>`;
  }
  beat(securityList, 'seguridad', 'Seguimos los hechos de inseguridad y las intervenciones policiales en los barrios. Recibimos testimonios, imágenes propias y datos para verificar.');
  beat(cityList, 'ciudad', 'Historias y novedades de los barrios, la infraestructura y los servicios de Mar del Plata.');
}

function render() {
  renderEditorialSections();
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

  const front = filter === 'todas' ? all : all.filter(a => a.categoria === filter);
  const lead = front.find(a => a.destacada) || front[0];
  const side = front.filter(a => a.id !== lead?.id).slice(0,2);
  if (!lead) { featured.innerHTML = '<div class="loading-card">Todavía no hay noticias verificadas en esta sección. Seguimos trabajando para informar con responsabilidad.</div>'; return; }
  featured.innerHTML = `<a class="feature-primary" href="${newsHref(lead)}">${art(lead)}<div class="feature-content"><span class="pill">${esc(labelFor(lead.categoria))}</span><h2>${esc(lead.titulo)}</h2><p>${esc(lead.bajada)}</p><div class="feature-foot"><span>REDACCIÓN ROBOS MDP · ${esc(format(lead.fecha))}</span><span>LEER NOTICIA ↗</span></div></div></a>
    <div class="feature-side"><div class="side-heading"><span>MÁS NOTICIAS DESTACADAS</span><span>EN PORTADA</span></div>${side.map((a,i) => `<a class="side-item" href="${newsHref(a)}"><span class="side-number">0${i+1}</span><div><span class="cat">${esc(labelFor(a.categoria))}</span><h3>${esc(a.titulo)}</h3><p>${esc(a.bajada)}</p><time>${esc(format(a.fecha))}</time></div></a>`).join('')}<a href="#ultimas" class="side-promo"><strong>La actualidad, en un solo lugar ↗</strong><p>Últimas noticias e investigaciones sobre nuestra ciudad.</p><span>IR A ÚLTIMAS NOTICIAS</span></a></div>`;
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
