/* Comentarios de Robos MDP Noticias.
 * La escritura pública entra exclusivamente a una bandeja privada de moderación.
 * El Admin SDK hace cumplir aquí las validaciones; no se abren reglas de
 * Firestore para que visitantes escriban ni lean comentarios sin aprobar.
 */
import crypto from 'node:crypto';
import { PUBLICADAS } from '../../robosmdp/assets/noticias-data.mjs';

export const config = { path: '/api/noticias-comentarios' };

const ADMIN_EMAIL = 'admin@robosmdp.com.ar';
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,115}$/;
const ID_RE = /^[A-Za-z0-9_-]{5,80}$/;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_COMMENTS_PER_WINDOW = 3;
const json = (body, status = 200, cache = 'no-store') => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': cache,
    'x-content-type-options': 'nosniff'
  }
});

let services;
async function firebaseServices() {
  if (services) return services;
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const raw = globalThis.Netlify?.env?.get('FIREBASE_SERVICE_ACCOUNT') || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT');
  if (!getApps().length) initializeApp({ credential:cert(JSON.parse(raw)) });
  services = { db:getFirestore(), auth:getAuth(), FieldValue, secret:raw };
  return services;
}

function clientIp(req) {
  return (req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || '').trim();
}
function publicComment(doc) {
  const data = doc.data();
  return {
    id:doc.id,
    nombre:data.nombre || 'Vecino/a',
    texto:data.texto || '',
    fecha:data.fecha?.toDate?.().toISOString() || null
  };
}
async function checkStaff(req, auth) {
  const bearer = req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!bearer) return false;
  try {
    const claims = await auth.verifyIdToken(bearer);
    return claims.admin === true || claims.email?.toLowerCase() === ADMIN_EMAIL;
  } catch { return false; }
}
async function isPublished(db, slug) {
  const snap = await db.collection('noticias').doc(slug).get();
  if (snap.exists) return snap.get('estado') === 'publicado';
  return PUBLICADAS.some(article => article.id === slug);
}

async function getComments(req, url, db, auth) {
  const mode = url.searchParams.get('moderacion');
  const slug = url.searchParams.get('slug') || '';
  if (mode) {
    if (!await checkStaff(req, auth)) return json({error:'No autorizado'}, 403);
    if (mode === 'pendientes') {
      const snap = await db.collection('noticias_comentarios_pendientes').orderBy('fecha','desc').limit(150).get();
      return json({comentarios:snap.docs.map(doc => ({...publicComment(doc),noticia:doc.get('noticia')}))});
    }
    if (mode === 'publicados' && SLUG_RE.test(slug)) {
      const snap = await db.collection('noticias').doc(slug).collection('comentarios_publicos').orderBy('fecha','desc').limit(120).get();
      return json({comentarios:snap.docs.map(doc => ({...publicComment(doc),visible:doc.get('visible') !== false}))});
    }
    return json({error:'Solicitud de moderación inválida'},400);
  }
  if (!SLUG_RE.test(slug)) return json({error:'Noticia inválida'},400);
  if (!await isPublished(db,slug)) return json({error:'Noticia no disponible'},404);
  const snap = await db.collection('noticias').doc(slug).collection('comentarios_publicos').orderBy('fecha','desc').limit(120).get();
  return json({comentarios:snap.docs.filter(doc => doc.get('visible') !== false).slice(0,60).map(publicComment)},200,'public, max-age=30, stale-while-revalidate=30');
}

