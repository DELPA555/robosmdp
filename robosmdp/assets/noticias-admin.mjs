import { PUBLICADAS } from './noticias-data.mjs';
import { initNewsFirebase, escapeHtml as esc, publicImage, articleDate } from './noticias-firebase.mjs';

const fb = initNewsFirebase();
const auth = fb.auth(), db = fb.firestore(), storage = fb.storage();
const ADMIN_EMAIL = 'admin@robosmdp.com.ar';
const $ = id => document.getElementById(id);
const col = db.collection('noticias');
let articles = [], selected = null, submitting = false;
let email = null;
const MAX_GALLERY = 16;
const PHOTO_TYPES = ['image/jpeg','image/png','image/webp'];
let galleryDraft = [];
function slugify(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,108); }
function status(msg, ok = true, target = 'edit-status') { $(target).textContent = msg; $(target).className = 'form-status ' + (ok ? 'ok' : 'error'); }

function checkPhoto(file) {
  if (!PHOTO_TYPES.includes(file.type) || file.size > 8 * 1024 * 1024 || !file.size) {
    throw new Error('Cada foto debe ser JPEG, PNG o WebP y pesar hasta 8 MB.');
  }
}
function resetGallery() {
  galleryDraft.forEach(item => { if (item.preview?.startsWith('blob:')) URL.revokeObjectURL(item.preview); });
  galleryDraft = [];
  $('a-gallery').value = '';
  renderGallery();
}
function renderGallery() {
  $('gallery-count').textContent = galleryDraft.length
    ? `${galleryDraft.length} foto${galleryDraft.length === 1 ? '' : 's'} complementaria${galleryDraft.length === 1 ? '' : 's'} · se guardan con la noticia.`
    : 'Todavía no hay imágenes complementarias.';
  $('gallery-list').innerHTML = galleryDraft.map((item, index) => {
    const src = item.file ? item.preview : publicImage(item.url);
    return `<div class="gallery-edit-card"><img src="${esc(src)}" alt="Vista previa de foto complementaria ${index + 1}"><span class="gallery-tag">FOTO ${index + 1} · ${item.file ? 'NUEVA, PENDIENTE DE SUBIR' : 'GUARDADA'}</span>
      <label>DESCRIPCIÓN / TEXTO ALTERNATIVO<input data-gallery-alt="${index}" maxlength="200" value="${esc(item.alt || '')}" placeholder="Qué muestra esta foto" required></label>
      <label>AUTOR / CRÉDITO<input data-gallery-credit="${index}" maxlength="120" value="${esc(item.credito || '')}" placeholder="Autor o titular de la imagen" required></label>
      <button type="button" data-gallery-remove="${index}">QUITAR DE LA NOTICIA</button></div>`;
  }).join('');
}
function loadGallery(article) {
  resetGallery();
  galleryDraft = (Array.isArray(article.galeria) ? article.galeria : [])
    .filter(item => item && typeof item === 'object' && publicImage(item.url))
    .slice(0, MAX_GALLERY)
    .map(item => ({url:publicImage(item.url),alt:String(item.alt || ''),credito:String(item.credito || '')}));
  renderGallery();
}
$('a-gallery').addEventListener('change', ev => {
  const files = [...ev.target.files];
  ev.target.value = '';
  if (submitting || !files.length) return;
  if (galleryDraft.length + files.length > MAX_GALLERY) return status(`Podés tener hasta ${MAX_GALLERY} fotos complementarias por noticia.`, false);
  try { files.forEach(checkPhoto); }
  catch (error) { return status(error.message, false); }
  files.forEach(file => galleryDraft.push({file,preview:URL.createObjectURL(file),alt:'',credito:''}));
  renderGallery();
  status('Fotos preparadas. Completá sus descripciones y créditos y guardá la noticia para subirlas.');
});
$('gallery-list').addEventListener('input', ev => {
  if (submitting) return;
  if ('galleryAlt' in ev.target.dataset) galleryDraft[Number(ev.target.dataset.galleryAlt)].alt = ev.target.value;
  if ('galleryCredit' in ev.target.dataset) galleryDraft[Number(ev.target.dataset.galleryCredit)].credito = ev.target.value;
});
$('gallery-list').addEventListener('click', ev => {
  const button = ev.target.closest('[data-gallery-remove]');
  if (!button || submitting) return;
  const index = Number(button.dataset.galleryRemove);
  if (!Number.isInteger(index) || index < 0 || index >= galleryDraft.length) return;
  const [removed] = galleryDraft.splice(index, 1);
  if (removed.preview?.startsWith('blob:')) URL.revokeObjectURL(removed.preview);
  renderGallery();
  status('Foto quitada de la nota. Guardá la noticia para confirmar el cambio.');
});
async function uploadPhoto(file, id) {
  checkPhoto(file);
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g,'-').slice(-75);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2,10)}-${safeName}`;
  const ref = storage.ref(`noticias/${id}/${filename}`);
  try {
    await ref.put(file, {contentType:file.type});
    return await ref.getDownloadURL();
  } catch (error) {
    if (error.code === 'storage/unauthorized' || error.code === 'storage/unauthenticated') {
      throw new Error('Firebase Storage rechazó una imagen por permisos. La noticia NO se guardó. Revisá las reglas del bucket robosmdp-d1ef3.firebasestorage.app y tu cuenta administradora.');
    }
    throw error;
  }
}

$('login-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  status('Validando credenciales…', true, 'login-status');
  try { await auth.signInWithEmailAndPassword($('login-email').value.trim(),$('login-pass').value); }
  catch (error) { status('No se pudo ingresar. Revisá tus credenciales.', false, 'login-status'); console.error(error.code); }
});
$('reset-password').addEventListener('click', async () => {
  const email = $('login-email').value.trim() || ADMIN_EMAIL;
  if (!/^\S+@\S+\.\S+$/.test(email)) return status('Ingresá un correo válido para recuperar la contraseña.',false,'login-status');
  try {
    await auth.sendPasswordResetEmail(email);
    status('Si el correo está registrado, recibirás las instrucciones para restablecer tu contraseña.',true,'login-status');
  } catch (error) {
    status('No se pudo solicitar la recuperación. Revisá el email o intentá nuevamente.',false,'login-status');
  }
});
$('logout').addEventListener('click', () => auth.signOut());
auth.onAuthStateChanged(async user => {
  let authorized = false;
  if (user) {
    try { const claims = (await user.getIdTokenResult()).claims; authorized = user.email === ADMIN_EMAIL || claims.admin === true; }
    catch (error) { console.warn('Auth',error.code); }
  }
  email = authorized ? user.email : null;
  $('editor-main').hidden = !authorized;
  $('login-area').hidden = authorized;
  if (!authorized) { status(user ? 'Esta cuenta no tiene permisos editoriales.' : '', false, 'login-status'); return; }
  await Promise.all([loadArticles(),loadTips()]);
});

async function loadArticles() {
  try {
    const snap = await col.limit(150).get();
    const editable = snap.docs.map(d => ({id:d.id,...d.data()}));
    const overrides = new Map(editable.map(a => [a.id,a]));
    articles = [...PUBLICADAS.map(a => ({...a,estado:'publicado',...overrides.get(a.id)})), ...editable.filter(a => !PUBLICADAS.some(p => p.id === a.id))].sort((a,b) => articleDate(b.actualizado || b.fecha) - articleDate(a.actualizado || a.fecha));
    $('edit-count').textContent = '('+articles.length+')';
    $('editor-list').innerHTML = articles.length ? articles.map(a => `<div class="editor-item" data-id="${esc(a.id)}"><span class="badge">${esc(a.estado)}</span><b>${esc(a.titulo)}</b><small>${esc(a.categoria)} · ${articleDate(a.fecha).toLocaleDateString('es-AR')}</small></div>`).join('') : '<p class="editor-hint">Todavía no hay publicaciones.</p>';
  } catch (error) { $('editor-list').textContent = 'No se pudo consultar Firestore (' + (error.code || 'error desconocido') + '). Revisá las reglas de Firestore publicadas y los permisos de tu cuenta. Las noticias del sitio no se borraron.'; console.error('Firestore noticias:',error); }
}
$('editor-list').addEventListener('click', ev => { const el = ev.target.closest('[data-id]'); if (el) selectArticle(el.dataset.id); });
$('a-title').addEventListener('input', () => { if (!selected) $('a-slug').value = slugify($('a-title').value); });
$('new-article').addEventListener('click', clearArticle);
$('clear-article').addEventListener('click', clearArticle);
function clearArticle() {
  selected = null;
  $('news-edit-form').reset();
  resetGallery();
  $('a-status').value = 'borrador';
  $('a-author').value = 'Redacción Robos MDP';
  $('a-slug').disabled = false;
  $('editor-heading').textContent = 'Nueva noticia';
  $('view-article').hidden = true;
  $('current-photo').textContent = 'Se utiliza una ilustración editorial si no se carga fotografía.';
  status('');
  window.scrollTo({top:0,behavior:'smooth'});
}
function selectArticle(id) {
  const a = articles.find(x => x.id === id);
  if (!a) return;
  selected = id;
  $('editor-heading').textContent = 'Editar publicación';
  $('a-title').value = a.titulo || '';
  $('a-slug').value = id; $('a-slug').disabled = true;
  $('a-category').value = a.categoria || 'ciudad';
  $('a-summary').value = a.bajada || '';
  $('a-body').value = a.texto || '';
  $('a-sources').value = (a.fuentes || []).map(s=>s.url).filter(Boolean).join('\n');
  $('a-author').value = a.autor || 'Redacción Robos MDP';
  $('a-status').value = a.estado || 'borrador';
  $('a-alt').value = a.alt_imagen || '';
  $('a-credit').value = a.credito_imagen || '';
  $('a-photo').value = '';
  loadGallery(a);
  $('current-photo').textContent = a.imagen ? 'Foto cargada. Elegí otra para reemplazarla.' : 'Sin foto cargada; se utiliza ilustración editorial.';
  $('view-article').href = '/noticias/' + encodeURIComponent(id);
  $('view-article').hidden = a.estado !== 'publicado';
  status('');
  window.scrollTo({top:0,behavior:'smooth'});
}

function linksFrom(text) {
  return text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,12).map(url=>{
    const link = publicImage(url);
    if (!link) throw new Error('Las fuentes deben ser enlaces HTTPS válidos.');
    return {nombre: (() => { try { return new URL(url).hostname; } catch { return 'Documento'; } })(),url:link};
  });
}
$('news-edit-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  if (submitting || !email) return;
  const id = selected || slugify($('a-slug').value);
  if (!id || !/^[a-z0-9][a-z0-9-]{1,115}$/.test(id)) return status('La dirección de la noticia no es válida.',false);
  const title=$('a-title').value.trim(), summary=$('a-summary').value.trim(), body=$('a-body').value.trim();
  if (title.length < 12 || summary.length < 25 || body.length < 100) return status('Completá título, bajada y desarrollo de al menos 100 caracteres.',false);
  if (!selected && articles.some(x=>x.id===id)) return status('Esa dirección ya está usada. Cambiala.',false);
  let sources;
  try { sources = linksFrom($('a-sources').value); } catch (e) {return status(e.message,false);}
  if (galleryDraft.some(item => !item.alt.trim() || !item.credito.trim())) {
    return status('Completá la descripción y el crédito de cada foto complementaria antes de guardar.', false);
  }
  submitting=true; $('save-article').disabled=true;
  try {
    const old=articles.find(x=>x.id===id);
    const file=$('a-photo').files[0];
    let image=old?.imagen || '';
    if (file) {
      status('Subiendo imagen de portada…');
      image = await uploadPhoto(file, id);
    }
    for (let i = 0; i < galleryDraft.length; i++) {
      const item = galleryDraft[i];
      if (!item.file) continue;
      status(`Subiendo foto complementaria ${i + 1} de ${galleryDraft.length}…`);
      const url = await uploadPhoto(item.file, id);
      if (item.preview?.startsWith('blob:')) URL.revokeObjectURL(item.preview);
      item.url = url;
      item.preview = url;
      delete item.file;
    }
    const now=new Date().toISOString();
    const data={
      titulo:title,bajada:summary,texto:body,categoria:$('a-category').value,
      autor:$('a-author').value.trim() || 'Redacción Robos MDP',
      estado:$('a-status').value,
      fuentes:sources,imagen:image,
      galeria:galleryDraft.map(item => ({url:item.url,alt:item.alt.trim(),credito:item.credito.trim()})),
      alt_imagen:$('a-alt').value.trim(),credito_imagen:$('a-credit').value.trim(),
      fecha:old?.fecha || now,actualizado:now
    };
    status('Guardando noticia…');
    await col.doc(id).set(data,{merge:true});
    selected=id; await loadArticles(); selectArticle(id);
    status(data.estado === 'publicado' ? 'Noticia publicada. Ya podés compartir su enlace.' : 'Guardado en '+data.estado+'. Solo la redacción puede verlo.');
  } catch (error) { status('No se pudo guardar: '+(error.message || 'Verificá permisos de Firebase.'),false); }
  finally { submitting=false;$('save-article').disabled=false; }
});

async function loadTips() {
  try {
    const snap = await db.collection('noticias_envios').limit(100).get();
    const tips=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>articleDate(b.fecha)-articleDate(a.fecha));
    $('tips-count').textContent = '('+tips.filter(t=>t.estado==='pendiente').length+' pendientes)';
    $('tips-list').innerHTML=tips.length ? tips.map(t=>`<div class="tip-card"><small>${esc(t.zona || 'Mar del Plata')} · ${esc(t.categoria)} · ${esc(t.estado)}</small><strong>${esc(t.nombre || 'Vecino/a')} · ${esc(t.contacto || 'Sin contacto')}</strong><p>${esc(t.mensaje)}</p>${t.fuente_url ? '<p>Material aportado: '+esc(t.fuente_url)+'</p>' : ''}<button type="button" data-tip="${esc(t.id)}">MARCAR REVISADO</button></div>`).join('') : '<p class="editor-hint">Todavía no recibimos colaboraciones.</p>';
    $('tips-list').querySelectorAll('[data-tip]').forEach(button => button.addEventListener('click', async () => {
      try { await db.collection('noticias_envios').doc(button.dataset.tip).update({estado:'revisado'}); await loadTips(); }
      catch (error) { alert('No se pudo actualizar el mensaje.'); }
    }));
  } catch (error) { $('tips-list').textContent='No se pudieron cargar los mensajes ('+(error.code || 'error desconocido')+'). Revisá las reglas de Firestore publicadas y los permisos de administrador.'; console.error('Firestore noticias_envios:',error); }
}
