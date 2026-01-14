/**
 * Provider API - Lecture seule du statut des providers
 *
 * La configuration des providers se fait exclusivement via
 * l'interface admin du backend (homenichat-serv/admin/)
 */

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
  /**
   * Obtenir le statut de tous les providers (lecture seule)
   */
  async getProvidersStatus() {
    const response = await providerApi.get('/providers/status');
    return response.data;
  },

  /**
   * Obtenir l'état de connexion du provider actif (lecture seule)
   */
  async getConnectionState() {
    const response = await providerApi.get('/providers/status');
    const data = response.data;

    if (data.success && data.health?.providers) {
      const activeProvider = data.activeProvider;
      const providerHealth = data.health.providers[activeProvider];

      return {
        connected: providerHealth?.connected || providerHealth?.isConnected || false,
        state: providerHealth?.state || 'disconnected',
        provider: activeProvider
      };
    }

    return {
      connected: false,
      state: 'disconnected',
      provider: null
    };
  }
};

export default api;
