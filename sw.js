/* Loop's service worker: keeps a copy of the app on the phone, so it opens instantly and works with no connection.
   The version below changes with every release. A new version makes a fresh copy, and the old one is cleared out. */
const VERSION = 'loop-9e9647240e';
// what the app can't start without
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.png',
  'vendor/recursive.woff2', 'vendor/skulpt.min.js', 'vendor/skulpt-stdlib.js', 'vendor/sql-asm.js'];
// the larger tools for React and Next.js: stored too, but a failure here doesn't stop the install
const LATER = ['vendor/react.production.min.js', 'vendor/react-dom.production.min.js', 'vendor/babel.min.js'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION)
    .then(cache => cache.addAll(SHELL).then(() => Promise.all(LATER.map(url => cache.add(url).catch(() => null)))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.indexOf('loop-') === 0 && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isPage = req.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname);
  event.respondWith(caches.open(VERSION).then(cache => {
    const key = isPage ? 'index.html' : req;
    return cache.match(key, { ignoreSearch: true }).then(hit => {
      // fetch a fresh copy in the background, so the next visit has the latest
      const fresh = fetch(req).then(res => { if (res && res.ok) cache.put(key, res.clone()); return res; });
      if (hit) { if (isPage) fresh.catch(() => null); return hit; }
      return fresh;
    });
  }));
});
