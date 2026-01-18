/**
 * Service de gestion des notifications push
 */

class NotificationService {
  constructor() {
    this.permission = (typeof Notification !== 'undefined') ? Notification.permission : 'denied';
    this.registration = null;
  }
  
  /**
   * Initialiser le service de notifications
   * NOTE: Ne PAS demander la permission ici - iOS bloque les demandes automatiques
   */
  async init() {
    // Vérifier le support des notifications
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return false;
    }

    // Vérifier le support du service worker
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return false;
    }

    try {
      // Récupérer l'enregistrement du service worker
      this.registration = await navigator.serviceWorker.ready;
      console.log('NotificationService initialized, permission:', this.permission);

      // NE PAS demander la permission automatiquement !
      // iOS requiert un geste utilisateur (clic sur bouton)
      // La permission sera demandée via requestPermission() appelé par le bouton

      return true;
    } catch (error) {
      console.error('NotificationService init error:', error);
      return false;
    }
  }
  
  /**
   * Demander la permission pour les notifications
   */
  async requestPermission() {
    console.log('🔔 requestPermission() called');
    try {
      if (typeof Notification === 'undefined') {
        console.log('🔔 Notification API not available');
        this.permission = 'denied';
        return 'denied';
      }

      console.log('🔔 Current permission before request:', Notification.permission);
      const permission = await Notification.requestPermission();
      console.log('🔔 Permission result:', permission);
      this.permission = permission;

      if (permission === 'granted') {
        console.log('🔔 Permission granted, showing test notification');

        // Afficher une notification de test
        this.showNotification('Homenichat', {
          body: 'Les notifications sont activées ! 🎉',
          icon: '/pwa/logo-192.png'
        });

        // S'abonner aux push notifications
        console.log('🔔 Subscribing to push...');
        await this.subscribeToPush();
        console.log('🔔 Subscribe complete');
      }

      return permission;
    } catch (error) {
      console.error('🔔 requestPermission error:', error);
      return 'denied';
    }
  }
  
  /**
   * S'abonner aux notifications push
   */
  async subscribeToPush() {
    console.log('🔔 subscribeToPush() called');
    try {
      if (!this.registration) {
        console.error('🔔 No service worker registration!');
        // Essayer de récupérer l'enregistrement
        this.registration = await navigator.serviceWorker.ready;
        console.log('🔔 Got SW registration:', this.registration);
      }

      // Vérifier si PushManager est supporté
      if (!('PushManager' in window)) {
        console.error('🔔 PushManager not supported!');
        alert('Push notifications ne sont pas supportées sur ce navigateur');
        return null;
      }

      // Récupérer la clé publique VAPID depuis le serveur
      let vapidPublicKey;
      console.log('🔔 Fetching VAPID key...');
      try {
        const response = await fetch('/api/notifications/vapid-public-key');
        console.log('🔔 VAPID response status:', response.status);
        const data = await response.json();
        vapidPublicKey = data.publicKey;
        console.log('🔔 Got VAPID key:', vapidPublicKey?.substring(0, 20) + '...');
      } catch (e) {
        console.error('🔔 Failed to fetch VAPID key:', e);
        vapidPublicKey = 'BLn2An3uQ5NyEbgPEvR5nsLlLz2mCi5dyhUVx3iMBXUixzb_Bqf7PTknxYZtHubyPDsFaxO6ZlbpA6K0E4TOcZw';
      }

      const convertedVapidKey = this.urlBase64ToUint8Array(vapidPublicKey);
      console.log('🔔 Converted VAPID key, subscribing to pushManager...');

      // S'abonner
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      console.log('🔔 Push subscription created!');
      console.log('🔔 Endpoint:', subscription.endpoint);

      // Envoyer l'abonnement au serveur
      console.log('🔔 Sending subscription to server...');
      await this.sendSubscriptionToServer(subscription);

      return subscription;
    } catch (error) {
      console.error('🔔 subscribeToPush ERROR:', error);
      console.error('🔔 Error name:', error.name);
      console.error('🔔 Error message:', error.message);
      alert('Erreur push: ' + error.message);
      return null;
    }
  }
  
  /**
   * Envoyer l'abonnement au serveur
   */
  async sendSubscriptionToServer(subscription) {
    console.log('🔔 sendSubscriptionToServer called');
    try {
      const token = localStorage.getItem('authToken');
      console.log('🔔 Auth token exists:', !!token);
      if (!token) {
        console.error('🔔 No auth token for push subscription');
        alert('Erreur: Pas de token authentification');
        return;
      }

      console.log('🔔 Sending POST to /api/notifications/subscribe...');
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
          }
        })
      });

      console.log('🔔 Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('🔔 Subscription saved!', data);
        alert('Souscription push enregistrée !');
      } else {
        const errorText = await response.text();
        console.error('🔔 Failed to save subscription:', response.status, errorText);
        alert('Erreur sauvegarde: ' + response.status + ' - ' + errorText);
      }
    } catch (error) {
      console.error('🔔 Error saving subscription:', error);
      alert('Erreur réseau: ' + error.message);
    }
  }
  
  /**
   * Afficher une notification locale
   */
  async showNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      return;
    }
    
    try {
      if (this.registration && 'showNotification' in this.registration) {
        // Utiliser le service worker pour afficher la notification
        await this.registration.showNotification(title, {
          body: options.body || '',
          icon: options.icon || '/pwa/logo-192.png',
          badge: options.badge || '/pwa/logo-192.png',
          tag: options.tag || 'homenichat-notification',
          data: options.data || {},
          vibrate: options.vibrate || [200, 100, 200],
          requireInteraction: options.requireInteraction || false,
          actions: options.actions || [],
          silent: options.silent || false
        });
      } else if (typeof Notification !== 'undefined') {
        // Fallback vers l'API Notification
        new Notification(title, options);
      } else {
      }
    } catch (error) {
    }
  }
  
  /**
   * Afficher une notification de nouveau message
   */
  async notifyNewMessage(chat, message) {
    const options = {
      body: message.text || 'Nouveau message',
      icon: chat.profilePicture || '/pwa/logo-192.png',
      tag: `message-${chat.id}`,
      data: {
        chatId: chat.id,
        messageId: message.id
      },
      actions: [
        {
          action: 'reply',
          title: 'Répondre'
        },
        {
          action: 'open',
          title: 'Ouvrir'
        }
      ]
    };
    
    await this.showNotification(chat.name || 'Nouveau message', options);
  }
  
  /**
   * Convertir la clé VAPID
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
  
  /**
   * Vérifier si les notifications sont supportées et activées
   */
  isSupported() {
    return 'Notification' in window && 
           'serviceWorker' in navigator &&
           'PushManager' in window;
  }
  
  /**
   * Obtenir l'état actuel des permissions
   */
  getPermissionStatus() {
    return this.permission;
  }
}

// Instance singleton
const notificationService = new NotificationService();

export default notificationService;