const CACHE='burning-routine-v421';
const CORE=['./live-duration.mjs','./compact-live.css','./compact-program.mjs','./live-session.mjs','./appearance.mjs','./exercise-policy.mjs','./progression-dose.mjs','./fitness-theme.css','./image-first.css','./playback-action.mjs','./controls.css','./session-progress.mjs','./duration-fit.mjs','./duration-catalog.mjs','./extra-exercises.mjs',"./","./index.html","./style.css","./workout.css","./iphone.css","./program.css","./presets.css","./illustrated-guide.css","./illustrated-guide.mjs","./guide-timing.mjs","./exercise-media-data.mjs","./vendor/omggif.mjs","./app.js","./workout-engine.mjs","./weekly-program.mjs","./preset-program.mjs","./screen-awake.mjs","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('burning-routine-')&&k!==CACHE&&k!=='burning-routine-guide-media-v310').map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);if(url.origin!==self.location.origin)return;
  e.respondWith(fetch(e.request).then(response=>{
    if(response.ok){const canonical=new URL(e.request.url);canonical.search='';const copy=response.clone();caches.open(CACHE).then(c=>c.put(canonical.href,copy)).catch(()=>{})}
    return response;
  }).catch(async()=>{
    const hit=await caches.match(e.request,{ignoreSearch:true});if(hit)return hit;
    if(e.request.mode==='navigate')return caches.match('./index.html');
    return new Response('Offline asset unavailable',{status:503});
  }));
});
self.addEventListener('notificationclick',e=>{e.notification.close();const target=new URL(e.notification.data?.url||'./',self.registration.scope).href;e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c){c.navigate(target);return c.focus()}}return clients.openWindow(target)}));});
