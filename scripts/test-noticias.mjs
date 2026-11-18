import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ARCHIVO, PUBLICADAS, CATEGORIAS } from '../robosmdp/assets/noticias-data.mjs';
import { AUTOMATICAS } from '../robosmdp/assets/noticias-auto.mjs';
import newsStory, { config as storyConfig } from '../netlify/functions/news-story.mjs';
import newsComments, { config as commentsConfig } from '../netlify/functions/news-comments.mjs';

test('archivo inicial: identificadores únicos, fuentes verificables y fechas reales', () => {
  assert.ok(ARCHIVO.length >= 4);
  assert.equal(new Set(ARCHIVO.map(a => a.id)).size, ARCHIVO.length);
  for (const a of ARCHIVO) {
    assert.match(a.id, /^[a-z0-9][a-z0-9-]+$/);
    assert.ok(CATEGORIAS.some(([id]) => id === a.categoria));
    assert.ok(a.titulo.length > 25 && a.bajada.length > 40 && a.texto.length > 200);
    assert.ok(new Date(a.fecha).getTime() > Date.parse('2026-01-01'));
    assert.ok(a.fuentes.length >= 1);
    for (const f of a.fuentes) assert.match(f.url, /^https:\/\//);
    assert.match(a.imagen, /^\/assets\/noticias\/[a-z0-9-]+\.webp$/);
    const localPhoto = new URL('../robosmdp' + a.imagen, import.meta.url);
    assert.ok(fs.statSync(localPhoto).size > 10000 && fs.statSync(localPhoto).size < 250000, `foto local optimizada: ${a.id}`);
    assert.ok(a.alt_imagen.includes('Mar del Plata') || a.alt_imagen.includes('Auditorium'));
    assert.match(a.credito_imagen, /Foto de archivo/);
    assert.match(a.fuente_imagen, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.match(a.licencia_imagen, /^https:\/\/creativecommons\.org\/licenses\/by-sa\//);
  }
});

test('publicaciones diarias automáticas: archivo separado, formato validado y rutas compartidas', () => {
  assert.ok(Array.isArray(AUTOMATICAS));
  assert.equal(PUBLICADAS.length, ARCHIVO.length + AUTOMATICAS.length,
    'cada noticia automática debe ser válida y tener un ID diferente del archivo');
  assert.equal(new Set(PUBLICADAS.map(a => a.id)).size, PUBLICADAS.length);
  const app = fs.readFileSync(new URL('../robosmdp/assets/noticias-app.mjs',import.meta.url),'utf8');
  const ssr = fs.readFileSync(new URL('../netlify/functions/news-story.mjs',import.meta.url),'utf8');
  assert.match(app, /PUBLICADAS/);
  assert.match(ssr, /PUBLICADAS/);
  assert.match(app, /36\*60\*60\*1000/);
});

test('nota documental: render HTML SSR con metadatos y fuente', async () => {
  const a = ARCHIVO[0];
  const res = await newsStory(new Request('https://robosmdp.com.ar/noticias/'+a.id), {params:{slug:a.id}});
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  const html = await res.text();
  assert.ok(html.includes('<h1 class="article-title">'));
  assert.ok(html.includes('application/ld+json'));
  assert.ok(html.includes('/noticias/'+a.id));
  assert.ok(html.includes('Fuentes y documentos'));
  assert.ok(html.includes('src="/assets/noticias/'));
  assert.ok(html.includes('Foto de archivo'));
  assert.ok(html.includes('Ver fotografía original'));
  assert.ok(html.includes('Licencia'));
  assert.ok(html.includes('id="news-comment-form"'));
  assert.ok(html.includes('id="news-comments-list"'));
  assert.ok(html.includes('/assets/noticias-comentarios.mjs'));
});

test('el editor permite agregar y administrar múltiples fotos sin reemplazar la portada', () => {
  const html = fs.readFileSync(new URL('../robosmdp/admin-noticias.html', import.meta.url), 'utf8');
  const js = fs.readFileSync(new URL('../robosmdp/assets/noticias-admin.mjs', import.meta.url), 'utf8');
  for (const id of ['a-photo', 'a-gallery', 'gallery-list', 'gallery-count']) {
    assert.ok(html.includes(`id="${id}"`), `falta ${id} en el editor`);
  }
  assert.match(html, /id="a-gallery"[^>]*multiple/);
  assert.match(js, /const MAX_GALLERY = 16/);
  assert.match(js, /galeria:galleryDraft\.map/);
  assert.match(js, /data-gallery-remove/);
  assert.match(js, /await uploadPhoto\(item\.file, id\)/);
});

test('comentarios: formulario público, moderación privada y límites antispam', async () => {
  const html = fs.readFileSync(new URL('../robosmdp/admin-noticias.html',import.meta.url),'utf8');
  const admin = fs.readFileSync(new URL('../robosmdp/assets/noticias-admin.mjs',import.meta.url),'utf8');
  const client = fs.readFileSync(new URL('../robosmdp/assets/noticias-comentarios.mjs',import.meta.url),'utf8');
  const server = fs.readFileSync(new URL('../netlify/functions/news-comments.mjs',import.meta.url),'utf8');
  assert.equal(commentsConfig.path, '/api/noticias-comentarios');
  assert.ok(html.includes('id="pending-comments"'));
  assert.ok(html.includes('id="published-comments"'));
  assert.ok(admin.includes("accion === 'rechazar'"));
  assert.ok(admin.includes('data-comment-action="aprobar"'));
  assert.ok(client.includes("status.textContent = 'Gracias!"));
  assert.match(server,/verifyIdToken/);
  assert.match(server,/noticias_comentarios_pendientes/);
  assert.match(server,/const MAX_COMMENTS_PER_WINDOW = 3/);
  assert.match(server,/visible:action === 'restaurar'/);
  const response = await newsComments(new Request('https://robosmdp.com.ar/api/noticias-comentarios',{method:'PUT'}));
  assert.equal(response.status,405);
});

test('la nota pública muestra su galería con crédito, enlaces y textos seguros', async () => {
  const previousFetch = globalThis.fetch;
  const photo = {mapValue:{fields:{
    url:{stringValue:'https://example.com/imagen-del-hecho.jpg'},
    alt:{stringValue:'Foto del operativo'},
    credito:{stringValue:'Fotógrafo autorizado <prueba>'}
  }}};
  globalThis.fetch = async () => new Response(JSON.stringify({fields:{
    estado:{stringValue:'publicado'},
    titulo:{stringValue:ARCHIVO[0].titulo},
    texto:{stringValue:ARCHIVO[0].texto},
    galeria:{arrayValue:{values:[photo]}}
  }}), {status:200,headers:{'content-type':'application/json'}});
  try {
    const a = ARCHIVO[0];
    const res = await newsStory(new Request('https://robosmdp.com.ar/noticias/'+a.id), {params:{slug:a.id}});
    const html = await res.text();
    assert.match(html, /Más imágenes de la noticia/);
    assert.match(html, /article-gallery-grid/);
    assert.match(html, /https:\/\/example\.com\/imagen-del-hecho\.jpg/);
    assert.match(html, /Foto del operativo/);
    assert.match(html, /Fotógrafo autorizado &lt;prueba&gt;/);
    assert.ok(!html.includes('Fotógrafo autorizado <prueba>'));
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('ruta inválida no busca ni muestra datos', async () => {
  const res = await newsStory(new Request('https://robosmdp.com.ar/.netlify/functions/news-story?slug=..%2Fprivate'));
  assert.equal(res.status, 404);
});

test('Netlify enruta las noticias directamente sin perder su slug', () => {
  const redirects = fs.readFileSync(new URL('../robosmdp/_redirects', import.meta.url), 'utf8');
  assert.equal(storyConfig.path, '/noticias/:slug');
  assert.ok(redirects.indexOf('/noticias                     ') >= 0);
  assert.ok(!redirects.includes('/noticias/:slug '));
  assert.ok(redirects.includes('/chat'));
});

test('el acceso a mapas y chat permanece en la landing', () => {
  const home = fs.readFileSync(new URL('../robosmdp/index.html', import.meta.url),'utf8');
  assert.ok(home.includes('href="./chat.html"'));
  assert.ok(home.includes('enterApp(\'robos\')'));
  assert.ok(home.includes('href="./noticias.html"'));
});

test('portada periodística con titular central, últimas e investigaciones sin datos inventados', () => {
  const html = fs.readFileSync(new URL('../robosmdp/noticias.html', import.meta.url), 'utf8');
  const js = fs.readFileSync(new URL('../robosmdp/assets/noticias-app.mjs', import.meta.url), 'utf8');
  for (const id of ['news-featured','news-latest','news-investigations','news-security','news-city','news-results','news-ticker-link']) {
    assert.ok(html.includes(`id="${id}"`), `falta ${id}`);
  }
  assert.ok(html.includes('Últimas noticias'));
  assert.ok(html.includes('Gastos bajo la lupa'));
  assert.ok(js.includes("filter(a => a.categoria === 'investigaciones')"));
  assert.ok(js.includes("filter(a => a.categoria === category)"));
});

test('espacios publicitarios visibles y contacto comercial sin afectar el mapa y chat', () => {
  const portada=fs.readFileSync(new URL('../robosmdp/noticias.html',import.meta.url),'utf8');
  const contratar=fs.readFileSync(new URL('../robosmdp/contratar.html',import.meta.url),'utf8');
  const redirects=fs.readFileSync(new URL('../robosmdp/_redirects',import.meta.url),'utf8');
  assert.ok(portada.includes('ESPACIOS COMERCIALES'));
  assert.ok(portada.includes('sponsor-francotirador.jpg') && portada.includes('banner-nikro.jpg'));
  assert.ok(portada.includes('Ningún anunciante interviene'));
  assert.ok(contratar.includes('https://wa.me/5491138574444'));
  assert.ok(contratar.includes('PUBLICIDAD') && contratar.includes('SERVICIOS'));
  assert.ok(redirects.includes('/contratar'));
});
