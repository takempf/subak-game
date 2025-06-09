const CACHE_NAME = 'subak-cache-v1';
const urlsToCache = [
  '/', // Corresponds to /index.html
  '/index.html',
  '/.nojekyll',
  '/CNAME',
  '/_app/env.js',
  '/_app/version.json',
  '/favicon.png',
  '/images/fruits/apple.png',
  '/images/fruits/blueberry.png',
  '/images/fruits/dragonfruit.png',
  '/images/fruits/grape.png',
  '/images/fruits/honeydew.png',
  '/images/fruits/lemon.png',
  '/images/fruits/orange.png',
  '/images/fruits/peach.png',
  '/images/fruits/pear.png',
  '/images/fruits/pineapple.png',
  '/images/fruits/watermelon.png',
  '/opengraph.png',
  '/sounds/bump.wav',
  '/sounds/pop.wav',
  // Files from docs/_app/immutable/assets/
  '/_app/immutable/assets/2.BcSkHU5w.css',
  '/_app/immutable/assets/_page.BP1C7cTP.css',
  // Files from docs/_app/immutable/chunks/
  '/_app/immutable/chunks/Bkc3y7n4.js',
  '/_app/immutable/chunks/BzQe2He3.js',
  '/_app/immutable/chunks/CQ73_Am2.js',
  '/_app/immutable/chunks/D728-70E.js',
  '/_app/immutable/chunks/DL2YzMrV.js',
  '/_app/immutable/chunks/DQlI39BD.js',
  '/_app/immutable/chunks/DZ63trv_.js',
  '/_app/immutable/chunks/Df6ZkciU.js',
  '/_app/immutable/chunks/Xcl2KTUD.js',
  // Files from docs/_app/immutable/entry/
  '/_app/immutable/entry/app.C2ZZUSVu.js',
  '/_app/immutable/entry/start.Bo0lxw5K.js',
  // Files from docs/_app/immutable/nodes/
  '/_app/immutable/nodes/0.DurclalL.js',
  '/_app/immutable/nodes/1.Dq0vEwB4.js',
  '/_app/immutable/nodes/2.DCDu2-3u.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // IMPORTANT: Clone the request. A request is a stream and
        // can only be consumed once. Since we are consuming this
        // once by cache and once by the browser for fetch, we need
        // to clone the response.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
