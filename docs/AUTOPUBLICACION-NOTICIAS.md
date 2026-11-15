# Robos MDP — publicación automática de noticias

## Autorización y alcance

El propietario autorizó publicar noticias **sin revisión editorial previa caso por caso** en https://robosmdp.com.ar/noticias. La inseguridad en Mar del Plata y General Pueyrredon es el tema prioritario; los gastos públicos y la actualidad son complementarios.

Esto autoriza publicaciones en el portal web, pero no publicaciones en Instagram/Facebook, mensajes a terceros ni la eliminación masiva de archivos.

## Cómo publicar

1. Leer la versión vigente en la rama main de DELPA555/robosmdp, especialmente robosmdp/assets/noticias-auto.mjs y robosmdp/assets/noticias-data.mjs.
2. Recopilar hechos de inseguridad ocurridos o conocidos en las últimas 24–48 horas. Comparar varias fuentes y no duplicar hechos por diferencia de titulares. Priorizar noticias confirmadas de robos, entraderas, motochorros, asaltos a comercios, recuperación de vehículos, allanamientos, seguridad barrial y justicia.
3. Preparar nuevas entradas originales en el array AUTOMATICAS de robosmdp/assets/noticias-auto.mjs. Conservar todas las entradas anteriores y evitar los IDs ya presentes en ARCHIVO o AUTOMATICAS. No modificar otros archivos del mapa, chat, noticias-data.mjs ni las reglas Firebase.
4. Validar sintaxis JavaScript y formato de artículos; con entorno de código ejecutar node --check y node --test scripts/test-noticias.mjs. Si algo falla, no publicar.
5. Utilizar la conexión GitHub para actualizar SOLO robosmdp/assets/noticias-auto.mjs en main con el SHA vigente del archivo y un commit identificable: noticias: nuevos casos verificados AAAA-MM-DD. Netlify tiene despliegue continuo desde main. Consultar estado del deploy y verificar enlaces cuando sea posible.
6. Informar cuántas noticias quedaron efectivamente publicadas con sus URL. Si falta permiso, conexión, fuente o verificación, informar el bloqueo y nunca dar por publicada una nota sin commit y despliegue comprobados.

## Esquema del artículo

Cada objeto agregado al array AUTOMATICAS debe contener:

- id: slug original único, minúsculas, números y guiones, de 2 a 116 caracteres.
- titulo: titular original, mínimo 20 caracteres.
- bajada: entradilla informativa, mínimo 45 caracteres.
- categoria: seguridad, recuperados, justicia, investigaciones, ciudad, comerciantes o comunidad.
- fecha: fecha de publicación en ISO 8601, con huso horario -03:00 y sin simular que un hecho antiguo ocurrió hoy.
- autor: Redacción Robos MDP.
- arte: ciudad o documentos (respaldo gráfico sin foto).
- texto: desarrollo original de al menos 250 caracteres, párrafos separados por líneas en blanco, antecedentes, contexto y atribuciones.
- fuentes: lista de objetos con nombre y url HTTPS específica al hecho; una como mínimo y corroboración adicional ante afirmaciones delicadas.
- imagen, alt_imagen, credito_imagen, fuente_imagen, licencia_imagen: opcionales; usar una foto real solamente con autorización/licencia y descripción veraz. Si no hay foto reutilizable, dejar imagen vacía.

El archivo debe seguir siendo un módulo JavaScript válido que exporte exactamente: export const AUTOMATICAS = [ ... ];

## Reglas de publicación automática responsable

- No copiar párrafos de otros medios ni atribuirse su trabajo; redactar notas originales y enlazar las fuentes.
- Distinguir hechos confirmados, denuncias, imputaciones, investigaciones y sentencias; no dar por culpable a una persona investigada.
- No revelar identidades de menores, contactos privados de víctimas ni direcciones residenciales cuya difusión aumente riesgos.
- No transformar reportes ciudadanos no corroborados en hechos confirmados. Dejar esos casos para investigación posterior.
- No alterar imágenes ajenas para aparentar autoría, ni usar imágenes generadas como si fueran fotografías del suceso. Identificar con claridad las fotos de archivo.
- Ante una actualización comprobada, corregir con aclaración o nota de rectificación. No borrar silenciosamente noticias anteriores.
- En asuntos que puedan dañar la reputación de una persona o institución, buscar evidencia sólida, atribuir las afirmaciones y ofrecer oportunidad de respuesta.

## Estado operativo

La ruta GitHub + Netlify elimina la dependencia de las reglas Firebase pendientes para publicar noticias. El código de lectura automática quedó implementado y probado localmente en 2026-11-14; la primera ejecución desatendida y el primer deploy de una nota nueva todavía deben verificarse por separado.
