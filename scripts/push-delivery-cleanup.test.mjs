import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import cleanup from '../netlify/functions/push-delivery-cleanup.mjs';

const backup=globalThis.fetch;
const saved=process.env.FIREBASE_SERVICE_ACCOUNT;
const keys=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const sa=JSON.stringify({project_id:'robosmdp-d1ef3',
 client_email:'test@robosmdp-d1ef3.iam.gserviceaccount.com',
 private_key:keys.privateKey.export({type:'pkcs8',format:'pem'})});
const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
test('limpieza programada solo borra registros push expirados',async()=>{
 let writes=[],queries=0;
 process.env.FIREBASE_SERVICE_ACCOUNT=sa;
 try{
  globalThis.fetch=async(url,options={})=>{
   if(url.includes('oauth2.googleapis.com'))return json({access_token:'test-access'});
   if(url.endsWith(':runQuery')){
    queries++;
    assert.equal(JSON.parse(options.body).structuredQuery.from[0].collectionId,'push_delivery_log');
    return json([{document:{name:'projects/robosmdp-d1ef3/databases/(default)/documents/push_delivery_log/expiredOne'}},
      {document:{name:'projects/robosmdp-d1ef3/databases/(default)/documents/usuarios/prohibido'}}]);
   }
   if(url.endsWith(':batchWrite')){
    writes=JSON.parse(options.body).writes;
    return json({status:[{code:0}]});
   }
   throw Error('Unexpected '+url);
  };
  const res=await cleanup();
  assert.equal(res.status,200);
  assert.equal((await res.json()).deleted,1);
  assert.equal(queries,1);
  assert.equal(writes.length,1);
  assert.match(writes[0].delete,/\/push_delivery_log\/expiredOne$/);
 }finally{
  globalThis.fetch=backup;
  if(saved===undefined)delete process.env.FIREBASE_SERVICE_ACCOUNT;
  else process.env.FIREBASE_SERVICE_ACCOUNT=saved;
 }
});
