import React, { useState, useEffect, useRef, useCallback } from 'react';
import useVoIP from '../../../hooks/useVoIP';
import { CallState } from '../../../services/voip/VoIPService';
import './CallScreen.css';

/**
 * CallScreen - Écran d'appel plein écran
 *
 * Gère l'affichage pour:
 * - Appel entrant (sonnerie)
 * - Appel sortant (en attente)
 * - Appel en cours (avec contrôles)
 *
 * Inclut un verrouillage d'écran pour éviter les clics accidentels
 * avec l'oreille pendant l'appel.
 */
const CallScreen = ({ call, isRinging, onAnswer, onReject, onHangup }) => {
  const {
    callState,
    callDuration,
    isMuted,
    isOnHold,
    toggleMute,
    hold,
    unhold,
    sendDTMF,
    formatDuration,
    formatPhoneNumber
  } = useVoIP();

  const [showDialpad, setShowDialpad] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const lockTimeoutRef = useRef(null);
  const lastTapRef = useRef(0);

  // Verrouiller automatiquement l'écran après 3 secondes en appel actif
  useEffect(() => {
    if (callState === CallState.ANSWERED && !isRinging) {
      lockTimeoutRef.current = setTimeout(() => {
        setIsScreenLocked(true);
      }, 3000);
    } else {
      setIsScreenLocked(false);
    }

    return () => {
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
    };
  }, [callState, isRinging]);

  // Déverrouiller avec double-tap
  const handleLockScreenTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap détecté - déverrouiller
      setIsScreenLocked(false);
      // Re-verrouiller après 10 secondes d'inactivité
      lockTimeoutRef.current = setTimeout(() => {
        if (callState === CallState.ANSWERED) {
          setIsScreenLocked(true);
        }
      }, 10000);
    }
    lastTapRef.current = now;
  }, [callState]);

  // Reset du timer de verrouillage sur interaction
  const handleUserInteraction = useCallback(() => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
    }
    if (callState === CallState.ANSWERED) {
      lockTimeoutRef.current = setTimeout(() => {
        setIsScreenLocked(true);
      }, 10000);
    }
  }, [callState]);

  // Nom ou numéro à afficher
  const displayName = call?.callerName || formatPhoneNumber(call?.target || call?.callerId) || 'Inconnu';
  const displayNumber = call?.callerName ? formatPhoneNumber(call?.target || call?.callerId) : null;

  // Déterminer l'état pour l'affichage
  const getStatusText = () => {
    switch (callState) {
      case CallState.RINGING_INCOMING:
        return 'Appel entrant...';
      case CallState.RINGING_OUTGOING:
        return 'Appel en cours...';
      case CallState.ANSWERED:
        return formatDuration(callDuration);
      case CallState.ON_HOLD:
        return 'En attente';
      default:
        return '';
    }
  };

  // Toggle haut-parleur (note: implémentation native limitée sur PWA)
  const toggleSpeaker = () => {
    setIsSpeaker(!isSpeaker);
    // TODO: Implémenter via setSinkId si disponible
  };

  // Toggle hold
  const toggleHold = async () => {
    if (isOnHold) {
      await unhold();
    } else {
      await hold();
    }
  };

  // Touches du dialpad DTMF
  const dtmfKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  const handleDTMF = (digit) => {
    sendDTMF(digit);
    // Feedback visuel/sonore
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  // Animation de pulsation pour l'avatar pendant la sonnerie
  const avatarClass = isRinging || callState === CallState.RINGING_OUTGOING
    ? 'call-avatar pulsing'
    : 'call-avatar';

  return (
    <div className="call-screen" onClick={handleUserInteraction}>
      {/* Overlay de verrouillage d'écran pendant l'appel */}
      {isScreenLocked && (
        <div className="call-screen-lock" onClick={handleLockScreenTap}>
          <div className="lock-indicator">
            <span className="material-icons">lock</span>
            <p>Double-tap pour déverrouiller</p>
          </div>
          <div className="lock-call-info">
            <p className="lock-duration">{formatDuration(callDuration)}</p>
            <p className="lock-name">{displayName}</p>
          </div>
        </div>
      )}

      <div className="call-screen-content">
        {/* Avatar et infos */}
        <div className="call-info">
          <div className={avatarClass}>
            <span className="material-icons">person</span>
          </div>
          <h2 className="call-name">{displayName}</h2>
          {displayNumber && (
            <p className="call-number">{displayNumber}</p>
          )}
          <p className="call-status">{getStatusText()}</p>
        </div>

        {/* Contrôles selon l'état */}
        {isRinging ? (
          // Appel entrant - Répondre / Refuser
          <div className="call-incoming-actions">
            <button
              className="call-action-large reject"
              onClick={onReject}
              aria-label="Refuser"
            >
              <span className="material-icons">call_end</span>
              <span className="action-label">Refuser</span>
            </button>
            <button
              className="call-action-large answer"
              onClick={onAnswer}
              aria-label="Répondre"
            >
              <span className="material-icons">call</span>
              <span className="action-label">Répondre</span>
            </button>
          </div>
        ) : callState === CallState.RINGING_OUTGOING ? (
          // Appel sortant en attente - juste annuler
          <div className="call-outgoing-actions">
            <button
              className="call-end-btn"
              onClick={onHangup}
              aria-label="Annuler"
            >
              <span className="material-icons">call_end</span>
            </button>
          </div>
        ) : (
          // Appel en cours - contrôles complets
          <>
            {/* Dialpad DTMF overlay */}
            {showDialpad && (
              <div className="call-dtmf-overlay">
                <div className="call-dtmf-keys">
                  {dtmfKeys.map(key => (
                    <button
                      key={key}
                      className="dtmf-key"
                      onClick={() => handleDTMF(key)}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contrôles principaux */}
            <div className="call-controls">
              <div className="call-controls-row">
                <button
                  className={`call-control ${isMuted ? 'active' : ''}`}
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Activer le micro' : 'Couper le micro'}
                >
                  <span className="material-icons">
                    {isMuted ? 'mic_off' : 'mic'}
                  </span>
                  <span className="control-label">Muet</span>
                </button>

                <button
                  className={`call-control ${isSpeaker ? 'active' : ''}`}
                  onClick={toggleSpeaker}
                  aria-label={isSpeaker ? 'Désactiver haut-parleur' : 'Activer haut-parleur'}
                >
                  <span className="material-icons">
                    {isSpeaker ? 'volume_up' : 'volume_down'}
                  </span>
                  <span className="control-label">HP</span>
                </button>

                <button
                  className={`call-control ${isOnHold ? 'active' : ''}`}
                  onClick={toggleHold}
                  aria-label={isOnHold ? 'Reprendre' : 'Mettre en attente'}
                >
                  <span className="material-icons">
                    {isOnHold ? 'play_arrow' : 'pause'}
                  </span>
                  <span className="control-label">Attente</span>
                </button>

                <button
                  className={`call-control ${showDialpad ? 'active' : ''}`}
                  onClick={() => setShowDialpad(!showDialpad)}
                  aria-label="Clavier"
                >
                  <span className="material-icons">dialpad</span>
                  <span className="control-label">Clavier</span>
                </button>
              </div>
            </div>

            {/* Bouton raccrocher */}
            <div className="call-end-wrapper">
              <button
                className="call-end-btn"
                onClick={onHangup}
                aria-label="Raccrocher"
              >
                <span className="material-icons">call_end</span>
              </button>
            </div>
          </>
        )}

        {/* Option répondre par message (appel entrant) */}
        {isRinging && (
          <button className="call-message-btn">
            <span className="material-icons">chat</span>
            <span>Répondre par message</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default CallScreen;
