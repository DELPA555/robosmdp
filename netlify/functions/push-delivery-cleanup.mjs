/* Robos MDP — purga programada de marcadores de notificaciones.
 * NO toca tokens, suscripciones, denuncias, chat ni campañas comerciales.
 * Requiere FIREBASE_SERVICE_ACCOUNT en el entorno Netlify; nunca en Git.
 */
import crypto from 'node:crypto';
const PROJECT='robosmdp-d1ef3';
const FS=`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const base64=b=>Buffer.from(b).toString('base64url');
const BATCH=250,MAX_PAGES=12;
async function accessToken(sa){
  const now=Math.floor(Date.now()/1000);
  const head=base64(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const body=base64(JSON.stringify({
    iss:sa.client_email,scope:'https://www.googleapis.com/auth/datastore',
    aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600
  }));
  const signer=crypto.createSign('RSA-SHA256');
  signer.update(head+'.'+body);signer.end();
  const assertion=head+'.'+body+'.'+base64(signer.sign(sa.private_key));
  const response=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})
  });
  if(!response.ok)throw Error('oauth '+response.status);
  return (await response.json()).access_token;
}
async function findExpired(token){
  const query={structuredQuery:{
    from:[{collectionId:'push_delivery_log'}],
    where:{fieldFilter:{field:{fieldPath:'expiresAt'},
      op:'LESS_THAN',value:{timestampValue:new Date().toISOString()}}},
    orderBy:[{field:{fieldPath:'expiresAt'},direction:'ASCENDING'}],
    select:{fields:[{fieldPath:'expiresAt'}]},
    limit:BATCH
  }};
  const res=await fetch(FS+':runQuery',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(query)
  });
  if(!res.ok)throw Error('runQuery '+res.status);
  const data=await res.json();
  return (Array.isArray(data)?data:[])
    .filter(d=>d.document?.name?.includes('/documents/push_delivery_log/'))
    .map(d=>d.document.name);
}
async function deleteBatch(names,token){
  if(!names.length)return 0;
  const res=await fetch(FS+':batchWrite',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({writes:names.map(name=>({delete:name}))})
  });
  if(!res.ok)throw Error('batchWrite '+res.status);
  const data=await res.json();
  const errors=(data.status||[]).filter(s=>s&&s.code&&s.code!==0&&s.code!==5);
  if(errors.length)throw Error('Firestore no pudo borrar todos los marcadores');
  return names.length;
}
export default async()=>{
  try{
    const raw=process.env.FIREBASE_SERVICE_ACCOUNT;
    if(!raw)return new Response('Falta configuración de Firebase',{status:503});
    const sa=JSON.parse(raw);
    if(sa.project_id!==PROJECT)throw Error('Proyecto incorrecto');
    const token=await accessToken(sa);
    let total=0,pages=0;
    for(;pages<MAX_PAGES;pages++){
      const docs=await findExpired(token);
      if(!docs.length)break;
      total+=await deleteBatch(docs,token);
      if(docs.length<BATCH)break;
    }
    console.log('Marcadores push vencidos eliminados:',total);
    return new Response(JSON.stringify({deleted:total}),{
      status:200,headers:{'Content-Type':'application/json'}
    });
  }catch(e){
    console.error('push-delivery-cleanup',String(e.message||'error').slice(0,100));
    return new Response(JSON.stringify({ok:false}),{status:500});
  }
};
// UTC 05:15 = Argentina 02:15 (UTC-3).
export const config={schedule:'15 5 * * *'};
