# ROBOS MDP — despliegue coordinado de privacidad y permisos

Cambios propuestos por ChatGPT el **18/10/2026**, rama `fix/seguridad-privacidad-chat-20261018`.

## Qué cambia
- La IP, geolocalización aproximada, ISP y huella técnica de dispositivo del chat **siguen visibles para el administrador**, pero pasan a `chat_ip_private/{sessionId}`. Los vecinos no pueden leer esa colección desde Firebase.
- `/.netlify/functions/chat-ip` valida un Firebase ID token y comprueba que la sesión enviada está asociada al UID autenticado antes de guardar los datos técnicos.
- El estado `resolved` de los reportes queda bajo control del administrador. El flujo ciudadano de avisos de resolución con foto se conserva.
- Se agregan tests del emulador para lectura de IP, escritura de presencia y cambio de estado.
- Se incorpora una herramienta de migración de IP existentes que no imprime datos personales.

## Despliegue obligatorio en orden

1. **Antes del merge:** revisar el PR, ejecutar `node --check netlify/functions/chat-ip.mjs`, `node --check scripts/migrate-chat-ip.mjs` y `cd firestore/tests && npm install && npm test` en un entorno con Java y Firebase CLI. La CI propuesta también ejecuta estos controles. No desplegar si fallan.
2. Verificar en Netlify la variable de entorno `FIREBASE_SERVICE_ACCOUNT` y su permiso; no copiar su contenido a GitHub ni a logs. `FIREBASE_WEB_API_KEY` es opcional: se usa por defecto la clave pública Web ya incluida en el frontend.
3. Publicar primero código web y funciones en Netlify, **sin publicar todavía las reglas de Firebase**. Probar nuevo chat con sesión anónima, escritura del documento `chat_ip_private` y acceso del administrador. Si las reglas antiguas no dejan leer la colección privada, el panel conserva temporalmente el dato heredado de presencia hasta que se actualicen las reglas.
4. **Migrar** los datos IP existentes en `chat_presencia`, desde una máquina autorizada y con credenciales fuera del repositorio:
   - `node scripts/migrate-chat-ip.mjs` — simulación, sin escribir.
   - `node scripts/migrate-chat-ip.mjs --apply` — copia a colección privada y elimina los campos de la presencia.
   - Ejecutar otra vez la simulación y confirmar `con_campos_sensibles: 0`.
   - El proceso **requiere** tener `FIREBASE_SERVICE_ACCOUNT` en la variable de entorno; no pegar la clave en comandos, historial ni archivos públicos.
5. Solo entonces publicar `firestore.rules` (Firebase Console o `firebase deploy --only firestore:rules`), tras aprobación del propietario. Evitar publicar reglas antes de la migración: Firestore no oculta campos de un documento individual.
6. Pruebas reales: ingresar como vecino anónimo y administrador; confirmar lectura del chat, presencia/contador, ban y desban, IP e ISP visibles solo para administrador, imposibilidad de leer `chat_ip_private` como vecino, y proceso de resolución por foto.
7. Confirmar funcionamiento en web y en **Android (Capacitor)**. No asumir que estar en GitHub equivale a estar en Netlify, Firebase o Play Store.
8. Actualizar estados, hashes y resultado de despliegue en `CLAUDE.md`. Si hay fallos, recuperar web/función y reglas de manera coordinada.

## Riesgos y notas
- La migración de datos históricos es indispensable: **la nueva interfaz por sí sola no corrige documentos que ya contienen IP**.
- Los navegadores con scripts cacheados podrían enviar peticiones antiguas a `chat-ip`, que responderá 401; eso no impide entrar al chat. Pueden refrescar el sitio.
- Una previsualización de Netlify puede apuntar a Firebase real. No utilizar datos personales auténticos para pruebas.
- La geolocalización IP opcional se consulta por HTTPS (`ipwho.is`); revisar aviso de privacidad y retención aplicables.
- El servidor no debe confiar en IP o UID proporcionados en el cuerpo de la petición.
- **Estado actual al crear el PR: NO DESPLEGADO.** Ningún dato de producción se ha migrado ni se han cambiado reglas activas.

## Reversión
- Conservá el deploy Netlify anterior para rollback.
- Si los datos se migraron, `chat_ip_private` queda como respaldo para el admin; **no regenerar IP en presencia pública** al revertir.
- Ante una reversión, no restaurar reglas que expongan IP sin una evaluación de privacidad; mantener lectura admin privada.

## Moderación y protección adicional de huellas
- La nueva función guarda `fingerprint` solo en `chat_ip_private`; los vecinos continúan usando la huella localmente para detectar baneos.
- El admin puede consultar huellas en la colección privada; los botones de baneo crean espejos por UID, huella y apodo y al levantar un ban limpian los espejos asociados si pertenecen al mismo UID.
- La función `chat-ip` no trata la huella como identificación infalsificable. Puede cambiar por navegador y ser manipulada; nunca sustituye a los controles de Firebase.
- Antes de declarar migrada la colección, comprobar que **ningún documento** de `chat_presencia` contenga `ip`, `ciudad`, `region`, `pais`, `isp` o `fingerprint`.
- Definir y publicar una política de retención aplicable a `chat_ip_private` antes de activar producción; no purgar registros por una decisión automatizada no autorizada.
