/* Archivo documental verificado, conservado con su fecha original.
   Los futuros artículos nuevos se almacenan en la colección Firestore 'noticias'. */
export const CATEGORIAS = [
  ['todas', 'Todas'], ['seguridad', 'Seguridad'], ['investigaciones', 'Gastos bajo la lupa'],
  ['ciudad', 'Mar del Plata'], ['comerciantes', 'Comerciantes'],
  ['justicia', 'Justicia'], ['comunidad', 'Comunidad'], ['recuperados', 'Recuperados']
];

export const ARCHIVO = [
  {
    id: 'festival-cine-2026-alojamiento-411-millones',
    titulo: 'Festival de Cine: una contratación de $411,5 millones para alojamiento y salones',
    bajada: 'Una resolución del EMTURyC registra mil noches de hotel y diez jornadas de salón. Una observación de Contaduría exige respuestas documentadas.',
    categoria: 'investigaciones', fecha: '2026-11-13T10:00:00-03:00',
    autor: 'Investigación Robos MDP', arte: 'cine', destacada: true,
    imagen: '/assets/noticias/teatro-auditorium.webp',
    alt_imagen: 'Acceso al Teatro Auditorium de Mar del Plata, fotografía de archivo de 2009',
    credito_imagen: 'Foto de archivo (2009): Teatro Auditorium. DagosNavy / Wikimedia Commons · CC BY-SA 3.0. Versión optimizada. No muestra el alojamiento contratado.',
    fuente_imagen: 'https://commons.wikimedia.org/wiki/File:Auditorium-MDQ.jpg',
    licencia_imagen: 'https://creativecommons.org/licenses/by-sa/3.0/',
    texto: `La Resolución 527/2026 del Ente Municipal de Turismo y Cultura (EMTURyC), publicada en el Boletín Oficial el 12 de noviembre de 2026, registra una contratación vinculada al 41° Festival Internacional de Cine de Mar del Plata por $411.550.000.

A Hermitage S.A. se le adjudicaron 950 noches de habitaciones superiores, a $329.000 cada una, por un total de $312.550.000; y otras 50 noches de suites, a $420.000 cada una, por $21.000.000. El alojamiento suma $333.550.000.

Por otra parte, Hotelera del Mar S.A. figura en la contratación de un salón durante diez jornadas, a razón de $7.800.000 por día, por un total de $78.000.000.

El acto administrativo menciona una observación de Contaduría bajo el artículo 186 de la Ley Orgánica de las Municipalidades, junto con una convalidación ad referéndum del Concejo Deliberante y cuestiones relativas a convenios y adendas.

Una observación administrativa no constituye, por sí misma, prueba de delito. Sí amerita examinar el expediente completo y conocer quiénes utilizaron las mil noches previstas, cuántas se ejecutaron, qué se facturó y qué se abonó finalmente.

Robos MDP seguirá este caso y solicitará la documentación que permita distinguir los importes adjudicados de los pagos y las prestaciones efectivamente cumplidas.`,
    fuentes: [{ nombre: 'Resolución EMTURyC 527/2026 · Boletín Oficial municipal', url: 'https://sibom.slyt.gba.gob.ar/bulletins/16124/contents/2472060/download_annex?annex_id=70888' }]
  },
  {
    id: 'residuos-6874-millones-octubre-2026',
    titulo: 'Residuos: cinco facturas por $6.874 millones correspondientes a octubre',
    bajada: 'Los actos del EMSUR detallan importes reconocidos a Transportes 9 de Julio. Cómo se comprueba el servicio facturado?',
    categoria: 'investigaciones', fecha: '2026-11-13T09:00:00-03:00',
    autor: 'Redacción Robos MDP', arte: 'ciudad',
    imagen: '/assets/noticias/playa-varese-2025.webp',
    alt_imagen: 'Vista de Playa Varese de Mar del Plata en enero de 2025',
    credito_imagen: 'Foto de archivo (2025): Playa Varese. Ezarate / Wikimedia Commons · CC BY-SA 4.0. Versión optimizada; no muestra tareas de recolección.',
    fuente_imagen: 'https://commons.wikimedia.org/wiki/File:PlayaVarese-ene2025-MDP.jpg',
    licencia_imagen: 'https://creativecommons.org/licenses/by-sa/4.0/',
    texto: `Resoluciones del Ente Municipal de Servicios Urbanos (EMSUR), difundidas en el Boletín Oficial de General Pueyrredon el 12 de noviembre de 2026, dan cuenta de cinco facturas por servicios prestados en octubre por Transportes 9 de Julio S.A.

El monto conjunto es de $6.874.284.190,13. Según el desglose oficial, se reconocen $3.374.063.346,99 por recolección domiciliaria; $834.765.716,83 por residuos voluminosos y restos verdes; $741.715.545,71 por tareas en playas, costa, cementerio y contenedores; $1.562.995.018,80 por barrido manual; y $360.744.561,80 por barrido mecánico.

La resolución incluye descuentos por servicios no ejecutados, por $887.464,14, y una retención preventiva por $10.281.156,48. Es importante cotejar estas cifras con recorridos, controles y certificaciones.

El reconocimiento de una factura no demuestra por sí solo sobreprecio. La investigación deberá establecer si los trabajos se hicieron, cómo se actualizan los valores y qué control público existe sobre cada prestación.

Mientras numerosos vecinos reportan problemas de limpieza, la publicación de recorridos y auditorías ayudaría a comparar el gasto con el servicio recibido.`,
    fuentes: [{ nombre: 'Resoluciones EMSUR · Boletín Oficial municipal', url: 'https://sibom.slyt.gba.gob.ar/bulletins/16124/contents/2471688/download_annex?annex_id=70871' }]
  },
  {
    id: 'emturyc-pauta-publicitaria-1551-millones',
    titulo: 'Pauta oficial: siete adjudicaciones superan los $1.551 millones',
    bajada: 'Un análisis de actos administrativos de junio de 2026 reconstruye las adjudicaciones de publicidad turística y plantea preguntas sobre su impacto.',
    categoria: 'investigaciones', fecha: '2026-11-10T10:00:00-03:00',
    autor: 'Investigación Robos MDP', arte: 'documentos',
    imagen: '/assets/noticias/playa-bristol-2025.webp',
    alt_imagen: 'Playa Bristol y costa de Mar del Plata en enero de 2025',
    credito_imagen: 'Foto de archivo (2025): Playa Bristol. Ezarate / Wikimedia Commons · CC BY-SA 4.0. Versión optimizada; no muestra la ejecución de la pauta.',
    fuente_imagen: 'https://commons.wikimedia.org/wiki/File:PlayaBristol-MDP-ene2025.jpg',
    licencia_imagen: 'https://creativecommons.org/licenses/by-sa/4.0/',
    texto: `Robos MDP revisó siete resoluciones del EMTURyC correspondientes a junio de 2026 que suman $1.551.237.550,85 en adjudicaciones publicitarias. Los actos administrativos pueden consultarse en el Sistema de Boletines Oficiales Municipales (SIBOM).

Entre los destinatarios de esas adjudicaciones figura el medio local 0223, con un monto de $88.999.992. Los importes reflejan decisiones de contratación y no deben confundirse automáticamente con pagos efectivamente realizados.

Para verificar cuánto dinero salió realmente de las cuentas públicas es necesario obtener facturas, certificaciones, órdenes de pago y registros de ejecución presupuestaria.

Las resoluciones analizadas incluyen observaciones de Contaduría. Corresponde conocer qué motivó cada advertencia, cómo fue tratada y qué controles se efectuaron.

El tema merece una discusión abierta sobre prioridades: los comerciantes aportan mediante tasas y tributos, mientras persisten reclamos por el estado de calles, luminarias e infraestructura. Qué resultados concretos produjo la promoción turística contratada?

Esta investigación solicita transparencia, pero no afirma que las adjudicaciones fueran pagadas íntegramente ni considera probados delitos.`,
    fuentes: [{ nombre: 'Sistema de Boletines Oficiales Municipales · SIBOM', url: 'https://sibom.slyt.gba.gob.ar/' }]
  },
  {
    id: 'camping-municipal-concesion-inversion-privada',
    titulo: 'Camping municipal: una concesión con inversión privada anunciada de $2.324 millones',
    bajada: 'El EMTURyC adjudicó la concesión a Bien Producido S.A. El canon y la inversión comprometida son conceptos distintos.',
    categoria: 'ciudad', fecha: '2026-11-12T14:00:00-03:00',
    autor: 'Redacción Robos MDP', arte: 'ciudad',
    imagen: '/assets/noticias/playa-bristol-vista-2025.webp',
    alt_imagen: 'Vista de Playa Bristol en Mar del Plata, fotografía de archivo de enero de 2025',
    credito_imagen: 'Foto de archivo (2025): Mar del Plata. Ezarate / Wikimedia Commons · CC BY-SA 4.0. Versión optimizada; no muestra el camping concesionado.',
    fuente_imagen: 'https://commons.wikimedia.org/wiki/File:PlayaBristol1-MDP-ene2025.jpg',
    licencia_imagen: 'https://creativecommons.org/licenses/by-sa/4.0/',
    texto: `La Resolución 526/2026 del EMTURyC registra la adjudicación de una concesión del camping municipal a Bien Producido S.A.

El expediente consigna un canon anual de $22.000.000 que debe ingresar al municipio y un compromiso de inversión en infraestructura de $2.324.091.000 por parte de la concesionaria. Esa inversión privada anunciada no es un gasto de la Municipalidad.

En la evaluación de propuestas, Bien Producido S.A. obtuvo 84 puntos y Nieuw S.A. 65. Existen antecedentes de una iniciativa privada previa cuya documentación puede ser examinada.

El seguimiento periodístico deberá verificar el cumplimiento de las obras, las garantías comprometidas y la efectiva percepción del canon.`,
    fuentes: [{ nombre: 'Resolución EMTURyC 526/2026 · Boletín Oficial', url: 'https://sibom.slyt.gba.gob.ar/bulletins/16124/contents/2472060/download_annex?annex_id=70888' }]
  },
  {
    id: 'licitacion-insumos-laboratorio-1568-millones',
    titulo: 'Nueva licitación de insumos de laboratorio con presupuesto de $1.568 millones',
    bajada: 'La apertura se prevé para el 25 de noviembre. Es un presupuesto oficial, no una adjudicación ni un pago.',
    categoria: 'ciudad', fecha: '2026-11-12T11:00:00-03:00',
    autor: 'Redacción Robos MDP', arte: 'documentos',
    imagen: '/assets/noticias/plaza-san-martin-2016.webp',
    alt_imagen: 'Plaza San Martín de Mar del Plata, fotografía de archivo de 2016',
    credito_imagen: 'Foto de archivo (2016): Plaza San Martín. Nicocuervo95 / Wikimedia Commons · CC BY-SA 4.0. Versión optimizada; no muestra los insumos licitados.',
    fuente_imagen: 'https://commons.wikimedia.org/wiki/File:Plaza_San_Martin_Mar_del_Plata.jpg',
    licencia_imagen: 'https://creativecommons.org/licenses/by-sa/4.0/',
    texto: `El municipio publicó un segundo llamado a licitación para reactivos e insumos de laboratorio, con un presupuesto oficial de $1.568.256.200 y apertura prevista para el 25 de noviembre de 2026.

El primer llamado había recibido dos ofertas que no superaron las exigencias técnicas del proceso, según el antecedente oficial.

Un presupuesto de licitación no equivale a una contratación ni a un gasto efectivamente ejecutado. La investigación deberá seguir las ofertas que se presenten, sus evaluaciones técnicas y la decisión administrativa final.`,
    fuentes: [{ nombre: 'Licitación publicada en el Boletín Oficial municipal', url: 'https://sibom.slyt.gba.gob.ar/bulletins/16124/contents/2471690/download_annex?annex_id=70873' }]
  }
];
