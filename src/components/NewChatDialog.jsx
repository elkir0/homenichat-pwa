import React, { useState, useEffect } from 'react';
import whatsappApi from '../services/whatsappApi';
import { validateInternationalNumber, formatDisplayNumber, getHelpMessage } from '../utils/phoneNumberUtils';
import './NewChatDialog.css';

function NewChatDialog({ isOpen, onClose, onChatCreated }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayNumber, setDisplayNumber] = useState('');
  const [message, setMessage] = useState('');
  const [line, setLine] = useState('chiro_sms');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [error, setError] = useState('');

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setPhoneNumber('');
      setDisplayNumber('');
      setMessage('');
      setLine('chiro_sms');
      setVerificationResult(null);
      setValidationResult(null);
      setError('');
    }
  }, [isOpen]);

  // Handle phone number change with international support
  const handlePhoneNumberChange = (e) => {
    const value = e.target.value;
    setDisplayNumber(value); // Garde la saisie brute pour l'affichage

    // Valider avec le système international
    const validation = validateInternationalNumber(value);
    setValidationResult(validation);
    setPhoneNumber(validation.cleanedNumber || '');

    // Clear previous verification and errors
    setVerificationResult(null);
    setError('');

    // Auto-verify if valid format
    if (validation.valid) {
      verifyPhoneNumber(validation.cleanedNumber);
    } else if (validation.error) {
      setError(validation.error);
    }
  };

  // Verify phone number existence
  const verifyPhoneNumber = async (number) => {
    if (!number) {
      setError('Numéro requis');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const result = await whatsappApi.checkPhoneNumber(number);
      setVerificationResult(result);

      if (!result.exists) {
        setError('Ce numéro WhatsApp n\'existe pas');
      }
    } catch (error) {
      console.error('Error verifying phone number:', error);
      setError('Erreur lors de la vérification du numéro');
      setVerificationResult(null);
    } finally {
      setIsVerifying(false);
    }
  };

  // Create new chat or open draft
  const handleCreateChat = async () => {
    // Validation: si WhatsApp, le numéro doit exister. Si SMS, juste avoir un numéro.
    // Message n'est plus obligatoire - on ouvre une conversation vide
    const isWhatsapp = line === 'whatsapp';
    const canProceed = isWhatsapp ? verificationResult?.exists : !!phoneNumber;

    if (!canProceed) {
      if (isWhatsapp && !verificationResult?.exists) {
        setError('Le numéro doit être valide sur WhatsApp pour ce canal');
      } else if (!phoneNumber) {
        setError('Numéro de téléphone requis');
      }
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Mapper la ligne vers le nom du provider backend
      let provider = 'baileys'; // Default
      if (line === 'chiro_sms' || line === 'osteo_sms') {
        provider = 'sms-bridge';
      }

      // Construire le JID selon le provider
      let jid;
      if (provider === 'sms-bridge') {
        const linePrefix = line.replace('_sms', '');
        jid = `sms_${linePrefix}_${phoneNumber}`;
      } else {
        // WhatsApp JID
        jid = `${phoneNumber}@s.whatsapp.net`;
      }

      // Créer un chat "draft" - il n'existe pas encore en DB
      // Le chat sera créé lors de l'envoi du premier message
      const draftChat = {
        id: jid,
        name: verificationResult?.name || formatDisplayNumber(phoneNumber) || phoneNumber,
        lastMessage: '',
        timestamp: Date.now() / 1000,
        unreadCount: 0,
        profilePicture: verificationResult?.profilePicture || null,
        isTyping: false,
        isDraft: true, // Flag pour identifier les drafts
        provider: provider,
        line: line,
        phoneNumber: phoneNumber, // Garder le numéro brut pour l'envoi
        pendingMessage: message.trim() || null // Message optionnel à envoyer automatiquement
      };

      onChatCreated(draftChat);
      onClose();
    } catch (error) {
      console.error('Error creating draft chat:', error);
      setError(error.message || 'Erreur lors de la création de la discussion');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleCreateChat();
    }
  };

  const passwordOrNumberValid = () => {
    if (line === 'whatsapp') return !!verificationResult?.exists;
    return !!phoneNumber;
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Nouvelle Discussion</h2>
          <button className="btn btn-icon" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="dialog-content">
          {/* Phone Number Input */}
          <div className="form-group">
            <label htmlFor="phoneNumber">Numéro de téléphone</label>
            <div className="phone-input-container">
              <input
                id="phoneNumber"
                type="tel"
                placeholder="+590 690 12 34 56 ou 0690123456"
                value={displayNumber}
                onChange={handlePhoneNumberChange}
                className={`phone-input ${verificationResult?.exists ? 'valid' : ''} ${error && phoneNumber ? 'invalid' : ''}`}
                disabled={isVerifying || isCreating}
              />
              {isVerifying && (
                <div className="input-status">
                  <span className="material-icons spinning">sync</span>
                </div>
              )}
              {verificationResult?.exists && (
                <div className="input-status success">
                  <span className="material-icons">check_circle</span>
                </div>
              )}
              {error && phoneNumber && (
                <div className="input-status error">
                  <span className="material-icons">error</span>
                </div>
              )}
            </div>

            {/* Country detection result */}
            {validationResult?.valid && validationResult.country && (
              <div className="country-info">
                <span className="country-flag">{validationResult.flag}</span>
                <span className="country-name">{validationResult.country}</span>
                {validationResult.displayNumber && (
                  <span className="formatted-number">{validationResult.displayNumber}</span>
                )}
              </div>
            )}

            {verificationResult?.exists && (
              <div className="verification-result success">
                <span className="material-icons">verified</span>
                Contact trouvé: {verificationResult.name || phoneNumber}
              </div>
            )}

            {error && (
              <div className="verification-result error">
                <span className="material-icons">error</span>
                {error}
              </div>
            )}

            <div className="help-text">
              {validationResult?.countryCode ?
                getHelpMessage(validationResult.countryCode) :
                'Formats acceptés: +33 6 12 34 56 78, +590 690 12 34 56, +1 555 123 4567, etc.'
              }
            </div>
          </div>

          {/* Line/Trunk Selection */}
          <div className="form-group">
            <label htmlFor="lineSelect">Ligne d'envoi</label>
            <select
              id="lineSelect"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              className="line-select"
              disabled={isCreating}
            >
              <option value="chiro_sms">Chiro sms</option>
              <option value="osteo_sms">Osteo sms</option>
              <option value="whatsapp">Whatsapp</option>
            </select>
          </div>

          {/* Message Input - Optionnel */}
          <div className="form-group">
            <label htmlFor="message">Message initial <span className="optional-label">(optionnel)</span></label>
            <textarea
              id="message"
              placeholder="Tapez un message ou laissez vide pour écrire après..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={2}
              disabled={isCreating}
              className="message-textarea"
            />
            <div className="help-text">
              Vous pourrez aussi écrire directement dans la conversation
            </div>
          </div>
        </div>

        <div className="dialog-actions">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isCreating}
          >
            Annuler
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreateChat}
            disabled={!passwordOrNumberValid() || isCreating}
          >
            {isCreating ? (
              <>
                <span className="material-icons spinning">sync</span>
                Ouverture...
              </>
            ) : (
              'Ouvrir Discussion'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewChatDialog;