import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const index=read('robosmdp/index.html');
const chat=read('robosmdp/chat.html');
const rules=read('firestore.rules');
const routes=read('robosmdp/_redirects');
const notifier=read('netlify/functions/notify-zone.mjs');

test('app principal compila después de integrar los cuatro desarrollos',()=>{
 const start=index.lastIndexOf('<script>'),end=index.indexOf('</script>',start);
 assert.ok(start>=0&&end>start);
 assert.doesNotThrow(()=>new vm.Script(index.slice(start+8,end)));
});
test('conserva las cuatro funciones en el mismo frontend',()=>{
 for(const key of ['chat_ip_private','updateReportState','push-unsubscribe',
   'admin-sponsors','/seguimiento','report-tracking.js?v=1']){
   assert.ok(index.includes(key),'falta '+key);
 }
});
test('rutas de las páginas nuevas antes del fallback a landing',()=>{
 const routesList=routes.trim().split(/\r?\n/);
 for(const [path,target] of [['/seguimiento','/seguimiento.html'],
   ['/admin-sponsors','/admin-sponsors.html']]){
   assert.ok(routesList.some(l=>l.startsWith(path+' ')&&l.includes(target)));
 }
 assert.equal(routesList.at(-1).startsWith('/*'),true);
});
test('reglas Firebase integran chat privado, sponsors y control de reportes',()=>{
 for(const key of ['chat_ip_private','campanias_publicitarias','historial_estado',
   'estado_gestion','chat_bans_fp']){
   assert.ok(rules.includes(key),'falta '+key);
 }
 assert.match(rules,/match \/campanias_publicitarias\/\{id\} \{[\s\S]*?allow read, create, update, delete: if isAdmin\(\);/);
});
test('se evita enviar datos de ubicación precisa sin consentimiento',()=>{
 assert.ok(chat.includes('reportChatIp('));
 assert.ok(chat.includes('Authorization'));
 assert.equal(chat.includes('navigator.geolocation.watchPosition'),false);
});
test('la función push utiliza idempotencia y evita adelantar estado al fallar',()=>{
 assert.ok(notifier.includes('reserveDelivery('));
 assert.ok(notifier.includes('releaseDelivery('));
 assert.ok(notifier.includes('if(failures)'));
});


test('alertas por categorías mantienen defaults y cinco opciones',()=>{
  assert.match(index,/class="zone-push-cat"/);
  assert.match(index,/const PUSH_DEFAULT_CATS=\['robos','basura','pozos'\]/);
  assert.match(index,/categories:getPushCategories\(\)/);
  assert.match(notifier,/categories\.includes\(tab\)/);
  for(const item of ['robos','basura','pozos','abandonados','luminarias']){
    assert.ok(notifier.includes("tab: '"+item+"'"));
  }
});
