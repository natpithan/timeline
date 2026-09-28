/* Daily Timeline Manager — service worker
   แคช app shell ให้เปิดออฟไลน์ได้ ข้อมูลกิจกรรมอยู่ใน localStorage/ไฟล์ในเครื่อง ไม่เกี่ยวกับ SW นี้เลย
   เวลาแก้ index.html แล้วอัปโหลดใหม่: เปลี่ยนเลข CACHE_VERSION ด้านล่างให้ SW รู้ว่ามีของใหม่ */
const CACHE_VERSION = 'v6';
const CACHE_NAME = 'dtm-shell-' + CACHE_VERSION;
const FONT_CACHE = 'dtm-fonts-v1';
const SHELL = [
  './',
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('dtm-shell-') && k !== CACHE_NAME)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // ฟอนต์ Google (ข้ามโดเมน): แคชตอนโหลดครั้งแรก ออฟไลน์จะได้หน้าตาเหมือนเดิม
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(req).then((hit) => {
          const net = fetch(req).then((res) => { cache.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // cache-first (เปิดไวและใช้ออฟไลน์ได้) + อัปเดตแคชเงียบๆ เบื้องหลัง เวอร์ชันใหม่จะขึ้นในการเปิดครั้งถัดไป
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((hit) => {
        const net = fetch(req).then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => null);
        if (hit) return hit;
        return net.then((res) => res || (req.mode === 'navigate' ? cache.match('index.html') : Response.error()));
      })
    )
  );
});
