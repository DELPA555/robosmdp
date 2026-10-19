# OPER-01 — tablero de indicadores por barrios y reportes

**Rama:** `feat/tablero-operativo-reportes-20261018`  
**Estado:** EN REVISIÓN, NO DESPLEGADO. Basado en la integración PR #7.

## Incluido
- Página `/admin-analitica` con inicio de sesión de Firebase desde cuenta admin existente y enlace en Panel de Gestión Maestro.
- Análisis de las cinco colecciones reales: Robos, Basura, Pozos, Vehículos abandonados y Luminarias.
- Indicadores calculados de documentos Firestore: total leído para el período, pendientes, resueltos, porcentaje de resolución, pendientes de más de 30 días, desglose por categoría, barrios y evolución mensual.
- Listado de hasta 20 reportes pendientes más antiguos entre los documentos leídos, con consulta de seguimiento por ID.
- Períodos de 30, 90, 365 días o todo lo descargado.
- Exportación CSV **agregada**, sin IP del chat, UID de usuarios ni posiciones GPS.

## Exactitud y límites
- **No es una estadística oficial policial ni municipal** y no se afirma que los reportes hayan sido verificados.
- Se consultan como máximo **1.200 documentos por categoría** usando paginación por ID para no depender de que todos los reportes tengan `timestamp`.
- Si se alcanza el límite, se muestra expresamente que puede tratarse de una **muestra**. El porcentaje de resolución se calcula sobre los documentos leídos, no sobre una totalidad desconocida.
- Si falla alguna colección, se informa el error, se evita presentarla como cero y se bloquea el CSV de resultados incompletos.
- La atribución territorial depende del campo de barrio introducido/obtenido en cada reporte; `Sin barrio informado` evita inventar zonas.
- Las ventanas de tiempo utilizan la fecha disponible de publicación o incidente; los registros sin fecha no forman parte de filtros por período, pero sí de «Todos los cargados».
- No se incluyen aún mapas geoespaciales de densidad más allá del mapa de calor que ya tiene la plataforma.

## Verificación y publicación
1. Ejecutar `node --test scripts/analytics.test.mjs`; revisar CI y la vista previa de Netlify.
2. Confirmar login admin y no presentar datos antes de autenticación; no usar credenciales reales en capturas ni pruebas automatizadas.
3. Confirmar conteos con una muestra conocida y etiquetas de truncamiento (en especial si alguna categoría supera 1.200 registros).
4. Probar filtros y CSV con nombres de barrio que contengan símbolos o caracteres inusuales.
5. Integrar con PR #7 y compatibilizar el enlace del panel con PR #8 (GPS voluntario); ambas tareas comparten `index.html` y `CLAUDE.md`.
6. Mantener las reglas Firestore de la integración (no son necesarias reglas nuevas para el tablero, que usa colecciones públicas ya disponibles).
7. No mover esta función a producción sin verificar navegación, autenticación, Android/Capacitor y la cobertura.

## Mejoras futuras posibles, no implementadas
- Reportes geográficos con polígonos de barrios oficiales y geocodificación controlada.
- Indicadores de SLA y asignación de responsables internos de seguimiento.
- Datos de clics e impresiones publicitarios medidos realmente mediante eventos explícitos.
