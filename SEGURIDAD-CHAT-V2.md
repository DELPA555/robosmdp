# Chat Vecinal — Seguridad y moderación v2 (identidad por UID)

Rama: `chat-seguridad-moderacion-v2` · Objetivo: baneos reales que no se eluden cambiando de
apodo, cortando lectura y presencia, con las reglas del servidor haciendo cumplir todo.

> **No fusionar ni desplegar reglas sin aprobación.** Esta rama es para revisión.
> Falta tu confirmación de dos cosas externas (ver §4 y §6).

---

## 1. Qué problema resolvía y cómo quedó

| # | Antes (producción) | Ahora (esta rama) |
|---|--------------------|-------------------|
| A | Ban por **apodo** → se escapaba cambiando el nombre | Ban por **UID de Firebase** (estable por instalación) |
| B | El baneado seguía **leyendo** (listener de mensajes vivo) | Se cancelan listeners y se oculta el historial |
| C | El baneado seguía **"en línea"** (pings de presencia) | Se cortan los pings y se marca su presencia inactiva |
| D | Identidad solo en `localStorage` | **Firebase Auth anónimo** → UID independiente del apodo |
| E | Reglas **no versionadas** ni verificables | `firestore.rules` versionado + tests de emulador |

---

## 2. Modelo de identidad

- `chat.html` usa una **Firebase App nombrada e independiente** (`rmdp_chat`). Así el login
  anónimo del chat **no interfiere** con la sesión admin del portal (que usa la app por defecto
  en `index.html`).
- Al entrar, el vecino se autentica con **`signInAnonymously()`** → obtiene un **UID estable**
  mientras conserve los datos del navegador. El apodo sigue en `localStorage` y es solo visual.
- El admin sigue entrando con **email + contraseña** (misma app `rmdp_chat`); se detecta por
  `email == admin@robosmdp.com.ar`.
- **Fail-closed:** el chat arranca bloqueado (`banned = true`) y solo se abre tras verificar
  auth **y** estado de ban. Si Anonymous no está habilitado o falla la verificación, se muestra
  una pantalla de estado y **no** se carga ningún mensaje.

### Forma de los datos (nuevos documentos)
- `chat_publico/{id}`: `{ uid, apodo, texto, admin, moderador, timestamp, replyTo? }`
- `chat_presencia/{sid}`: `{ uid, apodo, activo, ultimo_ping }`
- `chat_bans/{uid}`: `{ uid, apodo, motivo, ban_hasta(Timestamp|null), duracion_ms, baneado_por, timestamp }`
- `chat_moderadores/{uid}`: `{ uid, apodo, desde, por }`

Duraciones de ban sin cambios: **1 h · 6 h · 24 h · 7 días · 30 días · Indefinido**.
Al vencer un ban temporal, el cliente restablece el acceso solo (timer) y las reglas vuelven a
permitir lectura/escritura automáticamente.

---

## 3. Qué archivos cambian

- `robosmdp/chat.html` — identidad por UID, lockout Premium V5, teardown de listeners/presencia,
  ban por UID, auto-restablecimiento. Se conservan: tiempo real, respuestas/citas, menciones @,
  apodos, avatares, sonido, notificaciones, contador, historial, login AdminRobos y moderación inline.
- `robosmdp/index.html` — panel admin del chat: **En línea** (deduplicado por UID, excluye baneados,
  muestra última actividad y nº de sesiones) y **Baneados** (último apodo, UID, duración, motivo,
  "Levantar"). Banear/mod ahora por UID. Mensajes antiguos sin UID: se avisa que no se puede banear
  desde ahí (usar el panel cuando el usuario vuelva a conectarse).
- `firestore.rules` — **plantilla** con las reglas del chat (ver §5).
- `firebase.json`, `firestore/tests/` — emulador y pruebas.
- `netlify/functions/chat-cleanup.mjs` — **sin cambios de comportamiento**: ya limpiaba por tiempo
  (`timestamp` > 24 h, `ultimo_ping` > 2 h) y sigue sin tocar `chat_bans` ni `chat_moderadores`.
  Los nuevos documentos solo agregan el campo `uid`, que no afecta la limpieza.

---

## 4. ✅ Requisito en Firebase Console

**Habilitar el proveedor Anonymous:** Authentication → Sign-in method → **Anonymous**.
**Confirmado habilitado por el usuario (16-oct-2026).** Sin esto, el chat nuevo muestra
"No se pudo iniciar el chat" y nadie puede entrar.

---

## 5. Reglas de Firestore (FINALES — listas para publicar, NO publicadas)

