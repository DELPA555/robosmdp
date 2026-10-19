/* Indicadores derivados solamente de reportes reales ya publicados.
 * No utiliza posiciones privadas del chat ni datos personales.
 */
export const CATEGORIES=Object.freeze({
 robos:{label:'Robos',path:'artifacts/robosmdp-d1ef3/public/data/reports'},
 basura:{label:'Basura',path:'basura'},
 pozos:{label:'Pozos',path:'pozos'},
 abandonados:{label:'Vehículos abandonados',path:'abandonados'},
 luminarias:{label:'Luminarias',path:'luminarias'}
});
function parseDate(v){
 if(v?.toDate)return v.toDate();
 if(v?.seconds!=null)return new Date(v.seconds*1000);
 if(typeof v==='string'){
   const match=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
   if(match)return new Date(+match[1],+match[2]-1,+match[3]);
 }
 const n=new Date(v||0);
 return Number.isNaN(n.getTime())?new Date(0):n;
}
export function publicationDate(r){
 return parseDate(r.timestamp||r.createdAt||r.created_at||r.incidentDate||r.fecha);
}
export function isResolved(r){
 return r.resolved===true || r.estado_gestion==='resuelto';
}
export function neighborhood(r){
 const value=[r.barrio,r.neighborhood,r.zona,r.barrio_nombre]
   .find(x=>typeof x==='string'&&x.trim());
 return String(value||'Sin barrio informado').trim().slice(0,80);
}
export function summarize(rows,days=90,now=new Date()){
 const max=days===0?Infinity:days*86400000;
 const byCategory=Object.fromEntries(Object.entries(CATEGORIES)
   .map(([key,v])=>[key,{key,name:v.label,total:0,pending:0,resolved:0,old:0,new30:0}]));
 const barrios=new Map(),monthly=new Map();
 const filtered=[];
 for(const r of rows){
   if(!Object.hasOwn(byCategory,r.category))continue;
   const date=publicationDate(r);
   const age=now.getTime()-date.getTime();
   if(days!==0&&(date.getTime()===0||age<0||age>max))continue;
   const resolved=isResolved(r);
   const row=byCategory[r.category];row.total++;
   if(resolved)row.resolved++;else row.pending++;
   if(!resolved&&date.getTime()>0&&age>30*86400000)row.old++;
   if(date.getTime()>0&&age>=0&&age<30*86400000)row.new30++;
   const barrio=neighborhood(r);
   barrios.set(barrio,(barrios.get(barrio)||0)+1);
   if(date.getTime()>0){
     const key=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
     monthly.set(key,(monthly.get(key)||0)+1);
   }
   filtered.push({...r,reportDate:date,isDone:resolved});
 }
 const values=Object.values(byCategory);
 const total=values.reduce((x,r)=>x+r.total,0);
 const resolved=values.reduce((x,r)=>x+r.resolved,0);
 const old=values.reduce((x,r)=>x+r.old,0);
 const new30=values.reduce((x,r)=>x+r.new30,0);
 const topBarrios=[...barrios.entries()].map(([name,count])=>({name,count}))
   .sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)).slice(0,12);
 const trend=[...monthly.entries()].sort((a,b)=>a[0].localeCompare(b[0]))
   .map(([month,count])=>({month,count})).slice(-12);
 const backlog=filtered.filter(x=>!x.isDone)
   .sort((a,b)=>a.reportDate.getTime()-b.reportDate.getTime())
   .slice(0,20);
 return {total,resolved,pending:total-resolved,old,new30,
   rate:total?Math.round(100*resolved/total):0,byCategory:values,
   topBarrios,trend,backlog};
}
export function csvCell(v){
 let s=String(v??'');
 if(/^[\s]*[=+\-@]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
