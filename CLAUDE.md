# ROBOS MDP — Coordinación compartida ChatGPT + Claude Code

> **Archivo maestro del proyecto.** Última revisión: **2026-10-28**.
> Este archivo `CLAUDE.md` está en la raíz del repositorio para que **Claude Code lo lea como contexto de trabajo**. **ChatGPT también debe consultarlo mediante GitHub antes de proponer o realizar cambios.**
> Repositorio: https://github.com/DELPA555/robosmdp · Rama principal: `main` · Sitio: https://robosmdp.com.ar

## 1. Objetivo

Mantener una única fuente de verdad accesible para el propietario, ChatGPT y Claude Code. Registrar **qué existe**, **qué se pidió**, **qué se modificó**, **qué falta probar** y **qué está realmente desplegado**, evitando trabajos duplicados o cambios incompatibles.

**IMPORTANTE:** este archivo no se actualiza solo. El asistente que haga un cambio debe editarlo y guardar esa actualización en GitHub. Una conversación aislada con cualquiera de las IA no equivale a un cambio en el repositorio.

## Trabajos activos en ramas — consultar antes de editar (2026-10-18)

> Estos cambios **NO están en producción ni fusionados a `main`**. Se registran aquí para que ChatGPT y Claude Code conozcan el trabajo en curso sin esperar al merge. **No repetir ni sobrescribir estas tareas.** El estado real se confirma en cada PR.

