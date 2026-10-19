// Pruebas de las reglas de seguridad del Chat Vecinal de Robos MDP.
//
// Cómo correrlas (requiere Java + firebase-tools):
//   cd firestore/tests
//   npm install
//   npm test            # levanta el emulador, aplica ../../firestore.rules y corre node --test
//
// Cubre los casos de seguridad del pedido (7, 9, 10, 11, 16, 17 y afines):
//   - anónimo no baneado lee/escribe; baneado NO lee ni escribe (mensajes y presencia)
//   - el ban es por UID: cambiar de apodo no lo elude
//   - nadie puede auto-atribuirse admin/moderador
//   - solo el admin crea/levanta baneos y asigna moderadores
//   - la presencia queda atada al UID autenticado

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, serverTimestamp, Timestamp,
} from 'firebase/firestore';

const __dir = dirname(fileURLToPath(import.meta.url));
const RULES = readFileSync(resolve(__dir, '../../firestore.rules'), 'utf8');
const ADMIN_EMAIL = 'admin@robosmdp.com.ar';

let testEnv;

// Contextos de usuario
const anon      = (uid) => testEnv.authenticatedContext(uid).firestore();          // vecino anónimo (uid estable)
const adminCtx  = ()    => testEnv.authenticatedContext('admin-uid', { email: ADMIN_EMAIL }).firestore();

function msg(uid, extra = {}) {
  return { uid, apodo: 'Vecino', texto: 'hola barrio', admin: false, moderador: false, timestamp: serverTimestamp(), ...extra };
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'robosmdp-test',
    firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
  });
});
after(async () => { if (testEnv) await testEnv.cleanup(); });
beforeEach(async () => { await testEnv.clearFirestore(); });

// Helper: deja un ban sembrado (saltándose las reglas) para el uid dado.
async function seedBan(uid, ban_hasta /* Date|null */) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'chat_bans', uid), {
      uid, apodo: 'Vecino', motivo: 'spam',
      ban_hasta: ban_hasta ? Timestamp.fromDate(ban_hasta) : null,
      baneado_por: 'AdminRobos', timestamp: serverTimestamp(),
    });
  });
}
async function seedMod(uid) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'chat_moderadores', uid), { uid, apodo: 'Mod' });
  });
}

test('1-2. Vecino autenticado NO baneado puede leer y escribir', async () => {
  const db = anon('vecino1');
  await assertSucceeds(setDoc(doc(db, 'chat_publico', 'm1'), msg('vecino1')));
  await assertSucceeds(getDocs(collection(db, 'chat_publico')));
});

test('create: el uid del mensaje debe ser el del autor (no se puede suplantar)', async () => {
  const db = anon('vecino1');
  await assertFails(setDoc(doc(db, 'chat_publico', 'm2'), msg('otro-uid')));
});

test('create: no se puede auto-atribuir admin ni moderador', async () => {
  const db = anon('vecino1');
  await assertFails(setDoc(doc(db, 'chat_publico', 'a'), msg('vecino1', { admin: true })));
  await assertFails(setDoc(doc(db, 'chat_publico', 'b'), msg('vecino1', { moderador: true })));
});

test('create: un moderador (por UID) sí puede marcar moderador:true', async () => {
  await seedMod('mod1');
  const db = anon('mod1');
  await assertSucceeds(setDoc(doc(db, 'chat_publico', 'm'), msg('mod1', { apodo: 'Mod', moderador: true })));
});

test('6-7. Baneado por UID: NO lee ni escribe mensajes', async () => {
  await seedBan('malo', null); // permanente
  const db = anon('malo');
  await assertFails(setDoc(doc(db, 'chat_publico', 'x'), msg('malo')));
  await assertFails(getDocs(collection(db, 'chat_publico')));
});

test('9. Cambiar de apodo no elude el ban (el ban es por UID, no por apodo)', async () => {
  await seedBan('malo', null);
  const db = anon('malo');
  // Mismo UID, apodo distinto → sigue bloqueado.
  await assertFails(setDoc(doc(db, 'chat_publico', 'y'), msg('malo', { apodo: 'OtroNombre' })));
});

test('13. Ban temporal vencido: el acceso se restablece', async () => {
  await seedBan('temp', new Date(Date.now() - 60_000)); // venció hace 1 min
  const db = anon('temp');
  await assertSucceeds(setDoc(doc(db, 'chat_publico', 'z'), msg('temp')));
});

