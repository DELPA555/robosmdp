/* Migración única: IP/geo heredados en chat_presencia => chat_ip_private.
 * No imprime IP ni ubicación. Modo predeterminado: simulación, sin cambios.
 * NODE >=18; FIREBASE_SERVICE_ACCOUNT configurada fuera del repositorio.
 */
import crypto from 'node:crypto';

const PROJECT='robosmdp-d1ef3';
const BASE=`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const SENSITIVE=['ip','ciudad','region','pais','isp','fingerprint'];
const apply=process.argv.includes('--apply');
const encoded=s=>Buffer.from(s).toString('base64url');
const sa=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT||'null');
if(!sa?.client_email||!sa?.private_key||sa.project_id!==PROJECT){
  console.error('Falta una cuenta de servicio válida para '+PROJECT);
  process.exit(1);
}
async function authToken(){
  const now=Math.floor(Date.now()/1000);
  const h=encoded(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const p=encoded(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));
  const sign=crypto.createSign('RSA-SHA256');sign.update(h+'.'+p);sign.end();
  const assertion=h+'.'+p+'.'+encoded(sign.sign(sa.private_key));
  const r=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})
  });
  if(!r.ok)throw new Error('OAuth '+r.status);
  return (await r.json()).access_token;
}
const token=await authToken();
async function call(url,opts={}){
  const r=await fetch(url,{...opts,headers:{Authorization:'Bearer '+token,...opts.headers}});
  if(!r.ok)throw new Error('Firestore '+r.status+' ('+new URL(url).pathname+')');
  return r.status===204?{}:r.json();
}
let page='',checked=0,legacy=0,migrated=0;
do{
  const data=await call(BASE+'/chat_presencia?pageSize=200'+(page?'&pageToken='+encodeURIComponent(page):''));
  for(const d of data.documents||[]){
    checked++;
    const fields=d.fields||{};
    const names=SENSITIVE.filter(f=>Object.hasOwn(fields,f));
    if(!names.length)continue;
    legacy++;
    if(!apply)continue;
    const sid=d.name.split('/').pop();
    const dest=BASE+'/chat_ip_private/'+encodeURIComponent(sid);
    const existing=await fetch(dest,{headers:{Authorization:'Bearer '+token}});
    if(existing.status!==200&&existing.status!==404)throw new Error('Verificación de registro '+existing.status);
    if(existing.status===404){
      const privateFields={
        uid:fields.uid||{stringValue:''},
        actualizado:{timestampValue:new Date().toISOString()}
      };
      for(const f of names)privateFields[f]=fields[f];
      const mask=Object.keys(privateFields).map(f=>'updateMask.fieldPaths='+encodeURIComponent(f)).join('&');
      await call(dest+'?'+mask,{
        method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({fields:privateFields})
      });
    }
    // Nunca quitar del registro público antes de conservarlo en el privado.
    const mask=names.map(f=>'updateMask.fieldPaths='+encodeURIComponent(f)).join('&');
    await call('https://firestore.googleapis.com/v1/'+d.name+'?'+mask,{
      method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({fields:{}})
    });
    migrated++;
  }
  page=data.nextPageToken||'';
}while(page);
console.log(JSON.stringify({
  modo:apply?'APLICADO':'SIMULACIÓN',documentos_revisados:checked,
  con_campos_sensibles:legacy,migrados:migrated
}));
