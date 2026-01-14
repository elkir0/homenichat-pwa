import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const providerApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
providerApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
providerApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const api = {
  // Obtenir le statut de tous les providers
  async getProvidersStatus() {
    const response = await providerApi.get('/providers/status');
    return response.data;
  },

  // Obtenir l'état de connexion du provider actif
  async getConnectionState() {
    const response = await providerApi.get('/providers/status');
    const data = response.data;
    
    if (data.success && data.health?.providers) {
      const activeProvider = data.activeProvider;
      const providerHealth = data.health.providers[activeProvider];
      
      return {
        connected: providerHealth?.connected || false,
        state: providerHealth?.state || 'disconnected',
        provider: activeProvider
      };
    }
    
    return {
      connected: false,
      state: 'disconnected',
      provider: null
    };
  },

  // Obtenir la configuration des providers
  async getProvidersConfig() {
    const response = await providerApi.get('/providers/config');
    return response.data;
  },

  // Mettre à jour la configuration d'un provider
  async updateProviderConfig(provider, config) {
    const response = await providerApi.put(`/providers/config/${provider}`, config);
    return response.data;
  },

  // Définir le provider par défaut
  async setDefaultProvider(provider) {
    const response = await providerApi.post('/providers/default', { provider });
    return response.data;
  },

  // ==================== YAML Config API ====================

  // Obtenir la configuration YAML complète
  async getYamlConfig() {
    const response = await providerApi.get('/config');
    return response.data;
  },

  // Obtenir les providers par catégorie (whatsapp, sms, voip)
  async getProvidersByType(type) {
    const response = await providerApi.get(`/config/providers/${type}`);
    return response.data;
  },

  // Obtenir les types de providers disponibles
  async getProviderTypes() {
    const response = await providerApi.get('/config/provider-types');
    return response.data;
  },

  // Ajouter un nouveau provider
  async addProvider(type, providerData) {
    const response = await providerApi.post(`/config/providers/${type}`, providerData);
    return response.data;
  },

  // Modifier un provider existant
  async updateProvider(type, id, updates) {
    const response = await providerApi.put(`/config/providers/${type}/${id}`, updates);
    return response.data;
  },

  // Supprimer un provider
  async deleteProvider(type, id) {
    const response = await providerApi.delete(`/config/providers/${type}/${id}`);
    return response.data;
  },

  // Toggle actif/inactif un provider
  async toggleProvider(type, id) {
    const response = await providerApi.patch(`/config/providers/${type}/${id}/toggle`);
    return response.data;
  },

  // Recharger la configuration
  async reloadConfig() {
    const response = await providerApi.post('/config/reload');
    return response.data;
  },

  // Obtenir les règles de compliance
  async getComplianceRules() {
    const response = await providerApi.get('/config/compliance');
    return response.data;
  }
};

export default api;