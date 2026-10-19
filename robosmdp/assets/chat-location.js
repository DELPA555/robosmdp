/* Robos MDP - GPS voluntario del chat. Una captura por aceptación expresa.
 * No usa watchPosition ni corre geolocalización al cargar la página.
 * Lectura protegida por Firestore: únicamente titular y admin; lista solo admin.
 */
(function(){
'use strict';
const COLLECTION='chat_location_private';
const TTL=60*60*1000;
let currentUid=null,unsubscribe=null,current=null,busy=false;
const el=id=>document.getElementById(id);
const millis=t=>t?.toMillis?.()||(typeof t?.seconds==='number'?t.seconds*1000:0);
const available=()=>!!(auth?.currentUser&&G.authReady&&!G.banned&&!G.isAdmin);
const valid=d=>!!d&&millis(d.expires_at)>Date.now();
function render(){
  const button=el('chat-gps-btn');
  if(!button)return;
  const live=valid(current);
  button.disabled=busy||!available();
  button.textContent=live?'📍 GPS compartido':'📍 Compartir GPS';
  button.title=live?'Tocá para consultar o revocar la ubicación':'Ubicación precisa opcional. No afecta el chat.';
  const revoke=el('gps-revoke');
  const share=el('gps-share');
  if(revoke)revoke.hidden=!current;
  if(share)share.hidden=live;
}
function message(t){const p=el('gps-status');if(p)p.textContent=t;}
function subscribe(user){
  if(unsubscribe){unsubscribe();unsubscribe=null;}
  currentUid=user?.uid||null;current=null;render();
  if(!currentUid||!db)return;
  const uid=currentUid;
  unsubscribe=db.collection(COLLECTION).doc(uid).onSnapshot(s=>{
    if(auth?.currentUser?.uid!==uid)return;
    current=s.exists?s.data():null;render();
  },()=>{current=null;render();});
}
function open(){
  if(!available())return;
  const modal=el('gps-modal');if(!modal)return;
  message(valid(current)?
    'Tenés una ubicación compartida temporalmente. Podés revocarla ahora.':
    'No compartiste una ubicación activa.');
  modal.hidden=false;render();
}
function close(){const m=el('gps-modal');if(m)m.hidden=true;}
async function revoke(){
  if(busy||!auth?.currentUser)return;
  const uid=auth.currentUser.uid;
  busy=true;render();message('Eliminando ubicación compartida…');
  try{
    await db.collection(COLLECTION).doc(uid).delete();
    if(auth.currentUser?.uid===uid)current=null;
    message('Ubicación revocada y eliminada de Firebase.');
  }catch(e){message('No pudimos revocar tu ubicación. Reintentá.');}
  finally{busy=false;render();}
}
function share(){
  if(busy||!available())return;
  if(!navigator.geolocation){message('Tu navegador no dispone de GPS. Podés seguir chateando.');return;}
  busy=true;render();message('Solicitando permiso de GPS al navegador…');
  const uid=auth.currentUser.uid;
  // SOLO se ejecuta por click en "Aceptar y compartir ubicación".
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{
      if(!available()||auth.currentUser?.uid!==uid)throw Error('Sesión cambiada');
      const {latitude,longitude,accuracy}=pos.coords;
      if(![latitude,longitude,accuracy].every(Number.isFinite)||
          latitude< -90||latitude>90||longitude< -180||longitude>180||
          accuracy<0||accuracy>20000)throw Error('Coordenadas inválidas');
      const expiry=firebase.firestore.Timestamp.fromMillis(Date.now()+TTL);
      await db.collection(COLLECTION).doc(uid).set({
        lat:latitude,lng:longitude,accuracy,
        shared_at:firebase.firestore.FieldValue.serverTimestamp(),expires_at:expiry
      });
      if(auth.currentUser?.uid===uid)current={lat:latitude,lng:longitude,accuracy,expires_at:expiry};
      message('Ubicación compartida por 60 minutos. Podés revocarla ahora.');
    }catch(e){message('No se pudo compartir GPS. El chat funciona sin ubicación.');}
    finally{busy=false;render();}
  },error=>{
    busy=false;render();
    message(error.code===1?
      'No autorizaste el GPS. Podés usar el chat normalmente.':
      'No se pudo obtener tu ubicación. Podés reintentar.');
  },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}
window.RMDPChatGPS=Object.freeze({open,close,share,revoke});
if(auth)auth.onAuthStateChanged(subscribe);
setInterval(render,10000);
})();
