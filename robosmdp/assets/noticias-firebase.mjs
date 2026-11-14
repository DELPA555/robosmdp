// Configuración pública de Firebase, idéntica a la usada por Robos MDP.
// La autorización de lectura/escritura depende de las reglas de Firestore/Storage.
export const FB_CONFIG = {
  apiKey: 'AIzaSyCm2rB0jOpvoi_wLpxVSMk0nip1pR62mjo',
  authDomain: 'robosmdp-d1ef3.firebaseapp.com',
  projectId: 'robosmdp-d1ef3',
  storageBucket: 'robosmdp-d1ef3.firebasestorage.app',
  messagingSenderId: '329992862097',
  appId: '1:329992862097:web:be1166da8fe9380df2c230'
};

export function initNewsFirebase() {
  const fb = window.firebase;
  if (!fb) throw new Error('No se pudo cargar Firebase');
  if (!fb.apps.length) fb.initializeApp(FB_CONFIG);
  return fb;
}

export function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
}

export function publicImage(value) {
  if (!value) return '';
  try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
}

export function articleDate(value) {
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (value && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return new Date(value || 0);
}

export function newsHref(article) {
  return '/noticias/' + encodeURIComponent(article.id);
}
