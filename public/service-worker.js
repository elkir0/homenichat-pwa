// Service Worker pour Homenichat PWA
const CACHE_VERSION = '1.0.0';
const CACHE_NAME = `homenichat-v${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/logo-192.png',
  '/logo-512.png',
  '/manifest.json'
  // Les fonts externes seront cachées dynamiquement lors du fetch
];

// Installation du service worker
self.addEventListener('install', event => {
  // Force le nouveau service worker à devenir actif immédiatement
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert:', CACHE_NAME);
        // Essayer de cacher chaque URL individuellement pour éviter l'échec total
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`Impossible de cacher ${url}:`, err.message);
              // Continuer même si une URL échoue
              return Promise.resolve();
            });
          })
        );
      })
      .catch(error => {
        console.error('Erreur lors du cache:', error);
      })
  );
});

// Activation du service worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Forcer tous les clients à utiliser le nouveau service worker
      return self.clients.claim();
    })
  );
});

// Interception des requêtes
self.addEventListener('fetch', event => {
  // Ignorer les requêtes des extensions chrome
  if (event.request.url.startsWith('chrome-extension://') ||
      event.request.url.startsWith('moz-extension://') ||
      event.request.url.startsWith('edge://')) {
    return;
  }
  
  // Ne pas cacher les requêtes API
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('ws://') ||
      event.request.url.includes('wss://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retourner la réponse du cache si disponible
        if (response) {
          return response;
        }

        // Sinon, faire la requête réseau
        return fetch(event.request).then(response => {
          // Ne pas cacher les réponses non valides
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Vérifier que l'URL est cacheable (pas une extension)
          const url = event.request.url;
          if (url.startsWith('chrome-extension://') ||
              url.startsWith('moz-extension://') ||
              url.startsWith('edge://')) {
            return response;
          }

          // Cloner la réponse
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache)
                .catch(err => console.warn('Erreur cache.put:', err));
            });

          return response;
        });
      })
      .catch(error => {
        console.error('Erreur fetch:', error);
        // Retourner une page offline si disponible
        if (event.request.destination === 'document') {
          return caches.match('/offline.html');
        }
      })
  );
});

// Gestion des messages du client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notification push
self.addEventListener('push', event => {
  let title = "Homenichat";
  let body = 'Nouveau message';
  let icon = '/logo-192.png';
  let badge = '/logo-192.png';
  let tag = 'homenichat-notification';
  let data = {};
  let actions = [];
  let requireInteraction = false;
  let vibrate = [200, 100, 200];
  let renotify = false;

  // Parser les données JSON envoyées par le serveur
  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      body = payload.body || body;
      icon = payload.icon || icon;
      badge = payload.badge || badge;
      tag = payload.tag || tag;
      data = payload.data || data;
      actions = payload.actions || actions;
      requireInteraction = payload.requireInteraction || false;
      vibrate = payload.vibrate || vibrate;
      renotify = payload.renotify || false;
    } catch (e) {
      // Si ce n'est pas du JSON, utiliser le texte brut
      body = event.data.text();
    }
  }

  const options = {
    body: body,
    icon: icon,
    badge: badge,
    tag: tag,
    data: data,
    vibrate: vibrate,
    requireInteraction: requireInteraction,
    renotify: renotify,
    actions: actions
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Clic sur notification
self.addEventListener('notificationclick', event => {
  const notificationData = event.notification.data || {};

  // Gérer les actions spécifiques aux appels entrants
  if (notificationData.type === 'incoming_call') {
    event.notification.close();

    if (event.action === 'answer') {
      // Répondre à l'appel - ouvrir l'app avec paramètre d'action
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then(clientList => {
            // Chercher une fenêtre existante
            for (const client of clientList) {
              if (client.url.includes(self.location.origin) && 'focus' in client) {
                client.focus();
                client.postMessage({
                  type: 'INCOMING_CALL_ACTION',
                  action: 'answer',
                  callId: notificationData.callId
                });
                return;
              }
            }
            // Sinon, ouvrir une nouvelle fenêtre
            return clients.openWindow(`/?action=answer&callId=${notificationData.callId}`);
          })
      );
    } else if (event.action === 'reject') {
      // Rejeter l'appel - juste poster un message au client
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then(clientList => {
            for (const client of clientList) {
              if (client.url.includes(self.location.origin)) {
                client.postMessage({
                  type: 'INCOMING_CALL_ACTION',
                  action: 'reject',
                  callId: notificationData.callId
                });
              }
            }
          })
      );
    } else {
      // Clic sur la notification elle-même - ouvrir l'app
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then(clientList => {
            for (const client of clientList) {
              if (client.url.includes(self.location.origin) && 'focus' in client) {
                return client.focus();
              }
            }
            return clients.openWindow(`/?incoming=${notificationData.callId}`);
          })
      );
    }
    return;
  }

  // Pour les autres notifications (messages, etc.)
  event.notification.close();

  if (event.action === 'explore' || event.action === 'open') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          // Chercher une fenêtre existante pour la mettre au premier plan
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus();
            }
          }
          // Ouvrir une nouvelle fenêtre si aucune n'existe
          const url = notificationData.url || '/';
          return clients.openWindow(url);
        })
    );
  } else {
    // Clic simple - ouvrir l'app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus();
            }
          }
          const url = notificationData.url || '/';
          return clients.openWindow(url);
        })
    );
  }
});

// Background sync pour envoyer les messages en attente
self.addEventListener('sync', event => {
  if (event.tag === 'send-messages') {
    event.waitUntil(sendQueuedMessages());
  }
});

async function sendQueuedMessages() {
  try {
    // Ouvrir IndexedDB
    const db = await openDB();
    const tx = db.transaction('messageQueue', 'readonly');
    const store = tx.objectStore('messageQueue');
    const messages = await store.getAll();
    
    console.log(`${messages.length} messages en attente`);
    
    // Envoyer chaque message
    for (const msg of messages) {
      try {
        const response = await fetch('/api/chats/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            number: msg.chatId,
            text: msg.text,
            delay: msg.delay || 1000
          })
        });
        
        if (response.ok) {
          // Supprimer de la file après envoi réussi
          const deleteTx = db.transaction('messageQueue', 'readwrite');
          await deleteTx.objectStore('messageQueue').delete(msg.id);
          
          // Notifier l'utilisateur
          self.registration.showNotification('Message envoyé', {
            body: `Message envoyé à ${msg.chatName}`,
            icon: '/logo-192.png',
            tag: 'message-sent',
            silent: true
          });
        } else {
          console.error('Erreur envoi:', response.status);
        }
      } catch (error) {
        console.error('Erreur envoi message:', error);
      }
    }
  } catch (error) {
    console.error('Erreur sync messages:', error);
  }
}

// Helper pour ouvrir IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('HomenichatDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      // File d'attente des messages
      if (!db.objectStoreNames.contains('messageQueue')) {
        const messageStore = db.createObjectStore('messageQueue', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        messageStore.createIndex('chatId', 'chatId', { unique: false });
        messageStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Cache des conversations
      if (!db.objectStoreNames.contains('chatsCache')) {
        const chatStore = db.createObjectStore('chatsCache', { 
          keyPath: 'id' 
        });
        chatStore.createIndex('lastUpdate', 'lastUpdate', { unique: false });
      }
      
      // Cache des messages
      if (!db.objectStoreNames.contains('messagesCache')) {
        const msgStore = db.createObjectStore('messagesCache', { 
          keyPath: 'id' 
        });
        msgStore.createIndex('chatId', 'chatId', { unique: false });
      }
    };
  });
}