# CHAT-GPS — ubicación precisa voluntaria, temporal y privada

**Estado:** EN REVISIÓN / NO DESPLEGADO. Rama `feat/localizador-voluntario-panel-20261018`, basada en la integración PR #7.

## Función implementada
- En `/chat` aparece **Compartir GPS** (opcional). El dispositivo no solicita ubicación al abrir la página: el usuario debe abrir la explicación, presionar **Aceptar y compartir ubicación** y aceptar el permiso del sistema/navegador.
- Se utiliza `getCurrentPosition` una única vez por aceptación; **no** `watchPosition`, no hay seguimiento continuo, historial de desplazamientos ni obtención silenciosa.
- La ubicación exacta, la precisión declarada y la fecha de caducidad se guardan en `chat_location_private/{uid}`, no en mensajes públicos ni en presencia del chat.
- La regla permite **leer su propio documento** al participante; solo el administrador puede listar la colección para ver puntos compartidos en su panel. Ningún vecino puede leer coordenadas de otro.
- El administrador ve participantes con GPS voluntario vigente y puede abrir el punto en Google Maps. **No** convierte el GPS en verificación de identidad: un dispositivo podría manipular las coordenadas que declara.
- La ubicación deja de mostrarse como activa después de 60 minutos. El participante puede eliminarla antes desde el chat. La tarea `chat-location-cleanup.mjs` se ejecuta cada hora para borrar documentos vencidos y utiliza precondición de versión para no borrar puntos renovados.
- Rechazar GPS no limita el chat. IP/ciudad estimadas por red son independientes y no equivalen a GPS exacto.

## Riesgos, privacidad y despliegue
1. El consentimiento del chat debe permanecer claro y específico; no habilitar permisos GPS automáticos ni cambiarlo por seguimiento obligatorio.
2. Informar al usuario del propósito y conservación, revisar legislación y política de privacidad argentina aplicables.
3. Ejecutar `node --test scripts/chat-location.test.mjs` y la batería Firestore Emulator (`cd firestore/tests && npm test`). Ver GitHub Actions.
4. Verificar que `FIREBASE_SERVICE_ACCOUNT` está configurada en Netlify (sin copiarla a Git) para la limpieza automática.
5. Al publicar, integrar esta rama con PR #7 y conservar sus reglas de `chat_ip_private`, estados de reportes, `campanias_publicitarias` y notificaciones.
6. Probar en web y Android: compartir/rechazar/revocar; cuenta vecina ajena no puede leer/listar puntos; admin sí; las coordenadas caducadas desaparecen; el chat funciona sin GPS.
7. No asegurar que la eliminación física ocurre exactamente al segundo 60: se bloquea la visualización al vencer y la purga programada puede ocurrir hasta aproximadamente una hora después, sujeto al funcionamiento de Netlify.
8. No se modifica producción ni se consultan ubicaciones reales durante el desarrollo.

## No incluido
- No se exige GPS a todos los participantes.
- No existe rastreo de movimiento, notificación silenciosa, captura periódica o historial de posiciones.
- No se envía GPS a autoridades ni a terceros. El admin puede abrir voluntariamente el punto en Google Maps (proveedor externo) y eso aplica su política.
