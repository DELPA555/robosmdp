/* Netlify Function — Crear denuncia anónima con rate limiting por IP (ORG-01)
 *
 * POST /api/crear-denuncia
 * Body JSON: { destinatario, mensaje, imagen_url? }
 *
 * - Rate limiting: máximo 5 denuncias por IP cada 10 minutos. La IP se toma de los
 *   headers de Netlify, se HASHEA (sha256 con sal) y se usa SOLO como clave en
 *   rate_limits/{ip_hash}. La IP cruda NUNCA se guarda, ni en rate_limits ni en la
 *   denuncia. Si supera el límite → 429.
 * - Escribe la denuncia en chat_denuncias con Admin SDK (sin identidad: ni uid, ni
 *   ip, ni fingerprint, ni email). Como el Admin SDK NO pasa por las reglas de
 *   Firestore, la validación se replica acá.
 *
 * Usa firebase-admin (igual que resetear-password.mjs; está en dependencies y
 * marcado external_node_modules en netlify.toml). Import perezoso dentro del
 * try/catch para que cualquier fallo quede logueado y no tire un 502 opaco.
 * REQUIERE env var FIREBASE_SERVICE_ACCOUNT (configurada en Netlify).
 */
import crypto from 'node:crypto';

export const config = { path: '/api/crear-denuncia' };

const WINDOW_MS = 10 * 60 * 1000;     // ventana de 10 minutos
const MAX_POR_VENTANA = 5;            // máx. 5 denuncias por IP en esa ventana
const RATE_SALT = 'robosmdp-denuncias-v1'; // sal del hash de IP (la IP cruda no se guarda)
// imagen_url (opcional): solo download URL real de Firebase Storage bajo denuncias/
// (la barra del path va codificada como %2F en getDownloadURL()).
const IMG_RE = /^https:\/\/firebasestorage\.googleapis\.com\/.*denuncias(%2F|\/).*/;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

function clientIp(req) {
  const h = req.headers;
  const real = h.get('x-nf-client-connection-ip');
  if (real) return real.trim();
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return '';
}

// firebase-admin perezoso + singleton entre invocaciones calientes.
let _db = null, _FV = null, _TS = null;
async function getDb() {
  if (_db) return _db;
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore, FieldValue, Timestamp } = await import('firebase-admin/firestore');
  if (!getApps().length) {
    let sa;
    try { sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT); }
    catch (e) { throw new Error('FIREBASE_SERVICE_ACCOUNT no es JSON válido: ' + e.message); }
    initializeApp({ credential: cert(sa) });
  }
  _db = getFirestore(); _FV = FieldValue; _TS = Timestamp;
  return _db;
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return json({ error: 'Falta FIREBASE_SERVICE_ACCOUNT' }, 500);

  let body;
  try { body = await req.json(); } catch (_) { return json({ error: 'JSON inválido' }, 400); }
  const destinatario = String(body.destinatario || '').trim();
  const mensaje = String(body.mensaje || '').trim();
  const imagenUrl = body.imagen_url != null ? String(body.imagen_url) : '';
  if (!destinatario) return json({ error: 'Falta destinatario' }, 400);
  if (mensaje.length < 1 || mensaje.length > 1000) return json({ error: 'El mensaje debe tener entre 1 y 1000 caracteres' }, 400);
  if (imagenUrl && !IMG_RE.test(imagenUrl)) return json({ error: 'imagen_url inválida' }, 400);

  try {
    const db = await getDb();

    // ── Rate limiting por IP (hasheada; la IP cruda NUNCA se guarda) ──────────
    const ip = clientIp(req);
    const ipHash = crypto.createHash('sha256').update(RATE_SALT + '|' + (ip || 'desconocida')).digest('hex');
    const rlRef = db.collection('rate_limits').doc(ipHash);
    const now = Date.now();

    const permitido = await db.runTransaction(async (tx) => {
      const snap = await tx.get(rlRef);
      let hits = (snap.exists && Array.isArray(snap.get('hits'))) ? snap.get('hits') : [];
      hits = hits.filter((t) => typeof t === 'number' && (now - t) < WINDOW_MS);
      if (hits.length >= MAX_POR_VENTANA) return false;
      hits.push(now);
      tx.set(rlRef, { hits, actualizado: now }, { merge: true });
      return true;
    });
    if (!permitido) return json({ error: 'Demasiadas denuncias, esperá unos minutos' }, 429);

    // ── Escribir la denuncia — SIN identidad (ni uid, ni ip, ni fingerprint) ──
    const doc = { destinatario, mensaje, leido: false, creado_en: _FV.serverTimestamp() };
    if (imagenUrl) {
      doc.imagen_url = imagenUrl;
      doc.expira_imagen_en = _TS.fromMillis(now + 24 * 60 * 60 * 1000);
    }
    const ref = await db.collection('chat_denuncias').add(doc);
    return json({ ok: true, denunciaId: ref.id });
  } catch (e) {
    console.error('crear-denuncia ERROR:', (e && e.stack) || e);
    return json({ error: 'Error interno al crear la denuncia' }, 500);
  }
};
