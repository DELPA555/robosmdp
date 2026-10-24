/* Netlify Function — Notificar @mención a un organismo verificado (ORG-01)
 *
 * POST /api/notificar-mencion
 * Body JSON: { apodo, msgId, texto, autorApodo }
 *
 * Envía un push FCM al organismo mencionado en el chat. Fire-and-forget: el chat
 * no espera la respuesta. Si el organismo no tiene token, responde 200 en silencio.
 *
 * Mismo patrón que notify-zone.mjs: SIN dependencias npm (Firestore REST + FCM
 * HTTP v1 con `crypto`/`fetch` nativos de Node 18+).
 *
 * REQUIERE env var FIREBASE_SERVICE_ACCOUNT (JSON del Service Account) — configurada
 * en Netlify, NUNCA en el repo.
 *
 * PRIVACIDAD: no se loguea uid, IP ni datos del autor más allá del apodo.
 */
import crypto from 'node:crypto';

export const config = { path: '/api/notificar-mencion' };

const PROJECT_ID = 'robosmdp-d1ef3';
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const b64url = b => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  };
  const unsigned = b64url(JSON.stringify(header)) + '.' + b64url(JSON.stringify(claim));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned); signer.end();
  const jwt = unsigned + '.' + b64url(signer.sign(sa.private_key));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('OAuth falló: ' + JSON.stringify(j));
  return j.access_token;
}

// Lee chat_organismos/{apodo} y devuelve su fcm_token (o null).
async function getOrgToken(apodo, accessToken) {
  const res = await fetch(`${FS}/chat_organismos/${encodeURIComponent(apodo)}`, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  if (!res.ok) return null;
  const j = await res.json();
  const v = j.fields && j.fields.fcm_token;
  return v && v.stringValue ? v.stringValue : null;
}

// Pone fcm_token = null cuando FCM reporta un token inválido/desregistrado.
async function clearOrgToken(apodo, accessToken) {
  await fetch(`${FS}/chat_organismos/${encodeURIComponent(apodo)}?updateMask.fieldPaths=fcm_token`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { fcm_token: { nullValue: null } } })
  }).catch(() => {});
}

// Envía el push. Devuelve { ok } y si el token quedó inválido, { invalid:true }.
async function sendFCM(token, accessToken, message) {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { token, ...message } })
  });
  if (res.ok) return { ok: true };
  const body = await res.text();
  const invalid = res.status === 404 || /UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/.test(body);
  return { ok: false, invalid, status: res.status };
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return new Response('Falta FIREBASE_SERVICE_ACCOUNT', { status: 500 });

  let body;
  try { body = await req.json(); } catch (_) { return new Response('JSON inválido', { status: 400 }); }
  const apodo = String(body.apodo || '').trim();
  if (!apodo) return new Response('Falta apodo', { status: 400 });
  const texto = String(body.texto || '');
  const msgId = String(body.msgId || '');
  const autorApodo = String(body.autorApodo || 'Vecino').slice(0, 40);

  try {
    const sa = JSON.parse(raw);
    const accessToken = await getAccessToken(sa);
    const token = await getOrgToken(apodo, accessToken);
    if (!token) return new Response(JSON.stringify({ ok: true, sent: false }), { status: 200 });

    const r = await sendFCM(token, accessToken, {
      notification: { title: `@${apodo} — nueva mención`, body: texto.slice(0, 100) },
      data: { msgId, autorApodo }
    });
    if (!r.ok && r.invalid) await clearOrgToken(apodo, accessToken);
    return new Response(JSON.stringify({ ok: true, sent: r.ok }), { status: 200 });
  } catch (e) {
    console.error('notificar-mencion', e.message);
    // Fire-and-forget: nunca hacemos fallar al emisor del mensaje.
    return new Response(JSON.stringify({ ok: false }), { status: 200 });
  }
};
