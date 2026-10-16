/* Netlify Function — Captura IP real + geolocalización aproximada de un usuario del chat.
 *
 * Solo el SERVIDOR puede ver la IP real del cliente. Esta función la guarda en
 * chat_presencia/{sessionId} (ip, ciudad, region, pais, isp) para que quede visible
 * ÚNICAMENTE en el panel admin (las reglas de Firestore solo dejan leer presencia ajena
 * al admin). La IP NUNCA se expone en chat.html (vista pública) ni se loguea.
 *
 * POST  /.netlify/functions/chat-ip   body: { uid, sessionId }
 *
 * SIN dependencias npm: usa `crypto` y `fetch` nativos (Node 18+), mismo patrón que
 * chat-cleanup.mjs / notify-zone.mjs (OAuth JWT del Service Account + Firestore REST).
 * REQUIERE la variable de entorno FIREBASE_SERVICE_ACCOUNT (ya configurada en Netlify).
 */
import crypto from 'node:crypto';

const PROJECT_ID = 'robosmdp-d1ef3';
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const GEO_FIELDS = ['ip', 'ciudad', 'region', 'pais', 'isp'];

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
  if (!j.access_token) throw new Error('OAuth falló');
  return j.access_token;
}

// Escribe (merge) SOLO los campos de IP/geo en chat_presencia/{sessionId} vía updateMask.
async function patchPresence(sessionId, data, token) {
  const mask = GEO_FIELDS.map(f => 'updateMask.fieldPaths=' + f).join('&');
  const url = `${FS}/chat_presencia/${encodeURIComponent(sessionId)}?${mask}`;
  const fields = {};
  for (const f of GEO_FIELDS) fields[f] = { stringValue: String(data[f] ?? '') };
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  if (!res.ok) throw new Error('patch presencia ' + res.status);
}

function clientIp(req) {
  const h = req.headers;
  const real = h.get('x-nf-client-connection-ip');
  if (real) return real.trim();
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return '';
}

export default async (req) => {
  const bad = (error) => new Response(JSON.stringify({ ok: false, error }), {
    status: 400, headers: { 'Content-Type': 'application/json' }
  });
  if (req.method !== 'POST') return bad('method');

  let body;
  try { body = await req.json(); } catch { return bad('json'); }
  const uid = body && typeof body.uid === 'string' ? body.uid.trim() : '';
  const sessionId = body && typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!uid || !sessionId) return bad('uid y sessionId requeridos');

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return new Response(JSON.stringify({ ok: false, error: 'config' }), {
    status: 500, headers: { 'Content-Type': 'application/json' }
  });

  const data = { ip: '', ciudad: '', region: '', pais: '', isp: '' };
  try {
    const ip = clientIp(req);
    if (ip === '127.0.0.1' || ip === '::1' || ip === '') {
      data.ip = ip ? 'local' : 'desconocida';
    } else {
      data.ip = ip;
      // Geolocalización aproximada (gratis, sin API key). Si falla, se guarda solo la IP.
      try {
        const geoRes = await fetch(
          `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=country,regionName,city,isp&lang=es`
        );
        if (geoRes.ok) {
          const g = await geoRes.json();
          data.ciudad = g.city || '';
          data.region = g.regionName || '';
          data.pais = g.country || '';
          data.isp = g.isp || '';
        }
      } catch { /* geo opcional */ }
    }

    const token = await getAccessToken(JSON.parse(raw));
    await patchPresence(sessionId, data, token);
  } catch {
    // No se loguea la IP ni el detalle (dato sensible).
    return new Response(JSON.stringify({ ok: false, error: 'interno' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
};
