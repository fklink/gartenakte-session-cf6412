'use strict';

const CACHE_NAME = 'gartenakte-v0.4.1';
const APP_SHELL = [
  './index.html?share=ebd7b1',
  './style.css',
  './app.js',
  './pwa.js',
  './manifest.webmanifest',
  './qr.html',
  './404.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('gartenakte-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          if (event.request.mode === 'navigate') {
            return (await caches.match('./index.html?share=ebd7b1')) || (await caches.match('./404.html'));
          }
          throw new Error('Offline und Ressource nicht im Cache.');
        }))
  );
});
