/* Netlify Function — Resetear contraseña de un organismo (ORG-01, admin only)
 *
 * POST /api/resetear-password
 * Headers: Authorization: Bearer <idToken del admin>
 * Body JSON: { apodo, nuevaPassword }
 *
 * Solo el administrador puede resetear contraseñas. Se verifica decodificando el
 * idToken del caller con firebase-admin y chequeando claims.admin === true; si no,
 * 403. Luego se busca el usuario por email ({apodo}@robosmdp.com.ar) y se actualiza
 * su contraseña con el Admin SDK.
 *
 * A diferencia de las otras functions (notificar-*, limpiar-imagenes), que usan REST
 * sin dependencias, esta usa firebase-admin: verifyIdToken + updateUser no tienen un
 * equivalente REST simple y seguro. Por eso firebase-admin pasó a `dependencies`.
 * REQUIERE env var FIREBASE_SERVICE_ACCOUNT (configurada en Netlify).
 */
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export const config = { path: '/api/resetear-password' };

const DOMINIO = 'robosmdp.com.ar';

// App de firebase-admin reutilizable entre invocaciones calientes (singleton).
function getAdminAuth() {
  if (!getApps().length) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(sa) });
  }
  return getAuth();
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return json({ error: 'Falta FIREBASE_SERVICE_ACCOUNT' }, 500);

  // 1) idToken del caller.
  const authHeader = req.headers.get('authorization') || '';
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return json({ error: 'Falta Authorization: Bearer <idToken>' }, 401);
  const idToken = m[1].trim();

  // 2) Body.
  let body;
  try { body = await req.json(); } catch (_) { return json({ error: 'JSON inválido' }, 400); }
  const apodo = String(body.apodo || '').trim();
  const nuevaPassword = String(body.nuevaPassword || '');
  if (!apodo) return json({ error: 'Falta apodo' }, 400);
  if (nuevaPassword.length < 8) return json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400);

  try {
    const auth = getAdminAuth();

    // 3) Verificar que el caller sea admin.
    let decoded;
    try { decoded = await auth.verifyIdToken(idToken); }
    catch (_) { return json({ error: 'Token inválido o expirado' }, 401); }
    if (decoded.admin !== true) return json({ error: 'No autorizado' }, 403);

    // 4) Buscar el organismo por email y actualizar su contraseña.
    const email = `${apodo}@${DOMINIO}`;
    let user;
    try { user = await auth.getUserByEmail(email); }
    catch (_) { return json({ error: `No existe la cuenta ${email}` }, 404); }
    await auth.updateUser(user.uid, { password: nuevaPassword });

    return json({ ok: true, apodo, email });
  } catch (e) {
    console.error('resetear-password', e && e.message);
    return json({ error: 'Error interno al resetear la contraseña' }, 500);
  }
};
