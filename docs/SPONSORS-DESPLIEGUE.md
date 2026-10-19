# Panel privado de campañas — Robos MDP

Estado inicial: **EN REVISIÓN / NO DESPLEGADO**.

## Funcionalidades incluidas
- Página `/admin-sponsors` (redirigida por Netlify a `admin-sponsors.html`).
- Acceso por Firebase Auth con la cuenta administrativa existente. La interfaz también verifica usuario, pero la seguridad real está en `firestore.rules`, colección `campanias_publicitarias`: lectura/escritura solo admin.
- Alta, edición, eliminación y búsqueda de campañas, importes contratados/cobrados, notas, enlaces HTTPS, ubicaciones de banners, planes, fechas y estados.
- Cálculos automáticos de campañas vigentes, próximos 7 días, valores cargados y saldos. No registra montos falsos ni asume IVA o devengamiento.
- Descarga CSV con medidas para evitar fórmulas ejecutables en planillas.
- Enlace desde el panel administrativo principal (pestaña sponsors).

## No incluido todavía
- Seguimiento de clics e impresiones reales de campañas: no se mide ni se inventa.
- Facturación, integración con AFIP/ARCA, cobro mediante Mercado Pago o automatización de pagos.
- Publicación dinámica de banners: los anuncios públicos actuales conservan su funcionamiento y no son modificados.

## Seguridad y despliegue
1. Revisar GitHub Actions para pruebas de importes, entrada inválida y reglas Firebase por emulador.
2. Comprobar que el enlace y la autenticación se comporten en la vista previa Netlify.
3. Como las nuevas reglas de esta rama comparten el archivo `firestore.rules` con la PR #3, combinar ambos cambios **sin revertir** la separación de IP/huella, la protección de estados y las pruebas anteriores.
4. No publicar reglas a Firebase hasta comprobar emulador y autorización de producción.
5. Probar con una cuenta no administradora: lectura, listado, alta, modificación y eliminación deben estar denegados.
6. Probar con la cuenta admin y un registro de prueba sin información real, luego eliminarlo.
7. No presentar campañas guardadas como cifras reales de visualizaciones o conversiones.

## Reversión
- Revertir deploy de Netlify si la interfaz falla; preservar datos existentes.
- Mantener la regla exclusiva de lectura admin de `campanias_publicitarias`, incluso si se retira temporalmente la página.
- No borrar documentos comerciales sin decisión expresa del propietario.
