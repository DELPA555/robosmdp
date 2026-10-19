/* ROBOS MDP — seguimiento público de reportes, sin datos personales adicionales.
 * Compartido por index.html (comprobante) y seguimiento.html (consulta).
 * Usa identificadores existentes de Firestore; sin escrituras nuevas.
 */
(function(){
'use strict';
const STORAGE_KEY='rmdp_reportes_recientes_v1';
const TYPES=Object.freeze({
  robos:{name:'Robos',path:'artifacts/robosmdp-d1ef3/public/data/reports'},
  basura:{name:'Basura',path:'basura'},
  pozos:{name:'Pozos',path:'pozos'},
  abandonados:{name:'Vehículos abandonados',path:'abandonados'},
  luminarias:{name:'Luminarias',path:'luminarias'}
});
const ID=/^[A-Za-z0-9_-]{5,128}$/;
function valid(type,id){return Object.hasOwn(TYPES,type)&&ID.test(String(id||''));}
function urlOf(type,id){
  if(!valid(type,id))return '';
  const u=new URL('/seguimiento',window.location.origin);
  u.searchParams.set('tipo',type);u.searchParams.set('id',id);
  return u.toString();
}
function readHistory(){
  try{
    const arr=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    return Array.isArray(arr)?arr.filter(x=>x&&valid(x.tipo,x.id)).slice(0,10):[];
  }catch{return [];}
}
function save(type,id){
  if(!valid(type,id))return;
  try{
    const arr=readHistory().filter(x=>!(x.tipo===type&&x.id===id));
    arr.unshift({tipo:type,id,fecha:new Date().toISOString()});
    localStorage.setItem(STORAGE_KEY,JSON.stringify(arr.slice(0,10)));
  }catch{/* algunos navegadores bloquean el almacenamiento local */}
}
async function copyLink(link,button){
  try{
    if(!navigator.clipboard?.writeText)throw new Error('clipboard no disponible');
    await navigator.clipboard.writeText(link);
    if(button){button.textContent='✓ Enlace copiado';}
  }catch{
    window.prompt('Copiá el enlace de seguimiento:',link);
  }
}
function receipt(type,id){
  if(!valid(type,id))return;
  save(type,id);
  document.getElementById('rmdp-tracking-receipt')?.remove();
  const link=urlOf(type,id);
  const overlay=document.createElement('div');
  overlay.id='rmdp-tracking-receipt';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','Comprobante de reporte ciudadano');
  overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(2,6,15,.85);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px)';
  const panel=document.createElement('div');
  panel.style.cssText='background:#111827;color:#e5e7eb;border:1px solid #374151;border-radius:20px;padding:26px;max-width:440px;width:100%;font-family:system-ui,Arial,sans-serif;box-shadow:0 25px 70px rgba(0,0,0,.5)';
  const heading=document.createElement('h2');
  heading.textContent='✓ Reporte publicado';
  heading.style.cssText='color:#4ade80;font-size:22px;font-weight:800;margin:0 0 12px';
  const help=document.createElement('p');
  help.textContent='Guardá este código o copiá el enlace para consultar el estado del reporte.';
  help.style.cssText='font-size:14px;line-height:1.5;color:#cbd5e1;margin:0 0 14px';
  const code=document.createElement('p');
  code.textContent=id;
  code.style.cssText='padding:13px;background:#020617;border:1px solid #334155;border-radius:10px;word-break:break-all;letter-spacing:.02em;color:white;font-size:15px;font-weight:700';
  const note=document.createElement('p');
  note.textContent='Este reporte ciudadano no reemplaza una denuncia policial ni implica verificación oficial.';
  note.style.cssText='font-size:12px;line-height:1.5;color:#94a3b8;margin:16px 0';
  const actions=document.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
  const copy=document.createElement('button');copy.type='button';copy.textContent='Copiar enlace';
  copy.style.cssText='flex:1;min-width:125px;cursor:pointer;border:0;border-radius:10px;padding:13px;background:#dc2626;color:white;font-weight:800';
  copy.onclick=()=>copyLink(link,copy);
  const open=document.createElement('a');open.href=link;open.textContent='Consultar estado';
  open.style.cssText='flex:1;min-width:125px;text-align:center;border-radius:10px;padding:13px;background:#1e293b;color:#e2e8f0;text-decoration:none;font-weight:700';
  const close=document.createElement('button');close.type='button';close.textContent='Cerrar';
  close.style.cssText='width:100%;background:transparent;border:1px solid #475569;color:#cbd5e1;padding:12px;border-radius:10px;margin-top:10px;cursor:pointer';
  const dismiss=()=>{overlay.remove();document.removeEventListener('keydown',onEsc);};
  const onEsc=e=>{if(e.key==='Escape')dismiss();};
  overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss();});
  close.onclick=dismiss;document.addEventListener('keydown',onEsc);
  actions.append(copy,open);panel.append(heading,help,code,note,actions,close);overlay.append(panel);document.body.append(overlay);
  copy.focus();
}
function setMessage(txt,error=false){
  const el=document.getElementById('tracking-message');if(!el)return;
  el.textContent=txt;el.style.color=error?'#fca5a5':'#94a3b8';
}
function dateText(t){
  try{
    const d=t?.toDate?.()||new Date(t||0);
    if(Number.isNaN(d.getTime())||d.getTime()===0)return 'Sin fecha informada';
    return new Intl.DateTimeFormat('es-AR',{dateStyle:'medium',timeStyle:'short'}).format(d);
  }catch{return 'Sin fecha informada';}
}
function renderHistory(){
  const el=document.getElementById('tracking-history');if(!el)return;
  el.replaceChildren();
  const arr=readHistory();
  if(!arr.length){el.textContent='Todavía no hay reportes guardados en este navegador.';return;}
  for(const record of arr){
    const link=document.createElement('a');
    link.href=urlOf(record.tipo,record.id);
    link.textContent=TYPES[record.tipo].name+' · '+record.id;
    link.className='history-link';el.append(link);
  }
}
async function lookup(type,id){
  const result=document.getElementById('tracking-result');if(!result)return;
  result.hidden=true;setMessage('Consultando Firestore…');
  if(!valid(type,id)){setMessage('Elegí una categoría e ingresá un código válido.',true);return;}
  if(!window.firebase?.firestore){setMessage('No se pudo iniciar la consulta. Reintentá más tarde.',true);return;}
  const cfg={apiKey:'AIzaSyCm2rB0jOpvoi_wLpxVSMk0nip1pR62mjo',
    authDomain:'robosmdp-d1ef3.firebaseapp.com',projectId:'robosmdp-d1ef3',
    storageBucket:'robosmdp-d1ef3.firebasestorage.app',
    messagingSenderId:'329992862097',appId:'1:329992862097:web:be1166da8fe9380df2c230'};
  try{
    const app=firebase.apps.length?firebase.app():firebase.initializeApp(cfg);
    const snap=await app.firestore().doc(TYPES[type].path+'/'+id).get();
    if(!snap.exists){setMessage('No encontramos ese reporte. Revisá la categoría y el código.',true);return;}
    const r=snap.data()||{};
    document.getElementById('tracking-result-type').textContent=TYPES[type].name;
    document.getElementById('tracking-result-id').textContent=id;
    document.getElementById('tracking-result-date').textContent=dateText(r.timestamp);
    document.getElementById('tracking-result-description').textContent=String(r.description||'Sin descripción pública').slice(0,500);
    // Solo informa el estado que el administrador marcó en esta plataforma.
    // No equivale a la radicación o confirmación de una denuncia oficial.
    const labels={publicado:'Publicado',revision:'En revisión interna',
      derivado:'Derivado por Robos MDP',resuelto:'Resuelto'};
    const notes={
      publicado:'Reporte publicado. Aún no figura como resuelto.',
      revision:'Robos MDP marcó el reporte como en revisión interna. No implica trámite oficial.',
      derivado:'Robos MDP marcó este reporte como derivado. No confirma recepción ni actuación de autoridades.',
      resuelto:'El reporte figura como resuelto en la plataforma.'
    };
    const state=r.resolved===true?'resuelto':
      (Object.hasOwn(labels,r.estado_gestion)?r.estado_gestion:'publicado');
    document.getElementById('tracking-result-status').textContent=labels[state];
    document.getElementById('tracking-result-note').textContent=notes[state];
    const timeline=document.getElementById('tracking-timeline');
    if(timeline){
      timeline.replaceChildren();
      const validStates=(Array.isArray(r.historial_estado)?r.historial_estado:[])
        .filter(e=>e&&Object.hasOwn(labels,e.estado)).slice(-25).reverse();
      if(!validStates.length){
        timeline.textContent='No hay cambios administrativos registrados para este reporte.';
      }else{
        for(const item of validStates){
          const entry=document.createElement('div');
          entry.className='history-link';
          entry.textContent=labels[item.estado]+' · '+dateText(item.fecha);
          timeline.append(entry);
        }
      }
    }
    setMessage('Consulta actualizada.');
    result.hidden=false;
    save(type,id);renderHistory();
    const link=urlOf(type,id);
    history.replaceState(null,'','/seguimiento?tipo='+encodeURIComponent(type)+'&id='+encodeURIComponent(id));
    document.getElementById('tracking-share').onclick=e=>copyLink(link,e.currentTarget);
  }catch(e){
    setMessage('No fue posible consultar el reporte. Verificá tu conexión y volvé a intentar.',true);
    console.warn('seguimiento',e?.code||'error de red');
  }
}
function init(){
  const form=document.getElementById('tracking-form');
  if(!form)return;
  renderHistory();
  const params=new URLSearchParams(location.search);
  const type=params.get('tipo')||'',id=params.get('id')||'';
  const selector=document.getElementById('tracking-type'),input=document.getElementById('tracking-id');
  if(type in TYPES)selector.value=type;
  if(id)input.value=id;
  form.addEventListener('submit',e=>{
    e.preventDefault();lookup(selector.value,input.value.trim());
  });
  if(valid(type,id))lookup(type,id);
}
window.RMDPTracking=Object.freeze({showReceipt:receipt,save,urlOf});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
