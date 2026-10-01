/* Local encrypted storage. Passwords and keys are never persisted. */
(function (global) {
'use strict';
const enc=new TextEncoder(), dec=new TextDecoder(), rounds=310000;
const basePath=location.protocol==='file:'?location.pathname:location.pathname.replace(/[^/]*$/, '');
const scope=basePath.replace(/[^a-z0-9]/gi,'_').slice(0,100);
const dbName='quijo-vault-v1-'+scope;
let key=null, salt=null;
const b64=a=>{let s='';for(const b of new Uint8Array(a))s+=String.fromCharCode(b);return btoa(s);};
const un64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open(dbName,1);r.onupgradeneeded=()=>r.result.createObjectStore('vault');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('No se puede acceder al almacenamiento de este navegador.'));});}
async function store(value,remove=false){const d=await db();try{return await new Promise((resolve,reject)=>{const t=d.transaction('vault',value===undefined&&!remove?'readonly':'readwrite'),s=t.objectStore('vault');const r=remove?s.delete('main'):value===undefined?s.get('main'):s.put(value,'main');let result;r.onsuccess=()=>{result=r.result;};t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error||Error('No se ha podido guardar.'));t.onabort=()=>reject(t.error||Error('Guardado cancelado.'));});}finally{d.close();}}
function check(e){if(!e||e.schema!=='quijo-encrypted'||e.version!==1||e.algorithm!=='AES-GCM'||e.iterations!==rounds||typeof e.salt!=='string'||typeof e.iv!=='string'||typeof e.data!=='string'||e.data.length>35000000)throw Error('La copia cifrada no es compatible.');if(un64(e.salt).length!==16||un64(e.iv).length!==12)throw Error('Copia cifrada no valida.');return e;}
async function derive(password,s){if(!global.crypto?.subtle)throw Error('Para guardar cifrado necesitas HTTPS o localhost. Puedes abrir el Excel sin guardar.');const material=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:s,iterations:rounds,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function encrypt(payload){if(!key||!salt)throw Error('El archivo local esta bloqueado.');const iv=crypto.getRandomValues(new Uint8Array(12)),data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode('quijo-v1'),tagLength:128},key,enc.encode(JSON.stringify(payload)));return {schema:'quijo-encrypted',version:1,algorithm:'AES-GCM',iterations:rounds,salt:b64(salt),iv:b64(iv),data:b64(data)};}
async function create(password,payload){if(password.length<10)throw Error('Utiliza una contrasena de al menos 10 caracteres.');salt=crypto.getRandomValues(new Uint8Array(16));key=await derive(password,salt);try{await store(await encrypt(payload));}catch(e){key=null;salt=null;throw e;}}
async function unlock(password,envelope,activate=true){const e=check(envelope||await store()),s=un64(e.salt),k=await derive(password,s);let plain;try{plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(e.iv),additionalData:enc.encode('quijo-v1'),tagLength:128},k,un64(e.data));}catch(_){throw Error('Contrasena incorrecta o copia danada.');}const payload=JSON.parse(dec.decode(plain));if(activate){key=k;salt=s;}return payload;}
global.QFVault={read:()=>store(),create,unlock,save:async p=>store(await encrypt(p)),storeEnvelope:e=>store(check(e)),check,forget:()=>store(undefined,true),lock:()=>{key=null;salt=null;},unlocked:()=>!!key};
})(window);
