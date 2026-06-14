/* Service Worker de Firebase Cloud Messaging para Robos MDP.
   Se sirve en la raíz del sitio (https://robosmdp.com.ar/firebase-messaging-sw.js)
   y maneja las notificaciones push cuando la pestaña NO está activa. */
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:"AIzaSyCm2rB0jOpvoi_wLpxVSMk0nip1pR62mjo",
  authDomain:"robosmdp-d1ef3.firebaseapp.com",
  projectId:"robosmdp-d1ef3",
  storageBucket:"robosmdp-d1ef3.firebasestorage.app",
  messagingSenderId:"329992862097",
  appId:"1:329992862097:web:be1166da8fe9380df2c230"
});

const messaging = firebase.messaging();

// El servidor envía mensajes DATA-only (sin campo notification) para que la
// notificación se muestre UNA sola vez desde acá y no la duplique el navegador.
messaging.onBackgroundMessage(payload => {
  const d = payload.data || {};
  const n = payload.notification || {};
  const title = n.title || d.title || 'Robos MDP';
  self.registration.showNotification(title, {
    body: n.body || d.body || 'Nuevo reporte cerca de tu zona',
    icon: '/assets/logo-robos.png',
    badge: '/assets/logo-robos.png',
    tag: d.reportId || undefined,
    data: { url: d.url || 'https://robosmdp.com.ar' }
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || 'https://robosmdp.com.ar';
  e.waitUntil(clients.openWindow(url));
});
