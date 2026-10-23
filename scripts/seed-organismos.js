/* Seed de organismos verificados (ORG-01) — ADMIN ONLY, se corre a mano y en local.
 *
 * Crea/actualiza 25 cuentas de organismos:
 *   1. Usuario en Firebase Auth: email = {apodo}@robosmdp.com.ar + password aleatorio seguro
 *   2. Custom claims: { rol: 'organismo', apodo }
 *   3. Doc chat_organismos/{apodo}: { uid, apodo, nombre, email, activo, fcm_token, creado_en, ultima_sesion }
 *
 * Es idempotente: si la cuenta ya existe, reutiliza el uid, re-aplica los claims y
 * actualiza el doc (NO regenera la contraseña de las cuentas ya existentes).
 *
 * CREDENCIAL: via GOOGLE_APPLICATION_CREDENTIALS (ruta al JSON del Service Account).
 * NUNCA hardcodear la clave ni commitearla al repo.
 *
 * Uso (PowerShell):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\serviceAccount.json"; node scripts/seed-organismos.js
 * Uso (bash):
 *   GOOGLE_APPLICATION_CREDENTIALS=/ruta/serviceAccount.json node scripts/seed-organismos.js
 *
 * Requiere: npm install (firebase-admin está en devDependencies).
 */
'use strict';

const crypto = require('node:crypto');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const DOMINIO = 'robosmdp.com.ar';

const ORGANISMOS = [
  { apodo: 'comisaria1ra',      nombre: 'Comisaría 1ª' },
  { apodo: 'comisaria2da',      nombre: 'Comisaría 2ª' },
  { apodo: 'comisaria3ra',      nombre: 'Comisaría 3ª' },
  { apodo: 'comisaria4ta',      nombre: 'Comisaría 4ª' },
  { apodo: 'comisaria5ta',      nombre: 'Comisaría 5ª' },
  { apodo: 'comisaria6ta',      nombre: 'Comisaría 6ª' },
  { apodo: 'comisaria7ma',      nombre: 'Comisaría 7ª' },
  { apodo: 'comisaria8va',      nombre: 'Comisaría 8ª' },
  { apodo: 'comisaria9na',      nombre: 'Comisaría 9ª' },
  { apodo: 'comisaria10ma',     nombre: 'Comisaría 10ª' },
  { apodo: 'ddi',               nombre: 'DDI — Depto. de Investigaciones' },
  { apodo: 'patrullamunicipal', nombre: 'Patrulla Municipal MDP' },
  { apodo: 'brigada1',          nombre: 'Brigada de Investigaciones' },
  { apodo: 'infanteria',        nombre: 'Infantería PBA' },
  { apodo: 'transito',          nombre: 'Dirección de Tránsito MDP' },
  { apodo: 'defCivil',          nombre: 'Defensa Civil MDP' },
  { apodo: 'bomberosMdp',       nombre: 'Bomberos Voluntarios MDP' },
  { apodo: 'samur',             nombre: 'SAME / SAMUR MDP' },
  { apodo: 'defensoria',        nombre: 'Defensoría del Pueblo' },
  { apodo: 'fiscaliaMdp',       nombre: 'Fiscalía General MDP' },
  { apodo: 'juzgadoFaltas',     nombre: 'Juzgado de Faltas MDP' },
  { apodo: 'secretariaSegMdp',  nombre: 'Secretaría de Seguridad Municipal' },
  { apodo: 'polAdicionalMdp',   nombre: 'Policía Adicional MDP' },
  { apodo: 'gendarmeriaMdp',    nombre: 'Gendarmería Nacional MDP' },
  { apodo: 'prefecturaMdp',     nombre: 'Prefectura Naval MDP' },
];

// Password aleatorio seguro: 16 chars de un charset sin ambigüedades + '!' final.
function randomPassword() {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(16);
  let out = '';
  for (let i = 0; i < 16; i++) out += charset[bytes[i] % charset.length];
  return out + '!';
}

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('✗ Falta GOOGLE_APPLICATION_CREDENTIALS (ruta al JSON del Service Account).');
    process.exit(1);
  }

  // Lee el JSON del Service Account directamente desde la ruta de
  // GOOGLE_APPLICATION_CREDENTIALS (require de un .json = objeto ya parseado).
  const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  initializeApp({ credential: cert(serviceAccount) });
  const auth = getAuth();
  const db = getFirestore();
  const FV = FieldValue;

  const creadas = [];

  for (const org of ORGANISMOS) {
    const email = `${org.apodo}@${DOMINIO}`;
    let uid = null;
    let password = null;
    let estado = '';

    try {
      const pass = randomPassword();
      const user = await auth.createUser({ email, password: pass, displayName: org.nombre });
      uid = user.uid;
      password = pass;
      estado = 'creada';
    } catch (e) {
      if (e && e.code === 'auth/email-already-exists') {
        const existing = await auth.getUserByEmail(email);
        uid = existing.uid;
        password = '(sin cambios — ya existía)';
        estado = 'existente';
      } else {
        console.error(`✗ ${org.apodo}: ${e && e.message}`);
        continue;
      }
    }

    // Custom claims (rol + apodo) y doc en Firestore.
    await auth.setCustomUserClaims(uid, { rol: 'organismo', apodo: org.apodo });
    await db.collection('chat_organismos').doc(org.apodo).set({
      uid,
      apodo: org.apodo,
      nombre: org.nombre,
      email,
      activo: true,
      fcm_token: null,
      creado_en: FV.serverTimestamp(),
      ultima_sesion: null
    }, { merge: true });

    creadas.push({ nombre: org.nombre, email, password, estado });
    console.log(`✓ ${org.apodo} (${estado})`);
  }

  // Tabla final: se muestra UNA SOLA VEZ. Guardala en un lugar seguro.
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  CREDENCIALES DE ORGANISMOS — se muestran UNA SOLA VEZ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.table(creadas.map(c => ({ Organismo: c.nombre, Email: c.email, Password: c.password, Estado: c.estado })));
  console.log('\nTotal procesados: ' + creadas.length + ' / ' + ORGANISMOS.length);
  console.log('Guardá las contraseñas ahora: no se vuelven a mostrar.');

  process.exit(0);
}

main().catch(e => { console.error('Error fatal:', e); process.exit(1); });
