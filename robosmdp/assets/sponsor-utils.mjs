/* Cálculos y validaciones compartidos del panel comercial ROBOS MDP.
 * Nunca considera impresiones o clics imaginados.
 */
export const STATES=Object.freeze(['activa','pausada','finalizada','borrador']);
const ISO=/^\d{4}-\d{2}-\d{2}$/;
const money=x=>Number(x);
export function todayLocal(d=new Date()){
 const n=x=>String(x).padStart(2,'0');
 return d.getFullYear()+'-'+n(d.getMonth()+1)+'-'+n(d.getDate());
}
export function validateCampaign(input){
 const name=String(input?.cliente||'').trim();
 const plan=String(input?.plan||'').trim();
 const start=String(input?.inicio||'');
 const end=String(input?.fin||'');
 const total=money(input?.importe_total),paid=money(input?.cobrado_total);
 const status=String(input?.estado||'borrador');
 const note=String(input?.nota||'').trim();
 const placements=String(input?.ubicaciones||'').trim();
 const link=String(input?.enlace||'').trim();
 if(name.length<2||name.length>140)throw Error('Nombre del anunciante inválido');
 if(plan.length<2||plan.length>120)throw Error('Plan inválido');
 if(!ISO.test(start)||!ISO.test(end)||Number.isNaN(Date.parse(start))||
    Number.isNaN(Date.parse(end))||start>end)throw Error('Período de campaña inválido');
 if(!Number.isFinite(total)||!Number.isFinite(paid)||total<0||paid<0||
    paid>total||total>1000000000000)throw Error('Revisá los importes y el total cobrado');
 if(!STATES.includes(status))throw Error('Estado de campaña inválido');
 if(note.length>1200||placements.length>240)throw Error('Descripción demasiado extensa');
 if(link && (!/^https:\/\//i.test(link)||link.length>500))throw Error('Enlace HTTPS inválido');
 return {cliente:name,plan,inicio:start,fin:end,importe_total:total,
   cobrado_total:paid,estado:status,nota:note,ubicaciones:placements,enlace:link};
}
export function summary(rows,date=todayLocal()){
 const result={campanias:0,vigentes:0,por_vencer:0,contratado:0,cobrado:0,saldo:0};
 const near=new Date(date+'T12:00:00');
 near.setDate(near.getDate()+7);
 const deadline=todayLocal(near);
 for(const r of rows){
   result.campanias++;
   const total=Number(r.importe_total)||0;
   const paid=Number(r.cobrado_total)||0;
   result.contratado+=total;result.cobrado+=paid;
   result.saldo+=Math.max(0,total-paid);
   if(r.estado==='activa'&&r.inicio<=date&&r.fin>=date)result.vigentes++;
   if(r.estado==='activa'&&r.fin>=date&&r.fin<=deadline)result.por_vencer++;
 }
 return result;
}
export function csvCell(value){
 let s=String(value??'');
 // Evitar que Excel/Sheets ejecuten fórmulas incluidas en texto libre.
 if(/^[\s]*[=+\-@]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
