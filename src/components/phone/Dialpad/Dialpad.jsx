import React, { useState, useCallback } from 'react';
import './Dialpad.css';

/**
 * Dialpad - Clavier numérique pour composer un numéro
 *
 * Fonctionnalités:
 * - Pavé numérique T9/DTMF
 * - Affichage du numéro saisi
 * - Bouton appel
 * - Effacement caractère par caractère ou total
 * - Feedback haptique (si disponible)
 */
const Dialpad = ({ onCall, isConnected }) => {
  const [number, setNumber] = useState('');

  // Configuration des touches
  const keys = [
    { digit: '1', letters: '' },
    { digit: '2', letters: 'ABC' },
    { digit: '3', letters: 'DEF' },
    { digit: '4', letters: 'GHI' },
    { digit: '5', letters: 'JKL' },
    { digit: '6', letters: 'MNO' },
    { digit: '7', letters: 'PQRS' },
    { digit: '8', letters: 'TUV' },
    { digit: '9', letters: 'WXYZ' },
    { digit: '*', letters: '' },
    { digit: '0', letters: '+' },
    { digit: '#', letters: '' }
  ];

  // Ajouter un chiffre
  const handleKeyPress = useCallback((digit) => {
    // Feedback haptique
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    setNumber(prev => prev + digit);
  }, []);

  // Appui long sur 0 pour +
  const handleLongPress = useCallback((digit) => {
    if (digit === '0') {
      setNumber(prev => prev + '+');
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
  }, []);

  // Effacer le dernier caractère
  const handleBackspace = useCallback(() => {
    setNumber(prev => prev.slice(0, -1));
  }, []);

  // Effacer tout (appui long sur backspace)
  const handleClear = useCallback(() => {
    setNumber('');
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, []);

  // Lancer l'appel
  const handleCall = useCallback(() => {
    if (number.length > 0) {
      onCall(number);
    }
  }, [number, onCall]);

  // Formater le numéro pour l'affichage
  const formatDisplayNumber = (num) => {
    if (!num) return '';

    // Formatage français basique
    const cleaned = num.replace(/[^\d+*#]/g, '');

    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return cleaned.replace(/(\d{2})/, '$1 ');
    if (cleaned.length <= 6) return cleaned.replace(/(\d{2})(\d{2})/, '$1 $2 ');
    if (cleaned.length <= 8) return cleaned.replace(/(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 ');
    if (cleaned.length <= 10) return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 ');

    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  };

  // Timer pour le long press
  let longPressTimer = null;

  const handleTouchStart = (digit) => {
    longPressTimer = setTimeout(() => {
      handleLongPress(digit);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  return (
    <div className="dialpad">
      {/* Affichage du numéro */}
      <div className="dialpad-display">
        <div className="dialpad-number">
          {formatDisplayNumber(number) || (
            <span className="dialpad-placeholder">Entrez un numéro</span>
          )}
        </div>
        {number && (
          <button
            className="dialpad-backspace"
            onClick={handleBackspace}
            onDoubleClick={handleClear}
            aria-label="Effacer"
          >
            <span className="material-icons">backspace</span>
          </button>
        )}
      </div>

      {/* Pavé numérique */}
      <div className="dialpad-keys">
        {keys.map(key => (
          <button
            key={key.digit}
            className="dialpad-key"
            onClick={() => handleKeyPress(key.digit)}
            onTouchStart={() => handleTouchStart(key.digit)}
            onTouchEnd={handleTouchEnd}
            onMouseDown={() => handleTouchStart(key.digit)}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
          >
            <span className="dialpad-digit">{key.digit}</span>
            {key.letters && (
              <span className="dialpad-letters">{key.letters}</span>
            )}
          </button>
        ))}
      </div>

      {/* Bouton d'appel */}
      <div className="dialpad-actions">
        <button
          className={`dialpad-call-btn ${!isConnected ? 'disabled' : ''} ${!number ? 'empty' : ''}`}
          onClick={handleCall}
          disabled={!isConnected || !number}
          aria-label="Appeler"
        >
          <span className="material-icons">call</span>
        </button>
      </div>

      {/* Message si déconnecté */}
      {!isConnected && (
        <div className="dialpad-warning">
          <span className="material-icons">warning</span>
          <span>Non connecté au serveur téléphonique</span>
        </div>
      )}
    </div>
  );
};

export default Dialpad;
