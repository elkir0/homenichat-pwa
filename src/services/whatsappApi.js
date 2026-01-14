/**
 * Service API WhatsApp unifié
 * Gère la communication avec le backend qui utilise Baileys ou Meta
 */

const API_URL = process.env.REACT_APP_API_URL || '';

class WhatsAppApi {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token || localStorage.getItem('authToken')}`,
      'Content-Type': 'application/json'
    };
  }

  // Méthodes de connexion/état
  async getConnectionState() {
    try {
      const response = await fetch(`${API_URL}/api/providers/status`, {
        headers: this.getHeaders()
      });

      if (!response.ok) throw new Error('Failed to get connection state');

      const data = await response.json();
      const activeProvider = data.activeProvider || 'meta';
      const providerHealth = data.health?.[activeProvider] || {};
      return {
        instance: {
          state: providerHealth.isConnected ? 'open' : 'close',
          connectionStatus: providerHealth.state || 'disconnected'
        }
      };
    } catch (error) {
      console.error('Error getting connection state:', error);
      return {
        instance: {
          state: 'close',
          connectionStatus: 'disconnected'
        }
      };
    }
  }

  async getQRCode() {
    try {
      const response = await fetch(`${API_URL}/api/providers/qr/baileys`, {
        headers: this.getHeaders()
      });

      if (!response.ok) throw new Error('Failed to get QR code');

      const data = await response.json();
      return {
        qrcode: {
          base64: data.qrCode
        }
      };
    } catch (error) {
      console.error('Error getting QR code:', error);
      return null;
    }
  }

  async connect() {
    try {
      const response = await fetch(`${API_URL}/api/providers/connect/baileys`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      if (!response.ok) throw new Error('Failed to connect');

      return await response.json();
    } catch (error) {
      console.error('Error connecting:', error);
      throw error;
    }
  }

  async logout() {
    try {
      const response = await fetch(`${API_URL}/api/providers/disconnect/baileys`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      if (!response.ok) throw new Error('Failed to logout');

      return await response.json();
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  }

  // Méthodes de chat
  async getChats() {
    try {
      const response = await fetch(`${API_URL}/api/chats`, {
        headers: this.getHeaders()
      });

      if (!response.ok) throw new Error('Failed to get chats');

      return await response.json();
    } catch (error) {
      console.error('Error getting chats:', error);
      return [];
    }
  }

  async getChatMessages(chatId, limit = 50) {
    try {
      const response = await fetch(`${API_URL}/api/chats/${chatId}/messages?limit=${limit}`, {
        headers: this.getHeaders()
      });

      if (!response.ok) throw new Error('Failed to get messages');

      return await response.json();
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  async sendMessage(chatId, text, options = {}) {
    try {
      const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          text,
          options,
          provider: options?.provider
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async sendMediaMessage(chatId, media) {
    try {
      const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ media })
      });

      if (!response.ok) throw new Error('Failed to send media');

      return await response.json();
    } catch (error) {
      console.error('Error sending media:', error);
      throw error;
    }
  }

  async markAsRead(chatId) {
    try {
      const response = await fetch(`${API_URL}/api/chats/${chatId}/read`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      if (!response.ok) throw new Error('Failed to mark as read');

      return await response.json();
    } catch (error) {
      console.error('Error marking as read:', error);
      throw error;
    }
  }

  async sendTypingIndicator(chatId, isTyping) {
    try {
      // Si l'URL n'est pas définie dans le backend, on évite le crash
      // mais on tente quand même l'appel pour l'implémentation future
      const response = await fetch(`${API_URL}/api/chats/${chatId}/typing`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ isTyping })
      });

      if (!response.ok) {
        // On ignore silencieusement les erreurs 404 pour cette fonctionnalité mineure
        if (response.status !== 404) {
          console.warn('Failed to send typing indicator');
        }
        return false;
      }

      return true;
    } catch (error) {
      // On ne throw pas pour ne pas bloquer l'UI
      console.warn('Error sending typing indicator:', error);
      return false;
    }
  }

  // Méthodes utilitaires
  async checkPhoneNumber(phoneNumber) {
    try {
      const response = await fetch(`${API_URL}/api/contacts/check/${phoneNumber}`, {
        headers: this.getHeaders()
      });

      if (!response.ok) throw new Error('Failed to check number');

      return await response.json();
    } catch (error) {
      console.error('Error checking number:', error);
      return { exists: false };
    }
  }

  async createNewChat(phoneNumber, message, options = {}) {
    try {
      // Formater le JID si nécessaire
      let jid = phoneNumber;
      if (!options?.provider || options.provider !== 'sms-bridge') {
        jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
      }

      // Envoyer le premier message pour créer la discussion
      // Ajouter line aux options pour le provider SMS
      const msgOptions = { ...options };
      if (options.line) {
        msgOptions.line = options.line;
      }

      await this.sendMessage(jid, message, msgOptions);

      // Retourner l'objet chat attendu par le frontend
      return {
        id: jid,
        name: phoneNumber, // On utilisera le numéro comme nom initial
        unreadCount: 0,
        timestamp: Date.now() / 1000
      };
    } catch (error) {
      console.error('Error creating new chat:', error);
      throw error;
    }
  }

  async uploadMedia(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token || localStorage.getItem('authToken')}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload media');

      return await response.json();
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  formatPhoneNumber(phoneNumber) {
    // Nettoyer le numéro de téléphone
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Ajouter l'indicatif pays si nécessaire
    if (!cleaned.startsWith('590') && cleaned.length === 9) {
      cleaned = '590' + cleaned;
    }

    return cleaned;
  }

  setToken(token) {
    this.token = token;
  }
}

const whatsappApi = new WhatsAppApi();
export default whatsappApi;