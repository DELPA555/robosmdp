import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../robosmdp/assets/report-tracking.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../robosmdp/seguimiento.html',import.meta.url),'utf8');
const index=readFileSync(new URL('../robosmdp/index.html',import.meta.url),'utf8');
const redirects=readFileSync(new URL('../robosmdp/_redirects',import.meta.url),'utf8');

function setup(){
  const stored=new Map();
  const storage={
    getItem:k=>stored.get(k)||null,
    setItem:(k,v)=>stored.set(k,v)
  };
  const window={location:{origin:'https://robosmdp.com.ar'}};
  const document={readyState:'loading',addEventListener:()=>{}};
  vm.runInNewContext(source,{
    window,document,localStorage:storage,URL,URLSearchParams,Date,
    console
  },{filename:'report-tracking.js',timeout:1000});
  return {api:window.RMDPTracking,storage};
}

test('script de seguimiento compila sin ejecutar código al importar',()=>{
  assert.doesNotThrow(()=>new vm.Script(source));
});

test('enlace usa categoría y ID y rechaza rutas o identificadores maliciosos',()=>{
  const {api}=setup();
  assert.equal(api.urlOf('basura','AbCdEfGh12345'),
    'https://robosmdp.com.ar/seguimiento?tipo=basura&id=AbCdEfGh12345');
  assert.equal(api.urlOf('otra','AbCdEfGh12345'),'');
  assert.equal(api.urlOf('basura','../../foo'),'');
  assert.equal(api.urlOf('basura','<script>alert(1)</script>'),'');
  assert.equal(api.urlOf('pozos',''), '');
});

test('historial almacena sólo diez reportes válidos y elimina duplicados',()=>{
  const {api,storage}=setup();
  api.save('basura','AbCdEfGh12345');
  api.save('basura','AbCdEfGh12345');
  api.save('otra','AbCdEfGh12345');
  for(let i=0;i<12;i++)api.save('pozos','code_'+String(i).padStart(5,'0'));
  const history=JSON.parse(storage.getItem('rmdp_reportes_recientes_v1'));
  assert.equal(history.length,10);
  assert.equal(history[0].id,'code_00011');
  assert.equal(history[9].id,'code_00002');
  assert.equal(history.every(h=>h.tipo==='pozos'),true);
});

test('página y portal tienen el flujo de comprobante accesible',()=>{
  for(const id of ['tracking-form','tracking-type','tracking-id',
    'tracking-result-status','tracking-result-note','tracking-history']){
    assert.ok(html.includes('id="'+id+'"'), 'falta '+id);
  }
  assert.match(index,/RMDPTracking\?\.showReceipt/);
  assert.match(index,/const created=await db\.collection\(MOD_CFG\[mod\]\.col\)\.add\(data\)/);
  assert.match(index,/href="\/seguimiento"/);
  assert.match(redirects,/\/seguimiento\s+\/seguimiento\.html\s+200/);
});
