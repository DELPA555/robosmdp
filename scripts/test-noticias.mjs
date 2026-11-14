import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ARCHIVO, CATEGORIAS } from '../robosmdp/assets/noticias-data.mjs';
import newsStory, { config as storyConfig } from '../netlify/functions/news-story.mjs';

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
    assert.match(a.imagen, /^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//);
    assert.ok(a.alt_imagen.includes('Mar del Plata') || a.alt_imagen.includes('Auditorium'));
    assert.match(a.credito_imagen, /Foto de archivo/);
    assert.match(a.fuente_imagen, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.match(a.licencia_imagen, /^https:\/\/creativecommons\.org\/licenses\/by-sa\//);
  }
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
  assert.ok(html.includes('Foto de archivo'));
  assert.ok(html.includes('Ver fotografía original'));
  assert.ok(html.includes('Licencia'));
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
