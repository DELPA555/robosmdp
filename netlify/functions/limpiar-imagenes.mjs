/* Netlify Scheduled Function — Limpieza de fotos de denuncias vencidas (ORG-01)
 *
 * Corre @hourly. Las fotos adjuntas a denuncias expiran a las 24h (campo
 * `expira_imagen_en`): esta función las borra de Storage y limpia el campo
 * `imagen_url` del doc, dejando registro en `imagen_eliminada_en`.
 *
 * NOTA sobre la query: Firestore NO permite desigualdad sobre dos campos distintos
 * en una misma consulta. Por eso filtramos por `expira_imagen_en <= now` (una sola
 * desigualdad, sin índice compuesto) y descartamos en código los docs que ya no
 * tienen imagen (`imagen_url == null`).
 *
 * Mismo patrón que notify-zone.mjs: SIN dependencias npm (Firestore REST + GCS REST).
 * REQUIERE env var FIREBASE_SERVICE_ACCOUNT (configurada en Netlify).
 */
import crypto from 'node:crypto';

export const config = { schedule: '@hourly' };

const PROJECT_ID = 'robosmdp-d1ef3';
const BUCKET = 'robosmdp-d1ef3.firebasestorage.app';
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const b64url = b => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/devstorage.read_write',
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

// Extrae el path del objeto en Storage desde una download URL de Firebase
// (…/o/{path-encodeado}?alt=media&token=…) → "denuncias/archivo.jpg".
function storagePathFromUrl(url) {
  try {
    const m = String(url).match(/\/o\/([^?]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch (_) { return null; }
}

async function deleteObject(path, accessToken) {
  const res = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(path)}`,
    { method: 'DELETE', headers: { Authorization: 'Bearer ' + accessToken } }
  );
  // 404 = ya no está: lo tratamos como éxito (idempotente).
  return res.ok || res.status === 404;
}

async function markDeleted(docName, accessToken, nowIso) {
  await fetch(
    `https://firestore.googleapis.com/v1/${docName}?updateMask.fieldPaths=imagen_url&updateMask.fieldPaths=imagen_eliminada_en`,
    {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { imagen_url: { nullValue: null }, imagen_eliminada_en: { timestampValue: nowIso } } })
    }
  ).catch(() => {});
}

export default async () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return new Response('Falta FIREBASE_SERVICE_ACCOUNT', { status: 500 });

  try {
    const sa = JSON.parse(raw);
    const accessToken = await getAccessToken(sa);
    const nowIso = new Date().toISOString();

    const res = await fetch(`${FS}:runQuery`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'chat_denuncias' }],
          where: { fieldFilter: { field: { fieldPath: 'expira_imagen_en' }, op: 'LESS_THAN_OR_EQUAL', value: { timestampValue: nowIso } } },
          orderBy: [{ field: { fieldPath: 'expira_imagen_en' }, direction: 'ASCENDING' }],
          limit: 50
        }
      })
    });
    const rows = await res.json();
    if (!res.ok) throw new Error('runQuery: ' + JSON.stringify(rows));

    let eliminadas = 0;
    for (const row of (Array.isArray(rows) ? rows : [])) {
      if (!row.document) continue;
      const f = row.document.fields || {};
      const url = f.imagen_url && f.imagen_url.stringValue;
      if (!url) continue; // ya limpiada o sin foto
      const path = storagePathFromUrl(url);
      // Anti-abuso: imagen_url lo escribe el cliente al crear la denuncia. Solo
      // borramos objetos bajo denuncias/ — nunca un path arbitrario (p.ej. chat_media/)
      // que un atacante haya puesto en imagen_url para hacernos borrar algo ajeno.
      if (!path || !path.startsWith('denuncias/')) {
        console.warn('limpiar-imagenes: path fuera de denuncias/, se saltea sin borrar:', path);
        await markDeleted(row.document.name, accessToken, nowIso); // igual limpiamos el campo del doc
        continue;
      }
      await deleteObject(path, accessToken);
      await markDeleted(row.document.name, accessToken, nowIso);
      eliminadas++;
    }
    return new Response(JSON.stringify({ eliminadas }), { status: 200 });
  } catch (e) {
    console.error('limpiar-imagenes', e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
