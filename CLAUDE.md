# ROBOS MDP — Coordinación compartida ChatGPT + Claude Code

> **Archivo maestro del proyecto.** Última revisión: **2026-10-18**.
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
| SEG-04 | ALTA | Chat y baneos | Probar efectividad del ban por UID y capas adicionales (huella/apodo), levantamiento, vencimiento, corte de lectura y presencia; confirmar reglas publicadas. | EN REVISIÓN | ChatGPT — PR #3 |
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

**Nota sobre estados:** `PENDIENTE DE VERIFICACIÓN` es una observación descriptiva del estado inicial de SEG-04; al tomar el trabajo usar uno de los estados definidos en §2. Estas observaciones provienen de una revisión estática del repositorio al 2026-10-18; **no prueban vulnerabilidad explotada ni confirman reglas desplegadas**.

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

### 2026-10-18 — SEG-01/SEG-02/SEG-03/OPS-01: seguridad del chat y permisos de reportes
- Responsable: ChatGPT.
- Pedido y alcance: mantener IP, geolocalización e ISP visibles en el panel de administrador, resguardarlos en una colección privada, comprobar identidad y titularidad de sesión en la función Netlify, y evitar que vecinos marquen reportes como resueltos.
- Archivos modificados: `firestore.rules`, `robosmdp/chat.html`, `robosmdp/index.html` (incluye aviso de privacidad), `netlify/functions/chat-ip.mjs`, `firestore/tests/chat-rules.test.mjs`, `scripts/migrate-chat-ip.mjs`, `docs/SEG-01-02-03-DESPLIEGUE.md`, `.github/workflows/security-checks.yml`, `.github/workflows/monitor-web.yml`, `CLAUDE.md`.
- Resultado: se protege también la huella técnica del dispositivo, se evita crear reportes falsamente resueltos y se corrige el levantamiento de baneos asociados (UID, huella y apodo). Cambios guardados en rama `fix/seguridad-privacidad-chat-20261018`, revisión por PR pendiente de publicación. Migración de IP existentes incluida como script manual en modo simulación predeterminado.
- Pruebas realizadas y resultado: GitHub Actions verificó sintaxis Node y pasó la batería de reglas de Firestore en el emulador (corridas exitosas sobre commit `21ae2ec451215b2b2e6a4facea063cfc3ba48db9`; ver https://github.com/DELPA555/robosmdp/actions/runs/39186749576). Siguen pendientes pruebas integradas en Netlify/Firebase real y confirmación Android.
- Commit o PR: https://github.com/DELPA555/robosmdp/pull/3
- Estado de deploy: **NO DESPLEGADO**. No se tocaron datos ni reglas activas de Firebase, Netlify de producción ni Play Store.
- Pendientes o riesgos: ejecutar test del emulador y validación real, luego aplicar el orden de migración y publicación indicado en `docs/SEG-01-02-03-DESPLIEGUE.md`. La colección pública antigua aún puede contener IP hasta ejecutar migración.

### 2026-10-18 — OPS-02 Monitoreo horario de disponibilidad web (primera fase)
- Responsable: ChatGPT.
- Pedido: detectar automáticamente caídas o rutas erróneas del sitio.
- Archivo: `.github/workflows/monitor-web.yml`.
- Resultado: workflow programado cada hora (minuto 17) para las rutas Inicio, Chat, Foro y Rastreo. Verifica código HTTP y contenido de cada sección para detectar redireccionamientos incorrectos. Soporta ejecución manual.
- Estado: **EN REVISIÓN / NO DESPLEGADO** hasta integrar la PR en `main`. No incluye todavía Firebase, mapas, push ni alertas externas; las notificaciones de fallos dependen de la configuración de GitHub Actions.
- PR: https://github.com/DELPA555/robosmdp/pull/3

### 2026-10-18 — INT-01 Integración conjunta de seguridad, reportes, push y sponsors
- Responsable: ChatGPT.
- Pedido: continuar todo lo propuesto conservando compatibilidad entre Claude Code y ChatGPT.
- Rama: `integration/mejoras-robosmdp-20261018`, a partir de seguridad PR #3, incorporando los archivos y parches de PR #4, #5 y #6.
- Código combinado: `robosmdp/index.html` preserva los cambios de las cuatro solicitudes. `firestore.rules` conserva privacidad de chat y suma permisos privados comerciales; tests y `_redirects` integrados.
- Archivos de verificación: `scripts/integration.test.mjs`, `.github/workflows/integration-checks.yml`, `docs/INTEGRACION-VALIDACION.md`, `scripts/push-delivery-cleanup.test.mjs`.
- Resultado: rama de integración preparada; **NO DESPLEGADA** a Firebase, Netlify de producción ni Play Store.
- Pruebas: comprobada sintaxis del JS principal durante la fusión; falta confirmar el resultado completo de GitHub Actions y la ejecución integrada en Netlify/Android.
- Pendientes indispensables: migración de IP/huellas heredadas, publicación coordinada de reglas Firebase, prueba funcional admin/vecino. La retención de marcadores push se implementó con función programada diaria `netlify/functions/push-delivery-cleanup.mjs` y test `scripts/push-delivery-cleanup.test.mjs` (verificar ejecución tras desplegar). Ver guía `docs/INTEGRACION-VALIDACION.md`.
- Importante: no fusionar primero PR individuales a producción sin resolver cambios compartidos. Se recomienda utilizar la rama integrada validada como candidato final tras completar el checklist.

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
