const CACHE_NAME = 'sports-os-v1';
const STATIC_ASSETS = [
    '/pages/login.html',
    '/pages/register.html',
    '/css/global.css',
    '/css/auth.css',
    '/css/sidebar.css',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    // Always go to network for API calls
    if (event.request.url.includes('/api/')) {
        return event.respondWith(fetch(event.request));
    }
    // For pages — network first, fall back to cache
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});