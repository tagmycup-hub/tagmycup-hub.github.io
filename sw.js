/* 进货价格本 · 离线缓存 */
const CACHE='pricebook-84b25630';
const ASSETS=['./','./index.html','./manifest.webmanifest'];

self.addEventListener('install',e=>{
  // 首次安装（无控制者）直接激活；已有旧版时等页面确认再激活
  if(!self.registration.active) self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{})));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(
    ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))
  )).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  // Supabase 等跨域请求：直连，不缓存
  if(url.origin!==location.origin)return;
  // 页面本体：网络优先，失败回缓存（保证更新能拿到新版）
  if(req.mode==='navigate'||url.pathname.endsWith('index.html')){
    e.respondWith(
      fetch(req).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp));return r;})
                .catch(()=>caches.match(req).then(r=>r||caches.match('./index.html')))
    );
    return;
  }
  // 其余：缓存优先
  e.respondWith(caches.match(req).then(r=>r||fetch(req).then(res=>{
    const cp=res.clone();caches.open(CACHE).then(c=>c.put(req,cp));return res;
  }).catch(()=>r)));
});

// 收到页面指令：立刻激活新版本
self.addEventListener('message',e=>{
  if(e.data && e.data.type==='SKIP_WAITING') self.skipWaiting();
});
