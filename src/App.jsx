import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './mobile-stability.css'; // Helps with mobile transitions
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import NewChatDialog from './components/NewChatDialog';
import Login from './components/Login';
import AdminPanelEnhanced from './components/AdminPanelEnhanced';

import ChangePassword from './components/ChangePassword';
import NavigationMenu from './components/NavigationMenu';
import SessionTabs from './components/SessionTabs';
import VersionAlert from './components/VersionAlert';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useWebSocket } from './hooks/useWebSocket';
import whatsappApi from './services/whatsappApi';
import providerApi from './services/providerApi';
import notificationService from './services/notificationService';
import offlineQueueService from './services/offlineQueueService';
import axios from 'axios'; // Import ajouté
import './App.css';

// BETA: VoIP Module
import { BottomNavigation } from './components/navigation';
import { PhoneView } from './components/phone';
import useVoIP from './hooks/useVoIP';
import voipService from './services/voip/VoIPService';

// Détecter si on est en mode natif (app iOS avec CallKit)
// Vérifie le paramètre URL ?mode=native OU la présence de ReactNativeWebView
const isNativeMode = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const hasNativeParam = urlParams.get('mode') === 'native';
  const hasWebView = typeof window !== 'undefined' && !!window.ReactNativeWebView;
  return hasNativeParam || hasWebView;
};

// Log mode au démarrage
console.log('[App] Mode natif:', isNativeMode() ? 'OUI (CallKit actif)' : 'NON (PWA standard)');

