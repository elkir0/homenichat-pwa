/**
 * Service de gestion de la file d'attente hors ligne
 * Utilise IndexedDB pour stocker les messages en attente
 */

class OfflineQueueService {
  constructor() {
    this.dbName = 'LekipChatDB';
    this.dbVersion = 1;
    this.db = null;
    this.isOnline = navigator.onLine;
    
    // Écouter les changements de connexion
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }
  
  /**
   * Initialiser la base de données
   */
  async init() {
    try {
      this.db = await this.openDB();
      
      // Traiter la file si on est en ligne
      if (this.isOnline) {
        await this.processQueue();
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Ouvrir la base de données
   */
  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Table pour la file d'attente des messages
        if (!db.objectStoreNames.contains('messageQueue')) {
          const messageStore = db.createObjectStore('messageQueue', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          messageStore.createIndex('chatId', 'chatId', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
          messageStore.createIndex('status', 'status', { unique: false });
        }
        
        // Table pour le cache des conversations
        if (!db.objectStoreNames.contains('chatsCache')) {
          const chatStore = db.createObjectStore('chatsCache', { 
            keyPath: 'id' 
          });
          chatStore.createIndex('lastUpdate', 'lastUpdate', { unique: false });
        }
        
        // Table pour le cache des messages
        if (!db.objectStoreNames.contains('messagesCache')) {
          const msgStore = db.createObjectStore('messagesCache', { 
            keyPath: 'id' 
          });
          msgStore.createIndex('chatId', 'chatId', { unique: false });
          msgStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }
  
  /**
   * Ajouter un message à la file d'attente
   */
  async queueMessage(message) {
    if (!this.db) await this.init();
    
    const tx = this.db.transaction('messageQueue', 'readwrite');
    const store = tx.objectStore('messageQueue');
    
    const queueItem = {
      ...message,
      timestamp: Date.now(),
      status: 'pending',
      attempts: 0
    };
    
    try {
      await store.add(queueItem);
      
      // Essayer d'envoyer immédiatement si en ligne
      if (this.isOnline) {
        await this.processQueue();
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Traiter la file d'attente
   */
  async processQueue() {
    if (!this.db || !this.isOnline) return;
    
    const tx = this.db.transaction('messageQueue', 'readonly');
    const store = tx.objectStore('messageQueue');
    const index = store.index('status');
    
    // Récupérer les messages en attente
    const messages = await index.getAll('pending');
    
    // Vérifier que messages est un tableau
    if (!messages || !Array.isArray(messages)) {
      return;
    }
    
    
    for (const msg of messages) {
      await this.sendQueuedMessage(msg);
    }
  }
  
  /**
   * Envoyer un message de la file
   */
  async sendQueuedMessage(queueItem) {
    try {
      // Simuler l'envoi (remplacer par l'appel API réel)
      const response = await fetch('/api/baileys/message/sendText/lekipchat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: queueItem.chatId,
          text: queueItem.text,
          delay: queueItem.delay || 1000
        })
      });
      
      if (response.ok) {
        // Marquer comme envoyé
        await this.updateMessageStatus(queueItem.id, 'sent');
        
        // Notifier l'utilisateur
        if ('serviceWorker' in navigator && 'Notification' in window) {
          const registration = await navigator.serviceWorker.ready;
          registration.showNotification('Message envoyé', {
            body: `Message envoyé à ${queueItem.chatName}`,
            icon: '/logo-192.png',
            tag: 'message-sent',
            silent: true
          });
        }
        
        return true;
      } else {
        // Incrémenter les tentatives
        await this.incrementAttempts(queueItem.id);
        return false;
      }
    } catch (error) {
      await this.incrementAttempts(queueItem.id);
      return false;
    }
  }
  
  /**
   * Mettre à jour le statut d'un message
   */
  async updateMessageStatus(id, status) {
    const tx = this.db.transaction('messageQueue', 'readwrite');
    const store = tx.objectStore('messageQueue');
    
    const message = await store.get(id);
    if (message) {
      message.status = status;
      message.sentAt = Date.now();
      await store.put(message);
    }
  }
  
  /**
   * Incrémenter les tentatives d'envoi
   */
  async incrementAttempts(id) {
    const tx = this.db.transaction('messageQueue', 'readwrite');
    const store = tx.objectStore('messageQueue');
    
    const message = await store.get(id);
    if (message) {
      message.attempts += 1;
      
      // Marquer comme échoué après 3 tentatives
      if (message.attempts >= 3) {
        message.status = 'failed';
      }
      
      await store.put(message);
    }
  }
  
  /**
   * Récupérer les messages en attente
   */
  async getPendingMessages() {
    if (!this.db) await this.init();
    
    const tx = this.db.transaction('messageQueue', 'readonly');
    const store = tx.objectStore('messageQueue');
    const index = store.index('status');
    
    return await index.getAll('pending');
  }
  
  /**
   * Sauvegarder les conversations en cache
   */
  async cacheChats(chats) {
    if (!this.db) await this.init();
    
    const tx = this.db.transaction('chatsCache', 'readwrite');
    const store = tx.objectStore('chatsCache');
    
    for (const chat of chats) {
      await store.put({
        ...chat,
        lastUpdate: Date.now()
      });
    }
  }
  
  /**
   * Récupérer les conversations du cache
   */
  async getCachedChats() {
    if (!this.db) await this.init();
    
    const tx = this.db.transaction('chatsCache', 'readonly');
    const store = tx.objectStore('chatsCache');
    
    return await store.getAll();
  }
  
  /**
   * Sauvegarder les messages en cache
   */
  async cacheMessages(chatId, messages) {
    if (!this.db) await this.init();
    
    const tx = this.db.transaction('messagesCache', 'readwrite');
    const store = tx.objectStore('messagesCache');
    
    for (const msg of messages) {
      await store.put({
        ...msg,
        chatId,
        cachedAt: Date.now()
      });
    }
  }
  
  /**
   * Récupérer les messages du cache
   */
  async getCachedMessages(chatId) {
    if (!this.db) await this.init();
    
    const tx = this.db.transaction('messagesCache', 'readonly');
    const store = tx.objectStore('messagesCache');
    const index = store.index('chatId');
    
    return await index.getAll(chatId);
  }
  
  /**
   * Nettoyer les anciennes données
   */
  async cleanOldData() {
    if (!this.db) return;
    
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 jours
    const cutoff = Date.now() - maxAge;
    
    // Nettoyer les messages envoyés
    const tx = this.db.transaction(['messageQueue', 'messagesCache'], 'readwrite');
    
    // Messages de la file
    const queueStore = tx.objectStore('messageQueue');
    const queueIndex = queueStore.index('timestamp');
    const oldQueued = await queueIndex.getAllKeys(IDBKeyRange.upperBound(cutoff));
    
    for (const key of oldQueued) {
      await queueStore.delete(key);
    }
    
    // Messages en cache
    const cacheStore = tx.objectStore('messagesCache');
    const cacheIndex = cacheStore.index('timestamp');
    const oldCached = await cacheIndex.getAllKeys(IDBKeyRange.upperBound(cutoff));
    
    for (const key of oldCached) {
      await cacheStore.delete(key);
    }
  }
  
  /**
   * Gérer le retour en ligne
   */
  async handleOnline() {
    this.isOnline = true;
    
    // Traiter la file d'attente
    await this.processQueue();
    
    // Demander une synchronisation en arrière-plan
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await registration.sync.register('send-messages');
        }
      } catch (error) {
      }
    }
  }
  
  /**
   * Gérer le passage hors ligne
   */
  handleOffline() {
    this.isOnline = false;
    
    // Afficher une notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Mode hors ligne', {
        body: 'Les messages seront envoyés dès que la connexion sera rétablie',
        icon: '/logo-192.png',
        tag: 'offline-mode'
      });
    }
  }
  
  /**
   * Obtenir le nombre de messages en attente
   */
  async getPendingCount() {
    if (!this.db) return 0;
    
    const tx = this.db.transaction('messageQueue', 'readonly');
    const store = tx.objectStore('messageQueue');
    const index = store.index('status');
    
    return await index.count('pending');
  }
}

// Instance singleton
const offlineQueueService = new OfflineQueueService();

export default offlineQueueService;