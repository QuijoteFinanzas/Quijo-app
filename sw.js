/* Cache only public static app assets. Imported files never pass through fetch. */
const PREFIX='quijo-static-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+'v1.3.0';
const FILES=['./','./index.html','./style.css','./importer.js','./model.js','./vault.js','./app.js','./insights.js','./insights-ui.js','./experience.js','./public-card.js','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/apple-touch-icon.png',...['MSFT','META','MA','MCD','MC','SPGI','AMZN','AIR'].map(t=>'./assets/logos/'+t+'.svg')];
const allowed=new Set(FILES.map(f=>new URL(f,self.registration.scope).href));
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin||!allowed.has(url.href))return;event.respondWith(caches.open(CACHE).then(async cache=>{const found=await cache.match(event.request);if(found)return found;return fetch(event.request);}));});

self.addEventListener('message',event=>{if(event.data?.type==='QF_SKIP_WAITING')self.skipWaiting();});
