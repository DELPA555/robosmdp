# Robos MDP Noticias — integración con la web existente

Fecha: 2026-11-14. Estado: EN REVISIÓN; no desplegado en producción.

## Alcance

Se incorpora un diario digital dentro del repositorio y dominio actuales.
No se reemplazan index.html, el mapa, chat, foro, colectas, rastreo ni la app Android.

- /noticias: portada editorial, filtros y búsqueda.
- Portada de diario actualizada: cabecera compacta, sumario al día, titular principal, noticias secundarias, cronología de últimas noticias, reportajes de gasto público y secciones de seguridad y ciudad. La jerarquía toma patrones generales de portales de noticias consolidados, con diseño y marca propios.
- /noticias/:slug: nota completa mediante función Netlify news-story.mjs y su ruta nativa `config.path`, con metadatos, autor, fecha y NewsArticle.
- /admin-noticias: panel de redacción protegido con Firebase Auth y el criterio admin existente.
- /enviar-noticia: colaboración vecinal con bandeja privada.
- Nuevas colecciones Firestore: noticias y noticias_envios.
- Nuevo directorio Firebase Storage: noticias/{slug}/{archivo}.
- Cinco notas documentales iniciales en assets/noticias-data.mjs, conservadas con sus fechas y fuentes.
- Cinco fotografías auténticas de Mar del Plata tomadas de Wikimedia Commons, con autor, enlace al original, licencia CC BY-SA y contexto de archivo en cada artículo. No se presentan como fotos de los contratos investigados ni de hechos recientes.
- Banners comerciales identificados en portada (se reutilizan creatividades y enlaces actualmente presentes en el sitio) y en artículos, con rótulo PUBLICIDAD, separación editorial y enlace de contratación.
- /contratar: página comercial con formatos de banners, campañas y servicios, formulario que compone una consulta por WhatsApp al número ya publicado en el sitio. No presupone un pago ni una reserva sin confirmación.
- /admin-noticias: se ingresa por Firebase Auth con una cuenta autorizada; el correo configurado en código es admin@robosmdp.com.ar o una cuenta con claim admin. La contraseña no se crea ni se almacena en el repositorio, y debe ser la vigente de Firebase Auth. No se despliegan reglas sin pruebas.

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

- node --test scripts/test-noticias.mjs: siete pruebas aprobadas; incluyen control de procedencia y licencias de fotografías y presencia comercial identificada.
- node --check de los módulos JavaScript y la función Netlify: aprobado.
- Autenticación Firebase/Firestore/Storage reales, Deploy Preview y Android: pendientes.
