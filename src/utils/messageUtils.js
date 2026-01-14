/**
 * Utilitaires pour la gestion des messages
 */

/**
 * Extrait le texte d'un message, quel que soit son format
 */
export function getMessageText(message) {
  return message?.message?.extendedTextMessage?.text || 
         message?.message?.conversation || 
         message?.content || 
         message?.text || 
         '';
}

/**
 * Vérifie si deux messages sont identiques
 * @param {Object} msg1 - Premier message
 * @param {Object} msg2 - Deuxième message
 * @param {number} timeWindow - Fenêtre de temps en secondes pour considérer les messages comme doublons
 * @returns {boolean} - True si les messages sont considérés comme identiques
 */
export function areMessagesIdentical(msg1, msg2, timeWindow = 5) {
  // Vérifier par ID d'abord
  if (msg1.key?.id === msg2.key?.id || msg1.id === msg2.id) {
    return true;
  }
  
  // Pour les messages envoyés, vérifier le texte et le timing
  if (msg1.key?.fromMe && msg2.key?.fromMe) {
    const text1 = getMessageText(msg1);
    const text2 = getMessageText(msg2);
    
    if (text1 === text2 && text1 !== '') {
      const time1 = msg1.messageTimestamp || msg1.timestamp;
      const time2 = msg2.messageTimestamp || msg2.timestamp;
      
      // Si les timestamps sont proches (dans la fenêtre définie)
      if (Math.abs(time1 - time2) < timeWindow) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Trouve l'index d'un message existant dans une liste
 * @param {Array} messages - Liste des messages
 * @param {Object} newMessage - Nouveau message à chercher
 * @returns {number} - Index du message trouvé, ou -1 si non trouvé
 */
export function findExistingMessageIndex(messages, newMessage) {
  // Chercher d'abord un message temporaire à remplacer
  if (newMessage.key?.fromMe) {
    const messageText = getMessageText(newMessage);
    
    // Chercher un message temporaire avec le même texte
    const tempIndex = messages.findIndex(msg => 
      msg.key?.fromMe && 
      msg.status === 'sending' &&
      getMessageText(msg) === messageText
    );
    
    if (tempIndex !== -1) {
      return tempIndex;
    }
  }
  
  // Chercher un message identique
  return messages.findIndex(msg => areMessagesIdentical(msg, newMessage));
}

/**
 * Formatte le statut d'un message pour l'affichage
 */
export function getMessageStatusIcon(status) {
  switch (status) {
    case 'sending':
      return '⏳';
    case 'sent':
      return '✓';
    case 'delivered':
      return '✓✓';
    case 'read':
      return '✓✓'; // En bleu dans l'UI
    case 'failed':
      return '❌';
    default:
      return '';
  }
}