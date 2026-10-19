/* Baja segura de alertas push. Exige conocer el ID aleatorio del
 * documento y su token de FCM original. Nunca devuelve el token al cliente.
 * La cuenta de servicio se configura exclusivamente en Netlify.
 */
import crypto from 'node:crypto';

const PROJECT='robosmdp-d1ef3';
const BASE='https://firestore.googleapis.com/v1/projects/'+PROJECT+'/databases/(default)/documents';
const b64=x=>Buffer.from(x).toString('base64url');
const json=(status,value)=>new Response(JSON.stringify(value),{
  status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}
});
function equal(a,b){
  const x=Buffer.from(a),y=Buffer.from(b);
  return x.length===y.length&&crypto.timingSafeEqual(x,y);
}
async function accessToken(sa){
  const time=Math.floor(Date.now()/1000);
  const head=b64(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const data=b64(JSON.stringify({
    iss:sa.client_email,scope:'https://www.googleapis.com/auth/datastore',
    aud:'https://oauth2.googleapis.com/token',iat:time,exp:time+3600
  }));
  const sign=crypto.createSign('RSA-SHA256');
  sign.update(head+'.'+data);sign.end();
  const signed=head+'.'+data+'.'+b64(sign.sign(sa.private_key));
  const response=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({
      grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:signed
    })
  });
  if(!response.ok)throw Error('oauth '+response.status);
  return (await response.json()).access_token;
}
export default async(req)=>{
  if(req.method!=='POST')return json(405,{ok:false});
  let input;
  try{input=await req.json();}catch{return json(400,{ok:false,error:'json'});}
  const id=typeof input?.docId==='string'?input.docId:'';
  const token=typeof input?.token==='string'?input.token:'';
  if(!/^[A-Za-z0-9_-]{15,120}$/.test(id)||token.length<30||token.length>4096){
    return json(400,{ok:false,error:'invalid-input'});
  }
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT;
  if(!raw)return json(503,{ok:false,error:'configuration'});
  try{
    const sa=JSON.parse(raw);
    if(sa.project_id!==PROJECT)throw Error('project-id mismatch');
    const access=await accessToken(sa);
    const url=BASE+'/subscripciones_push/'+encodeURIComponent(id);
    const current=await fetch(url,{headers:{Authorization:'Bearer '+access}});
    if(current.status===404)return json(200,{ok:true,deleted:false});
    if(!current.ok)throw Error('firestore-read '+current.status);
    const doc=await current.json();
    const stored=doc.fields?.token?.stringValue||'';
    if(!equal(token,stored))return json(403,{ok:false,error:'token-mismatch'});
    const res=await fetch(url+'?currentDocument.updateTime='+encodeURIComponent(doc.updateTime),{
      method:'DELETE',headers:{Authorization:'Bearer '+access}
    });
    if(!res.ok&&res.status!==404&&res.status!==412)throw Error('firestore-delete '+res.status);
    if(res.status===412)return json(409,{ok:false,error:'concurrent-update'});
    return json(200,{ok:true,deleted:res.status!==404});
  }catch(e){
    // No incluir tokens ni datos personales en logs.
    console.error('push-unsubscribe',String(e.message||'service error').slice(0,120));
    return json(500,{ok:false,error:'service'});
  }
};
