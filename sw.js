// Each release has its own offline cache. Keep URLs relative for GitHub Pages project paths.
const CACHE_VERSION='hanja-pwa-v2.0.1-1';
const PREFIX='hanja-pwa-';
const CORE=['./','./index.html','./style.css','./app.js','./manifest.webmanifest','./data/hanja.json','./icons/icon-192.png','./icons/icon-512.png','./assets/forest.webp','./assets/fire.webp','./assets/water.webp'];
self.addEventListener('install', event=>event.waitUntil(caches.open(CACHE_VERSION).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate', event=>event.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE_VERSION).map(k=>caches.delete(k)))),
  self.clients.claim()
])));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(resp=>{
      if(resp.ok){const copy=resp.clone();caches.open(CACHE_VERSION).then(c=>c.put('./index.html',copy)).catch(()=>{});}
      return resp;
    }).catch(()=>caches.match('./index.html')));
  }else{
    event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(resp=>{
      if(resp.ok){const copy=resp.clone();caches.open(CACHE_VERSION).then(c=>c.put(event.request,copy)).catch(()=>{});}
      return resp;
    })));
  }
});
