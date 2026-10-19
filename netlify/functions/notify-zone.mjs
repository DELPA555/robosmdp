/* Netlify Scheduled Function — Notificaciones push "Mi zona" (Opción B)
 *
 * Corre cada 5 minutos. Busca reportes nuevos (robos/basura/pozos) desde la última
 * corrida, y por cada suscripción en `subscripciones_push` cuya zona contenga el
 * reporte, envía un push vía FCM HTTP v1.
 *
 * SIN dependencias npm: usa solo `crypto` y `fetch` nativos de Node 18+.
 *
 * REQUIERE (configurar en Netlify, NO en el repo):
 *   - Variable de entorno FIREBASE_SERVICE_ACCOUNT con el JSON del Service Account
 *     del proyecto robosmdp-d1ef3 (Firebase Console > Configuración del proyecto >
 *     Cuentas de servicio > Generar nueva clave privada). Pegá el JSON COMPLETO.
 *   - Que Netlify detecte esta carpeta como functions dir (ver netlify/functions/README.md).
 *
 * Ver README.md en esta carpeta para los pasos completos.
 */
import crypto from 'node:crypto';

const PROJECT_ID = 'robosmdp-d1ef3';
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const COLLECTIONS = [
  { tab: 'robos',  path: 'artifacts/robosmdp-d1ef3/public/data', col: 'reports' },
  { tab: 'basura', path: '',                                     col: 'basura'  },
  { tab: 'pozos',  path: '',                                     col: 'pozos'   },
  { tab: 'abandonados', path: '', col: 'abandonados' },
  { tab: 'luminarias', path: '', col: 'luminarias' }
];
const CAT_LABEL = { robos: 'robo', basura: 'reporte de basura', pozos: 'pozo',
  abandonados:'vehículo abandonado', luminarias:'problema de alumbrado' };

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

// ---- decode de valores Firestore REST ----
function dec(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) { const o = {}; for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = dec(x); return o; }
  return null;
}
function fields(doc) { const o = {}; for (const [k, v] of Object.entries(doc.fields || {})) o[k] = dec(v); return o; }
function coordsOf(r) {
  if (Array.isArray(r.location) && r.location.length >= 2) return [Number(r.location[0]), Number(r.location[1])];
  if (r.lat != null && r.lng != null) return [Number(r.lat), Number(r.lng)];
  return null;
}
function distMeters(a, b) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b[0] - a[0]) * toR, dLng = (b[1] - a[1]) * toR;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

async function fsGet(path, token) {
  const res = await fetch(`${FS}/${path}`, { headers: { Authorization: 'Bearer ' + token } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('GET ' + path + ': ' + res.status);
  return res.json();
}
async function fsRunQuery(parent, body, token) {
  const url = `${FS}${parent ? '/' + parent : ''}:runQuery`;
  const res = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await res.json();
  if (!res.ok) throw new Error('runQuery: ' + JSON.stringify(j));
  return (Array.isArray(j) ? j : []).filter(r => r.document);
}
async function fsListAll(col, token) {
  const out = []; let pageToken = '';
  do {
    const url = `${FS}/${col}?pageSize=300${pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''}`;
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    const j = await res.json();
    if (!res.ok) throw new Error('list ' + col + ': ' + JSON.stringify(j));
    (j.documents || []).forEach(d => out.push({ id: d.name.split('/').pop(), ...fields(d) }));
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return out;
}

async function sendPush(token, accessToken, { title, body, url, reportId }) {
  // DATA-only: el service worker (onBackgroundMessage) la muestra una sola vez.
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { token, data: { title, body, url, reportId: reportId || '' } } })
  });
  return res.ok ? {ok:true} : {ok:false,status:res.status};
}

