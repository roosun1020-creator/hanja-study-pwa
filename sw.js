// Increment CACHE_VERSION when deploying revised site assets.
const CACHE_VERSION = 'hanja-pwa-v2.0.0-1';
const SHELL = ['./','./index.html','./style.css','./app.js','./manifest.webmanifest','./data/hanja.json','./icons/icon-192.png','./icons/icon-512.png','./assets/forest.webp','./assets/fire.webp','./assets/water.webp'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('hanja-pwa-') && k !== CACHE_VERSION).map(k => caches.delete(k)))), self.clients.claim()]));
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {if (response.ok) {const saved=response.clone();caches.open(CACHE_VERSION).then(cache=>cache.put('./index.html',saved)).catch(()=>{});}return response;}).catch(()=>caches.match('./index.html')));
  } else {
    event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{if(response.ok){const saved=response.clone();caches.open(CACHE_VERSION).then(cache=>cache.put(event.request,saved)).catch(()=>{});}return response;})));
  }
});
