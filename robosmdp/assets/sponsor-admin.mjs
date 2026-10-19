import {validateCampaign,summary,todayLocal,csvCell} from './sponsor-utils.mjs';

const FB={
 apiKey:'AIzaSyCm2rB0jOpvoi_wLpxVSMk0nip1pR62mjo',
 authDomain:'robosmdp-d1ef3.firebaseapp.com',
 projectId:'robosmdp-d1ef3',
 storageBucket:'robosmdp-d1ef3.firebasestorage.app',
 messagingSenderId:'329992862097',
 appId:'1:329992862097:web:be1166da8fe9380df2c230'
};
const ADMIN='admin@robosmdp.com.ar',COL='campanias_publicitarias';
const app=firebase.apps.find(x=>x.name==='rmdp_sponsors')||firebase.initializeApp(FB,'rmdp_sponsors');
const auth=app.auth(),db=app.firestore();
const el=id=>document.getElementById(id);
const fmt=new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0});
const text=(node,value)=>{node.textContent=String(value??'');return node;};
const inputByName=name=>document.querySelector('#campaign-form [name="'+name+'"]');
let campaigns=[],unsubscribe=null,editing=null,loading=false;
const stateLabels={borrador:'Borrador',activa:'Activa',pausada:'Pausada',finalizada:'Finalizada'};
function status(message,error=false){
  const p=el('status');p.textContent=message;p.style.color=error?'#fca5a5':'#86efac';
}
function reset(){
  editing=null;el('campaign-form').reset();
  const now=todayLocal();
  inputByName('inicio').value=now;
  inputByName('fin').value=now;
  el('form-title').textContent='Nueva campaña';
  el('save-btn').textContent='Guardar campaña';
  status('');
}
function rowCell(tr,content){
  const td=document.createElement('td');
  text(td,content);
  tr.append(td);return td;
}
function campaignStage(c){
  const now=todayLocal();
  if(c.estado!=='activa')return stateLabels[c.estado]||'Borrador';
  if(c.fin<now)return 'Vencida';
  if(c.inicio>now)return 'Programada';
  return 'Activa';
}
function render(){
  const count=summary(campaigns);
  text(el('stat-all'),count.campanias);
  text(el('stat-current'),count.vigentes);
  text(el('stat-expiring'),count.por_vencer);
  text(el('stat-total'),fmt.format(count.contratado));
  text(el('stat-balance'),fmt.format(count.saldo));
  const q=el('filter-campaigns').value.trim().toLowerCase();
  const rows=campaigns.filter(c=>[c.cliente,c.plan,c.estado,c.ubicaciones]
    .some(x=>String(x||'').toLowerCase().includes(q)))
    .slice().sort((a,b)=>String(b.inicio||'').localeCompare(String(a.inicio||'')));
  const tbody=el('campaign-rows');tbody.replaceChildren();
  el('empty-campaigns').hidden=rows.length>0;
  for(const c of rows){
    const tr=document.createElement('tr');
    rowCell(tr,c.cliente);
    rowCell(tr,c.plan);
    rowCell(tr,(c.inicio||'—')+' → '+(c.fin||'—'));
    const debt=fmt.format(Math.max(0,(c.importe_total||0)-(c.cobrado_total||0)));
    const money=rowCell(tr,fmt.format(c.importe_total||0)+' / '+fmt.format(c.cobrado_total||0));
    const small=document.createElement('div');small.className='muted';
    small.textContent='Pendiente: '+debt;money.append(small);
    const statusCell=rowCell(tr,'');
    const badge=document.createElement('mark');text(badge,campaignStage(c));statusCell.append(badge);
    const actions=rowCell(tr,'');
    const edit=document.createElement('button');edit.type='button';edit.className='secondary';edit.textContent='Editar';
    edit.addEventListener('click',()=>editCampaign(c));actions.append(edit);
    const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent='Eliminar';
    remove.addEventListener('click',()=>deleteCampaign(c));actions.append(remove);
    if(c.enlace){
      const a=document.createElement('a');a.href=c.enlace;a.target='_blank';a.rel='noopener noreferrer';
      a.textContent='Abrir enlace';a.className='muted';a.style.display='block';actions.append(a);
    }
    tbody.append(tr);
  }
}
function editCampaign(c){
  editing=c.id;
  for(const field of ['cliente','plan','inicio','fin','ubicaciones','importe_total','cobrado_total','estado','nota','enlace']){
    const inp=inputByName(field);if(inp)inp.value=String(c[field]??'');
  }
  el('form-title').textContent='Editar: '+c.cliente;
  el('save-btn').textContent='Guardar cambios';
  status('Estás editando una campaña existente.');
  el('campaign-form').scrollIntoView({behavior:'smooth',block:'start'});
}
async function deleteCampaign(c){
  if(!confirm('¿Eliminar la campaña de '+c.cliente+'? Esta acción no se puede deshacer.'))return;
  try{
    await db.collection(COL).doc(c.id).delete();
    if(editing===c.id)reset();
    status('Campaña eliminada.');
  }catch(e){status('No se pudo eliminar la campaña.',true);}
}
async function saveCampaign(e){
  e.preventDefault();
  if(loading)return;
  const form=el('campaign-form');
  const entries=Object.fromEntries(new FormData(form).entries());
  let values;
  try{values=validateCampaign(entries);}
  catch(e){status(e.message,true);return;}
  loading=true;el('save-btn').disabled=true;
  try{
    const now=firebase.firestore.FieldValue.serverTimestamp();
    if(editing){
      await db.collection(COL).doc(editing).update({...values,updatedAt:now});
      status('Cambios guardados.');
    }else{
      await db.collection(COL).add({...values,createdAt:now,updatedAt:now});
      status('Campaña registrada.');
    }
    reset();status('Campaña guardada correctamente.');
  }catch(e){
    console.warn('sponsors write',e?.code||'fallo');
    status('No se pudo guardar. Revisá la sesión y los permisos.',true);
  }finally{loading=false;el('save-btn').disabled=false;}
}
function safeFile(name,content){
  const blob=new Blob([content],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportCSV(){
  if(!campaigns.length){status('No hay campañas para exportar.',true);return;}
  const cols=['cliente','plan','inicio','fin','importe_total','cobrado_total','estado',
    'ubicaciones','enlace','nota'];
  const lines=[cols.map(csvCell).join(',')];
  for(const c of campaigns)lines.push(cols.map(k=>csvCell(c[k])).join(','));
  safeFile('robosmdp-campanias-'+todayLocal()+'.csv','\uFEFF'+lines.join('\r\n'));
  status('Se exportaron '+campaigns.length+' campañas.');
}
function subscribe(){
  if(unsubscribe){unsubscribe();unsubscribe=null;}
  unsubscribe=db.collection(COL).limit(500).onSnapshot(snap=>{
    campaigns=snap.docs.map(d=>({id:d.id,...d.data()}));render();
  },e=>{
    console.warn('sponsors list',e?.code||'fallo');
    status('No se pudieron cargar campañas. Verificá los permisos.',true);
  });
}
function showAdmin(enabled){
  el('login-screen').hidden=enabled;
  el('sponsors-screen').hidden=!enabled;
  if(enabled)subscribe();
  else{if(unsubscribe){unsubscribe();unsubscribe=null;}campaigns=[];reset();}
}
auth.onAuthStateChanged(user=>{
  const enabled=!!user&&user.email===ADMIN;
  showAdmin(enabled);
  if(user&&!enabled){
    el('login-status').textContent='Esta cuenta no tiene acceso de administrador.';
    auth.signOut().catch(()=>{});
  }
});
el('login-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const login=el('login-status');login.textContent='Validando credenciales…';
  try{
    await auth.signInWithEmailAndPassword(el('login-email').value,el('login-password').value);
    el('login-password').value='';
    login.textContent='';
  }catch(e){login.textContent='No se pudo iniciar sesión con esta cuenta.';}
});
el('campaign-form').addEventListener('submit',saveCampaign);
el('reset-btn').addEventListener('click',reset);
el('filter-campaigns').addEventListener('input',render);
el('export-csv').addEventListener('click',exportCSV);
el('logout-btn').addEventListener('click',()=>auth.signOut());
reset();
