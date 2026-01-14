import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook pour une synchronisation intelligente et discrète
 * - Synchronise uniquement quand l'utilisateur est actif
 * - Évite les synchronisations inutiles
 * - Utilise une stratégie exponentielle pour les intervalles
 */
export const useSmartSync = (syncFunction, options = {}) => {
  const {
    minInterval = 10000,      // 10 secondes minimum
    maxInterval = 300000,     // 5 minutes maximum
    inactivityDelay = 30000,  // 30 secondes d'inactivité avant de ralentir
    enabled = true
  } = options;

  const intervalRef = useRef(null);
  const currentIntervalRef = useRef(minInterval);
  const lastActivityRef = useRef(Date.now());
  const lastSyncRef = useRef(0);
  const isActiveRef = useRef(true);

  // Détecter l'activité de l'utilisateur
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Si on était inactif, réinitialiser l'intervalle
    if (!isActiveRef.current) {
      isActiveRef.current = true;
      currentIntervalRef.current = minInterval;
    }
  }, [minInterval]);

  // Fonction de synchronisation intelligente
  const smartSync = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    const timeSinceLastSync = now - lastSyncRef.current;

    // Déterminer si l'utilisateur est actif
    isActiveRef.current = timeSinceLastActivity < inactivityDelay;

    // Ne pas synchroniser trop souvent
    if (timeSinceLastSync < minInterval) {
      return;
    }

    // Si inactif, augmenter progressivement l'intervalle
    if (!isActiveRef.current) {
      currentIntervalRef.current = Math.min(
        currentIntervalRef.current * 1.5,
        maxInterval
      );
    } else {
      // Si actif, utiliser l'intervalle minimum
      currentIntervalRef.current = minInterval;
    }

    // Effectuer la synchronisation
    try {
      lastSyncRef.current = now;
      await syncFunction();
    } catch (error) {
      console.error('Erreur de synchronisation:', error);
    }
  }, [syncFunction, minInterval, maxInterval, inactivityDelay]);

  // Configurer les écouteurs d'activité
  useEffect(() => {
    if (!enabled) return;

    // Événements qui indiquent une activité
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Throttle pour éviter trop d'appels
    let activityTimeout;
    const handleActivity = () => {
      if (activityTimeout) return;
      activityTimeout = setTimeout(() => {
        updateActivity();
        activityTimeout = null;
      }, 1000);
    };

    // Ajouter les écouteurs
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Démarrer la synchronisation
    smartSync(); // Première synchronisation
    intervalRef.current = setInterval(smartSync, minInterval);

    return () => {
      // Nettoyer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, smartSync, updateActivity, minInterval]);

  // Forcer une synchronisation immédiate
  const forceSync = useCallback(() => {
    lastSyncRef.current = 0; // Réinitialiser pour forcer
    smartSync();
  }, [smartSync]);

  return {
    forceSync,
    isActive: isActiveRef.current,
    currentInterval: currentIntervalRef.current
  };
};