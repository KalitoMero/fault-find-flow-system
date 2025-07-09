
// Service Worker für Offline-Funktionalität und Hintergrund-Synchronisation

// Type declarations for Service Worker APIs
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'production-error-reports-v1';
const OFFLINE_QUEUE_KEY = 'offline_error_reports';

// Cache-Strategien für verschiedene Ressourcen-Typen
const CACHE_STRATEGIES = {
  app: 'cache-first',    // App-Shell (HTML, CSS, JS)
  api: 'network-first',  // API-Calls
  assets: 'cache-first'  // Bilder, Fonts, etc.
};

// Zu cachende Ressourcen
const PRECACHE_URLS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Service Worker Installation
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Installed');
        return self.skipWaiting();
      })
  );
});

// Service Worker Aktivierung
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch-Events abfangen
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Nur GET-Requests cachen
  if (request.method !== 'GET') {
    // POST-Requests für Offline-Queue
    if (request.method === 'POST' && url.pathname.includes('/api/error-reports')) {
      event.respondWith(handleOfflineSync(request));
    }
    return;
  }

  // API-Requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // App-Shell und Assets
  event.respondWith(cacheFirstStrategy(request));
});

// Cache-First Strategie
const cacheFirstStrategy = async (request: Request): Promise<Response> => {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    
    // Erfolgreiche Responses cachen
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Cache-first failed:', error);
    
    // Fallback für Navigation-Requests
    if (request.mode === 'navigate') {
      const fallbackResponse = await caches.match('/');
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }
    
    throw error;
  }
};

// Network-First Strategie
const networkFirstStrategy = async (request: Request): Promise<Response> => {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network-first failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
};

// Offline-Synchronisation für Fehlermeldungen
const handleOfflineSync = async (request: Request): Promise<Response> => {
  try {
    // Versuche zuerst Netzwerk-Request
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network unavailable, queuing for sync');
    
    // Request für spätere Synchronisation speichern
    const requestData = await request.json();
    const offlineQueue = getOfflineQueue();
    offlineQueue.push({
      url: request.url,
      method: request.method,
      data: requestData,
      timestamp: Date.now()
    });
    
    // Store in IndexedDB instead of localStorage for larger data
    try {
      const db = await openDB();
      const tx = db.transaction(['offline_queue'], 'readwrite');
      const store = tx.objectStore('offline_queue');
      await store.put({ id: 'queue', data: offlineQueue });
    } catch (dbError) {
      console.log('Service Worker: Fallback to localStorage');
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
    }
    
    // Hintergrund-Sync registrieren wenn verfügbar
    if ('serviceWorker' in navigator && 'sync' in self.registration) {
      await self.registration.sync.register('error-report-sync');
    }
    
    // Erfolgreiche Response zurückgeben (simuliert)
    return new Response(JSON.stringify({ 
      success: true, 
      offline: true,
      message: 'Fehlermeldung wird bei nächster Verbindung synchronisiert'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// IndexedDB für größere Offline-Daten
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ErrorReportsDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id' });
      }
    };
  });
};

// Offline-Queue laden
const getOfflineQueue = (): any[] => {
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Service Worker: Error loading offline queue:', error);
    return [];
  }
};

// Offline-Queue abarbeiten
const processOfflineQueue = async (): Promise<void> => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  console.log(`Service Worker: Processing ${queue.length} offline items`);
  
  const processed: any[] = [];
  const failed: any[] = [];

  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data)
      });

      if (response.ok) {
        processed.push(item);
        console.log('Service Worker: Synced offline item:', item.data.id);
      } else {
        failed.push(item);
      }
    } catch (error) {
      console.log('Service Worker: Sync failed for item:', item.data.id, error);
      failed.push(item);
    }
  }

  // Queue aktualisieren (nur fehlgeschlagene Items behalten)
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failed));
  
  // Clients über erfolgreiche Synchronisation informieren
  if (processed.length > 0) {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        processed: processed.length,
        failed: failed.length
      });
    });
  }
};

// Background-Sync Event
self.addEventListener('sync', (event: any) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'error-report-sync') {
    event.waitUntil(processOfflineQueue());
  }
});

// Message-Handler für Client-Communication
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SYNC_ERROR_REPORT':
      console.log('Service Worker: Received error report for sync:', data.id);
      // Hier könnte zusätzliche Verarbeitung stattfinden
      break;
      
    case 'CHECK_OFFLINE_QUEUE':
      const queueLength = getOfflineQueue().length;
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ queueLength });
      }
      break;
      
    case 'FORCE_SYNC':
      processOfflineQueue();
      break;
  }
});

// Periodische Synchronisation (wenn online)
const startPeriodicSync = (): void => {
  setInterval(async () => {
    if (navigator.onLine) {
      const queue = getOfflineQueue();
      if (queue.length > 0) {
        console.log('Service Worker: Periodic sync check - processing queue');
        await processOfflineQueue();
      }
    }
  }, 5 * 60 * 1000); // Alle 5 Minuten
};

// Online/Offline Event-Listener
self.addEventListener('online', () => {
  console.log('Service Worker: Connection restored, processing offline queue');
  processOfflineQueue();
});

// Service Worker starten
startPeriodicSync();
