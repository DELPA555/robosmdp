import {CATEGORIES,summarize,neighborhood,csvCell} from './analytics-utils.mjs';
const FB={
 apiKey:'AIzaSyCm2rB0jOpvoi_wLpxVSMk0nip1pR62mjo',
 authDomain:'robosmdp-d1ef3.firebaseapp.com',
 projectId:'robosmdp-d1ef3',
 storageBucket:'robosmdp-d1ef3.firebasestorage.app',
 messagingSenderId:'329992862097',
 appId:'1:329992862097:web:be1166da8fe9380df2c230'
};
const app=firebase.apps.find(a=>a.name==='rmdp_analytics')||firebase.initializeApp(FB,'rmdp_analytics');
const auth=app.auth(),db=app.firestore(),ADMIN='admin@robosmdp.com.ar';
const PAGE=300,MAX=1200;
let data=[],coverage=[],inFlight=false,epoch=0,lastSummary=null;
const el=id=>document.getElementById(id),txt=(id,s)=>{el(id).textContent=String(s??'')};
const num=n=>new Intl.NumberFormat('es-AR').format(n);
const formatDate=d=>d instanceof Date&&d.getTime()>0?
 d.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}):'Sin fecha';
function setStatus(t,error=false){const e=el('status');e.textContent=t;e.style.color=error?'#fca5a5':'#86efac';}
async function readCategory(key){
 const col=db.collection(CATEGORIES[key].path);
 let cursor=null,result=[];
 for(let page=0;page<MAX/PAGE;page++){
   let q=col.orderBy(firebase.firestore.FieldPath.documentId()).limit(PAGE);
   if(cursor)q=q.startAfter(cursor);
   const snap=await q.get();
   if(snap.empty)break;
   for(const doc of snap.docs)result.push({...doc.data(),id:doc.id,category:key});
   if(snap.size<PAGE)break;
   cursor=snap.docs.at(-1);
 }
 return {key,rows:result,limited:result.length>=MAX};
}
function td(row,value){
 const cell=document.createElement('td');
 cell.textContent=String(value??'');row.append(cell);return cell;
}
function renderBar(container,name,count,max){
 const bar=document.createElement('div');bar.className='meter-row';
 const title=document.createElement('span');title.className='meter-name';title.textContent=name;
 const track=document.createElement('div');track.className='meter-track';
 const fill=document.createElement('div');fill.className='meter-fill';
 fill.style.width=(max?Math.max(1,Math.round(count/max*100)):0)+'%';
 track.append(fill);
 const countNode=document.createElement('span');countNode.className='meter-count';
 countNode.textContent=num(count);bar.append(title,track,countNode);container.append(bar);
}
function render(){
 const days=Number(el('period').value);
 const result=summarize(data,days);
 lastSummary=result;
 txt('k-total',num(result.total));txt('k-pending',num(result.pending));
 txt('k-resolved',num(result.resolved));txt('k-rate',result.rate+'%');
 txt('k-old',num(result.old));
 const table=el('table-categories');table.replaceChildren();
 for(const cat of result.byCategory){
   const row=document.createElement('tr');td(row,cat.name);
   td(row,num(cat.total));td(row,num(cat.pending));
   td(row,num(cat.resolved));td(row,num(cat.old));
   table.append(row);
 }
 const neighborhoods=el('chart-neighborhoods');neighborhoods.replaceChildren();
 const highest=Math.max(0,...result.topBarrios.map(x=>x.count));
 for(const b of result.topBarrios)renderBar(neighborhoods,b.name,b.count,highest);
 if(!result.topBarrios.length)neighborhoods.textContent='Sin barrios registrados para el período.';
 const months=el('chart-months');months.replaceChildren();
 const max=Math.max(0,...result.trend.map(x=>x.count));
 for(const m of result.trend)renderBar(months,m.month,m.count,max);
 if(!result.trend.length)months.textContent='Sin fechas registradas en el período.';
 const backlog=el('table-backlog');backlog.replaceChildren();
 for(const report of result.backlog){
   const row=document.createElement('tr');
   td(row,CATEGORIES[report.category].label);td(row,formatDate(report.reportDate));
   td(row,neighborhood(report));td(row,String(report.description||'').slice(0,100));
   const linkTd=document.createElement('td'),a=document.createElement('a');
   a.href='/seguimiento?tipo='+encodeURIComponent(report.category)+'&id='+encodeURIComponent(report.id);
   a.target='_blank';a.rel='noopener';a.textContent='Consultar ↗';linkTd.append(a);row.append(linkTd);
   backlog.append(row);
 }
 if(!result.backlog.length){const row=document.createElement('tr');const cell=td(row,'No hay pendientes con fechas disponibles.');cell.colSpan=5;backlog.append(row);}
 const limited=coverage.filter(x=>x.limited).map(x=>CATEGORIES[x.key].label);
 const errors=coverage.filter(x=>x.failed).map(x=>CATEGORIES[x.key].label);
 const txtCoverage='Documentos descargados: '+num(data.length)+
   ' (máximo '+MAX+' por sección). '+
   (limited.length?'Límite alcanzado en '+limited.join(', ')+'. Las cifras de esas secciones representan una muestra, no el total. ':
   'No se alcanzó el límite de consulta en las secciones cargadas. ')+
   (errors.length?'No se pudieron consultar: '+errors.join(', ')+'. Estas cifras NO están completas. ':
   'Todas las consultas se completaron. ')+
   'El período elegido se calcula con la fecha disponible de cada reporte.';
 el('coverage').textContent=txtCoverage;
}
async function reload(){
 if(inFlight||!auth.currentUser||auth.currentUser.email!==ADMIN)return;
 inFlight=true;const seq=++epoch;
 el('refresh').disabled=true;el('csv').disabled=true;
 setStatus('Consultando las cinco categorías de Firestore…');
 const entries=Object.keys(CATEGORIES);
 const results=await Promise.allSettled(entries.map(readCategory));
 if(seq!==epoch||!auth.currentUser){inFlight=false;return;}
 data=[];coverage=[];
 for(let i=0;i<results.length;i++){
   const res=results[i],key=entries[i];
   if(res.status==='fulfilled'){
     data.push(...res.value.rows);
     coverage.push({key,count:res.value.rows.length,limited:res.value.limited});
   }else{
     coverage.push({key,count:0,limited:false,failed:true});
     console.warn('Analytics collection',key,res.reason?.code||'error');
   }
 }
 render();
 const errors=coverage.filter(x=>x.failed);
 setStatus(errors.length?'Consulta parcialmente completa; revisá el aviso de cobertura.':
   'Indicadores actualizados con datos de la plataforma.',!!errors.length);
 inFlight=false;el('refresh').disabled=false;el('csv').disabled=errors.length>0||!data.length;
}
function csv(){
 if(!lastSummary||coverage.some(x=>x.failed)){setStatus('No hay un conjunto completo para exportar.',true);return;}
 const lines=[['Sección','Analizados','Pendientes','Resueltos','Pendientes +30 días'].map(csvCell).join(',')];
 for(const cat of lastSummary.byCategory)
   lines.push([cat.name,cat.total,cat.pending,cat.resolved,cat.old].map(csvCell).join(','));
 lines.push('');
 lines.push(['Barrio','Reportes analizados'].map(csvCell).join(','));
 for(const r of lastSummary.topBarrios)lines.push([r.name,r.count].map(csvCell).join(','));
 const csvText='\uFEFF'+lines.join('\r\n');
 const blob=new Blob([csvText],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;
 a.download='robosmdp-reporte-operativo-'+new Date().toISOString().slice(0,10)+'.csv';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
auth.onAuthStateChanged(user=>{
 const admin=!!user&&user.email===ADMIN;
 el('login').hidden=admin;el('dashboard').hidden=!admin;
 if(admin)reload();
 else{
   epoch++;data=[];coverage=[];lastSummary=null;
   if(user){txt('auth-status','Cuenta sin acceso administrativo.');auth.signOut().catch(()=>{});}
 }
});
el('auth-form').addEventListener('submit',async e=>{
 e.preventDefault();txt('auth-status','Verificando credenciales…');
 try{await auth.signInWithEmailAndPassword(el('auth-email').value,el('auth-password').value);
   el('auth-password').value='';txt('auth-status','');
 }catch(e){txt('auth-status','No se pudo ingresar con esa cuenta.');}
});
el('period').addEventListener('change',()=>{if(data.length)render();});
el('refresh').addEventListener('click',reload);
el('csv').addEventListener('click',csv);
el('logout').addEventListener('click',()=>auth.signOut());
