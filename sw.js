const CACHE='creccom-swap-shell-v2';
const CORE=[
  '/',
  '/index.html',
  '/assets/creccom-rounded-logo.png'
];
const EXTERNAL=[
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

async function warmExternal(cache,url){
  try{
    const res=await fetch(url,{mode:'cors',cache:'reload'});
    if(res && res.ok)await cache.put(url,res.clone());
  }catch(e){}
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(CORE);
    await Promise.allSettled(EXTERNAL.map(url=>warmExternal(cache,url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;

  const url=new URL(req.url);
  if(url.hostname.endsWith('.supabase.co'))return;

  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req)
        .then(res=>{
          const copy=res.clone();
          caches.open(CACHE).then(cache=>cache.put('/index.html',copy)).catch(()=>{});
          return res;
        })
        .catch(()=>caches.match('/index.html').then(r=>r||caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>{
      if(cached)return cached;
      return fetch(req).then(res=>{
        if(res && (res.ok||res.type==='opaque')){
          const copy=res.clone();
          caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});
        }
        return res;
      });
    })
  );
});