| PR | Responsable | Descripción | Estado |
| --- | --- | --- | --- |
| [#3](https://github.com/DELPA555/robosmdp/pull/3) | ChatGPT | `fix/seguridad-privacidad-chat-20261018`: IP, ubicación, ISP y huella de dispositivo a `chat_ip_private` (lectura solo admin), función Netlify autenticada, separación de presencia pública, migración de campos históricos, protección de `resolved` al crear/actualizar, baneo/desbaneo y tests Firebase | EN REVISIÓN; NO DESPLEGADO. Tests automáticos del último commit aún por confirmar, migración y despliegue requieren coordinación/aprobación |
| [#4](https://github.com/DELPA555/robosmdp/pull/4) | ChatGPT | `feat/seguimiento-reportes-v1-20261018`: comprobante al reportar, consulta pública por ID, estados internos administrables (publicado, revisión, derivado y resuelto), historial de estados y pruebas JS | EN REVISIÓN; NO DESPLEGADO. GitHub Actions aprobó pruebas, Netlify informó vista previa correcta; falta prueba funcional integrada |
| [#5](https://github.com/DELPA555/robosmdp/pull/5) | ChatGPT | `fix/push-cancelacion-deduplicacion-20261018`: baja efectiva de alertas mediante token FCM y Netlify, historial de entregas sin duplicados, reintentos sin adelantar el checkpoint, pruebas | EN REVISIÓN; NO DESPLEGADO. CI aprobada; configurar caducidad del log y verificar Android/web |
| [#6](https://github.com/DELPA555/robosmdp/pull/6) | ChatGPT | `feat/panel-sponsors-20261018`: panel privado de campañas y cobros, vencimientos, exportación CSV, reglas admin y pruebas | EN REVISIÓN; NO DESPLEGADO. Falta validar tests Firestore y fusionar reglas con PR #3 |
| [#7](https://github.com/DELPA555/robosmdp/pull/7) | ChatGPT | `integration/mejoras-robosmdp-20261018`: integración de PR #3–#6, frontend, backend Netlify, reglas Firebase y pruebas conjuntas | EN REVISIÓN; NO DESPLEGADO. Candidato conjunto; migración IP/huellas, retención push y validación E2E pendientes |
| [#8](https://github.com/DELPA555/robosmdp/pull/8) | ChatGPT | GPS voluntario temporal de chat; lectura privada por titular/admin, caducidad, revocación y pruebas | INTEGRADO EN CÓDIGO DE PR #7; NO DESPLEGADO. Mantener consentimiento y verificar permisos Android |
| [#9](https://github.com/DELPA555/robosmdp/pull/9) | ChatGPT | Tablero `/admin-analitica`: KPI reales, barrios, pendientes, categorías y CSV con aviso de muestras | INTEGRADO EN CÓDIGO DE PR #7; NO DESPLEGADO. Validar cobertura y autenticación admin |
| [#12](https://github.com/DELPA555/robosmdp/pull/12) | Claude Code | `feat/colectas-panel-unificado`: módulo Colectas admin integrado como pestaña en `panel-organismos.html` (Lista, Nueva, Yo tengo esto; overlay con Movimientos, Agregar+foto, Checklist) | EN REVISIÓN; NO DESPLEGADO. Requiere prueba funcional y aprobación del propietario |
| [#13](https://github.com/DELPA555/robosmdp/pull/13) | Claude Code | `feat/super-admin-unificado`: `super-admin.html` panel único con 9 tabs (Reportes, Patentes, Objetos, Mascotas, Foro, Chat, Rastreo, Organismos, Colectas). Reemplaza `panel-organismos.html` y `admin-colectas.html` para el admin. Login Firebase, lazy-load, ban modal, eliminar colecta completa (batch). | EN REVISIÓN; NO DESPLEGADO. Requiere prueba funcional, merge y decisión del propietario sobre qué paneles reemplazar |

**Importante al integrar:** las PR #3, #4, #5 y #6 modifican `CLAUDE.md` y `robosmdp/index.html`; también #3 y #6 modifican `firestore.rules`. Resolver conflictos conservando todas las mejoras. Los PR #5 y #6 tampoco están desplegados. Al fusionar, conservar los dos cambios en frontend y las dos entradas del historial, resolviendo conflictos. No fusionar el PR #3 antes de migrar las IP/huellas históricas y probar la seguridad en producción. El PR #4 incorporó una segunda fase con estados internos e historial administrativo; no implica confirmación de un trámite oficial. Requiere prueba funcional de punta a punta antes de publicar. Ver instrucciones de despliegue en cada rama.

## 2. Reglas de colaboración obligatorias para ambas IA

1. **Al iniciar un trabajo:** leer este archivo y comprobar el estado más reciente de `main`, ramas y archivos afectados. No suponer que el contenido de conversaciones anteriores representa la versión actual.
2. **Antes de editar:** revisar si la funcionalidad ya existe, si hay trabajos en curso y si el cambio puede afectar web, Android, Firebase, Netlify, datos antiguos o avisos push.
3. **Un trabajo = una rama identificable**, preferentemente `feat/...`, `fix/...` o `chore/...`; no reescribir ni sobrescribir trabajo de la otra IA. Para cambios sustanciales, crear PR y validar su vista previa.
4. **Al terminar:** actualizar el tablero de §5 y añadir una entrada a §6 en el mismo commit/PR de los cambios. Registrar autor (`ChatGPT` o `Claude Code`), fecha, archivos, cambios, pruebas, commit/PR y despliegue.
5. **Estados exactos:** `IDEA`, `PENDIENTE`, `EN DESARROLLO`, `EN REVISIÓN`, `PROBADO`, `DESPLEGADO`, `BLOQUEADO`, `DESCARTADO`. **No decir DESPLEGADO solo porque el código esté en GitHub**; verificar Netlify/Firebase/Play Store según corresponda.
6. **Producción:** no modificar reglas publicadas de Firebase, funciones, datos ni `main` para un cambio de comportamiento crítico sin validación y autorización del propietario. Tener rollback. No borrar información histórica sin instrucción.
7. **Seguridad:** nunca escribir contraseñas, tokens, claves de servicio, IP de usuarios, credenciales ni datos personales en este archivo, commits, capturas o logs públicos.
8. **Si ambas IA tocan este archivo:** sincronizar `main` antes de registrar el cambio y resolver conflictos **conservando todas las entradas**, sin sobrescribir registros ajenos.
9. Documentar lo que **se confirmó en código** y distinguirlo expresamente de lo **verificado en producción** y de lo **informado por el propietario**.
10. Respetar la identidad visual y las funciones actuales de Robos MDP. No reconstruir la web desde cero cuando alcanza con una modificación puntual.

## 3. Arquitectura actual (confirmada en el repositorio)

- **Hosting web:** Netlify; `netlify.toml` publica la carpeta `robosmdp/` y usa funciones en `netlify/functions/`.
- **Frontend:** principalmente HTML, CSS y JavaScript; páginas `robosmdp/index.html`, `chat.html`, `foro.html`, `rastreo.html` y hojas de estilo bajo `robosmdp/assets/`. **No tratar este proyecto como un Next.js activo solo por descripciones anteriores.**
- **Backend/datos:** Firebase Authentication, Cloud Firestore y Firebase Storage; configuración/versionado de reglas en `firestore.rules`, `storage.rules` y `firebase.json`.
- **Funciones Netlify:** `chat-ip.mjs` (IP y geolocalización aproximada para moderación), `chat-cleanup.mjs` (limpieza programada), `notify-zone.mjs` (push por zona).
- **App Android:** Capacitor, ID `com.robosmdp.app` y URL `https://robosmdp.com.ar` en `capacitor.config.json`. El propietario informa que la app está en Google Play; **no se ha verificado desde este archivo su versión publicada**.
- **Funciones visibles en código:** reportes y mapas (robos, basura, pozos, vehículos abandonados y luminarias), foro, chat vecinal, moderación, rastreo y notificaciones por zona. La disponibilidad exacta en producción debe comprobarse.
- **Pruebas existentes:** `firestore/tests/chat-rules.test.mjs`; no consta aquí una ejecución satisfactoria reciente contra el emulador.
- **Documentación existente:** `README-V5-INTEGRACION.md` y `SEGURIDAD-CHAT-V2.md`. Pueden reflejar etapas anteriores: prevalecen el código vigente, los tests y lo efectivamente desplegado.

## 4. Decisiones del propietario (no revertir sin consultar)

- Mantener **Robos MDP** en su dominio, GitHub, Netlify, Firebase y app Android actuales.
- El administrador **necesita poder ver la IP y localización aproximada de los participantes del chat** para moderación. Esta funcionalidad es deliberada y **no se debe eliminar**. La protección requerida es que **solo administradores autorizados** puedan acceder a los datos personales desde Firebase y las funciones del servidor, no meramente ocultarlos en la interfaz.
- Mantener **chat vecinal con apodos y entrada anónima**, con sistema de moderación, sanciones y control anti-evasión. No presentar la huella de dispositivo como protección infalible.
- Proteger el servicio en producción: probar cambios primero en ramas y previsualizaciones cuando corresponda.
- ChatGPT y Claude Code colaboran; toda mejora concluida debe quedar documentada aquí.

## 5. Tablero único de mejoras y verificaciones

| ID | Prioridad | Área | Trabajo / criterio principal | Estado inicial | Responsable |
| --- | --- | --- | --- | --- | --- |
| SEG-01 | CRÍTICA | Privacidad del chat | Segregar IP/ciudad/ISP de `chat_presencia` legible por usuarios autenticados. Permitir lectura de datos sensibles únicamente al admin en colección o servicio separado, **sin quitarle visibilidad en su panel**. Añadir pruebas negativas de acceso. | EN REVISIÓN | ChatGPT — PR #3 |
| SEG-02 | CRÍTICA | Función `chat-ip` | Autenticar al solicitante, validar que `uid` y `sessionId` correspondan a su sesión, y evitar que un tercero sobreescriba datos de otra presencia mediante la credencial de servidor. Evaluar geolocalización por canal seguro. | EN REVISIÓN | ChatGPT — PR #3 |
| SEG-03 | ALTA | Reglas de reportes | Restringir la modificación de `resolved` a personas autorizadas; revisar incremento de contadores y demás escrituras públicas contra manipulación/abuso. Preservar el alta vecinal. | EN REVISIÓN | ChatGPT — PR #3 |
| SEG-04 | IMPLEMENTADO EN PRODUCCIÓN | Chat y baneos (3 capas) | **PROTEGIDO — NO REIMPLEMENTAR**. Preservar UID + huella + apodo, `initFingerprint`, `checkFingerprintBan`, `checkApodoBan`, `applyExternalBan`, `isLocallyBlocked`, y espejos `chat_bans_fp` / `chat_bans_nick`. Solamente pruebas de regresión y mejoras coordinadas. | IMPLEMENTADO | Claude Code (existente en main); ChatGPT solo revisión de PR #3/#7 |
| OPS-01 | ALTA | Despliegue | Tests automáticos de reglas, revisión de deploy previews, verificación Netlify y plan de rollback. No publicar reglas sin pruebas. | EN REVISIÓN | ChatGPT — PR #3 |
| OPS-02 | ALTA | Monitoreo | Registrar fallos de Firestore, mapas, chat, funciones programadas, push y experiencia Android; alerta al admin ante errores importantes. | EN REVISIÓN | ChatGPT — PR #3 (monitoreo web parcial) |
| REP-01 | ALTA | Reportes | Código de seguimiento, estado (recibido/en revisión/publicado/derivado/resuelto), historial y consulta por vecino. Diferenciar claramente reporte ciudadano de denuncia oficial. | EN DESARROLLO | ChatGPT — PR #4 (fase 1) |
| ADM-01 | ALTA | Administración | Centro de control unificado de reportes, chat, moderación, alertas, métricas y actividad; filtros por fecha/zona/estado y auditoría de acciones. | IDEA | Sin asignar |
| MAP-01 | MEDIA | Mapas | Mapa de calor, tendencias por barrio/período e informes con explicación de límites y cobertura de los datos. | IDEA | Sin asignar |
| PUSH-01 | MEDIA | Alertas | Varias zonas/categorías, horarios y deduplicación de notificaciones; reintentos/logs y control de tokens inválidos. | EN REVISIÓN | ChatGPT — PR #5 (baja y duplicados) |
| CHAT-01 | MEDIA | Chat | Denuncia de mensajes, silencio temporal, antispam del lado del servidor e historial de sanciones. | IDEA | Sin asignar |
| APP-01 | MEDIA | Android | Auditar versión publicada, navegación, push, permisos, rendimiento móvil y comportamiento sin conexión. | IDEA | Sin asignar |
| COM-01 | MEDIA | Sponsors | Administrar campañas, fechas, banners, clics/impresiones medidos e informes para anunciantes. | EN REVISIÓN | ChatGPT — PR #6 (gestión comercial) |
| PERF-01 | MEDIA | Frontend | Reducir peso de imágenes y recursos, modularizar gradualmente `index.html`, mejorar tiempos de carga y evitar regresiones. | IDEA | Sin asignar |
| APP-02 | MEDIA | Política de privacidad | Página legal para Google Play: `robosmdp/politica-de-privacidad.html` → `robosmdp.com.ar/politica-de-privacidad` (10 secciones, Ley 25.326). Verificada en vivo HTTP 200 (2026-10-19). | DESPLEGADO | Claude Code |
| ORG-01 | ALTA | Organismos verificados | Panel de organismos, denuncias anónimas, menciones ✓ + FCM y chat a 500 chars. Rama `feature/organismos-verificados`. NO mergeado; reglas NO desplegadas. | PR #10 EN REVISIÓN | Claude Code |
| COL-01 | ALTA | Colectas vecinales | Página pública `colectas.html` con listado y detalle de colectas (4 tabs: Dinero, Cosas recibidas, Lo que falta, Gastos). Formulario "Yo tengo esto" → `yo_tengo`. Panel admin `admin-colectas.html`: crear/cerrar colectas, cargar movimientos con foto, gestionar checklist, leer formularios recibidos. Balance en tiempo real. Entrada en menú principal. Rama `feat/colectas-20261028` **MERGEADA a `main` (PR #11, merge `71637b7`)**; páginas **DESPLEGADAS y verificadas en Netlify** (HTTP 200, 2026-10-28). **Reglas Firestore NO publicadas en Firebase todavía** → hasta publicarlas el módulo no opera. | DESPLEGADO (web) / reglas pendientes | Claude Code |

**Nota histórica:** los estados anteriores de SEG-04 reflejaban una revisión estática anterior; el sistema anti-evasión de tres capas ya está implementado en `main`. Quedan pendientes solamente las pruebas de regresión relacionadas con las modificaciones de seguridad y el despliegue, no volver a programarlo. Las demás observaciones iniciales no implican confirmar las reglas de Firebase efectivamente desplegadas.

## 6. Registro cronológico de cambios (actualizar después de CADA tarea)

Usar este formato para cada entrada nueva:

```md
### AAAA-MM-DD — [ID] Título del cambio
- Responsable: ChatGPT / Claude Code / propietario / tercero
- Pedido y alcance:
- Archivos modificados:
- Resultado:
- Pruebas realizadas y resultado:
- Commit o PR: [enlace]
- Estado de deploy: NO DESPLEGADO / NETLIFY VERIFICADO / REGLAS FIREBASE VERIFICADAS / ANDROID VERIFICADA
- Pendientes o riesgos:
```

### 2026-10-28 — SA-01 Super Admin panel unificado (super-admin.html)
- Responsable: Claude Code.
- Pedido y alcance: el propietario quiere un único panel de admin en vez de dos (`panel-organismos.html` + `admin-colectas.html`). Opción B elegida: nuevo `super-admin.html` autónomo con todos los módulos.
- Archivos modificados: `robosmdp/super-admin.html` (nuevo; 1214 líneas).
- Resultado: 9 tabs en una sola página — Reportes (5 tipos), Patentes, Objetos perdidos, Mascotas, Foro, Chat, Rastreo vehicular, Organismos verificados, Colectas. Login propio Firebase Auth con verificación claim admin. Lazy-load por tab. Ban modal con duración, desbanear, moderadores. Colectas: crear, cerrar/reabrir, **eliminar colecta completa** (batch que borra movimientos + necesita + doc padre), movimientos con foto a Storage, checklist, formularios Yo tengo esto.
- Pruebas realizadas: verificación de presencia de todas las funciones clave en el HTML (colSaEliminar, chatSaOpenBan, banConfirm, etc.). Sin prueba funcional en producción (requiere reglas Firestore de COL-01 publicadas).
- Commit o PR: commit `2857798` — PR [#13](https://github.com/DELPA555/robosmdp/pull/13)
- Estado de deploy: **NO DESPLEGADO** (rama `feat/super-admin-unificado`; sin merge a main).
- Pendientes: prueba funcional de cada tab; decidir si se redirige `panel-organismos.html` y `admin-colectas.html` hacia `super-admin.html`; publicar reglas Firestore COL-01 antes de probar tab Colectas; aprobación y merge del propietario.

### 2026-10-28 — COL-02 Colectas integradas en panel-organismos.html (pestaña admin unificada)
- Responsable: Claude Code.
- Pedido y alcance: integrar el módulo admin de colectas como pestaña "💚 Colectas" dentro de `panel-organismos.html` (visible solo para admin), en lugar de página separada `admin-colectas.html`.
- Archivos modificados: `robosmdp/panel-organismos.html` (+496 líneas: CSS, HTML overlay+sub-tabs, JS completo con prefijo `c`).
- Resultado: nueva pestaña con sub-tabs Lista / Nueva colecta / Yo tengo esto. Overlay de detalle con 3 sub-tabs: 💰 Movimientos, ➕ Agregar (con foto a Storage), 📋 Checklist. Lazy-load con `_colectasLoaded`. SDK Storage agregado con try/catch. Funciones y CSS con prefijo `c` para no colisionar.
- Pruebas realizadas: verificación de presencia de todos los IDs clave (`csdtab-need`, `csdpane-need`, `cCargarNeedsAdm`, `cSwitchSDTab`) en el HTML. Sin prueba funcional en producción.
- Commit o PR: commit `39e1159` — PR [#12](https://github.com/DELPA555/robosmdp/pull/12)
- Estado de deploy: **NO DESPLEGADO** (rama `feat/colectas-panel-unificado`; sin merge a main).
- Pendientes: prueba funcional del sub-tab Checklist y subida de fotos; aprobación del propietario; merge a main.

### 2026-10-28 — COL-01 Módulo de colectas vecinales
- Responsable: Claude Code.
- Pedido y alcance: implementar el módulo completo de colectas solidarias en rama `feat/colectas-20261028` y abrir PR #11 hacia main (sin merge).
- Archivos modificados: `robosmdp/colectas.html` (nuevo; página pública con listado de colectas activas y detalle con 4 tabs: Dinero recibido · Cosas en especie · Lo que falta · Gastos, formulario "Yo tengo esto" con foto, lightbox, hash routing `#c-{id}`), `robosmdp/admin-colectas.html` (nuevo; panel privado: login con email/pass + verificación claim admin, crear colectas, agregar movimientos con foto/comprobante, recalcular totales automático, gestionar checklist de necesidades con cantidades, leer y marcar formularios "yo_tengo" como leídos, toggle activa/cerrada), `firestore.rules` (reglas para `colectas/{id}`, `colectas/{id}/movimientos/{id}`, `colectas/{id}/necesita/{id}` — lectura pública, escritura solo admin; `yo_tengo` — create para auth != null, read/update/delete solo admin), `robosmdp/index.html` (entrada "💚 Colectas vecinales" en nav desktop, menú móvil, sidebar de módulos y card en sección de servicios).
- Resultado: módulo completo construido desde cero en rama feature. Incluye: balance dinámico recaudado/gastado/disponible, barra de progreso si hay meta, checklist público con estado cubierto/parcial/pendiente, formularios que llegan al panel admin con foto.
- Pruebas realizadas: `node --check` N/A (solo HTML); parseo de scripts inline correcto; coherencia de IDs entre admin y público verificada manualmente; reglas Firestore revisadas.
- Commit o PR: PR #11 — https://github.com/DELPA555/robosmdp/pull/11 — **mergeado a `main` con `--no-ff`** (merge commit `71637b7`, push `20ae0a2..71637b7`). Revisión previa al merge: diff limpio, SEG-04 intacto (no se tocó `chat.html` ni las reglas `chat_bans_fp`/`chat_bans_nick`; `firestore.rules` solo agrega bloques al final usando el helper `isAdmin()` existente), sin claves/tokens (solo config pública de Firebase). Merge auto-resuelto sin conflictos contra los 3 commits de hardening de seguridad que ya estaban en `main`.
- Estado de deploy: **NETLIFY VERIFICADO (páginas)** — `colectas.html` (title "Colectas Vecinales - Robos MDP", HTTP 200) y `admin-colectas.html` (HTTP 200) sirviéndose en producción en robosmdp.com.ar, verificado 2026-10-28. **REGLAS FIREBASE NO DESPLEGADAS**: las reglas de `colectas`/`movimientos`/`necesita`/`yo_tengo` están en el repo pero **NO publicadas en Firebase Console** → hasta publicarlas, toda lectura/escritura de esas colecciones será denegada por las reglas de producción actuales y el módulo NO funcionará (la página carga pero queda vacía / sin poder enviar formularios).
- Pendientes (del dueño): **publicar `firestore.rules` en Firebase Console** (o `firebase deploy --only firestore:rules`) — PASO BLOQUEANTE para que colectas funcione; crear índices compuestos si Firestore los requiere (`colectas` → `creada_en desc`; `movimientos` → `tipo` + `fecha desc`); seed de las dos colectas actuales ("Quique" y "Flor") desde el panel admin.

### 2026-10-23 — ORG-01 Organismos verificados (panel, denuncias anónimas, FCM, chat 500)
- Responsable: Claude Code.
- Pedido y alcance: implementar la feature ORG-01 completa en la rama `feature/organismos-verificados` y abrir PR hacia main (sin merge).
- Archivos modificados: `robosmdp/panel-organismos.html` (nuevo; login por apodo que arma el email solo + dropdown de organismos + reset de contraseña + link a cambiar-password), `robosmdp/denuncia.html` (nuevo, anónima), `robosmdp/cambiar-password.html` (nuevo; reautenticación + updatePassword), `robosmdp/admin-organismos.html` (nuevo; panel admin: tabla de organismos, KPIs, detalle de denuncias, desactivar), `netlify/functions/notificar-mencion.mjs` (nuevo), `netlify/functions/notificar-denuncia.mjs` (nuevo), `netlify/functions/limpiar-imagenes.mjs` (nuevo, `@hourly`), `scripts/seed-organismos.js` (nuevo, admin-only), `firestore.rules` (helper `isOrganismo` + reglas `chat_organismos` y `chat_denuncias`; chat_publico 280→500 y `menciones` en whitelist; comentarios de reportes se mantienen en 280; **admin** lee `chat_denuncias` y actualiza `chat_organismos` para el panel de administración), `robosmdp/chat.html` (menciones con badge ✓, notificación FCM, límite 500 chars), `.gitignore` (bloqueo de claves Firebase/`*.json` con negaciones para configs versionados), `package.json`/`package-lock.json` (`firebase-admin` devDependency para el seed).
- Resultado: feature construida desde cero (los commits/archivos del pedido original no existían en el repo). Funciones Netlify implementadas con el patrón REST del repo (no firebase-admin) para no sumar deps en producción.
- Pruebas realizadas y resultado: `node --check` OK en las 3 funciones y el seed; parseo OK de los scripts inline de los 5 HTML; `git check-ignore` verifica que las claves quedan ignoradas y los configs versionables; `index.html` intacto (guard WIP preservado).
- Commit o PR: PR #10 — https://github.com/DELPA555/robosmdp/pull/10 (commits `16cb357` feature, `93fe170` fix límites + CLAUDE.md, `f40f169` gitignore, `86d6ab8` cambiar-password + admin + login por apodo, `86b1755` docs, `5b66f0f` config real + VAPID + Auth anónima foto + bloque storage.rules).
- Estado de deploy: **NO DESPLEGADO** (sin merge; reglas NO publicadas en Firebase).
- Ya hecho (sin intervención del dueño): config pública real en las 4 páginas nuevas; VAPID key real en `panel-organismos.html`; `denuncia.html` con Auth anónima solo al subir foto (opción A); bloque `denuncias/` agregado a `storage.rules` (create con `auth != null` + 8 MB + `image/*`), **aún sin desplegar**. Confirmado por el dueño: `FIREBASE_SERVICE_ACCOUNT` ya cargado en Netlify; `firebase-messaging-sw.js` ya existe.
- Pendientes (del dueño): publicar `firestore.rules` Y `storage.rules` en Firebase (requiere su aprobación); correr el seed (`node scripts/seed-organismos.js` con `GOOGLE_APPLICATION_CREDENTIALS`, crea cuentas Auth + claims); crear índices compuestos (`chat_denuncias`: destinatario + `creado_en DESC`; `chat_publico`: `menciones` array-contains + `timestamp DESC`); mergear PR #10. Riesgo conocido: lectura de `chat_organismos` abierta a firmados expone `fcm_token` (endurecer si se desea).

### 2026-10-18 — DOC-006 Política de privacidad desplegada
- Responsable: Claude Code.
- Pedido y alcance: crear la página de política de privacidad requerida por Google Play Console y dejarla pública.
- Archivos modificados: `robosmdp/politica-de-privacidad.html` (nuevo).
- Resultado: página de 10 secciones conforme a la Ley 25.326 (Argentina). Declara los datos que trata la app: Firebase Anonymous Auth, huella FingerprintJS (moderación), IP/geolocalización aproximada (visible solo para admin), tokens FCM/push + zona, y almacenamiento local (localStorage). Contacto: robosmdp@gmail.com.
- Pruebas: verificación en vivo `GET https://robosmdp.com.ar/politica-de-privacidad` → HTTP 200 y título correcto (2026-10-19).
- Commit o PR: 9cd674c (push directo a main).
- Estado de deploy: **NETLIFY VERIFICADO** (página servida en el dominio).
- Pendientes o riesgos: cargar la URL en la ficha de Play Console. Si en el futuro se agrega AdSense u otra red publicitaria, actualizar la sección de terceros de la política.
- Nota de ID: se registra como DOC-006 porque DOC-005 ya está ocupado (localizador GPS y tablero).

### 2026-10-18 — DOC-001 Creación del archivo maestro de coordinación
- Responsable: ChatGPT, a pedido del propietario.
- Pedido y alcance: establecer una fuente de seguimiento compartida para ChatGPT y Claude Code.
- Archivos modificados: `CLAUDE.md` (este archivo).
- Resultado: inventario técnico, decisiones, reglas de colaboración, backlog y plantilla de changelog.
- Pruebas: lectura de archivos del repositorio vía GitHub. **No se realizaron pruebas funcionales ni se cambiaron reglas en Firebase.**
- Estado de deploy: archivo de documentación en GitHub; **sin cambio de comportamiento del sitio ni de Android**.
- Pendientes: asignar responsables y completar las entradas históricas de los cambios de Claude que se quieran conservar; no inventar fechas o despliegues.

### 2026-10-18 — DOC-002 Sincronización entre ramas en revisión
- Responsable: ChatGPT.
- Tipo: **solo documentación en `main`**, sin cambios en la web, en datos, ni en reglas publicadas.
- Estado: PR #3 de seguridad y PR #4 de seguimiento activos y **NO DESPLEGADOS**. Consultar sus diffs y ejecución CI antes de intervenir.
- Notas para Claude Code: revisar PR #3 y #4 antes de tocar `index.html`, `chat.html`, Firestore o admin. Evitar trabajar sobre archivos y líneas de los dos PR sin coordinar. Al integrar, resolver `CLAUDE.md` preservando ambos historiales.

### 2026-10-18 — DOC-003 Registro compartido de PR #5 y #6
- Responsable: ChatGPT. Actualización **solo documental de `main`**, sin cambiar la web ni las reglas en producción.
- PR #5: https://github.com/DELPA555/robosmdp/pull/5 — baja real de alertas y deduplicación. Pruebas automáticas aprobadas.
- PR #6: https://github.com/DELPA555/robosmdp/pull/6 — panel privado de patrocinadores. Pruebas de lógica financiera aprobadas; verificar reglas Firestore.
- Estado de ambos: **EN REVISIÓN / NO DESPLEGADO**.
- Atención: múltiples ramas tocan `index.html`, `CLAUDE.md`; dos tocan `firestore.rules`. No sobrescribir el desarrollo ajeno; integrar y verificar reglas Firebase antes de desplegar.

### 2026-10-18 — DOC-004 Integración conjunta en PR #7
- Responsable: ChatGPT. Cambios en `main`: **solo documentación**, sin desplegar código funcional.
- PR #7: https://github.com/DELPA555/robosmdp/pull/7 — contiene la integración de seguridad, seguimiento de reportes, alertas y patrocinadores.
- La integración preserva los cambios del archivo principal `index.html`, las reglas de Firebase, las rutas y los tests de los PR #3–#6.
- Estado: **EN REVISIÓN / NO DESPLEGADO**. Quedan las pruebas E2E, la migración de IP/huellas, la configuración de TTL de entregas FCM y el despliegue coordinado.
- Claude Code debe priorizar la lectura de PR #7 antes de añadir nuevas funciones que modifiquen los archivos compartidos.

### 2026-10-18 — DOC-005 Localizador GPS y tablero consolidados
- Responsable: ChatGPT. Actualización **exclusivamente documental** en `main`.
- PR #8 y PR #9 ya incorporadas a los archivos de la **PR #7**, sin publicar web, reglas o datos reales. Las PR dependientes se conservan para su revisión individual.
- GPS: captura única con consentimiento; solo titular/admin leen coordenadas, sin seguimiento permanente. Revocación y purga horaria.
- Analítica: totales de los documentos efectivamente cargados, pendientes, resolución, barrios, tendencias y CSV, con advertencias de muestreo; no usa datos privados del chat.
- Ramas: `integration/mejoras-robosmdp-20261018` es la candidata unificada. Revisar `docs/INTEGRACION-VALIDACION.md` y CI más reciente antes de cualquier despliegue.
- Estado: **EN REVISIÓN / NO DESPLEGADO**. Faltan migración histórica de IP/huellas, verificación funcional de Netlify/Firebase y Android, especialmente permisos de GPS.

### SEC-04-IMPL — Anti-evasión de 3 capas: protegido en producción
- **Código ya implementado en `main`**: UID de Firebase + huella de dispositivo + apodo. Nunca volver a implementar SEG-04 desde cero.
- **Zona protegida:** `robosmdp/chat.html`, sección `ANTI-EVASIÓN DE BANEO ("anti-Jorgito")`. Preservar completas `initFingerprint`, `checkFingerprintBan`, `checkApodoBan`, `applyExternalBan`, `isLocallyBlocked` y funciones asociadas.
- **Reglas protegidas:** `firestore.rules`, bloques `chat_bans_fp` y `chat_bans_nick`. Son colecciones espejo **deliberadas**, con `get` para usuario autenticado, `list` solo administrador y escritura solo administrador. No consolidar ni borrar.
- **PR #3 y PR #7:** ambos modifican archivos cercanos. Antes de cada merge, **diff manual contra `main` actualizado** y pruebas UID/huella/apodo, cambio de UID, nick, vencimiento, ban/desban y presencia.
- Atención especial: el cambio de almacenamiento de `fingerprint` desde `chat_presencia` a `chat_ip_private` debe mantener el baneo por huella desde administración y la limpieza correcta de espejos. No desplegar sin validar.
- Enlaces de advertencia: https://github.com/DELPA555/robosmdp/pull/3 y https://github.com/DELPA555/robosmdp/pull/7.
- Esta entrada **no implica** que las funciones de seguridad nuevas de esas PR estén publicadas; dichas mejoras aún requieren integración coordinada.

## 7. Checklist de cierre de cualquier modificación

- [ ] Se consultó este `CLAUDE.md` y el código vigente antes de empezar.
- [ ] Se identificaron archivos, colecciones, reglas y posibles impactos en Android/Netlify.
- [ ] Los cambios se realizaron en una rama apropiada o con aprobación expresa para otro flujo.
- [ ] Se ejecutaron las pruebas pertinentes y se anotaron sus resultados reales.
- [ ] Se respetaron los permisos, la privacidad y la visión de datos del administrador.
- [ ] Se registraron posibles cambios de reglas, variables de entorno, índices y migraciones.
- [ ] Se actualizó §5 y se agregó entrada a §6 con enlace de commit/PR.
- [ ] **Solo si se verificó:** se marcó DESPLEGADO y se especificó dónde y cómo se confirmó.

## 8. Cómo usar este archivo

- **Claude Code:** este `CLAUDE.md` de la raíz debe funcionar como instrucciones/contexto del repositorio. Al trabajar, actualizarlo también.
- **ChatGPT:** consultar el `CLAUDE.md` más reciente por el conector GitHub antes de modificar el proyecto y actualizarlo con cada tarea completada.
- **Propietario:** puede pedir «revisá el CLAUDE.md y seguí con SEG-01» a cualquiera de los dos. Si un cambio lo hizo la otra IA y no figura aquí, primero revisar GitHub y registrarlo.
- **Registro veraz:** en caso de conflicto entre conversaciones, documentación y código, primero comparar con la rama y el commit reales; **nunca sobreescribir un cambio reciente por seguir notas antiguas**.
