import { initNewsFirebase, escapeHtml as esc, publicImage, articleDate } from './noticias-firebase.mjs';

const fb = initNewsFirebase();
const auth = fb.auth(), db = fb.firestore(), storage = fb.storage();
const ADMIN_EMAIL = 'admin@robosmdp.com.ar';
const $ = id => document.getElementById(id);
const col = db.collection('noticias');
let articles = [], selected = null, submitting = false;
let email = null;
function slugify(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,108); }
function status(msg, ok = true, target = 'edit-status') { $(target).textContent = msg; $(target).className = 'form-status ' + (ok ? 'ok' : 'error'); }

$('login-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  status('Validando credenciales…', true, 'login-status');
  try { await auth.signInWithEmailAndPassword($('login-email').value.trim(),$('login-pass').value); }
  catch (error) { status('No se pudo ingresar. Revisá tus credenciales.', false, 'login-status'); console.error(error.code); }
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
    articles = snap.docs.map(d => ({id:d.id,...d.data()})).sort((a,b) => articleDate(b.actualizado || b.fecha) - articleDate(a.actualizado || a.fecha));
    $('edit-count').textContent = '('+articles.length+')';
    $('editor-list').innerHTML = articles.length ? articles.map(a => `<div class="editor-item" data-id="${esc(a.id)}"><span class="badge">${esc(a.estado)}</span><b>${esc(a.titulo)}</b><small>${esc(a.categoria)} · ${articleDate(a.fecha).toLocaleDateString('es-AR')}</small></div>`).join('') : '<p class="editor-hint">Aún no hay artículos propios. Los informes del archivo inicial se muestran en la portada y no forman parte de este listado.</p>';
  } catch (error) { $('editor-list').textContent = 'Error al cargar. Revisá las reglas de Firebase.'; console.error(error); }
}
$('editor-list').addEventListener('click', ev => { const el = ev.target.closest('[data-id]'); if (el) selectArticle(el.dataset.id); });
$('a-title').addEventListener('input', () => { if (!selected) $('a-slug').value = slugify($('a-title').value); });
$('new-article').addEventListener('click', clearArticle);
$('clear-article').addEventListener('click', clearArticle);
function clearArticle() {
  selected = null;
  $('news-edit-form').reset();
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
  submitting=true; $('save-article').disabled=true;
  try {
    const old=articles.find(x=>x.id===id);
    const file=$('a-photo').files[0];
    let image=old?.imagen || '';
    if (file) {
      if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8*1024*1024) throw new Error('La foto debe ser JPEG, PNG o WebP y pesar hasta 8 MB.');
      status('Subiendo imagen…');
      const safeName=file.name.replace(/[^a-zA-Z0-9_.-]/g,'-').slice(-75);
      const ref=storage.ref('noticias/'+id+'/'+Date.now()+'-'+safeName);
      await ref.put(file,{contentType:file.type});
      image=await ref.getDownloadURL();
    }
    const now=new Date().toISOString();
    const data={
      titulo:title,bajada:summary,texto:body,categoria:$('a-category').value,
      autor:$('a-author').value.trim() || 'Redacción Robos MDP',
      estado:$('a-status').value,
      fuentes:sources,imagen:image,
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
  } catch (error) { $('tips-list').textContent='No se pudieron cargar los mensajes. Revisá las reglas de Firestore.'; console.error(error); }
}