async function moderateComment(req, body, db, auth) {
  if (!await checkStaff(req,auth)) return json({error:'No autorizado'},403);
  const action = body.accion;
  const id = typeof body.id === 'string' ? body.id : '';
  if (!ID_RE.test(id)) return json({error:'Identificador inválido'},400);
  if (action === 'aprobar' || action === 'rechazar') {
    const pendingRef = db.collection('noticias_comentarios_pendientes').doc(id);
    const result = await db.runTransaction(async tx => {
      const doc = await tx.get(pendingRef);
      if (!doc.exists) return false;
      const comment = doc.data();
      if (!SLUG_RE.test(comment.noticia)) return false;
      if (action === 'aprobar') {
        const visibleRef = db.collection('noticias').doc(comment.noticia).collection('comentarios_publicos').doc(id);
        tx.set(visibleRef, {nombre:comment.nombre,texto:comment.texto,fecha:comment.fecha,visible:true});
      }
      tx.delete(pendingRef);
      return true;
    });
    return result ? json({ok:true}) : json({error:'Comentario no encontrado'},404);
  }
  const slug = typeof body.slug === 'string' ? body.slug : '';
  if (!SLUG_RE.test(slug) || !['ocultar','restaurar'].includes(action)) return json({error:'Acción inválida'},400);
  const publicRef = db.collection('noticias').doc(slug).collection('comentarios_publicos').doc(id);
  const doc = await publicRef.get();
  if (!doc.exists) return json({error:'Comentario no encontrado'},404);
  await publicRef.update({visible:action === 'restaurar'});
  return json({ok:true});
}

async function submitComment(req, body, db, FieldValue, secret) {
  // Campo trampa para bots; se responde sin escribir nada.
  if (body.website) return json({ok:true,pendiente:true});
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  const texto = typeof body.texto === 'string' ? body.texto.trim() : '';
  if (!SLUG_RE.test(slug)) return json({error:'Noticia inválida'},400);
  if (nombre.length < 2 || nombre.length > 50) return json({error:'Ingresá un nombre o apodo de 2 a 50 caracteres'},400);
  if (texto.length < 10 || texto.length > 1500) return json({error:'El comentario debe tener entre 10 y 1500 caracteres'},400);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(nombre + texto)) return json({error:'El comentario contiene caracteres inválidos'},400);
  if (!await isPublished(db,slug)) return json({error:'Esta noticia no admite comentarios'},404);

  // Rate limit servidor: HMAC de IP con una clave privada ya configurada.
  // La IP en claro no se guarda; las marcas de tiempo caducan lógicamente
  // al salir de la ventana, aunque el documento de cuota persiste.
  const ipHash = crypto.createHmac('sha256',secret).update(clientIp(req) || 'sin-ip').digest('hex');
  const rateRef = db.collection('noticias_comentarios_rate_limits').doc(ipHash);
  const now = Date.now();
  const allowed = await db.runTransaction(async tx => {
    const snap = await tx.get(rateRef);
    const hits = (Array.isArray(snap.get('hits')) ? snap.get('hits') : [])
      .filter(t => typeof t === 'number' && now - t < WINDOW_MS);
    if (hits.length >= MAX_COMMENTS_PER_WINDOW) return false;
    tx.set(rateRef,{hits:[...hits,now],actualizado:now});
    return true;
  });
  if (!allowed) return json({error:'Enviaste varios comentarios. Esperá unos minutos antes de volver a escribir.'},429);
  await db.collection('noticias_comentarios_pendientes').add({
    noticia:slug,nombre,texto,fecha:FieldValue.serverTimestamp()
  });
  return json({ok:true,pendiente:true},201);
}

export default async (req) => {
  if (!['GET','POST'].includes(req.method)) return json({error:'Método no permitido'},405);
  try {
    const {db,auth,FieldValue,secret} = await firebaseServices();
    if (req.method === 'GET') return await getComments(req,new URL(req.url),db,auth);
    const raw = await req.text();
    if (raw.length > 6000) return json({error:'Mensaje demasiado largo'},413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({error:'Formato inválido'},400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({error:'Formato inválido'},400);
    if (body.accion) return await moderateComment(req,body,db,auth);
    return await submitComment(req,body,db,FieldValue,secret);
  } catch (error) {
    console.error('noticias-comentarios:', error?.stack || error);
    return json({error:'El servicio de comentarios no está disponible. Intentá nuevamente más tarde.'},503);
  }
};