function MainApp() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [newMessage, setNewMessage] = useState(null); // Nouveau message pour ChatWindow
  const [connectionState, setConnectionState] = useState('connecting');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  // BETA: Navigation par onglets (SMS / WhatsApp / Téléphone)
  const [activeTab, setActiveTab] = useState('whatsapp'); // 'sms' | 'whatsapp' | 'phone'

  // BETA: Hook VoIP pour les appels (incoming calls disabled - handled by native iOS app)
  const { missedCallsCount } = useVoIP();

  // DISABLED: Incoming calls handled by native iOS app
  // useEffect(() => {
  //   const handleServiceWorkerMessage = (event) => {
  //     if (event.data && event.data.type === 'INCOMING_CALL_ACTION') {
  //       console.log('📞 Action depuis notification push:', event.data);
  //       if (event.data.action === 'answer') {
  //         voipAnswer();
  //       } else if (event.data.action === 'reject') {
  //         voipReject();
  //       }
  //     }
  //   };
  //
  //   if ('serviceWorker' in navigator) {
  //     navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
  //   }
  //
  //   return () => {
  //     if ('serviceWorker' in navigator) {
  //       navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
  //     }
  //   };
  // }, [voipAnswer, voipReject]);

  const { user } = useAuth();

  // BETA: Filtrer les chats selon l'onglet actif
  const filteredChats = useMemo(() => {
    if (activeTab === 'phone') return []; // Pas de chats sur l'onglet téléphone
    return chats.filter(chat => {
      const source = chat.source || 'whatsapp';
      if (activeTab === 'sms') return source === 'sms';
      if (activeTab === 'whatsapp') return source === 'whatsapp';
      return true;
    });
  }, [chats, activeTab]);

  // BETA: Calculer les badges pour chaque onglet
  const badges = useMemo(() => {
    const smsUnread = chats
      .filter(c => c.source === 'sms')
      .reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    const whatsappUnread = chats
      .filter(c => c.source !== 'sms')
      .reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    return {
      sms: smsUnread,
      whatsapp: whatsappUnread,
      phone: missedCallsCount
    };
  }, [chats, missedCallsCount]);

  // BETA: Changer d'onglet
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Si on change d'onglet, désélectionner le chat
    if (tab === 'phone') {
      setSelectedChat(null);
    }
  };

  // Vérifier si on doit demander les notifications
  useEffect(() => {
    const checkNotificationPermission = () => {
      if (notificationService.isSupported() &&
        notificationService.getPermissionStatus() === 'default') {
        // Attendre 2 secondes avant d'afficher le prompt
        setTimeout(() => setShowNotifPrompt(true), 2000);
      }
    };
    checkNotificationPermission();
  }, []);

  const handleEnableNotifications = async () => {
    setShowNotifPrompt(false);
    const permission = await notificationService.requestPermission();
    if (permission === 'granted') {
      console.log('Notifications push activées !');
    }
  };


  // Gestion du viewport visuel pour mobile (clavier)
  useEffect(() => {
    // Fonction robuste pour redimensionner l'application
    const handleVisualViewportResize = () => {
      // Sur mobile (iOS particulièrement), visualViewport change quand le clavier s'ouvre
      // On force la hauteur de l'élément .app pour qu'elle corresponde exactement à la hauteur VISIBLE
      // Cela permet à flexbox de "pousser" et réduire le contenu (comme la liste de messages)
      if (window.visualViewport) {
        const appElement = document.querySelector('.app');
        if (appElement) {
          appElement.style.height = `${window.visualViewport.height}px`;
          // Important: scroller vers le haut du document pour éviter que le clavier ne cache le haut
          window.scrollTo(0, 0);
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
      window.visualViewport.addEventListener('scroll', handleVisualViewportResize); // Scroll aussi important

      // Init initial
      handleVisualViewportResize();
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
        window.visualViewport.removeEventListener('scroll', handleVisualViewportResize);
      }
    };
  }, []);


  // WebSocket pour temps réel - Une seule connexion
  // Utiliser wss: si on est en https, sinon ws:
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = process.env.REACT_APP_WS_URL || `${wsProtocol}//${window.location.host}/ws`;
  const token = localStorage.getItem('authToken');
  const { isConnected, lastMessage, subscribeToChat } = useWebSocket(wsUrl, token);

  // Traiter les messages WebSocket directement
  useEffect(() => {
    if (!lastMessage) return;

    const { type, data } = lastMessage;

    switch (type) {
      case 'new_message':
        // console.log('🚀 Push: Nouveau message reçu', data);
        updateChatWithNewMessage(data);
        break;

      case 'chats_list_update':
        console.log('🚀 Push: Mise à jour liste des chats', data);
        if (data.chats) {
          // S'assurer que chaque chat a une propriété source
          const normalizedChats = data.chats.map(chat => ({
            ...chat,
            source: chat.source || chat.provider ||
              (chat.id.startsWith('sms_') ? 'sms' :
                (chat.id.includes('@s.whatsapp.net') || chat.id.includes('@g.us')) ? 'whatsapp' : 'whatsapp')
          }));
          setChats(normalizedChats);
        }
        break;

      case 'connection_update':
        console.log('🚀 Push: Mise à jour connexion', data);
        setConnectionState(data.status?.state || 'connected');
        break;

      case 'typing_status':
        console.log('🚀 Push: Statut de frappe', data);
        updateTypingIndicator(data.chatId, data.isTyping);
        break;

      case 'reaction':
        console.log('🚀 Push: Réaction reçue', data);
        handleReaction(data);
        break;

      case 'trigger_sync':
        console.log('🚀 Synchronisation intelligente déclenchée:', data.reason);
        // Forcer une synchronisation immédiate des chats
        loadChats(true);
        // Si une conversation est ouverte, la synchroniser aussi
        if (selectedChat) {
          window.dispatchEvent(new CustomEvent('forceChatSync', {
            detail: { chatId: selectedChat.id }
          }));
        }
        break;

      case 'notification':
        console.log('🚀 Push: Notification', data);
        // Afficher la notification
        if (data.type === 'error') {
          alert(data.message);
        }
        break;

      case 'message_status':
        // Mettre à jour le statut du message
        if (data && data.messageId) {
          window.dispatchEvent(new CustomEvent('messageStatusUpdate', {
            detail: {
              messageId: data.messageId,
              status: data.status,
              timestamp: data.timestamp,
              recipient: data.recipient
            }
          }));
        }
        break;

      // Incoming calls - only handle in native mode (iOS app with CallKit)
      case 'incoming_call':
        console.log('📞 Push: Appel entrant AMI', data);
        if (isNativeMode() && window.nativeCallKit) {
          console.log('📞 Mode natif - déclenchement CallKit');
          const callId = data.callId || data.uniqueId || Date.now().toString();
          const callerName = data.callerName || data.callerIdName || 'Inconnu';
          const callerNumber = data.callerId || data.callerIdNum || '';
          window.nativeCallKit.displayIncomingCall(callId, callerName, callerNumber);
        } else {
          console.log('📞 Mode PWA standard - appels entrants désactivés');
        }
        break;

      case 'call_ended':
        console.log('📞 Push: Appel terminé AMI', data);
        if (isNativeMode() && window.nativeCallKit) {
          const callId = data.callId || data.uniqueId || '';
          window.nativeCallKit.endCall(callId);
        }
        break;

      case 'call_history_update':
        console.log('📞 Push: Mise à jour historique appels', data);
        // Rafraîchir l'historique des appels via le hook VoIP
        voipService.syncCallHistory();
        break;

      default:
        console.log('Message WebSocket non géré:', type, data);
    }
  }, [lastMessage, selectedChat, loadChats]);

  // Détecter le changement de taille d'écran
  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth <= 768;
      setIsMobile(newIsMobile);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Charger les chats au démarrage - seulement si authentifié
  useEffect(() => {
    // Initialiser les services
    initializeServices();

    // Ne charger les données que si on a un token ET un utilisateur authentifié
    if (token && user) {
      loadChats();
      checkConnectionState();

      // Plus besoin de vérifier périodiquement - on reçoit les updates par push
    }
  }, [token, user]);

  // Initialiser les services
  const initializeServices = async () => {
    try {
      // Initialiser les notifications
      await notificationService.init();
    } catch (error) {
    }

    try {
      // Initialiser la file d'attente hors ligne
      await offlineQueueService.init();

      // Nettoyer les anciennes données périodiquement
      setInterval(() => {
        offlineQueueService.cleanOldData();
      }, 24 * 60 * 60 * 1000); // Une fois par jour
    } catch (error) {
    }
  };

  // Les messages WebSocket sont maintenant gérés par usePushEvents
  // pour éviter la duplication des messages

  // S'abonner au chat sélectionné
  useEffect(() => {
    if (selectedChat && isConnected) {
      subscribeToChat(selectedChat.id);
    }
  }, [selectedChat, isConnected, subscribeToChat]);

  // Fonction utilitaire pour filtrer les statuts
  const isStatusOrBroadcast = (remoteJid, messageText = '', contactName = '') => {
    // Filtre ULTRA SIMPLE pour débugger
    // On filtre UNIQUEMENT status@broadcast, RIEN d'autre
    return remoteJid === 'status@broadcast';
  };

  // Charger la liste des chats
  const loadChats = async (forceRefresh = false) => {
    try {
      // Utiliser la nouvelle API unifiée pour les chats
      const headers = {
        'Authorization': `Bearer ${token}`
      };

      // Ajouter le sessionId si disponible
      if (activeSessionId) {
        headers['X-Session-Id'] = activeSessionId;
      }

      const response = await fetch('/api/chats', {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to load chats');
      }

      const data = await response.json();
      const chatsData = data.chats || [];

      // Transformer les données au format attendu
      const transformedChats = chatsData.map(chat => {
        // Les données peuvent venir soit de ChatStorageService (Meta) soit d'WhatsApp
        // ChatStorageService retourne déjà les données dans le bon format
        if (chat.lastMessage && typeof chat.lastMessage === 'string') {
          // Format ChatStorageService (déjà transformé)
          return {
            id: chat.id,
            name: chat.name || chat.id,
            lastMessage: chat.lastMessage,
            timestamp: chat.timestamp,
            unreadCount: chat.unreadCount || 0,
            profilePicture: chat.profilePicture || null,
            isTyping: chat.isTyping || false,
            source: chat.source || chat.provider || (chat.id.startsWith('sms_') ? 'sms' : 'whatsapp')
          };
        }

        // Format WhatsApp API (ancien format)
        let lastMessageText = '';
        // FIX: Utiliser chat.timestamp en priorité (crucial pour SMS), puis updatedAt, puis Date.now() en dernier recours
        let timestamp = chat.timestamp || (chat.updatedAt ? new Date(chat.updatedAt).getTime() / 1000 : Date.now() / 1000);

        if (chat.lastMessage) {
          // Gérer différents types de messages WhatsApp
          if (chat.lastMessage.message?.conversation) {
            lastMessageText = chat.lastMessage.message.conversation;
          } else if (chat.lastMessage.message?.extendedTextMessage?.text) {
            lastMessageText = chat.lastMessage.message.extendedTextMessage.text;
          } else if (chat.lastMessage.message?.imageMessage?.caption) {
            lastMessageText = '📷 ' + chat.lastMessage.message.imageMessage.caption;
          } else if (chat.lastMessage.message?.imageMessage) {
            lastMessageText = '📷 Photo';
          } else if (chat.lastMessage.message?.videoMessage) {
            lastMessageText = '🎥 Vidéo';
          } else if (chat.lastMessage.message?.audioMessage) {
            lastMessageText = '🎵 Audio';
          } else if (chat.lastMessage.message?.documentMessage) {
            lastMessageText = '📄 Document';
          } else {
            lastMessageText = 'Message';
          }

          // Utiliser le timestamp du dernier message si disponible
          if (chat.lastMessage.messageTimestamp) {
            timestamp = parseInt(chat.lastMessage.messageTimestamp);
          }
        }

        return {
          id: chat.remoteJid || chat.id,
          name: chat.pushName || chat.name || '',
          lastMessage: lastMessageText,
          timestamp: timestamp,
          unreadCount: 0,
          profilePicture: chat.profilePicUrl || chat.profilePicture || null,
          isTyping: false,
          localPhoneNumber: chat.local_phone_number || chat.localPhoneNumber || null,
          source: chat.provider || (chat.id.startsWith('sms_') ? 'sms' : 'whatsapp')
        };
      });

      // Filtrer les chats spéciaux et statuts, puis trier par date
      const filteredChats = transformedChats
        .filter(chat => !isStatusOrBroadcast(chat.id, chat.lastMessage, chat.name))
        .sort((a, b) => b.timestamp - a.timestamp);

      setChats(filteredChats);
      // console.log('DEBUG: Chats charged:', filteredChats.length);
    } catch (error) {
      // TODO: Afficher notification d'erreur
    }
  };

  // Vérifier l'état de connexion WhatsApp
  const checkConnectionState = async () => {
    try {
      const response = await providerApi.getConnectionState();

      // Le provider API retourne { connected: boolean, state: string, provider: string }
      if (response.connected) {
        setConnectionState('connected');
      } else if (response.state === 'connecting') {
        setConnectionState('connecting');
      } else {
        setConnectionState('disconnected');
      }
    } catch (error) {
      console.error('Erreur vérification connexion:', error);
      setConnectionState('disconnected');
    }
  };




  // Gérer les réactions
  const handleReaction = (reactionData) => {
    console.log('🎯 Réaction reçue:', reactionData);

    // Si c'est le chat actuellement ouvert, transmettre la réaction au ChatWindow
    if (selectedChat?.id === reactionData.key.remoteJid) {
      setNewMessage({
        type: 'reaction',
        ...reactionData,
        _renderTrigger: Date.now() // Pour forcer re-render
      });
    }
  };

  // Mettre à jour un chat avec un nouveau message
  const updateChatWithNewMessage = async (messageData) => {
    // Adapter la structure Baileys/Meta à celle attendue par le frontend
    const normalizedMessage = messageData.key ? messageData : {
      key: {
        remoteJid: messageData.chatId || messageData.from,
        fromMe: messageData.fromMe ?? messageData.isFromMe ?? false, // Baileys utilise isFromMe
        id: messageData.id
      },
      message: messageData.message || {
        conversation: messageData.content || messageData.text
      },
      pushName: messageData.pushName || messageData.contactName,
      // FIX: Utiliser messageTimestamp du WebSocket, puis timestamp en fallback
      messageTimestamp: messageData.messageTimestamp || messageData.timestamp,
      // Propager les propriétés importantes pour les médias
      type: messageData.type,
      media: messageData.media,
      content: messageData.content
    };

    console.log('🔔 Nouveau message reçu:', {
      remoteJid: normalizedMessage.key?.remoteJid,
      fromMe: normalizedMessage.key?.fromMe,
      pushName: normalizedMessage.pushName,
      messageTimestamp: normalizedMessage.messageTimestamp,
      message: normalizedMessage.message
    });

    // Extraire le texte du message d'abord pour le filtrage
    let messageText = '';
    if (normalizedMessage.message?.conversation) {
      messageText = normalizedMessage.message.conversation;
    } else if (normalizedMessage.message?.extendedTextMessage?.text) {
      messageText = normalizedMessage.message.extendedTextMessage.text;
    } else if (normalizedMessage.content) {
      messageText = normalizedMessage.content;
    }

    // Filtrer les statuts et broadcasts dès la réception avec tous les paramètres
    if (isStatusOrBroadcast(normalizedMessage.key.remoteJid, messageText, normalizedMessage.pushName)) {
      console.log('❌ Message filtré (status/broadcast):', normalizedMessage.key.remoteJid);
      return; // Ignorer les statuts
    }

    console.log('✅ Message accepté, mise à jour des chats');

    // Si c'est le chat actuellement ouvert, transmettre le message au ChatWindow
    if (selectedChat?.id === normalizedMessage.key.remoteJid) {
      setNewMessage({
        ...normalizedMessage,
        _renderTrigger: Date.now() // Pour forcer re-render (ne pas écraser timestamp!)
      });
    }

    // Compléter l'extraction du texte du message pour tous les types
    if (normalizedMessage.message?.imageMessage?.caption) {
      messageText = '📷 ' + normalizedMessage.message.imageMessage.caption;
    } else if (normalizedMessage.message?.imageMessage) {
      messageText = '📷 Photo';
    } else if (normalizedMessage.message?.videoMessage) {
      messageText = '🎥 Vidéo';
    } else if (normalizedMessage.message?.audioMessage) {
      messageText = '🎵 Audio';
    } else if (normalizedMessage.message?.documentMessage) {
      messageText = '📄 Document';
    } else {
      messageText = 'Message';
    }

    // Mise à jour de la liste des chats
    setChats(prevChats => {
      // Vérifier si le chat existe déjà
      const chatExists = prevChats.some(chat => chat.id === normalizedMessage.key.remoteJid);

      if (!chatExists) {
        // Si le chat n'existe pas, le créer
        // Déterminer la source en fonction de l'ID ou du provider du message
        const chatId = normalizedMessage.key.remoteJid;
        const source = normalizedMessage.provider ||
          (chatId.startsWith('sms_') ? 'sms' :
            (chatId.includes('@s.whatsapp.net') || chatId.includes('@g.us')) ? 'whatsapp' : 'whatsapp');

        const newChat = {
          id: chatId,
          name: normalizedMessage.pushName || chatId.replace('@s.whatsapp.net', ''),
          lastMessage: messageText,
          timestamp: parseInt(normalizedMessage.messageTimestamp) || Date.now() / 1000,
          unreadCount: selectedChat?.id === chatId ? 0 : 1,
          profilePicture: null,
          isTyping: false,
          source: source  // IMPORTANT: pour le filtrage par onglet
        };

        // Ajouter le nouveau chat et trier
        return [newChat, ...prevChats].sort((a, b) => b.timestamp - a.timestamp);
      } else {
        // Mettre à jour le chat existant
        const updatedChats = prevChats.map(chat => {
          if (chat.id === normalizedMessage.key.remoteJid) {
            return {
              ...chat,
              lastMessage: messageText,
              timestamp: parseInt(normalizedMessage.messageTimestamp) || Date.now() / 1000,
              unreadCount: chat.id === selectedChat?.id ? 0 : (chat.unreadCount || 0) + 1
            };
          }
          return chat;
        });

        // Trier directement par timestamp
        return updatedChats.sort((a, b) => b.timestamp - a.timestamp);
      }
    });

    // Afficher une notification si ce n'est pas le chat actuel et pas un message envoyé
    const chat = chats.find(c => c.id === normalizedMessage.key.remoteJid);
    if (chat && chat.id !== selectedChat?.id && !normalizedMessage.key.fromMe) {
      await notificationService.notifyNewMessage(chat, {
        id: normalizedMessage.key.id,
        text: messageText
      });
    }
  };

  // Mettre à jour l'indicateur de frappe
  const updateTypingIndicator = (chatId, isTyping) => {
    setChats(prevChats => {
      return prevChats.map(chat => {
        if (chat.id === chatId) {
          return { ...chat, isTyping };
        }
        return chat;
      });
    });
  };

  // Gérer la sélection d'un chat
  const handleChatSelect = (chat) => {
    // Nettoyer le draft précédent si on change de conversation sans avoir envoyé
    if (selectedChat?.isDraft && selectedChat.id !== chat.id) {
      cleanupDraft(selectedChat);
    }

    setSelectedChat(chat);

    // S'abonner aux mises à jour de ce chat via WebSocket
    if (isConnected) {
      subscribeToChat(chat.id);
    }

    // Marquer comme lu
    if (chat.unreadCount > 0) {
      setChats(prevChats => {
        return prevChats.map(c => {
          if (c.id === chat.id) {
            return { ...c, unreadCount: 0 };
          }
          return c;
        });
      });
    }
  };

  // Retour à la liste (mobile)
  const handleBackToList = () => {
    // Nettoyer le draft si on quitte sans avoir envoyé
    cleanupDraft(selectedChat);
    setSelectedChat(null);
  };

  // Désactivé - remplacé par la synchronisation intelligente
  // La synchronisation via WebSocket est suffisante
  /*
  useEffect(() => {
    if (!token || !user) return;
  
    const syncInterval = setInterval(() => {
      console.log('🔄 Synchronisation périodique des chats...');
      loadChats(true);
    }, 30000);
  
    return () => clearInterval(syncInterval);
  }, [token, user]);
  */

  // Gérer l'ouverture du dialog nouvelle conversation
  const handleNewChat = () => {
    setShowNewChatDialog(true);
  };

  // Gérer la création d'un nouveau chat (ou draft)
  const handleNewChatCreated = async (newChat) => {
    // Ajouter le nouveau chat à la liste
    setChats(prev => [newChat, ...prev]);

    // Sélectionner automatiquement le nouveau chat
    setSelectedChat(newChat);

    // Fermer le dialog
    setShowNewChatDialog(false);

    // Pour les drafts, NE PAS recharger immédiatement (le chat n'existe pas en DB)
    // loadChats() sera appelé après l'envoi du premier message dans ChatWindow
    if (!newChat.isDraft) {
      setTimeout(() => {
        loadChats();
      }, 1000);
    }
  };

  // Nettoyer les drafts non utilisés (quand on quitte sans envoyer de message)
  const cleanupDraft = (chatToClean) => {
    if (chatToClean?.isDraft) {
      setChats(prev => prev.filter(c => c.id !== chatToClean.id));
    }
  };

  // Convertir un draft en chat réel après l'envoi du premier message
  const handleDraftConverted = (chatId) => {
    // Retirer le flag isDraft du chat
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        const { isDraft, pendingMessage, ...rest } = c;
        return rest;
      }
      return c;
    }));

    // Mettre à jour selectedChat aussi
    setSelectedChat(prev => {
      if (prev?.id === chatId) {
        const { isDraft, pendingMessage, ...rest } = prev;
        return rest;
      }
      return prev;
    });

    // Recharger les chats pour sync avec la DB
    setTimeout(() => {
      loadChats();
    }, 1000);
  };

  // Rendu de l'état de connexion
  const renderConnectionBanner = () => {
    if (connectionState !== 'connected') {
      return (
        <div className={`connection-banner ${connectionState}`}>
          <span className="material-icons">
            {connectionState === 'connecting' ? 'sync' : 'signal_wifi_off'}
          </span>
          <span>
            {connectionState === 'connecting' ? 'Connexion...' : 'WhatsApp déconnecté'}
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="app">
      {/* DISABLED: Incoming calls handled by native iOS app
      <IncomingCallOverlay />
      */}

      {renderConnectionBanner()}
      <VersionAlert />

      {/* Prompt pour activer les notifications */}
      {showNotifPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            margin: '20px',
            maxWidth: '320px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
            <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>Activer les notifications ?</h3>
            <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
              Recevez une alerte quand vous recevez un nouveau message.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowNotifPrompt(false)}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Plus tard
              </button>
              <button
                onClick={handleEnableNotifications}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#25D366',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Activer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onglets de sessions - Masqué selon demande utilisateur
      <SessionTabs onSessionChange={setActiveSessionId} />
      */}



      <div className="app-container">
        {/* BETA: Vue Téléphone */}
        {activeTab === 'phone' ? (
          <PhoneView chats={chats} />
        ) : (
          <>
            {/* Liste des chats - Filtrée selon l'onglet actif */}
            <div className={`view-container chat-list-view ${isMobile && selectedChat ? 'hidden' : ''}`}>
              <ChatList
                chats={filteredChats}
                selectedChat={selectedChat}
                onChatSelect={handleChatSelect}
                onRefresh={loadChats}
                onNewChat={handleNewChat}
              />
            </div>

            {/* Fenêtre de chat */}
            <div className={`view-container chat-window-view ${isMobile && !selectedChat ? 'hidden' : ''}`}>
              {selectedChat ? (
                <ChatWindow
                  key={selectedChat.id}
                  chat={selectedChat}
                  newMessage={newMessage}
                  onBack={isMobile ? handleBackToList : null}
                  onMessageSent={loadChats}
                  onDraftConverted={handleDraftConverted}
                  activeSessionId={activeSessionId}
                />
              ) : (
                <div className="no-chat-selected">
                  <span className="material-icons">chat</span>
                  <p>Sélectionnez une discussion pour commencer</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Dialog nouvelle conversation */}
      <NewChatDialog
        isOpen={showNewChatDialog}
        onClose={() => setShowNewChatDialog(false)}
        onChatCreated={handleNewChatCreated}
      />

      {/* BETA: Bottom Navigation - Remplace le menu hamburger */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        badges={badges}
      />

      {/* Menu de navigation (conservé pour accès admin/settings) */}
      <NavigationMenu />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminPanelEnhanced />
              </ProtectedRoute>
            }
          />

          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

function LoginRoute() {
  const { login } = useAuth();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Login onLogin={login} />;
}

export default App;