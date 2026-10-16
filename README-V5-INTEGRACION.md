# Rediseño visual Premium V5 — rama de prueba

Esta rama es una integración exclusivamente visual con la lógica actual de Robos MDP.

- Se añaden ocho hojas de estilo y los cambios visuales a Inicio, Foro y Rastreo.
- La página Chat actual de main **se conserva íntegra**, salvo la inserción del enlace a `premium-v5-chat.css`. No se reemplaza por una versión anterior del chat.
- Se conservan las funciones Netlify, en particular `netlify/functions/chat-cleanup.mjs` y `notify-zone.mjs`.
- `netlify.toml` indica publish=robosmdp y directory=netlify/functions.
- No se modificaron las imágenes ni los datos publicitarios existentes; los CSS de V5 se importan como en el paquete de prueba.

## Antes de combinar con main
1. Revisar la vista previa de Netlify de esta rama; no publicar sobre el dominio principal.
2. Verificar chat (enviar, moderación, actualización, menciones y limpieza), los cinco mapas y sus sidebars (incluyendo desplazamiento móvil).
3. Verificar reportes, filtros, autenticación, funciones, sponsors, donaciones y enlaces de pago.
4. Comprobar el despliegue de funciones programadas de Netlify y el funcionamiento de las notificaciones.
5. Sólo fusionar cuando los controles de aceptación estén completos.

**No se ha ejecutado una prueba integral de producción con Firebase y servicios reales.**
