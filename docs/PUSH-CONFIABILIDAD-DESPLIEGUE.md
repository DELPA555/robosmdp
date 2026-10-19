# Corrección de alertas push — implementación 2026-10-18

## Problema encontrado en código real

- La web llamaba a `delete()` de `subscripciones_push` sin permiso Firestore (`allow delete: if isAdmin()`), por lo que podía aparentar una cancelación mientras las alertas seguían activas.
- El trabajo programado usa un margen de 1 minuto respecto de `meta/push_state.lastRun`, que permite repetir notificaciones del mismo reporte entre ejecuciones; las consultas capturaban errores y el checkpoint avanzaba incluso si una consulta fallaba.
- Los errores de FCM imprimían el cuerpo sin filtrar y podían impedir el análisis adecuado de incidencias.

## Solución en PR separado

- `push-unsubscribe.mjs`: Netlify Function que exige conocer el ID aleatorio de suscripción **y** su token FCM. Verifica ambos por el servidor con Service Account, usa comparación constante, precondición de versión Firestore y borra la suscripción, sin exponer tokens ni permitir bajas por ID solamente.
- `robosmdp/index.html`: conserva el token en el navegador para revocar. Las suscripciones antiguas web pueden recuperar el token vía Firebase Messaging; para Android se intenta registrar nuevamente el token. Si no se puede completar la baja en el servidor, el control vuelve a activado y avisa el error: **nunca finge un éxito**.
- `notify-zone.mjs`: registro atómico por hash de token + categoría + reporte, evitando duplicados entre ventanas/reintentos. En caso de error, libera la reserva para reintento y no adelanta `lastRun`. No se registran tokens ni respuestas crudas de FCM.
- `scripts/push-notifications.test.mjs`: pruebas con Firebase REST y FCM simulados, sin credenciales reales, con flujos positivos y fallos.

## Validación y despliegue

1. Ejecutar `node --test scripts/push-notifications.test.mjs` y comprobar Actions.
2. Usar Deploy Preview Netlify sin migrar datos.
3. Verificar que `FIREBASE_SERVICE_ACCOUNT` exista en Netlify. No está ni debe estar en GitHub.
4. Probar web y Android: activar, cambiar de zona, recibir reporte, desactivar, confirmar que `subscripciones_push` no conserva el documento y no llegan avisos.
5. En caso de suscripción heredada cuyo token no pueda recuperarse, **no borrar información ni simular una baja exitosa**; resolver caso desde admin identificando el registro.
6. Para eliminar automáticamente registros históricos de `push_delivery_log`, configurar política Firestore TTL sobre `expiresAt` o un trabajo programado de mantenimiento. El código incorpora la fecha de caducidad, pero una marca TTL por sí sola no configura la política en Firebase.
7. La CI y despliegue web deben comprobarse independientemente de la app Android publicada.

**Estado al crear:** NO DESPLEGADO. Ni Firebase ni FCM de producción fueron consultados o modificados.
