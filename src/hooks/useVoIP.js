import { useState, useEffect, useCallback, useRef } from 'react';
import voipService, { ConnectionState, CallState } from '../services/voip/VoIPService';

/**
 * Hook React pour gérer l'état VoIP
 *
 * Fournit un accès réactif à:
 * - État de connexion au PBX
 * - État de l'appel en cours
 * - Actions d'appel (call, answer, hangup, etc.)
 * - Historique des appels (synchronisé avec le serveur)
 */
const useVoIP = () => {
  // États
  const [connectionState, setConnectionState] = useState(voipService.connectionState);
  const [callState, setCallState] = useState(voipService.callState);
  const [currentCall, setCurrentCall] = useState(voipService.currentCall);
  const [callHistory, setCallHistory] = useState(voipService.getCallHistory());
  const [missedCallsCount, setMissedCallsCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Ref pour le timer de durée d'appel
  const durationIntervalRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);

  // Synchroniser l'historique avec le serveur
  const syncHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const history = await voipService.syncCallHistory();
      setCallHistory(history);
      const count = await voipService.getMissedCallsCount();
      setMissedCallsCount(count);
    } catch (err) {
      console.error('[useVoIP] Erreur sync historique:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  // Charger l'historique au montage
  useEffect(() => {
    syncHistory();
  }, [syncHistory]);

  // Effets pour écouter les événements du service
  useEffect(() => {
    const handleConnectionStateChange = (state) => {
      setConnectionState(state);
      setError(null);
    };

    const handleCallStateChange = ({ state, call }) => {
      setCallState(state);
      setCurrentCall(call);

      // Démarrer/arrêter le timer de durée
      if (state === CallState.ANSWERED) {
        startDurationTimer();
      } else {
        stopDurationTimer();
        setCallDuration(0);
      }

      // Reset mute quand l'appel se termine
      if (state === CallState.IDLE) {
        setIsMuted(false);
      }
    };

    const handleIncomingCall = (call) => {
      setCurrentCall(call);
      // Vibration pour appel entrant (si supporté)
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    };

    const handleCallEnded = async (call) => {
      // Attendre un court délai pour que le serveur traite l'appel
      setTimeout(async () => {
        setCallHistory(voipService.getCallHistory());
        const count = await voipService.getMissedCallsCount();
        setMissedCallsCount(count);
      }, 500);
    };

    const handleError = (err) => {
      setError(err.message);
      console.error('[useVoIP] Erreur:', err.message);
    };

    // S'abonner aux événements
    voipService.on('connectionStateChange', handleConnectionStateChange);
    voipService.on('callStateChange', handleCallStateChange);
    voipService.on('incomingCall', handleIncomingCall);
    voipService.on('callEnded', handleCallEnded);
    voipService.on('error', handleError);

    // Cleanup
    return () => {
      voipService.off('connectionStateChange', handleConnectionStateChange);
      voipService.off('callStateChange', handleCallStateChange);
      voipService.off('incomingCall', handleIncomingCall);
      voipService.off('callEnded', handleCallEnded);
      voipService.off('error', handleError);
      stopDurationTimer();
    };
  }, []);

  // Charger la configuration au montage
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch('/api/config/voip', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const config = await response.json();
          if (config.server && config.extension) {
            voipService.configure(config);
            console.log('[useVoIP] Configuration chargée depuis le serveur');
            // Auto-connect après chargement de la config
            console.log('[useVoIP] Tentative de connexion automatique...');
            voipService.connect().catch(err => {
              console.error('[useVoIP] Erreur connexion auto:', err);
            });
          }
        }
      } catch (err) {
        console.error('[useVoIP] Erreur chargement config:', err);
      }
    };

    fetchConfig();
  }, []);

  // Timer pour la durée d'appel
  const startDurationTimer = useCallback(() => {
    stopDurationTimer();
    const startTime = Date.now();
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // Actions exposées
  const connect = useCallback(async () => {
    setError(null);
    await voipService.connect();
  }, []);

  const disconnect = useCallback(async () => {
    await voipService.disconnect();
  }, []);

  const call = useCallback(async (target) => {
    setError(null);
    return await voipService.call(target);
  }, []);

  const answer = useCallback(async () => {
    await voipService.answer();
  }, []);

  const reject = useCallback(async () => {
    await voipService.reject();
  }, []);

  const hangup = useCallback(async () => {
    await voipService.hangup();
  }, []);

  const hold = useCallback(async () => {
    await voipService.hold();
  }, []);

  const unhold = useCallback(async () => {
    await voipService.unhold();
  }, []);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    voipService.setMute(newMutedState);
    setIsMuted(newMutedState);
  }, [isMuted]);

  const sendDTMF = useCallback((digit) => {
    voipService.sendDTMF(digit);
  }, []);

  const markMissedCallsAsSeen = useCallback(async () => {
    await voipService.markMissedCallsAsSeen();
    setMissedCallsCount(0);
  }, []);

  const configure = useCallback((config) => {
    voipService.configure(config);
  }, []);


  // États dérivés
  const isConnected = connectionState === ConnectionState.REGISTERED;
  const isInCall = callState !== CallState.IDLE;
  const isRinging = callState === CallState.RINGING_INCOMING;
  const isCalling = callState === CallState.RINGING_OUTGOING;
  const isOnHold = callState === CallState.ON_HOLD;

  return {
    // États
    connectionState,
    callState,
    currentCall,
    callHistory,
    callDuration,
    missedCallsCount,
    isMuted,
    error,
    isHistoryLoading,

    // États dérivés
    isConnected,
    isInCall,
    isRinging,
    isCalling,
    isOnHold,

    // Actions
    configure,
    connect,
    disconnect,
    call,
    answer,
    reject,
    hangup,
    hold,
    unhold,
    toggleMute,
    sendDTMF,
    markMissedCallsAsSeen,
    syncHistory,

    // Utilitaires statiques
    isSupported: voipService.constructor.isSupported,
    formatPhoneNumber: voipService.constructor.formatPhoneNumber,
    formatDuration: voipService.constructor.formatDuration
  };
};

export default useVoIP;
