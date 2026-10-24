/* Netlify Function — Notificar denuncia anónima recibida (ORG-01)
 *
 * POST /api/notificar-denuncia
 * Body JSON: { denunciaId, destinatario }
 *
 * Avisa por FCM al organismo destinatario que recibió una denuncia. NO incluye
 * ningún dato del denunciante en el payload (la denuncia es anónima). Antes de
 * notificar, verifica que el doc chat_denuncias/{denunciaId} exista y que su campo
 * `destinatario` coincida con el del body (anti-spoofing: nadie dispara pushes a
 * organismos arbitrarios sin una denuncia real detrás).
 *
 * Mismo patrón que notify-zone.mjs: SIN dependencias npm (Firestore REST + FCM
 * HTTP v1). REQUIERE env var FIREBASE_SERVICE_ACCOUNT (configurada en Netlify).
 */
import crypto from 'node:crypto';

export const config = { path: '/api/notificar-denuncia' };

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

async function fsGet(path, accessToken) {
  const res = await fetch(`${FS}/${path}`, { headers: { Authorization: 'Bearer ' + accessToken } });
  if (!res.ok) return null;
  return res.json();
}

async function clearOrgToken(apodo, accessToken) {
  await fetch(`${FS}/chat_organismos/${encodeURIComponent(apodo)}?updateMask.fieldPaths=fcm_token`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { fcm_token: { nullValue: null } } })
  }).catch(() => {});
}

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
  const denunciaId = String(body.denunciaId || '').trim();
  const destinatario = String(body.destinatario || '').trim();
  if (!denunciaId || !destinatario) return new Response('Faltan datos', { status: 400 });

  try {
    const sa = JSON.parse(raw);
    const accessToken = await getAccessToken(sa);

    // Anti-spoofing: la denuncia debe existir y apuntar a ese destinatario.
    const den = await fsGet(`chat_denuncias/${encodeURIComponent(denunciaId)}`, accessToken);
    const destReal = den && den.fields && den.fields.destinatario && den.fields.destinatario.stringValue;
    if (!destReal || destReal !== destinatario) {
      return new Response(JSON.stringify({ ok: true, sent: false, reason: 'no-match' }), { status: 200 });
    }

    const org = await fsGet(`chat_organismos/${encodeURIComponent(destinatario)}`, accessToken);
    const token = org && org.fields && org.fields.fcm_token && org.fields.fcm_token.stringValue;
    if (!token) return new Response(JSON.stringify({ ok: true, sent: false }), { status: 200 });

    const r = await sendFCM(token, accessToken, {
      // Payload genérico: ni un dato del denunciante.
      notification: { title: 'Nueva denuncia recibida', body: 'Tenés una nueva denuncia anónima' },
      data: { denunciaId }
    });
    if (!r.ok && r.invalid) await clearOrgToken(destinatario, accessToken);
    return new Response(JSON.stringify({ ok: true, sent: r.ok }), { status: 200 });
  } catch (e) {
    console.error('notificar-denuncia', e.message);
    return new Response(JSON.stringify({ ok: false }), { status: 200 });
  }
};
