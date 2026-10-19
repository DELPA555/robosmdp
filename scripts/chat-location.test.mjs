import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import cleanup from '../netlify/functions/chat-location-cleanup.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const script=read('robosmdp/assets/chat-location.js');
const chat=read('robosmdp/chat.html');
const portal=read('robosmdp/index.html');
const rules=read('firestore.rules');
const originalFetch=globalThis.fetch;
const originalSA=process.env.FIREBASE_SERVICE_ACCOUNT;

test('el GPS requiere acción afirmativa y permite revocar, no sigue en segundo plano',()=>{
  assert.doesNotThrow(()=>new vm.Script(script));
  assert.match(chat,/RMDPChatGPS\.share\(\)/);
  assert.match(chat,/Aceptar y compartir ubicación/);
  assert.match(chat,/RMDPChatGPS\.revoke\(\)/);
  assert.match(script,/navigator\.geolocation\.getCurrentPosition\(/);
  assert.doesNotMatch(script,/navigator\.geolocation\.watchPosition\s*\(/);
  assert.doesNotMatch(script,/getCurrentPosition\s*\(\s*\)\s*;/);
  assert.match(script,/if\(busy\|\|!available\(\)\)return/);
  assert.match(script,/auth\.currentUser\?\.uid!==uid/);
});

test('el administrador solamente muestra ubicaciones compartidas aún vigentes',()=>{
  assert.match(portal,/collection\('chat_location_private'\)\.onSnapshot/);
  assert.match(portal,/const gpsActive=_chatA\.gps\.filter/);
  assert.match(portal,/until>Date\.now\(\)/);
  assert.match(portal,/GPS voluntario activo/);
  assert.match(rules,/match \/chat_location_private\/\{uid\}/);
  assert.match(rules,/allow list: if isAdmin\(\);/);
});

test('la limpieza solo elimina ubicaciones GPS vencidas, nunca otros datos',async()=>{
  const keys=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
  const sa={project_id:'robosmdp-d1ef3',
    client_email:'test@robosmdp-d1ef3.iam.gserviceaccount.com',
    private_key:keys.privateKey.export({type:'pkcs8',format:'pem'})};
  process.env.FIREBASE_SERVICE_ACCOUNT=JSON.stringify(sa);
  const json=(o,status=200)=>new Response(JSON.stringify(o),{status});
  let writes=[];
  try{
    globalThis.fetch=async(url,opts={})=>{
      if(url.includes('oauth2.googleapis.com'))return json({access_token:'fake'});
      if(url.endsWith(':runQuery')){
        assert.equal(JSON.parse(opts.body).structuredQuery.from[0].collectionId,
          'chat_location_private');
        return json([{document:{
          name:'projects/robosmdp-d1ef3/databases/(default)/documents/chat_location_private/owner1'
        }},{document:{
          name:'projects/robosmdp-d1ef3/databases/(default)/documents/chat_ip_private/protected'
        }}]);
      }
      if(url.endsWith(':batchWrite')){
        writes=JSON.parse(opts.body).writes;return json({status:[{code:0}]});
      }
      throw Error('unexpected URL');
    };
    const res=await cleanup();
    assert.equal(res.status,200);
    assert.equal((await res.json()).deleted,1);
    assert.deepEqual(writes.map(x=>x.delete),
      ['projects/robosmdp-d1ef3/databases/(default)/documents/chat_location_private/owner1']);
  }finally{
    globalThis.fetch=originalFetch;
    if(originalSA==null)delete process.env.FIREBASE_SERVICE_ACCOUNT;
    else process.env.FIREBASE_SERVICE_ACCOUNT=originalSA;
  }
});