test('Presencia: atada al UID; baneado no puede escribir presencia', async () => {
  const ok = anon('vecino2');
  await assertSucceeds(setDoc(doc(ok, 'chat_presencia', 's1'),
    { uid: 'vecino2', apodo: 'V', activo: true, ultimo_ping: serverTimestamp() }));
  // uid ajeno → rechazado
  await assertFails(setDoc(doc(ok, 'chat_presencia', 's2'),
    { uid: 'otro', apodo: 'V', activo: true, ultimo_ping: serverTimestamp() }));
  await seedBan('vecino2', null);
  await assertFails(setDoc(doc(anon('vecino2'), 'chat_presencia', 's3'),
    { uid: 'vecino2', apodo: 'V', activo: true, ultimo_ping: serverTimestamp() }));
});

test('chat_bans: un vecino solo puede leer SU propio ban, no el de otros ni listar', async () => {
  await seedBan('otro', null);
  const db = anon('vecino3');
  await assertFails(getDoc(doc(db, 'chat_bans', 'otro')));   // ban ajeno
  await assertFails(getDocs(collection(db, 'chat_bans')));   // listar
  await seedBan('vecino3', null);
  await assertSucceeds(getDoc(doc(anon('vecino3'), 'chat_bans', 'vecino3'))); // el propio
});

test('16-17. Solo el admin crea/levanta baneos y asigna moderadores', async () => {
  const vecino = anon('vecino4');
  await assertFails(setDoc(doc(vecino, 'chat_bans', 'victima'), { uid: 'victima', ban_hasta: null }));
  await assertFails(setDoc(doc(vecino, 'chat_moderadores', 'vecino4'), { uid: 'vecino4' }));

  const admin = adminCtx();
  await assertSucceeds(setDoc(doc(admin, 'chat_bans', 'victima'),
    { uid: 'victima', apodo: 'X', motivo: 't', ban_hasta: null, baneado_por: 'AdminRobos', timestamp: serverTimestamp() }));
  await assertSucceeds(getDocs(collection(admin, 'chat_bans')));            // admin lista
  await assertSucceeds(deleteDoc(doc(admin, 'chat_bans', 'victima')));      // admin levanta
  await assertSucceeds(setDoc(doc(admin, 'chat_moderadores', 'alguien'), { uid: 'alguien', apodo: 'M' }));
});

test('Admin puede marcar inactiva la presencia de un usuario baneado', async () => {
  const vecino = anon('vecino5');
  await assertSucceeds(setDoc(doc(vecino, 'chat_presencia', 'sv'),
    { uid: 'vecino5', apodo: 'V', activo: true, ultimo_ping: serverTimestamp() }));
  const admin = adminCtx();
  await assertSucceeds(setDoc(doc(admin, 'chat_presencia', 'sv'),
    { uid: 'vecino5', apodo: 'V', activo: false, ultimo_ping: serverTimestamp() }, { merge: true }));
});


test('IP privada: el vecino no puede consultar ni escribir información sensible', async()=>{
  const vecino=anon('usuario-6'), admin=adminCtx();
  await testEnv.withSecurityRulesDisabled(async ctx=>{
    await setDoc(doc(ctx.firestore(),'chat_ip_private','sesion-test'),{
      uid:'usuario-6',ip:'192.0.2.15',ciudad:'Prueba'
    });
  });
  await assertFails(getDoc(doc(vecino,'chat_ip_private','sesion-test')));
  await assertFails(getDocs(collection(vecino,'chat_ip_private')));
  await assertFails(setDoc(doc(vecino,'chat_ip_private','nueva'),{ip:'192.0.2.20'}));
  await assertSucceeds(getDoc(doc(admin,'chat_ip_private','sesion-test')));
});

test('presencia: el vecino no puede crear ni modificar IP', async()=>{
  const vecino=anon('usuario-7'), ref=doc(vecino,'chat_presencia','sesion-7');
  await assertFails(setDoc(ref,{
    uid:'usuario-7',apodo:'Vecino',ultimo_ping:serverTimestamp(),activo:true,ip:'192.0.2.15'
  }));
  await assertSucceeds(setDoc(ref,{
    uid:'usuario-7',apodo:'Vecino',ultimo_ping:serverTimestamp(),activo:true
  }));
  await assertFails(updateDoc(ref,{ip:'192.0.2.20'}));
  await assertFails(updateDoc(ref,{fingerprint:'abcdefghijklmnop'}));
  await assertFails(setDoc(doc(vecino,'chat_presencia','sesion-7-fp'),{
    uid:'usuario-7',apodo:'Vecino',ultimo_ping:serverTimestamp(),
    activo:true,fingerprint:'abcdefghijklmnop'
  }));
});

