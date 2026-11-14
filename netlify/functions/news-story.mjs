/* Nota periodística servida con metadatos propios, apta para enlaces y buscadores.
   Archivo de notas cotejadas + noticias publicadas en Firebase Firestore. */
import { ARCHIVO, CATEGORIAS } from '../../robosmdp/assets/noticias-data.mjs';

const PROJECT = 'robosmdp-d1ef3';
const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const safeUrl = value => { try { const u = new URL(value); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const dateOf = value => {
  if (value && typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const d = new Date(value || 0); return Number.isNaN(d.valueOf()) ? new Date(0) : d;
};
const format = value => dateOf(value).toLocaleDateString('es-AR', {day:'numeric',month:'long',year:'numeric',timeZone:'America/Argentina/Buenos_Aires'});
const labelFor = value => CATEGORIAS.find(x => x[0] === value)?.[1] || 'Actualidad';
const renderImage = a => {
  const image = safeUrl(a.imagen);
  if (image) return `<figure><div class="news-art article-image"><img src="${escapeHtml(image)}" alt="${escapeHtml(a.alt_imagen || a.titulo)}"></div><figcaption class="photo-credit">${escapeHtml(a.credito_imagen || 'Imagen aportada a Robos MDP')}</figcaption></figure>`;
  return `<figure><div class="news-art news-art--${['cine','ciudad','documentos'].includes(a.arte) ? a.arte : 'documentos'} article-image"><span class="art-label">ROBOS MDP · ILUSTRACIÓN EDITORIAL</span><span class="art-icon">${a.arte === 'cine' ? '◉' : a.arte === 'ciudad' ? 'MDP' : '§'}</span><span class="art-footer">MAR DEL PLATA / NOTICIAS</span></div><figcaption class="photo-credit">Ilustración editorial. No representa un registro fotográfico del hecho.</figcaption></figure>`;
};
function decodeFirestore(value) {
  if (!value || typeof value !== 'object') return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeFirestore);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k,v]) => [k,decodeFirestore(v)]));
  if ('nullValue' in value) return null;
  return null;
}
async function findNews(slug) {
  const archived = ARCHIVO.find(a => a.id === slug);
  if (archived) return archived;
  // Reglas Firebase: solo artículos publicados son accesibles sin credenciales.
  // La clave web pública es la misma del frontend; las reglas Firestore
  // restringen la lectura de cualquier borrador o artículo sin publicar.
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/noticias/${encodeURIComponent(slug)}?key=AIzaSyCm2rB0jOpvoi_wLpxVSMk0nip1pR62mjo`;
  try {
    const res = await fetch(url, {headers:{accept:'application/json'},signal:AbortSignal.timeout(7000)});
    if (!res.ok) return null;
    const data = await res.json();
    const row = Object.fromEntries(Object.entries(data.fields || {}).map(([k,v]) => [k,decodeFirestore(v)]));
    return row.estado === 'publicado' && row.titulo && row.texto ? {id:slug,...row} : null;
  } catch { return null; }
}
// El enrutamiento nativo de Netlify entrega :slug en context.params.
// En una reescritura 200, Netlify no interpola de forma fiable :slug
// dentro de un query string de destino.
export const config = { path: '/noticias/:slug' };

export default async (request, context) => {
  if (request.method !== 'GET') return new Response('Método no permitido', {status:405});
  const requestUrl = new URL(request.url);
  const pathSlug = requestUrl.pathname.match(/^\/noticias\/([^/]+)\/?$/)?.[1];
  const slug = context?.params?.slug || pathSlug || requestUrl.searchParams.get('slug') || '';
  if (!/^[a-z0-9][a-z0-9-]{1,115}$/.test(slug)) return new Response('Noticia no encontrada', {status:404});
  const a = await findNews(slug);
  if (!a) return new Response('<h1>Noticia no encontrada</h1><p><a href="/noticias">Volver al diario</a></p>',{status:404,headers:{'content-type':'text/html; charset=utf-8'}});
  const title = escapeHtml(a.titulo);
  const desc = escapeHtml(a.bajada);
  const url = 'https://robosmdp.com.ar/noticias/' + encodeURIComponent(slug);
  const img = safeUrl(a.imagen) || 'https://robosmdp.com.ar/assets/banner-robos.jpg';
  const sources = Array.isArray(a.fuentes) ? a.fuentes.filter(s => typeof s === 'object' && safeUrl(s.url)).slice(0,12) : [];
  const body = String(a.texto || '').split(/\n\s*\n/).filter(Boolean).map(p => '<p>' + escapeHtml(p).replace(/\n/g,'<br>') + '</p>').join('');
  const jsonLd = JSON.stringify({'@context':'https://schema.org','@type':'NewsArticle',headline:a.titulo,description:a.bajada,datePublished:dateOf(a.fecha).toISOString(),dateModified:dateOf(a.actualizado || a.fecha).toISOString(),author:{'@type':'Organization',name:'Robos MDP Noticias'},publisher:{'@type':'Organization',name:'Robos MDP Noticias',logo:{'@type':'ImageObject',url:'https://robosmdp.com.ar/assets/logo-nuevo.png'}},mainEntityOfPage:url,image:[img]}).replace(/</g,'\\u003c');
  const html = `<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b1019">
<title>${title} | Robos MDP Noticias</title><meta name="description" content="${desc}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:locale" content="es_AR"><meta property="og:site_name" content="Robos MDP Noticias"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:url" content="${url}"><meta property="og:image" content="${escapeHtml(img)}">
<meta property="article:published_time" content="${dateOf(a.fecha).toISOString()}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/logo-nuevo.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/noticias.css"><script type="application/ld+json">${jsonLd}</script></head>
<body><div class="news-mini"><div class="news-wrap news-mini-inner"><span><i class="status-dot"></i> MAR DEL PLATA · ARGENTINA</span><a href="https://www.instagram.com/robos.mdp/" target="_blank" rel="noopener">INSTAGRAM ↗</a></div></div>
<header class="news-head"><div class="news-wrap head-row"><a href="/noticias" class="news-logo"><img src="/assets/logo-nuevo.png" alt="Robos MDP"><span><strong>ROBOS <b>MDP</b></strong><small>NOTICIAS</small></span></a><span class="head-claim">LA CIUDAD. LOS HECHOS.<br><strong>LOS DOCUMENTOS.</strong></span><a class="news-button" href="/enviar-noticia">ENVIAR NOTICIA ↗</a></div></header>
<nav class="news-nav"><div class="news-wrap news-nav-row"><a href="/noticias" class="nav-current">PORTADA</a><a href="/noticias?categoria=investigaciones">Gastos bajo la lupa</a><a href="/noticias?categoria=seguridad">Seguridad</a><a href="/noticias?categoria=ciudad">Mar del Plata</a><a href="/">← MAPA Y CHAT</a></div></nav>
<main class="news-wrap"><a class="article-back" href="/noticias">← VOLVER A NOTICIAS</a><div class="article-layout"><article>
<span class="cat">${escapeHtml(labelFor(a.categoria))}</span><h1 class="article-title">${title}</h1><p class="article-deck">${desc}</p>
<div class="article-byline"><span>${escapeHtml(a.autor || 'Redacción Robos MDP')}</span><time datetime="${dateOf(a.fecha).toISOString()}">${escapeHtml(format(a.fecha))}</time><span>MAR DEL PLATA</span><a href="https://wa.me/?text=${encodeURIComponent(a.titulo+' · '+url)}" target="_blank" rel="noopener noreferrer" style="color:#ba2132">COMPARTIR POR WHATSAPP ↗</a></div>
${renderImage(a)}<div class="article-copy">${body}</div>
<section class="sources"><h3>Fuentes y documentos</h3><p>Podés consultar la documentación mencionada en este artículo.</p>${sources.length ? sources.map(s => `<a href="${escapeHtml(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer">↗ ${escapeHtml(s.nombre || s.url)}</a>`).join('') : '<p>No se incorporaron enlaces documentales a esta nota.</p>'}</section>
</article><aside class="article-aside"><div class="aside-box"><p class="section-tag">PERIODISMO CIUDADANO</p><h3>Tenés algo para contarnos?</h3><p>Ayudanos a investigar lo que sucede en tu barrio.</p><a href="/enviar-noticia">ENVIAR INFORMACIÓN ↗</a></div>
<div class="disclaimer-box">ROBOS MDP NOTICIAS · Diferenciamos hechos verificados de denuncias y opiniones. Una investigación no implica una condena ni prueba automática de un delito.</div>
<div class="related-list"><h3>SEGUÍ LEYENDO</h3><a href="/noticias?categoria=investigaciones">Investigaciones y gasto público ↗</a><a href="/noticias">Todas las noticias ↗</a><a href="/">Mapa ciudadano ↗</a></div></aside></div></main>
<footer class="news-footer"><div class="news-wrap footer-small" style="margin-top:0;border:0"><span>ROBOS MDP NOTICIAS · MAR DEL PLATA</span><a href="/noticias">VOLVER AL DIARIO ↗</a></div></footer>
</body></html>`;
  return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public,max-age=45,stale-while-revalidate=180','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}});
};
