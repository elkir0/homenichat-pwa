import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

/**
 * Hook pour gérer les événements push du serveur
 * Remplace tous les polling et refresh périodiques
 */
export const usePushEvents = ({
  onNewMessage,
  onMessageUpdate,
  onChatsUpdate,
  onConnectionUpdate,
  onTypingStatus,
  onNotification,
  onReaction,
  onTriggerSync,
  onIncomingCall,
  onCallEnded,
  onCallHistoryUpdate
}) => {
  // Récupérer l'URL et le token
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = process.env.REACT_APP_WS_URL || `${wsProtocol}//${window.location.host}/ws`;
  const token = localStorage.getItem('authToken');
  
  const { isConnected, lastMessage } = useWebSocket(wsUrl, token);

  // Gestionnaire d'événements centralisé
  const handlePushEvent = useCallback((event) => {
    const { type, data } = event;

    switch (type) {
      case 'new_message':
        if (onNewMessage) {
          onNewMessage(data);
        }
        break;

      case 'message_update':
        if (onMessageUpdate) {
          onMessageUpdate(data);
        }
        break;

      case 'chats_list_update':
        if (onChatsUpdate) {
          onChatsUpdate(data);
        }
        break;

      case 'connection_update':
        if (onConnectionUpdate) {
          onConnectionUpdate(data);
        }
        break;

      case 'typing_status':
        if (onTypingStatus) {
          onTypingStatus(data);
        }
        break;

      case 'notification':
        if (onNotification) {
          onNotification(data);
        }
        break;

      case 'reaction':
        if (onReaction) {
          onReaction(data);
        }
        break;

      case 'trigger_sync':
        if (onTriggerSync) {
          onTriggerSync(data);
        }
        break;

      // Appels téléphoniques
      case 'incoming_call':
        console.log('[usePushEvents] 📞 Incoming call:', data);
        if (onIncomingCall) {
          onIncomingCall(data);
        }
        break;

      case 'call_ended':
        console.log('[usePushEvents] 📞 Call ended:', data);
        if (onCallEnded) {
          onCallEnded(data);
        }
        break;

      case 'call_history_update':
        console.log('[usePushEvents] 📞 Call history update:', data);
        if (onCallHistoryUpdate) {
          onCallHistoryUpdate(data);
        }
        break;

      default:
        console.log('Événement push non géré:', type, data);
    }
  }, [onNewMessage, onMessageUpdate, onChatsUpdate, onConnectionUpdate, onTypingStatus, onNotification, onReaction, onTriggerSync, onIncomingCall, onCallEnded, onCallHistoryUpdate]);

  // Traiter les messages reçus via WebSocket
  useEffect(() => {
    if (lastMessage) {
      handlePushEvent(lastMessage);
    }
  }, [lastMessage, handlePushEvent]);

  // Fonction pour s'abonner à un chat
  const subscribeToChat = useCallback((chatId) => {
    // Cette fonctionnalité est maintenant gérée dans useWebSocket
    console.log('Subscription to chat:', chatId);
  }, []);

  // Fonction pour envoyer un statut de frappe
  const sendTypingStatus = useCallback((chatId, isTyping) => {
    // Cette fonctionnalité est maintenant gérée dans useWebSocket
    console.log('Typing status:', chatId, isTyping);
  }, []);

  return {
    subscribeToChat,
    sendTypingStatus
  };
};