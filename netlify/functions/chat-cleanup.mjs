/* Netlify Scheduled Function — Limpieza automática del chat vecinal
 *
 * Corre todos los días a las 3:00 AM (hora Argentina). Borra:
 *   - chat_publico     : mensajes con timestamp   anterior a hace 24 hs
 *   - chat_presencia   : presencias con ultimo_ping anterior a hace 2 hs (huérfanas)
 * NO toca chat_bans, chat_moderadores ni ninguna otra colección.
 *
 * SIN dependencias npm: usa solo `crypto` y `fetch` nativos de Node 18+
 * (mismo patrón que notify-zone.mjs: OAuth JWT del Service Account + Firestore REST).
 *
 * REQUIERE (configurar en Netlify, NO en el repo):
 *   - Variable de entorno FIREBASE_SERVICE_ACCOUNT con el JSON del Service Account
 *     del proyecto robosmdp-d1ef3 (la misma que usa notify-zone.mjs).
 */
import crypto from 'node:crypto';

const PROJECT_ID = 'robosmdp-d1ef3';
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const MSG_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hs
const PRES_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hs
const BATCH = 500;                          // máximo por batchWrite de Firestore

const b64url = b => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
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

// Devuelve hasta `limit` NOMBRES de documentos cuyo campo `field` < `isoValue`.
async function queryOlderThan(col, field, isoValue, token, limit) {
  const body = {
    structuredQuery: {
      from: [{ collectionId: col }],
      where: { fieldFilter: { field: { fieldPath: field }, op: 'LESS_THAN', value: { timestampValue: isoValue } } },
      select: { fields: [{ fieldPath: field }] },
      orderBy: [{ field: { fieldPath: field }, direction: 'ASCENDING' }],
      limit
    }
  };
  const res = await fetch(`${FS}:runQuery`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await res.json();
  if (!res.ok) throw new Error('runQuery ' + col + ': ' + JSON.stringify(j));
  return (Array.isArray(j) ? j : []).filter(r => r.document).map(r => r.document.name);
}

async function batchDelete(names, token) {
  if (!names.length) return 0;
  const res = await fetch(`${FS}:batchWrite`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes: names.map(n => ({ delete: n })) })
  });
  const j = await res.json();
  if (!res.ok) throw new Error('batchWrite: ' + JSON.stringify(j));
  return names.length;
}

// Borra en lotes de BATCH hasta vaciar lo que cumpla el filtro (tope de seguridad de iteraciones).
async function purge(col, field, isoValue, token) {
  let total = 0;
  for (let i = 0; i < 100; i++) {
    const names = await queryOlderThan(col, field, isoValue, token, BATCH);
    if (!names.length) break;
    total += await batchDelete(names, token);
    if (names.length < BATCH) break;
  }
  return total;
}

export default async () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return new Response('Falta FIREBASE_SERVICE_ACCOUNT', { status: 500 });
  const sa = JSON.parse(raw);
  const token = await getAccessToken(sa);

  const now = Date.now();
  const msgCutoff = new Date(now - MSG_MAX_AGE_MS).toISOString();
  const presCutoff = new Date(now - PRES_MAX_AGE_MS).toISOString();

  const msgs = await purge('chat_publico', 'timestamp', msgCutoff, token);
  const pres = await purge('chat_presencia', 'ultimo_ping', presCutoff, token);

  console.log('Chat cleanup: ' + msgs + ' mensajes eliminados, ' + pres + ' presencias eliminadas');
  return new Response(JSON.stringify({ mensajes: msgs, presencias: pres }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
};

// Netlify Scheduled Function: todos los días a las 3:00 AM hora Argentina.
export const config = { schedule: 'CRON_TZ=America/Argentina/Buenos_Aires 0 3 * * *' };
