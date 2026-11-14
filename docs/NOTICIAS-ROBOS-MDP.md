# Robos MDP Noticias — integración con la web existente

Fecha: 2026-11-14. Estado: EN REVISIÓN; no desplegado en producción.

## Alcance

Se incorpora un diario digital dentro del repositorio y dominio actuales.
No se reemplazan index.html, el mapa, chat, foro, colectas, rastreo ni la app Android.

- /noticias: portada editorial, filtros y búsqueda.
- /noticias/:slug: nota completa mediante función Netlify news-story.mjs y su ruta nativa `config.path`, con metadatos, autor, fecha y NewsArticle.
- /admin-noticias: panel de redacción protegido con Firebase Auth y el criterio admin existente.
- /enviar-noticia: colaboración vecinal con bandeja privada.
- Nuevas colecciones Firestore: noticias y noticias_envios.
- Nuevo directorio Firebase Storage: noticias/{slug}/{archivo}.
- Cinco notas documentales iniciales en assets/noticias-data.mjs, conservadas con sus fechas y fuentes.

## Antes de lanzar

1. Revisar Deploy Preview de Netlify: portada, artículo, formulario, enlaces y mapa/chat, también desde celular. No fusionar sin pruebas.
2. Evaluar las reglas nuevas de firestore.rules y storage.rules contra las reglas publicadas. Netlify NO despliega automáticamente reglas Firebase: su publicación es separada, con autorización del propietario.
3. Probar con el administrador real creación y edición de borradores, subida de fotos y cambio a publicado, y comprobar que otro usuario no pueda leer notas privadas o colaboraciones.
4. Probar el envío anónimo. El campo oculto y la validación de longitud son controles básicos: para gran volumen conviene añadir App Check/CAPTCHA y límites de tasa en servidor.
5. Revisar la política de privacidad antes de recopilar contactos de vecinos. No mostrar nunca esos contactos en el diario.
6. Actualizar Google Search Console tras publicar. El sitemap inicial incorpora las notas documentales; el sitemap dinámico de futuras notas aún queda pendiente.

## Política editorial

Separar licitaciones, adjudicaciones y pagos; no calificar de corrupción lo no comprobado. Publicar textos originales basados en investigación y atribución de fuentes; no retocar imágenes ajenas para aparentar autoría. Las imágenes deben ser propias, autorizadas o licenciadas y los gráficos ilustrativos se identifican.

## Automatizaciones actuales

Un radar diario de noticias locales comienza el 15/11/2026 y existe además una búsqueda diaria separada de gastos públicos. Ambas investigaciones generan alertas y borradores en ChatGPT para revisión. Todavía no existe un canal de publicación automática en Firestore y NO se afirma que la web vaya a recibir artículos nuevos sin intervención.

## Verificación

- node --test scripts/test-noticias.mjs: cinco pruebas aprobadas.
- node --check de los módulos JavaScript y la función Netlify: aprobado.
- Autenticación Firebase/Firestore/Storage reales, Deploy Preview y Android: pendientes.
