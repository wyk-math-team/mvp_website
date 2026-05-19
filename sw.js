// sw.js - Service Worker with network-first for qs.json
const CACHE_NAME = 'wyk-math-v1';
const urlsToCache = [
  './',
  './index.html',
  './login.html',
  './problems.html',
  './submissions.html',
  './terminal.html',
  './styles.css',
  './auth.js',
  './app.js',
  // 注意：qs.json 不再预先缓存到列表，而是动态网络优先
];

// 安装阶段：只缓存非动态数据（静态页面和脚本）
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // 过滤掉 qs.json，避免安装时缓存旧版本
        const staticUrls = urlsToCache.filter(url => !url.includes('qs.json'));
        return cache.addAll(staticUrls);
      })
      .catch(err => console.error('Cache addAll failed:', err))
  );
  self.skipWaiting();
});

// 激活阶段：删除旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：对 qs.json 使用网络优先策略，其他资源使用缓存优先
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // 对于 qs.json 文件：网络优先，失败时使用缓存
  if (url.pathname.endsWith('/qs.json') || url.pathname === '/qs.json') {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // 网络请求成功，克隆并存入缓存，然后返回网络结果
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // 网络失败时，从缓存中读取
          return caches.match(event.request);
        })
    );
  } else {
    // 其他资源（HTML、JS、CSS等）：缓存优先（提高性能）
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          });
        })
    );
  }
});
