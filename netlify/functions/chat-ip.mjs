/* Netlify Function — IP y ubicación aproximada del chat en Firestore privado.
 * Exige Firebase ID token validado y un documento de presencia del mismo UID.
 * No confía en el UID que llega desde el navegador.
 */
import crypto from 'node:crypto';
const PROJECT_ID='robosmdp-d1ef3';
// La API key WEB pública es la misma del frontend, no es un secreto de servicio.
const WEB_API_KEY=process.env.FIREBASE_WEB_API_KEY||'AIzaSyCm2rB0jOpvoi_wLpxVSMk0nip1pR62mjo';
const FS=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const FIELDS=['uid','ip','ciudad','region','pais','isp','actualizado'];
const b64url=b=>Buffer.from(b).toString('base64url');

function json(status,body){
  return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
}
async function authUid(req){
  const match=/^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')||'');
  if(!match)return null;
  const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(WEB_API_KEY),{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({idToken:match[1]})
  });
  if(!r.ok)return null;
  const j=await r.json();
  return typeof j.users?.[0]?.localId==='string'?j.users[0].localId:null;
}
async function accessToken(sa){
  const now=Math.floor(Date.now()/1000);
  const h=b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const p=b64url(JSON.stringify({
    iss:sa.client_email,scope:'https://www.googleapis.com/auth/datastore',
    aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600
  }));
  const sign=crypto.createSign('RSA-SHA256');sign.update(h+'.'+p);sign.end();
  const assertion=h+'.'+p+'.'+b64url(sign.sign(sa.private_key));
  const res=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})
  });
  if(!res.ok)throw new Error('oauth '+res.status);
  return (await res.json()).access_token;
}
async function ownerOf(sid,token){
  const r=await fetch(FS+'/chat_presencia/'+encodeURIComponent(sid),{
    headers:{Authorization:'Bearer '+token}
  });
  if(r.status===404)return null;
  if(!r.ok)throw new Error('presence '+r.status);
  const f=(await r.json()).fields||{};
  const age=Date.now()-Date.parse(f.ultimo_ping?.timestampValue||'');
  if(!Number.isFinite(age)||age< -60000||age>5*60*1000)return null;
  return f.uid?.stringValue||null;
}
function clientIp(req,context){
  // Usar cabecera gestionada por Netlify, no una cabecera X-Forwarded-For arbitraria.
  return String(req.headers.get('x-nf-client-connection-ip')||context?.ip||'').trim();
}
async function geoFor(ip,context){
  const geo={
    ip,ciudad:context?.geo?.city||'',region:context?.geo?.subdivision?.name||'',
    pais:context?.geo?.country?.name||'',isp:''
  };
  if(!ip||ip==='127.0.0.1'||ip==='::1')return geo;
  // Geolocalización opcional vía HTTPS. Si falla, se conserva la IP original.
  try{
    const r=await fetch('https://ipwho.is/'+encodeURIComponent(ip),{signal:AbortSignal.timeout(2500)});
    if(r.ok){
      const v=await r.json();
      if(v.success!==false){
        geo.ciudad=v.city||geo.ciudad;geo.region=v.region||geo.region;
        geo.pais=v.country||geo.pais;geo.isp=v.connection?.isp||'';
      }
    }
  }catch{}
  return geo;
}
export default async(req,context)=>{
  if(req.method!=='POST')return json(405,{ok:false,error:'method'});
  let body;
  try{body=await req.json();}catch{return json(400,{ok:false,error:'json'});}
  const sid=typeof body?.sessionId==='string'?body.sessionId:'';
  if(!/^[A-Za-z0-9_-]{8,100}$/.test(sid))return json(400,{ok:false,error:'sessionId'});
  let uid;
  try{uid=await authUid(req);}catch{return json(503,{ok:false,error:'auth-service'});}
  if(!uid)return json(401,{ok:false,error:'unauthorized'});
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT;
  if(!raw)return json(503,{ok:false,error:'config'});
  try{
    const sa=JSON.parse(raw);
    if(sa.project_id!==PROJECT_ID)throw new Error('config-project');
    const token=await accessToken(sa);
    if((await ownerOf(sid,token))!==uid)return json(403,{ok:false,error:'session'});
    const data=await geoFor(clientIp(req,context),context);
    const fields={uid:{stringValue:uid},ip:{stringValue:data.ip},
      ciudad:{stringValue:data.ciudad},region:{stringValue:data.region},
      pais:{stringValue:data.pais},isp:{stringValue:data.isp},
      actualizado:{timestampValue:new Date().toISOString()}};
    const mask=FIELDS.map(f=>'updateMask.fieldPaths='+encodeURIComponent(f)).join('&');
    const res=await fetch(FS+'/chat_ip_private/'+encodeURIComponent(sid)+'?'+mask,{
      method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({fields})
    });
    if(!res.ok)throw new Error('private-write '+res.status);
    return json(200,{ok:true});
  }catch(e){
    // Nunca registrar en los logs IP, token ni datos personales.
    console.error('chat-ip error',String(e.message||'unknown').replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g,'[IP]'));
    return json(500,{ok:false,error:'internal'});
  }
};