test('reportes: ni visitantes ni autores pueden marcar resuelto', async()=>{
  const vecino=anon('usuario-8'), ref=doc(vecino,'basura','test-resuelto');
  await assertSucceeds(setDoc(ref,{
    description:'Basura en la esquina',lat:-38.01,lng:-57.55,resolved:false,uid:'usuario-8'
  }));
  await assertFails(updateDoc(ref,{resolved:true}));
  await assertSucceeds(updateDoc(doc(adminCtx(),'basura','test-resuelto'),{resolved:true}));
});

test('reportes: no se puede crear un reporte ya resuelto sin ser administrador', async()=>{
  const db=anon('usuario-9');
  await assertFails(setDoc(doc(db,'basura','nuevo-report-falso'),{
    description:'Basural identificado',lat:-38.01,lng:-57.55,resolved:true
  }));
  await assertSucceeds(setDoc(doc(db,'basura','nuevo-report-correcto'),{
    description:'Basural identificado',lat:-38.01,lng:-57.55,resolved:false
  }));
});

test('estados y su historial solamente los modifica el administrador', async()=>{
  const user=anon('usuario-10');
  const own=doc(user,'basura','gestion-prueba');
  await assertFails(setDoc(doc(user,'basura','gestion-falsificada'),{
    description:'Reportado',lat:-38.01,lng:-57.55,estado_gestion:'resuelto'
  }));
  await assertSucceeds(setDoc(own,{
    description:'Reportado',lat:-38.01,lng:-57.55,uid:'usuario-10',resolved:false
  }));
  await assertFails(updateDoc(own,{estado_gestion:'derivado'}));
  await assertFails(updateDoc(own,{historial_estado:[{estado:'resuelto'}]}));
  await assertFails(updateDoc(own,{estado_actualizado:serverTimestamp()}));
  await assertSucceeds(updateDoc(doc(adminCtx(),'basura','gestion-prueba'),{
    estado_gestion:'revision',estado_actualizado:serverTimestamp(),
    historial_estado:[{estado:'revision'}],resolved:false
  }));
});

test('campañas publicitarias: acceso y escritura exclusivos del administrador',async()=>{
  const vecino=anon('lector-comercial');
  const admin=adminCtx();
  const values={
    cliente:'Anunciante de prueba',plan:'Campaña mensual',
    inicio:'2026-10-18',fin:'2026-11-18',
    importe_total:100000,cobrado_total:50000,estado:'activa'
  };
  await assertFails(setDoc(doc(vecino,'campanias_publicitarias','c0'),values));
  await assertSucceeds(setDoc(doc(admin,'campanias_publicitarias','c1'),values));
  await assertFails(getDoc(doc(vecino,'campanias_publicitarias','c1')));
  await assertFails(getDocs(collection(vecino,'campanias_publicitarias')));
  await assertFails(updateDoc(doc(vecino,'campanias_publicitarias','c1'),{cobrado_total:0}));
  await assertFails(deleteDoc(doc(vecino,'campanias_publicitarias','c1')));
  await assertSucceeds(getDoc(doc(admin,'campanias_publicitarias','c1')));
  await assertSucceeds(updateDoc(doc(admin,'campanias_publicitarias','c1'),{cobrado_total:100000}));
  await assertSucceeds(deleteDoc(doc(admin,'campanias_publicitarias','c1')));
});


test('push: se admiten categorías válidas y se rechazan categorías ajenas', async()=>{
  const db=anon('vecino-push');
  const base={token:'token-prueba-1234567890',lat:-38,lng:-57.56,radius:400};
  await assertSucceeds(setDoc(doc(db,'subscripciones_push','cat-validas'),{
    ...base,categories:['robos','luminarias']
  }));
  await assertFails(setDoc(doc(db,'subscripciones_push','cat-invalidas'),{
    ...base,categories:['robos','no-existe']
  }));
  await assertFails(setDoc(doc(db,'subscripciones_push','cat-vacias'),{
    ...base,categories:[]
  }));
  await assertSucceeds(updateDoc(doc(db,'subscripciones_push','cat-validas'),{
    categories:['basura','pozos']
  }));
  await assertFails(updateDoc(doc(db,'subscripciones_push','cat-validas'),{
    categories:['robo-falso']
  }));
  // Compatibilidad con usuarios anteriores sin campo categories.
  await assertSucceeds(setDoc(doc(db,'subscripciones_push','cat-heredadas'),base));
});
