/**
 * ICS Tracking & Monitoring Tool
 * Phase 7: Production Polish — Service Worker
 */
'use strict';

const CACHE_NAME = 'ics-tracker-cache-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './css/styles.css',
  './css/phase2.css',
  './css/phase3.css',
  './css/phase4.css',
  './css/phase5.css',
  './css/phase6.css',
  './css/phase7.css',
  './js/app.js',
  './js/router.js',
  './js/db/db.js',
  './js/utils/utils.js',
  './js/ui/modal.js',
  './js/ui/command-palette.js',
  './js/ui/print-engine.js',
  './js/services/validation.js',
  './js/services/search-engine.js',
  './js/services/recent-activity.js',
  './js/services/favorites-manager.js',
  './js/services/search-history.js',
  './js/services/timeline-service.js',
  './js/services/monitoring-service.js',
  './js/services/health-analyzer.js',
  './js/services/relationship-engine.js',
  './js/services/notification-engine.js',
  './js/services/settings-manager.js',
  './js/services/report-engine.js',
  './js/services/export-service.js',
  './js/services/backup-manager.js',
  './js/services/maintenance-service.js',
  './js/services/audit-logger.js',
  './js/services/record-service.js',
  './js/pages/dashboard.js',
  './js/pages/records.js',
  './js/pages/viewer.js',
  './js/pages/new-ics.js',
  './js/pages/notifications.js',
  './js/pages/reports.js',
  './js/pages/settings.js'
];

// Install: Cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ServiceWorker] Caching App Shell and Page Modules...');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache version:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate caching strategy
self.addEventListener('fetch', event => {
  // Only handle GET requests and skip browser extensions or HTTP schemes other than http/https
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Cache valid response
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Offline fallback
          return cachedResponse;
        });
        
        return cachedResponse || fetchPromise;
      });
    })
  );
});
