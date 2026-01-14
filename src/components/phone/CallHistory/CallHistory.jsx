import React from 'react';
import { CallDirection } from '../../../services/voip/VoIPService';
import './CallHistory.css';

/**
 * CallHistory - Liste des appels récents (partagée)
 *
 * Affiche les appels avec:
 * - Icône de direction (entrant/sortant/manqué)
 * - Nom ou numéro du contact
 * - Date/heure de l'appel
 * - Durée (si répondu)
 * - Qui a répondu (pour les appels partagés)
 * - Actions rapides (rappeler, message)
 */
const CallHistory = ({ history = [], searchQuery = '', onCallback, onSelectCall, selectedCall, formatPhoneNumber, isLoading = false }) => {

  // Filtrer selon la recherche
  const filteredHistory = history.filter(call => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const name = (call.callerName || '').toLowerCase();
    // Support des deux formats (local et serveur)
    const number = (call.target || call.callerId || call.callerNumber || call.calledNumber || '').toLowerCase();
    const answeredBy = (call.answeredByUsername || '').toLowerCase();
    return name.includes(query) || number.includes(query) || answeredBy.includes(query);
  });

  // Formater la date (gère timestamp Unix en secondes ou millisecondes)
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    // Si timestamp < 10000000000, c'est en secondes (Unix), sinon en millisecondes
    const ts = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now - 86400000).toDateString() === date.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Hier ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Formater la durée
  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Obtenir l'icône selon le type d'appel
  const getCallIcon = (call) => {
    if (call.status === 'missed') {
      return { icon: 'phone_missed', color: 'missed' };
    }
    if (call.direction === CallDirection.INCOMING) {
      return { icon: 'phone_callback', color: 'incoming' };
    }
    return { icon: 'phone_forwarded', color: 'outgoing' };
  };

  // Obtenir le label du type d'appel
  const getCallLabel = (call) => {
    // Ligne (Chiro/Osteo) si présente
    const lineName = call.line_name || call.lineName;

    if (call.status === 'missed') {
      return lineName ? `Appel manqué · ${lineName}` : 'Appel manqué';
    }
    if (call.status === 'rejected') {
      return lineName ? `Appel refusé · ${lineName}` : 'Appel refusé';
    }

    const direction = call.direction === CallDirection.INCOMING || call.direction === 'incoming'
      ? 'Appel entrant'
      : 'Appel sortant';

    let label = direction;

    // Ajouter la ligne si présente
    if (lineName) {
      label += ` · ${lineName}`;
    }

    if (call.duration) {
      label += ` · ${formatDuration(call.duration)}`;
    }

    // Afficher qui a répondu (pour les appels partagés)
    if (call.answeredByUsername) {
      label += ` · ${call.answeredByUsername}`;
    }

    return label;
  };

  // Obtenir le numéro à afficher (support format local et serveur)
  const getDisplayNumber = (call) => {
    // Format serveur
    if (call.direction === 'incoming') {
      return call.callerNumber || 'Inconnu';
    } else if (call.direction === 'outgoing') {
      return call.calledNumber || 'Inconnu';
    }
    // Format local (CallDirection enum)
    return call.target || call.callerId || call.callerNumber || call.calledNumber || 'Inconnu';
  };

  // État de chargement
  if (isLoading) {
    return (
      <div className="call-history-empty">
        <span className="material-icons spinning">sync</span>
        <p>Chargement...</p>
        <small>Synchronisation de l'historique</small>
      </div>
    );
  }

  if (filteredHistory.length === 0) {
    return (
      <div className="call-history-empty">
        <span className="material-icons">history</span>
        {searchQuery ? (
          <>
            <p>Aucun résultat pour "{searchQuery}"</p>
            <small>Essayez une autre recherche</small>
          </>
        ) : (
          <>
            <p>Aucun appel récent</p>
            <small>L'historique partagé apparaîtra ici</small>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="call-history">
      {filteredHistory.map((call, index) => {
        const { icon, color } = getCallIcon(call);
        const rawNumber = getDisplayNumber(call);
        const displayName = call.callerName || formatPhoneNumber(rawNumber) || 'Inconnu';
        const displayNumber = call.callerName ? formatPhoneNumber(rawNumber) : null;

        const isSelected = selectedCall && (selectedCall.id === call.id || selectedCall === call);
        const isMissed = call.status === 'missed';
        const isUnseen = isMissed && !call.seen;

        return (
          <div
            key={call.id || index}
            className={`call-history-item ${isUnseen ? 'unseen' : ''} ${isMissed ? 'missed' : ''} ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelectCall && onSelectCall(call)}
          >
            <div className="call-history-icon-wrapper">
              <span className={`material-icons call-icon ${color}`}>
                {icon}
              </span>
            </div>

            <div className="call-history-info">
              <div className={`call-history-name ${isMissed ? 'missed-text' : ''}`}>
                {displayName}
              </div>
              {displayNumber && (
                <div className="call-history-number">{displayNumber}</div>
              )}
              <div className="call-history-meta">
                {getCallLabel(call)}
              </div>
            </div>

            <div className="call-history-time">
              {formatDate(call.startTime || call.endTime)}
            </div>

            <div className="call-history-actions">
              <button
                className="call-action-btn callback"
                onClick={(e) => {
                  e.stopPropagation();
                  onCallback && onCallback(call);
                }}
                aria-label="Rappeler"
              >
                <span className="material-icons">call</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CallHistory;
