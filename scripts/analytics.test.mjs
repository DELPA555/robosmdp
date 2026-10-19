import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {CATEGORIES,publicationDate,isResolved,neighborhood,summarize,csvCell}
  from '../robosmdp/assets/analytics-utils.mjs';

const fixtures=[
 {id:'r1',category:'robos',timestamp:'2026-10-15',resolved:true,barrio:'Centro',description:'1'},
 {id:'r2',category:'robos',timestamp:'2026-07-01',resolved:false,barrio:'Punta Mogotes',description:'2'},
 {id:'b1',category:'basura',timestamp:'2026-10-10',resolved:false,barrio:'Centro',description:'3'},
 {id:'p1',category:'pozos',timestamp:'2026-09-01',resolved:false,description:'4'},
 {id:'a1',category:'abandonados',timestamp:'2026-10-01',estado_gestion:'resuelto',barrio:'Puerto'},
 {id:'l1',category:'luminarias',resolved:false,description:'Sin fecha'}
];
const now=new Date('2026-10-18T12:00:00Z');
test('categorías corresponden a las cinco colecciones reales',()=>{
 assert.deepEqual(Object.keys(CATEGORIES),['robos','basura','pozos','abandonados','luminarias']);
 assert.equal(CATEGORIES.robos.path,'artifacts/robosmdp-d1ef3/public/data/reports');
});
test('fechas de reportes admiten Firestore Timestamp y fechas ISO',()=>{
 assert.equal(publicationDate({timestamp:{toDate:()=>new Date('2026-10-15T00:00:00Z')}}).getFullYear(),2026);
 assert.equal(publicationDate({timestamp:'2026-10-15'}).getMonth(),9);
 assert.equal(publicationDate({}).getTime(),0);
});
test('indicadores por períodos, antigüedad y barrios reales',()=>{
 const all=summarize(fixtures,0,now);
 assert.equal(all.total,6);assert.equal(all.resolved,2);
 assert.equal(all.pending,4);assert.equal(all.old,2);
 const summary=summarize(fixtures,90,now);
 assert.equal(summary.total,4);assert.equal(summary.resolved,2);
 assert.equal(summary.pending,2);assert.equal(summary.old,1);
 assert.equal(summary.new30,3);
 assert.equal(summary.rate,50);
 assert.equal(summary.byCategory.find(x=>x.key==='robos').total,1);
 assert.equal(summary.topBarrios[0].name,'Centro');
 assert.equal(summary.topBarrios[0].count,2);
 assert.equal(summary.backlog[0].id,'p1');
});
test('no se confunde estado interno con trámite oficial',()=>{
 assert.equal(isResolved({resolved:false,estado_gestion:'revision'}),false);
 assert.equal(isResolved({estado_gestion:'resuelto'}),true);
 assert.equal(neighborhood({}), 'Sin barrio informado');
});
test('el CSV neutraliza fórmulas maliciosas',()=>{
 assert.equal(csvCell('=IMPORTRANGE("x")'),'"\'=IMPORTRANGE(""x"")"');
});
test('la interfaz presenta el límite de consulta y obliga a login admin',()=>{
 const html=readFileSync(new URL('../robosmdp/admin-analitica.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../robosmdp/assets/admin-analytics.mjs',import.meta.url),'utf8');
 const portal=readFileSync(new URL('../robosmdp/index.html',import.meta.url),'utf8');
 const routes=readFileSync(new URL('../robosmdp/_redirects',import.meta.url),'utf8');
 for(const id of ['k-total','k-pending','chart-neighborhoods','chart-months','table-backlog','coverage']){
   assert.ok(html.includes('id="'+id+'"'),'missing '+id);
 }
 assert.match(js,/const PAGE=300,MAX=1200/);
 assert.match(js,/limited/);
 assert.match(js,/user\.email===ADMIN/);
 assert.match(js,/FieldPath\.documentId\(\)/);
 assert.match(portal,/href="\/admin-analitica"/);
 assert.match(routes,/\/admin-analitica\s+\/admin-analitica\.html\s+200/);
 assert.doesNotThrow(()=>new vm.Script('('+function example(){}+')'));
});