`firestore.rules` ya es el **archivo completo y final**: trae las reglas reales de todas las
colecciones del proyecto (reportes, basura, pozos, comentarios, foro, rastreo, mascotas,
patentes, abandonados, luminarias, objetos, etc., **sin cambios**) con los 4 bloques del chat
reemplazados por la versión por UID. Reutiliza tus helpers existentes `isAdmin()`,
`reservedName()` y `honestAuthor()`, y agrega `isSignedIn()`, `isBanned()` e `isMod()`.

Para publicar: copiá el contenido de `firestore.rules` en Firebase Console → Firestore Database →
Reglas → **Publicar** (o `firebase deploy --only firestore:rules`). **Hacelo recién tras el paso 2
del orden de abajo.**

Lo que hacen las reglas del chat:
- Leer/escribir chat: solo autenticado y **no baneado**.
- `uid` del mensaje = UID del autor; no se puede suplantar.
- No se puede auto-atribuir `admin` (solo el email admin) ni `moderador` (solo si hay doc en
  `chat_moderadores/{uid}`).
- Crear/levantar baneos y asignar moderadores: **solo admin**.
- Un vecino solo lee **su propio** doc de ban.
- Presencia atada al UID autenticado; el admin puede marcarla inactiva al banear.

### Probar las reglas (emulador, sin tocar producción)
Requiere Java y `firebase-tools` (`npm i -g firebase-tools`):
```
cd firestore/tests
npm install
npm test
```
Levanta el emulador con `../../firestore.rules` y corre la batería de casos de seguridad.

> **Nota:** No pude ejecutar el emulador en este entorno (sin `firebase-tools` ni Java), así que
> los tests están escritos pero **sin correr**. Corré `npm test` antes de publicar las reglas.

---

## 6. Orden de despliegue (para no romper el chat en vivo)

El chat actual funciona **sin** autenticación. Si publicás las reglas nuevas antes de tiempo, los
clientes viejos dejan de leer. Orden seguro:

1. **Habilitar Anonymous** en Authentication (§4).
2. **Mergear y desplegar** la rama (Netlify) → los clientes pasan a autenticarse. El chat sigue
   funcionando aunque las reglas viejas sigan abiertas (la auth solo agrega el `uid`).
3. Verificar en producción (ver §7).
4. **Integrar y publicar `firestore.rules`** (con tus reglas actuales incluidas), ya probado en emulador.

Levantar la rama sin el paso 4 ya arregla A–D en el cliente; el paso 4 es el candado del servidor.

---

## 7. Pruebas manuales sugeridas (escritorio + celular)

1. Vecino nuevo entra sin registrarse y envía mensajes.
2. Cambia el apodo → el UID se mantiene (mismo usuario para el admin).
3. Admin banea 1 h → al instante: pantalla de suspensión, deja de recibir mensajes, desaparece de
   "En línea".
4. Recargar / abrir otra pestaña → sigue baneado.
5. Admin levanta el ban → recupera acceso sin borrar datos del navegador.
6. Al vencer un ban temporal → acceso restablecido solo.
7. Login AdminRobos sigue funcionando y no queda nunca bloqueado.
8. El resto del portal (mapas, foro, rastreo, etc.) sin cambios.

---

## 8. Límites honestos (anti-evasión)

Firebase Auth anónimo da una identidad **estable por instalación**, no infalsificable: borrar los
datos del navegador o usar otro navegador/dispositivo genera **otro UID**. Esto reduce la evasión
casual (cambiar de apodo ya no sirve) pero no la elimina. Para subir el costo de evadir, sin pedir
datos personales, se recomienda a futuro: **Firebase App Check** (atestación del cliente),
rate-limiting ya presente en el cliente (y reforzable por reglas), y moderación activa. **No** se
usan baneos por IP como mecanismo principal (una IP puede ser de varias personas y además cambia).

---

## 9. Migración de datos existentes

- **Mensajes/presencias/bans antiguos sin `uid`:** se conservan. Los mensajes viejos se siguen
  mostrando; no se les puede aplicar un ban por UID (se avisa en el panel). No se atribuye un UID
  a un apodo viejo porque cualquiera pudo haber usado ese apodo.
- **Moderadores:** antes se indexaban por apodo; ahora por UID. Los mods actuales (si hay) pierden
  el badge y el admin los reasigna una vez (botón "Hacer mod" junto a su mensaje/conexión).
- **Bans viejos por apodo:** quedan en `chat_bans/{apodo}` y ya no aplican (el cliente mira
  `chat_bans/{uid}`). Conviene que el admin los vuelva a aplicar por UID si el usuario reincide.
