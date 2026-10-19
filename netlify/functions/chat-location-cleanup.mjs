/* Chat GPS voluntario: borrar puntos privados vencidos una vez por hora.
 * Solo toca chat_location_private. No imprime posiciones ni UIDs en logs.
 */
import crypto from 'node:crypto';
const PROJECT='robosmdp-d1ef3';
const FS=`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const b64=b=>Buffer.from(b).toString('base64url');
async function token(sa){
  const now=Math.floor(Date.now()/1000);
  const header=b64(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const payload=b64(JSON.stringify({iss:sa.client_email,
    scope:'https://www.googleapis.com/auth/datastore',
    aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));
  const signer=crypto.createSign('RSA-SHA256');
  signer.update(header+'.'+payload);signer.end();
  const assertion=header+'.'+payload+'.'+b64(signer.sign(sa.private_key));
  const res=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})
  });
  if(!res.ok)throw Error('oauth '+res.status);
  return (await res.json()).access_token;
}
async function expiredDocs(auth){
  const now=new Date().toISOString();
  const body={structuredQuery:{
    from:[{collectionId:'chat_location_private'}],
    where:{fieldFilter:{field:{fieldPath:'expires_at'},
      op:'LESS_THAN_OR_EQUAL',value:{timestampValue:now}}},
    orderBy:[{field:{fieldPath:'expires_at'},direction:'ASCENDING'}],
    select:{fields:[{fieldPath:'expires_at'}]},limit:200
  }};
  const r=await fetch(FS+':runQuery',{method:'POST',
    headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json'},
    body:JSON.stringify(body)});
  if(!r.ok)throw Error('query '+r.status);
  const rows=await r.json();
  return (Array.isArray(rows)?rows:[])
    .filter(x=>x.document?.name?.startsWith(
      'projects/'+PROJECT+'/databases/(default)/documents/chat_location_private/'))
    .map(x=>({name:x.document.name,updateTime:x.document.updateTime}))
    .filter(x=>typeof x.updateTime==='string'&&x.updateTime.length>0);
}
async function erase(names,auth){
  if(!names.length)return;
  const r=await fetch(FS+':batchWrite',{method:'POST',
    headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json'},
    // Evitar borrar una ubicación que el usuario renovó luego de la consulta.
    body:JSON.stringify({writes:names.map(doc=>({
      delete:doc.name,currentDocument:{updateTime:doc.updateTime}
    }))})});
  if(!r.ok)throw Error('batchWrite '+r.status);
  const j=await r.json();
  if((j.status||[]).some(v=>v?.code&&v.code!==0&&v.code!==5)){
    throw Error('failed batch');
  }
}
export default async()=>{
  try{
    const raw=process.env.FIREBASE_SERVICE_ACCOUNT;
    if(!raw)return new Response('Missing configuration',{status:503});
    const sa=JSON.parse(raw);if(sa.project_id!==PROJECT)throw Error('project');
    const auth=await token(sa);
    let removed=0;
    for(let i=0;i<10;i++){
      const docs=await expiredDocs(auth);
      if(!docs.length)break;
      await erase(docs,auth);removed+=docs.length;
      if(docs.length<200)break;
    }
    console.log('Puntos GPS temporales vencidos eliminados:',removed);
    return new Response(JSON.stringify({deleted:removed}),{
      headers:{'Content-Type':'application/json'},status:200});
  }catch(e){
    console.error('chat-location-cleanup',String(e.message||'failed').slice(0,75));
    return new Response(JSON.stringify({ok:false}),{status:500});
  }
};
export const config={schedule:'15 * * * *'};
