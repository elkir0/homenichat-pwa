import React, { useEffect, useRef, useCallback, useState } from 'react';
import useVoIP from '../../../hooks/useVoIP';
import { CallState } from '../../../services/voip/VoIPService';
import './IncomingCallOverlay.css';

/**
 * IncomingCallOverlay - Overlay d'appel entrant
 *
 * Affiche une overlay plein écran quand un appel entrant est détecté
 * (via SIP.js ou AMI/WebSocket push).
 *
 * Inclut:
 * - Information sur l'appelant
 * - Sonnerie (Web Audio API)
 * - Boutons Répondre / Refuser
 * - Vibration (si supportée)
 */
const IncomingCallOverlay = () => {
  const {
    callState,
    currentCall,
    answer,
    reject,
    hangup,
    formatPhoneNumber
  } = useVoIP();

  const [isAnswering, setIsAnswering] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState(null);

  // Récupérer le token depuis localStorage
  const getToken = () => localStorage.getItem('authToken');

  const audioContextRef = useRef(null);
  const ringIntervalRef = useRef(null);
  const vibrationIntervalRef = useRef(null);

  // Déterminer si on doit afficher l'overlay
  const isRinging = callState === CallState.RINGING_INCOMING;

  // Créer une sonnerie avec Web Audio API
  const startRingtone = useCallback(() => {
    try {
      // Créer le contexte audio
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.warn('[IncomingCallOverlay] Web Audio API non supportée');
        return;
      }

      audioContextRef.current = new AudioContext();

      // Pattern de sonnerie: 2 bips, pause, répéter
      const playRingTone = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;

        // Premier bip (400Hz)
        const osc1 = audioContextRef.current.createOscillator();
        const gain1 = audioContextRef.current.createGain();
        osc1.connect(gain1);
        gain1.connect(audioContextRef.current.destination);
        osc1.frequency.value = 440; // La4
        osc1.type = 'sine';
        gain1.gain.value = 0.3;

        const now = audioContextRef.current.currentTime;
        osc1.start(now);
        osc1.stop(now + 0.2);

        // Deuxième bip (480Hz) après 0.3s
        const osc2 = audioContextRef.current.createOscillator();
        const gain2 = audioContextRef.current.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContextRef.current.destination);
        osc2.frequency.value = 480;
        osc2.type = 'sine';
        gain2.gain.value = 0.3;

        osc2.start(now + 0.3);
        osc2.stop(now + 0.5);
      };

      // Jouer immédiatement puis toutes les 2 secondes
      playRingTone();
      ringIntervalRef.current = setInterval(playRingTone, 2000);

    } catch (err) {
      console.error('[IncomingCallOverlay] Erreur création sonnerie:', err);
    }
  }, []);

  // Arrêter la sonnerie
  const stopRingtone = useCallback(() => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  // Vibration pattern pour appel entrant
  const startVibration = useCallback(() => {
    if (!navigator.vibrate) return;

    // Pattern: vibrer 500ms, pause 300ms, répéter
    const vibratePattern = () => {
      navigator.vibrate([500, 300, 500, 300, 500]);
    };

    vibratePattern();
    vibrationIntervalRef.current = setInterval(vibratePattern, 3000);
  }, []);

  const stopVibration = useCallback(() => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0); // Arrêter la vibration
    }
  }, []);

  // Vérifier si on est dans l'app native
  const isInNativeApp = () => {
    return typeof window !== 'undefined' && window.ReactNativeWebView && window.nativeCallKit;
  };

  // Démarrer/arrêter sonnerie et vibration selon l'état
  useEffect(() => {
    if (isRinging && currentCall) {
      // Si on est dans l'app native, utiliser CallKit
      if (isInNativeApp()) {
        console.log('[IncomingCallOverlay] App native détectée - utilisation CallKit');
        const callId = currentCall.callId || currentCall.id || Date.now().toString();
        const callerName = currentCall.callerName || 'Inconnu';
        const callerNumber = currentCall.callerId || currentCall.callerNumber || '';

        window.nativeCallKit.displayIncomingCall(callId, callerName, callerNumber);
        // Ne pas démarrer la sonnerie web - CallKit s'en charge
        return;
      }

      console.log('[IncomingCallOverlay] Appel entrant - démarrage sonnerie');
      startRingtone();
      startVibration();
    } else {
      stopRingtone();
      stopVibration();
    }

    return () => {
      stopRingtone();
      stopVibration();
    };
  }, [isRinging, currentCall, startRingtone, stopRingtone, startVibration, stopVibration]);

  // Écouter les événements CallKit natifs (answer/reject)
  useEffect(() => {
    if (!isInNativeApp()) return;

    const handleNativeAnswer = async (e) => {
      console.log('[IncomingCallOverlay] CallKit answer event:', e.detail);
      await handleAnswer();
    };

    const handleNativeReject = async (e) => {
      console.log('[IncomingCallOverlay] CallKit reject event:', e.detail);
      await handleReject();
    };

    window.addEventListener('nativeCallAnswer', handleNativeAnswer);
    window.addEventListener('nativeCallReject', handleNativeReject);

    return () => {
      window.removeEventListener('nativeCallAnswer', handleNativeAnswer);
      window.removeEventListener('nativeCallReject', handleNativeReject);
    };
  }, [currentCall]);

  // Gérer la réponse via API (pour appels AMI)
  const answerViaApi = async (callId) => {
    const token = getToken();
    if (!token) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`/api/calls/ringing/${callId}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({})
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la réponse à l\'appel');
    }

    return data;
  };

  // Gérer le rejet via API (pour appels AMI)
  const rejectViaApi = async (callId) => {
    const token = getToken();
    if (!token) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`/api/calls/ringing/${callId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors du rejet de l\'appel');
    }

    return data;
  };

  // Gérer la réponse
  const handleAnswer = async () => {
    if (isAnswering) return;

    setIsAnswering(true);
    setError(null);
    stopRingtone();
    stopVibration();

    try {
      // Pour les appels AMI, utiliser l'API pour rediriger vers l'extension WebRTC
      if (currentCall?.source === 'ami') {
        const callId = currentCall.callId || currentCall.id;
        console.log('[IncomingCallOverlay] Appel AMI - réponse via API, callId:', callId);

        const result = await answerViaApi(callId);
        console.log('[IncomingCallOverlay] Réponse API:', result);

        // L'appel a été redirigé vers l'extension WebRTC
        // Le SIP.js devrait recevoir l'appel entrant maintenant
        hangup(); // Reset l'état de l'overlay (l'appel SIP prendra le relais)
        return;
      }

      // Pour les appels SIP directs
      await answer();
    } catch (err) {
      console.error('[IncomingCallOverlay] Erreur réponse:', err);
      setError(err.message);
    } finally {
      setIsAnswering(false);
    }
  };

  // Gérer le rejet
  const handleReject = async () => {
    if (isRejecting) return;

    setIsRejecting(true);
    setError(null);
    stopRingtone();
    stopVibration();

    try {
      // Pour les appels AMI, utiliser l'API
      if (currentCall?.source === 'ami') {
        const callId = currentCall.callId || currentCall.id;
        console.log('[IncomingCallOverlay] Rejet AMI via API, callId:', callId);

        await rejectViaApi(callId);
        hangup(); // Reset l'état
        return;
      }

      // Pour les appels SIP directs
      await reject();
    } catch (err) {
      console.error('[IncomingCallOverlay] Erreur rejet:', err);
      setError(err.message);
    } finally {
      setIsRejecting(false);
    }
  };

  // Ne rien afficher si pas d'appel entrant
  if (!isRinging || !currentCall) {
    return null;
  }

  // Extraire les informations d'affichage
  const callerName = currentCall.callerName;
  const callerNumber = currentCall.callerId || currentCall.callerNumber;
  const lineName = currentCall.lineName;
  const displayName = callerName || formatPhoneNumber(callerNumber) || 'Numéro inconnu';
  const displayNumber = callerName ? formatPhoneNumber(callerNumber) : null;

  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-content">
        {/* Indicateur de ligne */}
        {lineName && (
          <div className="incoming-call-line">
            <span className="material-icons">phone_in_talk</span>
            <span>{lineName}</span>
          </div>
        )}

        {/* Avatar avec animation pulsante */}
        <div className="incoming-call-avatar pulsing">
          <span className="material-icons">person</span>
        </div>

        {/* Informations appelant */}
        <div className="incoming-call-info">
          <h2 className="caller-name">{displayName}</h2>
          {displayNumber && (
            <p className="caller-number">{displayNumber}</p>
          )}
          <p className="call-status">Appel entrant...</p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="incoming-call-error">
            <span className="material-icons">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="incoming-call-actions">
          <button
            className={`call-action reject ${isRejecting ? 'loading' : ''}`}
            onClick={handleReject}
            disabled={isAnswering || isRejecting}
            aria-label="Refuser l'appel"
          >
            <span className="material-icons">{isRejecting ? 'hourglass_empty' : 'call_end'}</span>
            <span className="action-label">{isRejecting ? 'Rejet...' : 'Refuser'}</span>
          </button>

          <button
            className={`call-action answer ${isAnswering ? 'loading' : ''}`}
            onClick={handleAnswer}
            disabled={isAnswering || isRejecting}
            aria-label="Répondre à l'appel"
          >
            <span className="material-icons">{isAnswering ? 'hourglass_empty' : 'call'}</span>
            <span className="action-label">{isAnswering ? 'Connexion...' : 'Répondre'}</span>
          </button>
        </div>

        {/* Note pour les appels AMI */}
        {currentCall.source === 'ami' && !isAnswering && (
          <p className="ami-note">
            Cliquez sur Répondre pour transférer l'appel vers votre poste WebRTC.
          </p>
        )}
      </div>
    </div>
  );
};

export default IncomingCallOverlay;