// Reserva atómica antes de enviar. El registro permite no repetir un push
// cuando la ventana de 1 minuto se solapa o se reintenta una ejecución fallida.
// La clave es un hash: jamás persistimos el token en el historial de entregas.
function deliveryId(token,tab,reportId){
  return crypto.createHash('sha256').update(token+'|'+tab+'|'+reportId).digest('hex');
}
async function reserveDelivery(token,tab,reportId,access){
  const id=deliveryId(token,tab,reportId);
  const payload={fields:{
    createdAt:{timestampValue:new Date().toISOString()},
    expiresAt:{timestampValue:new Date(Date.now()+8*86400000).toISOString()},
    type:{stringValue:tab}
  }};
  const response=await fetch(FS+'/push_delivery_log?documentId='+id,{
    method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  if(response.status===409)return null;
  if(!response.ok)throw Error('Reserva push '+response.status);
  return id;
}
async function releaseDelivery(id,access){
  const response=await fetch(FS+'/push_delivery_log/'+id,{
    method:'DELETE',headers:{Authorization:'Bearer '+access}
  });
  if(!response.ok&&response.status!==404)throw Error('Liberación push '+response.status);
}

export default async () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return new Response('Falta FIREBASE_SERVICE_ACCOUNT', { status: 500 });
  const sa = JSON.parse(raw);
  const accessToken = await getAccessToken(sa);

  // 1) lastRun (con solapamiento de seguridad de 1 min); default: últimos 10 min
  const stateDoc = await fsGet('meta/push_state', accessToken);
  const nowIso = new Date().toISOString();
  let lastRun = stateDoc?.fields?.lastRun?.timestampValue || new Date(Date.now() - 10 * 60000).toISOString();
  const sinceIso = new Date(new Date(lastRun).getTime() - 60000).toISOString();

  // 2) suscripciones (admin lee todo, las reglas no aplican al service account)
  const subs = await fsListAll('subscripciones_push', accessToken)
    .then(arr => arr.filter(s => !s.revoked && s.token &&
      Number.isFinite(s.lat) && Number.isFinite(s.lng) && Number.isFinite(s.radius)
      && Math.abs(s.lat)<=90 && Math.abs(s.lng)<=180 && s.radius>0 && s.radius<=50000));
  if (!subs.length) {
    await saveLastRun(accessToken, nowIso, stateDoc);
    return new Response('Sin suscripciones', { status: 200 });
  }

  // 3) reportes nuevos por colección (timestamp > sinceIso), sin photoBase64
  let sent = 0, matched = 0, failures = 0, duplicates = 0;
  for (const { tab, path, col } of COLLECTIONS) {
    const rows = await fsRunQuery(path, {
      structuredQuery: {
        from: [{ collectionId: col }],
        where: { fieldFilter: { field: { fieldPath: 'timestamp' }, op: 'GREATER_THAN', value: { timestampValue: sinceIso } } },
        select: { fields: ['type', 'description', 'location', 'lat', 'lng', 'timestamp'].map(f => ({ fieldPath: f })) },
        orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'ASCENDING' }]
      }
    }, accessToken); // No avanzar lastRun si falló una consulta.

    for (const row of rows) {
      const r = fields(row.document);
      const c = coordsOf(r); if (!c) continue;
      const reportId = row.document.name.split('/').pop();
      for (const s of subs) {
        // Las suscripciones anteriores reciben exactamente las 3 categorías
        // originales. Las nuevas pueden elegir 1..5.
        const categories=Array.isArray(s.categories)&&s.categories.length?
          s.categories:['robos','basura','pozos'];
        if (!categories.includes(tab)) continue;
        if (distMeters(c, [s.lat, s.lng]) <= s.radius) {
          matched++;
          let lock=null;
          try{
            lock=await reserveDelivery(s.token,tab,reportId,accessToken);
            if(!lock){duplicates++;continue;}
            const body=(r.description||CAT_LABEL[tab]).slice(0,90);
            const res=await sendPush(s.token,accessToken,{
              title:'⚠️ Nuevo '+CAT_LABEL[tab]+' en tu zona',
              body,url:'https://robosmdp.com.ar',reportId
            });
            if(res.ok)sent++;
            else{
              failures++;
              console.warn('FCM: entrega fallida',res.status);
              await releaseDelivery(lock,accessToken);
            }
          }catch(error){
            failures++;
            console.warn('FCM: error de entrega',String(error?.message||'error').slice(0,80));
            if(lock){
              try{await releaseDelivery(lock,accessToken);}catch(e){}
            }
          }
        }
      }
    }
  }

  // Si hubo un fallo, NO avanzar checkpoint: los envíos exitosos ya están
  // reservados y un próximo reintento solo alcanzará a los pendientes.
  if(failures){
    return new Response(JSON.stringify({subs:subs.length,matched,sent,failures,duplicates}),
      {status:503,headers:{'Content-Type':'application/json'}});
  }
  await saveLastRun(accessToken,nowIso,stateDoc);
  return new Response(JSON.stringify({subs:subs.length,matched,sent,duplicates,failures:0}),
    {status:200,headers:{'Content-Type':'application/json'}});
};

async function saveLastRun(accessToken, iso, stateDoc) {
  const response = await fetch(`${FS}/meta/push_state?updateMask.fieldPaths=lastRun`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { lastRun: { timestampValue: iso } } })
  });
  if(!response.ok)throw Error('No se pudo guardar checkpoint push '+response.status);
}

// Netlify Scheduled Function: cada 5 minutos.
export const config = { schedule: '*/5 * * * *' };
