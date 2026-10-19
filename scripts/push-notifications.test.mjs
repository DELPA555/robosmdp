import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const unsubscribe=(await import('../netlify/functions/push-unsubscribe.mjs')).default;
const notify=(await import('../netlify/functions/notify-zone.mjs')).default;
const originalFetch=globalThis.fetch;
const originalSecret=process.env.FIREBASE_SERVICE_ACCOUNT;
const mockSecret=(()=>{
 const keys=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 return JSON.stringify({
   project_id:'robosmdp-d1ef3',
   client_email:'test-account@robosmdp-d1ef3.iam.gserviceaccount.com',
   private_key:keys.privateKey.export({type:'pkcs8',format:'pem'})
 });
})();
const json=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{'Content-Type':'application/json'}
});
const ip='https://firestore.googleapis.com/v1/projects/robosmdp-d1ef3/databases/(default)/documents';
const token='FCM_test_token_which_is_long_and_not_a_real_secret_abcdefghijklmnopqrstuvwxyz';
const docId='V3ryLongRandomDocumentABCDEF';
async function context(fn){try{
 process.env.FIREBASE_SERVICE_ACCOUNT=mockSecret;
 return await fn();
}finally{
 globalThis.fetch=originalFetch;
 if(originalSecret===undefined)delete process.env.FIREBASE_SERVICE_ACCOUNT;
 else process.env.FIREBASE_SERVICE_ACCOUNT=originalSecret;
}}

test('baja: sin token correcto no se borra el documento',async()=>context(async()=>{
 let deletes=0;
 globalThis.fetch=async(url,opts)=>{
   if(url.includes('oauth2.googleapis.com'))return json({access_token:'fake-token'});
   if(url===ip+'/subscripciones_push/'+docId && !opts?.method)
     return json({updateTime:'2026-10-18T13:00:00.000Z',fields:{token:{stringValue:token}}});
   if(opts?.method==='DELETE'){deletes++;return json({});}
   throw Error('unexpected '+url);
 };
 const goodReq=new Request('https://robosmdp.com.ar/.netlify/functions/push-unsubscribe',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({docId,token:'another_token_abcdefghijklmnopqrstuvwxyz_123456'})
 });
 const response=await unsubscribe(goodReq);
 assert.equal(response.status,403);assert.equal(deletes,0);
}));

test('baja: token correcto permite borrar un solo documento; reintento es inocuo',async()=>context(async()=>{
 let deletes=0,existing=true;
 globalThis.fetch=async(url,opts)=>{
   if(url.includes('oauth2.googleapis.com'))return json({access_token:'fake-token'});
   if(url===ip+'/subscripciones_push/'+docId && !opts?.method){
     return existing?json({updateTime:'2026-10-18T13:00:00Z',fields:{token:{stringValue:token}}}):json({},404);
   }
   if(opts?.method==='DELETE'){existing=false;deletes++;return json({},200);}
   throw Error('unexpected '+url);
 };
 const req=()=>new Request('https://robosmdp.com.ar/.netlify/functions/push-unsubscribe',{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({docId,token})
 });
 assert.equal((await unsubscribe(req())).status,200);
 assert.equal((await unsubscribe(req())).status,200);
 assert.equal(deletes,1);
}));

test('notificador: reintentos y solapamiento no duplican envíos FCM',async()=>context(async()=>{
 const reservations=new Set();
 let sends=0, checkpoints=0;
 const d=new Date().toISOString();
 globalThis.fetch=async(url,opts={})=>{
   const method=opts.method||'GET';
   if(url.includes('oauth2.googleapis.com'))return json({access_token:'fake-token'});
   if(url===ip+'/meta/push_state'&&method==='GET')return json({},404);
   if(url.startsWith(ip+'/subscripciones_push?'))return json({documents:[
     {name:ip+'/subscripciones_push/docOne',fields:{
       token:{stringValue:token},lat:{doubleValue:-38.0},
       lng:{doubleValue:-57.56},radius:{integerValue:'5000'}
     }}
   ]});
   if(url.endsWith(':runQuery')){
     const body=JSON.parse(opts.body);
     const col=body.structuredQuery.from[0].collectionId;
     return json(col==='reports'?[{document:{name:ip+'/artifacts/robosmdp-d1ef3/public/data/reports/reportOne',fields:{
       description:{stringValue:'Alerta prueba'},lat:{doubleValue:-38},
       lng:{doubleValue:-57.56},timestamp:{timestampValue:d}
     }}}]:[]);
   }
   if(url.startsWith(ip+'/push_delivery_log?')&&method==='POST'){
     const id=new URL(url).searchParams.get('documentId');
     if(reservations.has(id))return json({error:'already exists'},409);
     reservations.add(id);return json({name:ip+'/push_delivery_log/'+id},201);
   }
   if(url.includes('/messages:send')&&method==='POST'){sends++;return json({name:'ok'});}
   if(url.startsWith(ip+'/meta/push_state?')&&method==='PATCH'){
     checkpoints++;return json({name:'state'});
   }
   throw Error('unexpected '+method+' '+url);
 };
 const first=await notify();
 const second=await notify();
 assert.equal(first.status,200);assert.equal(second.status,200);
 assert.equal(sends,1);assert.equal(checkpoints,2);
 const body=await second.json();
 assert.equal(body.duplicates,1);
}));

test('notificador: no avanza checkpoint cuando el envío FCM falla',async()=>context(async()=>{
 let saves=0,reservations=0;
 globalThis.fetch=async(url,opts={})=>{
   const method=opts.method||'GET';
   if(url.includes('oauth2.googleapis.com'))return json({access_token:'fake-token'});
   if(url===ip+'/meta/push_state')return json({},404);
   if(url.startsWith(ip+'/subscripciones_push?'))return json({documents:[
     {name:ip+'/subscripciones_push/docOne',fields:{
       token:{stringValue:token},lat:{doubleValue:-38},
       lng:{doubleValue:-57.56},radius:{integerValue:'5000'}
     }}
   ]});
   if(url.endsWith(':runQuery')){
     const col=JSON.parse(opts.body).structuredQuery.from[0].collectionId;
     return json(col==='reports'?[{document:{name:ip+'/artifacts/robosmdp-d1ef3/public/data/reports/r1',fields:{
       description:{stringValue:'Alerta'},lat:{doubleValue:-38},
       lng:{doubleValue:-57.56}
     }}}]:[]);
   }
   if(url.startsWith(ip+'/push_delivery_log?')&&method==='POST'){reservations++;return json({name:'reserved'},201);}
   if(url.startsWith(ip+'/push_delivery_log/')&&method==='DELETE')return json({},200);
   if(url.includes('/messages:send'))return json({error:'error temporal'},503);
   if(url.startsWith(ip+'/meta/push_state?')&&method==='PATCH'){saves++;return json({});}
   throw Error('unexpected '+method+' '+url);
 };
 const response=await notify();
 assert.equal(response.status,503);assert.equal(saves,0);assert.equal(reservations,1);
}));
