// Service worker: guarda la app y las librerías para que funcione sin conexión.
const CACHE = 'c3d-v10';
const CORE = ['./', 'index.html', 'vendor/three/three.module.js', 'vendor/three/bvh.module.js', 'vendor/three/bvh-csg.module.js', 'vendor/manifold/manifold.js', 'vendor/manifold/manifold.wasm', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable.png',
  'css/app.css', 'css/marca.css',
  'js/aviso-version.js', 'js/libs.js', 'js/nucleo.js', 'js/operaciones.js', 'js/interfaz.js', 'js/exportar.js',
  'js/formas.js', 'js/sketch.js', 'js/acabados.js', 'js/grupos.js', 'js/plano.js', 'js/roscas.js', 'js/grabado.js', 'js/distancias.js', 'js/layout.js', 'js/mudanza.js', 'js/marca.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mine = url.origin === location.origin;
  if (!mine) return;   // todo lo que usa la app viene del propio sitio (vendor/)
  if (mine) {
    // La app: red primero (siempre la última versión), caché si no hay conexión.
    e.respondWith(fetch(req, {cache:'no-store'}).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
      .catch(() => caches.match(req).then(m => m || caches.match('index.html'))));
  } else {
    // Librerías con versión fija: caché primero.
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return r;
    })));
  }
});
