import { initNewsFirebase } from './noticias-firebase.mjs';

const fb=initNewsFirebase();
const $=id=>document.getElementById(id);
const form=$('tip-form');
let busy=false;
form.addEventListener('submit', async ev => {
  ev.preventDefault();
  if(busy) return;
  const status=$('tip-status');
  const display=(txt,ok)=>{status.textContent=txt;status.className='form-status '+(ok?'ok':'error');};
  if($('t-website').value.trim()) return display('No se pudo completar el envío.',false);
  const body=$('t-body').value.trim();
  const source=$('t-source').value.trim();
  if(body.length<30||body.length>3000) return display('Contanos al menos 30 caracteres y un máximo de 3.000.',false);
  if(source) { try {const u=new URL(source);if(!['https:','http:'].includes(u.protocol))throw 0;}catch{return display('Ingresá un enlace válido.',false);} }
  busy=true;$('tip-submit').disabled=true;display('Enviando información…',true);
  try {
    if(!fb.auth().currentUser) await fb.auth().signInAnonymously();
    const user=fb.auth().currentUser;
    await fb.firestore().collection('noticias_envios').add({
      nombre:$('t-name').value.trim(),contacto:$('t-contact').value.trim(),
      zona:$('t-area').value.trim(),categoria:$('t-category').value,
      mensaje:body,fuente_url:source,uid:user.uid,
      estado:'pendiente',fecha:fb.firestore.FieldValue.serverTimestamp()
    });
    display('Gracias! Recibimos tu información. La redacción la revisará antes de publicarla.',true);
    form.reset();
  } catch(error) {
    console.warn('No se pudo enviar colaboración',error.code||error.message);
    display('No pudimos enviar el mensaje en este momento. Probá nuevamente más tarde.',false);
  } finally {busy=false;$('tip-submit').disabled=false;}
});
