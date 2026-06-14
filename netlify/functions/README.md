# Notificaciones push "Mi zona" — disparo (Netlify Scheduled Function)

`notify-zone.mjs` corre cada 5 minutos en Netlify, busca reportes nuevos y envía
push vía FCM HTTP v1 a las suscripciones cuya zona contenga cada reporte nuevo.

Es **Opción B**: Firestore en plan Spark no tiene triggers (eso requiere Cloud
Functions de pago / plan Blaze), así que se hace por *polling* programado desde
Netlify. La función no usa dependencias npm (solo `crypto` y `fetch` de Node 18+),
por eso no hace falta `package.json` ni build.

## Pasos para activarlo (manual, fuera del repo)

### 1. Service Account de Firebase (credencial sensible — NUNCA al repo)
Firebase Console → ⚙ Configuración del proyecto → **Cuentas de servicio** →
**Generar nueva clave privada** → se descarga un JSON.

### 2. Variable de entorno en Netlify
Netlify → Site configuration → **Environment variables** → agregar:
- **Key:** `FIREBASE_SERVICE_ACCOUNT`
- **Value:** el contenido COMPLETO del JSON del paso 1 (pegado tal cual).

### 3. Regla de Firestore para `subscripciones_push`
En Firebase Console → Firestore → Reglas, agregá dentro de
`match /databases/{database}/documents { ... }`:

```
match /subscripciones_push/{doc} {
  allow write: if true;   // el cliente crea/borra su suscripción (token, sin datos sensibles)
}
```
(El backend lee las suscripciones con el Service Account, que ignora las reglas, así
que no hace falta `allow read` público.)

### 4. Que Netlify detecte esta carpeta como "functions"
Por defecto Netlify busca funciones en `netlify/functions` **relativo al base
directory** del sitio. Verificá en Netlify → Site configuration → Build & deploy:
- Si el **base directory** es la raíz del repo → esta carpeta ya se detecta.
- Si el base directory está seteado a `robosmdp` (la carpeta del sitio), entonces
  configurá **Functions directory** = `../netlify/functions`, o mové esta carpeta a
  `robosmdp/netlify/functions`, o agregá un `netlify.toml` con
  `[functions] directory = "netlify/functions"` y el schedule.

### 5. Verificar
- Netlify → Functions → `notify-zone`: debería aparecer como *Scheduled*.
- "Trigger" manual para una corrida de prueba.
- Logs: debería loguear `{subs, matched, sent}`.
- Prueba real: con push activado y un reporte nuevo dentro de tu zona, en ≤5 min
  llega la notificación.

## Notas
- Mensajes **DATA-only** (el service worker los muestra una vez; evita duplicados).
- `meta/push_state.lastRun` guarda la marca de la última corrida (con 1 min de
  solapamiento). Se crea sola en la primera corrida.
- Tokens FCM que el server detecte como inválidos podrían limpiarse a futuro
  (mejora pendiente; hoy solo se loguea el fallo).
