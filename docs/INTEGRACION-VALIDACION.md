# ROBOS MDP — Integración conjunta y plan de publicación

**Rama:** `integration/mejoras-robosmdp-20261018`  
**Estado:** EN REVISIÓN, **NO DESPLEGADO**.  
**Objetivo:** probar juntos los cambios de PR #3 (seguridad), #4 (seguimiento), #5 (push) y #6 (sponsors).

## Incluido
- Chat: IP/ISP/ubicación aproximada y huella de navegador conservadas para administración autorizada en `chat_ip_private`; lectura pública limitada a presencia sin esos campos; endpoint `chat-ip` con ID token de Firebase.
- Ban y desban: protección por UID y capas adicionales de apodo/huella con revisión administrativa y levantamiento de espejos cuando correspondan.
- Reportes: comprobante con ID real, pantalla `/seguimiento`, historial, estados administrados por Robos MDP. Los estados internos **no** implican actuación formal de la Municipalidad ni denuncia policial.
- Alertas: baja validada en Netlify, reintentos y deduplicación de FCM por hash de token/reporte, sin registrar tokens en el historial de entregas. Los vecinos pueden elegir categorías (robos, basura, pozos, vehículos abandonados y luminarias); las suscripciones antiguas conservan las primeras tres. En Android se registran los listeners antes de pedir el token FCM.
- Campañas: página `/admin-sponsors`, datos privados, cobros declarados, vencimientos, CSV y prueba de permiso Firebase.
- Monitor web horario de Inicio, Foro, Chat y Rastreo (se ejecuta únicamente cuando esté en `main`).
- No se implementó rastreo GPS obligatorio o silencioso. El mapa admin de IP señala **zonas aproximadas**; ninguna IP identifica por sí sola un domicilio.

## Pruebas necesarias antes de aprobar la integración
1. GitHub Actions: sintaxis de JS, pruebas unitarias, pruebas de reglas Firebase en emulador. Ver `.github/workflows/integration-checks.yml`.
2. Netlify Deploy Preview: abrir portada, mapa, chat y vistas nuevas. Verificar rutas con y sin barra.
3. Cuenta anónima: enviar chat y reportes; no puede leer `chat_ip_private`, `campanias_publicitarias`, ni alterar estados administrativos.
4. Cuenta admin: moderar chat, ver IP/ISP, banear/desbanear, editar reportes e importar/exportar campañas.
5. Android Capacitor: experiencia móvil, notificaciones, alta y baja de alertas, registro de token, selección de categorías y navegación.
6. Revisar políticas de privacidad, conservación y acceso a los datos de conexión/IP/huella y notificación de proveedores externos.

## Orden obligatorio de publicación — sin saltos
1. **Backup y validación:** guardar versión desplegada y plan de rollback. Confirmar `FIREBASE_SERVICE_ACCOUNT` sin mostrar su contenido.
2. **Vista previa** sobre entornos de prueba cuando sea posible; evitar escribir en Firestore de producción desde previews.
3. **Código web y funciones de Netlify primero**, de modo que el chat deje de escribir IP/huellas a la presencia pública y registre nuevos datos en la colección privada. No publicar aún las reglas Firebase.
4. **Migrar los datos antiguos** con `scripts/migrate-chat-ip.mjs` en modo simulación y luego `--apply`, usando credencial de servicio en entorno autorizado, sin imprimir IP. Comprobar **0 documentos** de `chat_presencia` con `ip`, `ciudad`, `region`, `pais`, `isp` o `fingerprint` antes de publicar reglas.
5. Publicar las **reglas completas de esta rama**, incluyendo chats, estados de reportes y colección privada de sponsors, después de probar en el emulador y contar con aprobación de producción.
6. Verificar la ejecución diaria de `netlify/functions/push-delivery-cleanup.mjs`: purga los documentos de `push_delivery_log` cuyo `expiresAt` venció, sin tocar tokens ni suscripciones. Puede agregarse una política TTL de Firestore como respaldo opcional. Confirmar las pruebas antes de publicar.
7. Prueba de humo real con dos cuentas de ensayo (vecino/admin), Android y navegador; revisar errores Netlify y permisos Firestore. Actualizar `CLAUDE.md` al verificar **DESPLEGADO**.
8. Si falla algo, coordinar rollback de Netlify y Firebase; **no** restaurar reglas que vuelvan a publicar IP y huellas sin validar la privacidad. No eliminar registros históricos comerciales automáticamente.

## Límites actuales
- El mapa de calor ya existía antes de estas mejoras: no se duplicó.
- No se implementaron mediciones reales de clics o impresiones publicitarias; el panel comercial refleja exclusivamente importes ingresados.
- Los estados de reportes no generan constancias ni comunicaciones automáticas a organismos oficiales.
- La app Android carga el sitio remoto: verificar los efectos en WebView antes de atribuirlos a una actualización de Play Store.
- La fusión a `main` por sí sola no despliega reglas Firebase; debe controlarse cada plataforma por separado.

**No ejecutar esta publicación de forma automática a partir de una revisión de código.**

## Limpieza automática de entregas
La rama integra `netlify/functions/push-delivery-cleanup.mjs` (cron diario 05:15 UTC, 02:15 de Argentina). Elimina por lotes únicamente marcadores de notificaciones vencidos; el ciclo de vida de las suscripciones reales es independiente. Su funcionamiento se prueba con `scripts/push-delivery-cleanup.test.mjs` y también depende de `FIREBASE_SERVICE_ACCOUNT` en Netlify.
