import React, { useState, useEffect } from 'react';
import CallHistory from './CallHistory/CallHistory';
import Dialpad from './Dialpad/Dialpad';
import CallScreen from './CallScreen/CallScreen';
import PhoneSettings, { getPhoneSettings } from './PhoneSettings/PhoneSettings';
import useVoIP from '../../hooks/useVoIP';
import ringtoneService from '../../services/RingtoneService';
import './PhoneView.css';

/**
 * PhoneView - Vue principale du module téléphone (Layout 2 colonnes)
 *
 * Structure identique aux vues SMS/WhatsApp:
 * - Sidebar gauche (360px): Historique des appels
 * - Panel droit (flex): Dialpad / Contacts / Détails
 * - CallScreen en overlay quand appel en cours
 */
const PhoneView = ({ chats = [] }) => {
  const [selectedCall, setSelectedCall] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [rightPanelView, setRightPanelView] = useState('dialpad'); // 'dialpad' | 'contact' | 'contacts_list'
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState([]); // Liste des contacts dérivés des chats
  const [showDialpadMobile, setShowDialpadMobile] = useState(false); // Mobile: toggle dialpad view
  const [showSettings, setShowSettings] = useState(false); // Afficher le panneau paramètres

  const {
    isInCall,
    isRinging,
    isCalling,
    currentCall,
    callHistory,
    isConnected,
    isHistoryLoading,
    call,
    answer,
    reject,
    hangup,
    formatPhoneNumber,
    syncHistory
  } = useVoIP();

  // Note: La permission micro est demandée uniquement au moment de l'appel
  // Limitation iOS Safari: la permission ne persiste pas entre sessions PWA

  // Jouer la sonnerie lors d'un appel entrant
  useEffect(() => {
    if (isRinging) {
      const settings = getPhoneSettings();
      ringtoneService.setVolume(settings.speakerVolume / 100);
      ringtoneService.play(settings.ringtone);

      // Vibration si activée
      if (settings.vibration && navigator.vibrate) {
        const vibratePattern = () => {
          if (isRinging) {
            navigator.vibrate([200, 100, 200, 100, 200]);
          }
        };
        vibratePattern();
        const vibrateInterval = setInterval(vibratePattern, 2000);
        return () => {
          clearInterval(vibrateInterval);
          ringtoneService.stop();
        };
      }
    } else {
      ringtoneService.stop();
    }
    return () => ringtoneService.stop();
  }, [isRinging]);

  // Jouer la tonalité de retour d'appel (ringback) lors d'un appel sortant
  useEffect(() => {
    if (isCalling) {
      const settings = getPhoneSettings();
      ringtoneService.setVolume(settings.speakerVolume / 100);
      ringtoneService.playRingback();
    } else {
      // Arrêter le ringback quand l'appel est décroché ou terminé
      if (ringtoneService.currentRingtone === 'ringback') {
        ringtoneService.stop();
      }
    }
    return () => {
      if (ringtoneService.currentRingtone === 'ringback') {
        ringtoneService.stop();
      }
    };
  }, [isCalling]);

  // Handler pour passer un appel depuis le dialpad
  const handleCall = async (number) => {
    if (!isConnected) {
      alert('Non connecté au serveur téléphonique');
      return;
    }
    await call(number);
  };

  // Handler pour rappeler depuis l'historique
  const handleCallback = async (historyItem) => {
    // Support des deux formats (local et serveur)
    let number;
    if (historyItem.direction === 'incoming') {
      number = historyItem.callerNumber || historyItem.callerId;
    } else if (historyItem.direction === 'outgoing') {
      number = historyItem.calledNumber || historyItem.target;
    } else {
      number = historyItem.target || historyItem.callerId;
    }

    if (number) {
      await call(number);
    }
  };

  // Sélectionner un appel dans l'historique
  const handleSelectCall = (callItem) => {
    setSelectedCall(callItem);
    setRightPanelView('contact');
  };

  // Retour au dialpad
  const handleBackToDialpad = () => {
    setSelectedCall(null);
    setRightPanelView('dialpad');
  };

  // Basculer vers la liste des contacts
  const handleShowContacts = () => {
    // Charger les contacts depuis les props ou le service (ici on simule depuis les chats pour l'instant)
    // Idéalement, on devrait recevoir 'chats' en props
    setRightPanelView('contacts_list');
  };

  // Sélectionner un contact pour l'appeler
  const handleSelectContact = (contact) => {
    // Si le contact a un numéro local, on l'utilise, sinon son ID
    const number = contact.localPhoneNumber || contact.id.replace('@s.whatsapp.net', '');
    handleCall(number);
  };

  // Filtrer les contacts (chats)
  const filteredContacts = chats.filter(chat => {
    if (!chat.id.includes('@s.whatsapp.net') && !chat.id.startsWith('sms_')) return false; // Ignorer les groupes pour l'instant
    if (!searchQuery) return true;
    const name = (chat.name || '').toLowerCase();
    const number = (chat.id || '').replace('@s.whatsapp.net', '');
    return name.includes(searchQuery.toLowerCase()) || number.includes(searchQuery);
  });

  // Mobile: retour à la sidebar depuis le dialpad
  const handleBackToSidebar = () => {
    setShowDialpadMobile(false);
  };

  return (
    <div className={`phone-view ${showDialpadMobile ? 'show-main' : ''}`}>
      {/* === SIDEBAR GAUCHE: Historique des appels === */}
      <div className="phone-sidebar">
        {/* Header sidebar */}
        <div className="phone-sidebar-header">
          <div className="phone-sidebar-title">
            <span className="material-icons">call</span>
            <h1>Téléphone</h1>
            <span
              className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`}
              title={isConnected ? 'Connecté' : 'Déconnecté'}
            />
          </div>
          <button
            className="phone-settings-btn"
            aria-label="Paramètres"
            onClick={() => setShowSettings(true)}
          >
            <span className="material-icons">settings</span>
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="phone-search">
          <span className="material-icons search-icon">search</span>
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="phone-search-input"
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Effacer"
            >
              <span className="material-icons">close</span>
            </button>
          )}
        </div>

        {/* Navigation Sidebar (Historique / Contacts) */}
        <div className="phone-sidebar-tabs">
          <button
            className={`sidebar-tab ${rightPanelView !== 'contacts_list' ? 'active' : ''}`}
            onClick={handleBackToDialpad}
          >
            Historique
          </button>
          <button
            className={`sidebar-tab ${rightPanelView === 'contacts_list' ? 'active' : ''}`}
            onClick={handleShowContacts}
          >
            Contacts
          </button>
        </div>

        {/* Liste historique */}
        <div className="phone-sidebar-content">
          {rightPanelView === 'contacts_list' ? (
            <div className="contacts-list">
              {filteredContacts.length === 0 ? (
                <div className="empty-state-contacts">
                  <p>Aucun contact trouvé</p>
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <div key={contact.id} className="contact-item" onClick={() => handleSelectContact(contact)}>
                    <div className="contact-avatar">
                      {contact.profilePicture ? (
                        <img src={contact.profilePicture} alt={contact.name} />
                      ) : (
                        <span className="material-icons">person</span>
                      )}
                    </div>
                    <div className="contact-info">
                      <div className="contact-name">{contact.name || 'Inconnu'}</div>
                      <div className="contact-number">{formatPhoneNumber(contact.id.replace('@s.whatsapp.net', ''))}</div>
                    </div>
                    <button className="contact-call-btn">
                      <span className="material-icons">call</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <CallHistory
              history={callHistory}
              searchQuery={searchQuery}
              onCallback={handleCallback}
              onSelectCall={handleSelectCall}
              selectedCall={selectedCall}
              formatPhoneNumber={formatPhoneNumber}
              isLoading={isHistoryLoading}
            />
          )}
        </div>

        {/* FAB pour accéder au dialpad sur mobile */}
        <button
          className="phone-fab-dialpad"
          onClick={() => setShowDialpadMobile(true)}
          aria-label="Ouvrir le clavier"
        >
          <span className="material-icons">dialpad</span>
        </button>
      </div>

      {/* === PANEL DROIT: Dialpad ou Détails contact === */}
      <div className="phone-main">
        {rightPanelView === 'dialpad' && (
          <div className="phone-main-dialpad">
            {/* Header mobile avec bouton retour, status et settings */}
            <div className="dialpad-mobile-header">
              <button className="back-btn" onClick={handleBackToSidebar}>
                <span className="material-icons">arrow_back</span>
              </button>
              <h2>Clavier</h2>
              <div className="dialpad-mobile-header-actions">
                <span
                  className={`connection-dot ${isConnected ? 'connected' : 'disconnected'}`}
                  title={isConnected ? 'Connecté' : 'Déconnecté'}
                />
                <button
                  className="mobile-settings-btn"
                  onClick={() => setShowSettings(true)}
                  aria-label="Paramètres"
                >
                  <span className="material-icons">settings</span>
                </button>
              </div>
            </div>
            <Dialpad
              onCall={handleCall}
              isConnected={isConnected}
            />
          </div>
        )}

        {rightPanelView === 'contact' && selectedCall && (
          <div className="phone-main-contact">
            {/* Header contact */}
            <div className="contact-header">
              <button className="back-btn" onClick={handleBackToDialpad}>
                <span className="material-icons">arrow_back</span>
              </button>
              <h2>{selectedCall.callerName || formatPhoneNumber(
                selectedCall.direction === 'incoming'
                  ? (selectedCall.callerNumber || selectedCall.callerId)
                  : (selectedCall.calledNumber || selectedCall.target)
              )}</h2>
            </div>

            {/* Détails contact */}
            <div className="contact-details">
              <div className="contact-avatar">
                <span className="material-icons">person</span>
              </div>
              <p className="contact-number">
                {formatPhoneNumber(
                  selectedCall.direction === 'incoming'
                    ? (selectedCall.callerNumber || selectedCall.callerId)
                    : (selectedCall.calledNumber || selectedCall.target)
                )}
              </p>
              <p className="contact-call-info">
                {selectedCall.direction === 'incoming' ? 'Appel entrant' : 'Appel sortant'}
                {' • '}
                {selectedCall.duration ? `${Math.floor(selectedCall.duration / 60)}:${(selectedCall.duration % 60).toString().padStart(2, '0')}` : 'Manqué'}
                {selectedCall.answeredByUsername && ` • Pris par ${selectedCall.answeredByUsername}`}
              </p>
            </div>

            {/* Actions contact */}
            <div className="contact-actions">
              <button
                className="contact-action-btn call"
                onClick={() => handleCallback(selectedCall)}
              >
                <span className="material-icons">call</span>
                <span>Appeler</span>
              </button>
              <button className="contact-action-btn message">
                <span className="material-icons">message</span>
                <span>Message</span>
              </button>
            </div>
          </div>
        )}

        {/* État vide - aucun appel sélectionné et pas en mode dialpad */}
        {!selectedCall && rightPanelView !== 'dialpad' && (
          <div className="phone-empty-state">
            <span className="material-icons">dialpad</span>
            <p>Sélectionnez un appel ou utilisez le clavier</p>
          </div>
        )}
      </div>

      {/* === OVERLAY: CallScreen quand appel en cours === */}
      {(isInCall || isRinging) && (
        <CallScreen
          call={currentCall}
          isRinging={isRinging}
          onAnswer={answer}
          onReject={reject}
          onHangup={hangup}
        />
      )}

      {/* === MODAL: Paramètres téléphone === */}
      <PhoneSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        connectionInfo={{
          isConnected,
          server: 'FreePBX / Yeastar P550',
          extension: '---', // À récupérer depuis la config VoIP
          latency: isConnected ? 45 : undefined // À calculer depuis useVoIP
        }}
      />
    </div>
  );
};

export default PhoneView;
