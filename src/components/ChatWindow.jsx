import React, { useState, useEffect, useRef } from 'react';
import MessageInput from './MessageInput';
import SimpleImageViewer from './SimpleImageViewer';
import AudioPlayerUnified from './AudioPlayerUnified';
import whatsappApi from '../services/whatsappApi';
import axios from 'axios';
import offlineQueueService from '../services/offlineQueueService';
import { useHumanBehavior } from '../utils/humanBehavior';
import useVoIP from '../hooks/useVoIP';
import './ChatWindow.css';

function ChatWindow({ chat, newMessage, onBack, onMessageSent, onDraftConverted, activeSessionId }) {
  const { call, isConnected } = useVoIP();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [viewerImage, setViewerImage] = useState(null);

  // Détecter si c'est un draft (nouvelle conversation pas encore envoyée)
  const isDraftChat = chat?.isDraft === true;

  // Écouter les mises à jour de statut des messages
  useEffect(() => {
    const handleStatusUpdate = (event) => {
      const { messageId, status } = event.detail;

      setMessages(prevMessages =>
        prevMessages.map(msg => {
          // Vérifier si c'est le bon message par ID
          if (msg.key?.id === messageId || msg.id === messageId) {
            // console.log(`📊 Mise à jour statut message ${(messageId)}: ${status}`);

            // Petite vibration subtile pour delivered/read (si supporté)
            if ((status === 'delivered' || status === 'read') &&
              msg.status !== status &&
              'vibrate' in navigator) {
              navigator.vibrate(50); // Vibration très courte
            }

            return {
              ...msg,
              status: status,
              // Ajouter un timestamp de mise à jour pour forcer le re-render
              lastStatusUpdate: Date.now()
            };
          }
          return msg;
        })
      );
    };

    window.addEventListener('messageStatusUpdate', handleStatusUpdate);
    return () => window.removeEventListener('messageStatusUpdate', handleStatusUpdate);
  }, []);

  // Helper pour créer les headers avec session
  const createHeaders = () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    if (activeSessionId) {
      headers['X-Session-Id'] = activeSessionId;
    }
    return headers;
  };

  // Nettoyer les blob URLs quand le composant se démonte
  useEffect(() => {
    return () => {
      if (viewerImage && viewerImage.src && viewerImage.src.startsWith('blob:')) {
        URL.revokeObjectURL(viewerImage.src);
      }
    };
  }, [viewerImage]);
  const messagesEndRef = useRef(null);
  const { simulateReading } = useHumanBehavior();

  // Charger les messages quand le chat change
  useEffect(() => {
    if (chat) {
      // Pour les drafts, ne pas appeler l'API (pas de messages en DB)
      if (chat.isDraft) {
        setMessages([]);
        setLoading(false);

        // Si un message est en attente (écrit dans le dialog), l'envoyer automatiquement
        if (chat.pendingMessage) {
          console.log('📤 Envoi automatique du message en attente:', chat.pendingMessage);
          // Petit délai pour laisser le temps au composant de se monter
          setTimeout(() => {
            handleSendMessage(chat.pendingMessage);
          }, 300);
        }
      } else {
        loadMessages();
      }

      // Désactivé temporairement - trop agressif
      // TODO: Implémenter un système de synchronisation plus intelligent
      /*
      const messageRefreshInterval = setInterval(() => {
        console.log('🔄 Rechargement des messages pour:', chat.name);
        loadMessages();
      }, 15000);

      return () => clearInterval(messageRefreshInterval);
      */
    } else {
      setMessages([]);
    }
  }, [chat?.id]);

  // Forcer le scroll au montage du composant et quand le chat change
  useEffect(() => {
    if (chat) {
      // Scroll immédiat puis après un délai pour garantir
      forceScrollToBottom();
      const timer = setTimeout(() => {
        forceScrollToBottom();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [chat?.id]);

  // Écouter les nouveaux messages via WebSocket
  useEffect(() => {
    if (newMessage && newMessage.key?.remoteJid === chat?.id) {
      // console.log('📨 Nouveau message dans ChatWindow:', newMessage.key?.id);

      // Auto-detect type if missing
      // Auto-detect type if missing
      if (!newMessage.type) {
        if (newMessage.message?.conversation || newMessage.message?.extendedTextMessage) newMessage.type = 'text';
        else if (newMessage.message?.imageMessage) newMessage.type = 'image';
        else if (newMessage.message?.audioMessage) newMessage.type = 'audio';
      }

      // Au lieu de recharger, ajouter le message directement

      // Vérifier si c'est une réaction
      if (newMessage.type === 'reaction') {
        console.log('🎯 Réaction reçue dans ChatWindow:', newMessage);

        // Mettre à jour le message avec la réaction
        setMessages(prevMessages => {
          return prevMessages.map(msg => {
            // Trouver le message cible de la réaction
            if (msg.key.id === newMessage.reaction.key?.id) {
              // Ajouter ou mettre à jour les réactions du message
              const reactions = msg.reactions || {};
              const emoji = newMessage.reaction.text;
              const senderId = newMessage.key.participant || newMessage.key.remoteJid;

              if (emoji) {
                // Ajouter la réaction
                if (!reactions[emoji]) {
                  reactions[emoji] = [];
                }
                // Éviter les doublons
                if (!reactions[emoji].find(r => r.senderId === senderId)) {
                  reactions[emoji].push({
                    senderId,
                    senderName: newMessage.pushName,
                    timestamp: newMessage.messageTimestamp
                  });
                }
              } else {
                // Supprimer toutes les réactions de cet utilisateur si emoji est vide
                Object.keys(reactions).forEach(e => {
                  reactions[e] = reactions[e].filter(r => r.senderId !== senderId);
                  if (reactions[e].length === 0) {
                    delete reactions[e];
                  }
                });
              }

              return {
                ...msg,
                reactions: Object.keys(reactions).length > 0 ? reactions : undefined
              };
            }
            return msg;
          });
        });
      } else {
        // Message normal
        setMessages(prevMessages => {
          // Vérifier si le message existe déjà par ID
          const messageExistsById = prevMessages.some(msg => msg.key.id === newMessage.key.id);

          // Pour les messages envoyés, vérifier aussi le contenu pour éviter les doublons
          if (newMessage.key.fromMe) {
            const messageText = newMessage.message?.extendedTextMessage?.text ||
              newMessage.message?.conversation ||
              newMessage.content || '';

            // Chercher d'abord un message temporaire avec le même texte
            const tempMessageIndex = prevMessages.findIndex(msg =>
              msg.key.fromMe &&
              msg.status === 'sending' &&
              (msg.message?.extendedTextMessage?.text === messageText ||
                msg.message?.conversation === messageText)
            );

            if (tempMessageIndex !== -1) {
              console.log('🔄 Remplacement du message temporaire par le message final');
              const updatedMessages = [...prevMessages];
              updatedMessages[tempMessageIndex] = newMessage;
              return updatedMessages;
            }

            // Vérifier aussi s'il existe déjà un message avec le même ID ou le même texte récent
            const existingMessageIndex = prevMessages.findIndex(msg => {
              // Vérifier par ID d'abord
              if (msg.key.id === newMessage.key.id || msg.id === newMessage.id) return true;

              // Pour les messages envoyés récemment (moins de 5 secondes), vérifier le texte
              if (msg.key.fromMe && msg.status === 'sent') {
                const msgText = msg.message?.extendedTextMessage?.text ||
                  msg.message?.conversation ||
                  msg.content || '';
                const msgTime = msg.messageTimestamp || msg.timestamp;
                const newMsgTime = newMessage.messageTimestamp || newMessage.timestamp;

                // Si le texte est identique et envoyé dans les 5 dernières secondes
                if (msgText === messageText && Math.abs(newMsgTime - msgTime) < 5) {
                  return true;
                }
              }

              return false;
            });

            if (existingMessageIndex !== -1) {
              console.log('🚫 Message doublon détecté, mise à jour au lieu d\'ajouter');
              const updatedMessages = [...prevMessages];
              updatedMessages[existingMessageIndex] = newMessage;
              return updatedMessages;
            }
          }

          if (!messageExistsById) {
            console.log('➕ Ajout nouveau message');
            return [...prevMessages, newMessage];
          } else {
            console.log('🔄 Message existe déjà, mise à jour');
            return prevMessages.map(msg =>
              msg.key.id === newMessage.key.id ? newMessage : msg
            );
          }
        });
      }
    }
  }, [newMessage, chat?.id]);

  // Polling pour les messages audio sans URL
  useEffect(() => {
    // Créer un intervalle pour chaque message audio sans URL
    const intervals = [];

    messages.forEach(message => {
      if (message.type === 'audio' && message.media && !message.media.url && !message.media.localUrl) {
        console.log(`🔄 Démarrage polling pour message audio ${message.key?.id || message.id}`);

        const interval = setInterval(async () => {
          try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const response = await axios.get(`/api/chats/${chat.id}/messages`, {
              headers: createHeaders()
            });

            const updatedMessages = response.data.messages || [];
            const updatedMessage = updatedMessages.find(m =>
              (m.key?.id || m.id) === (message.key?.id || message.id)
            );

            if (updatedMessage && updatedMessage.media?.url) {
              console.log(`✅ URL trouvée pour message audio ${message.key?.id || message.id}`);

              // Mettre à jour le message localement
              setMessages(prev => prev.map(msg =>
                (msg.key?.id || msg.id) === (message.key?.id || message.id)
                  ? { ...msg, media: { ...msg.media, ...updatedMessage.media } }
                  : msg
              ));

              // Arrêter le polling pour ce message
              clearInterval(interval);
            }
          } catch (error) {
            console.error('Erreur polling message audio:', error);
          }
        }, 2000); // Vérifier toutes les 2 secondes

        intervals.push(interval);

        // Arrêter après 30 secondes max
        setTimeout(() => {
          clearInterval(interval);
          console.log(`⏹️ Arrêt polling pour message audio ${message.key?.id || message.id}`);
        }, 30000);
      }
    });

    // Cleanup
    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [messages.filter(m => m.type === 'audio' && !m.media?.url).length, chat?.id]);

  // Fonction utilitaire pour forcer le scroll
  const forceScrollToBottom = () => {
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
      // Force le scroll au maximum possible
      chatMessages.scrollTop = chatMessages.scrollHeight + 1000;
    }
  };

  // Scroll automatique vers le bas quand les messages changent
  const scrollToBottom = (behavior = 'smooth') => {
    // block: 'end' est CRUCIAL pour que le bas de la liste reste en BAS de l'écran visible
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  // Scroll au bas au chargement et nouveaux messages
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, loading]);

  // Gérer le scroll quand le clavier s'ouvre (resize ou focus)
  useEffect(() => {
    const handleResize = () => {
      // Scroll immédiat pour suivre le clavier
      scrollToBottom('auto');
    };

    const handleInputFocus = () => {
      // Forcer le scroll tout en bas quand l'input prend le focus
      // Séquence de scrolls pour assurer la visibilité pendant l'animation du clavier iOS
      setTimeout(() => scrollToBottom('auto'), 50);
      setTimeout(() => scrollToBottom('smooth'), 300);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('messageInputFocus', handleInputFocus);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('messageInputFocus', handleInputFocus);
    };
  }, []);

  // Écouter la synchronisation forcée
  useEffect(() => {
    const handleForcedSync = (event) => {
      if (event.detail.chatId === chat?.id) {
        console.log('🔄 Synchronisation forcée pour cette conversation');
        loadMessages();
      }
    };

    window.addEventListener('forceChatSync', handleForcedSync);
    return () => window.removeEventListener('forceChatSync', handleForcedSync);
  }, [chat?.id]);

  // Charger les messages du chat avec option silencieuse
  const loadMessages = async (silent = false) => {
    if (!chat) return;

    // Si silencieux ou si on a déjà des messages, ne pas afficher le loader (évite le flash et le unmount)
    if (!silent && messages.length === 0) {
      setLoading(true);
    }

    try {
      // Utiliser l'API locale directement
      // Déterminer le provider (par défaut baileys/whatsapp)
      const provider = chat.provider || (chat.id.startsWith('sms_') ? 'sms' : 'baileys');
      const realId = chat.id;

      // Faire la requête
      const response = await axios.get(`/api/chats/${realId}/messages`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        params: { limit: 50, provider } // Charger 50 messages pour avoir du contexte
      });

      // Gestion robuste du format de réponse (Array direct ou objet { messages: [...] })
      let messagesData = response.data;
      let messagesArray = [];

      if (Array.isArray(messagesData)) {
        messagesArray = messagesData;
      } else if (messagesData && Array.isArray(messagesData.messages)) {
        messagesArray = messagesData.messages;
      }

      // DEBUG: Log timestamps for first 3 messages
      console.log('📥 DEBUG TIMESTAMPS - Messages chargés:', messagesArray.slice(0, 3).map(m => ({
        id: m.key?.id || m.id,
        messageTimestamp: m.messageTimestamp,
        timestamp: m.timestamp,
        'message.messageTimestamp': m.message?.messageTimestamp,
        formatted: new Date((m.messageTimestamp || m.timestamp || 0) * 1000).toLocaleString()
      })));

      // Trier par date
      const sortedMessages = messagesArray.sort((a, b) => {
        const tA = a.timestamp || a.messageTimestamp || 0;
        const tB = b.timestamp || b.messageTimestamp || 0;
        return tA - tB;
      });

      setMessages(sortedMessages);
      setError(null);

    } catch (err) {
      console.error('Erreur chargement messages:', err);
      // Fallback silencieux, ne pas effacer les messages existants si erreur poll
      if (!silent) {
        setError("Impossible de charger les messages");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Envoyer un message
  const handleSendMessage = async (text, typingTime) => {
    // Si appelé sans paramètres (après envoi de fichier), ne rien faire
    // Le message arrivera via push
    if (!text) {
      return;
    }

    if (!chat || !text.trim() || sending) return;

    setSending(true);

    // Ajouter le message optimistiquement
    const tempMessage = {
      key: {
        id: `temp_${Date.now()}`,
        fromMe: true,
        remoteJid: chat.id
      },
      message: {
        extendedTextMessage: {
          text: text
        },
        conversation: text // Ajouter aussi dans conversation pour la compatibilité
      },
      messageTimestamp: Math.floor(Date.now() / 1000),
      status: 'sending',
      pushName: 'Moi'
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      // Vérifier si on est en ligne
      if (navigator.onLine) {
        // Utiliser l'API unifiée pour envoyer le message
        console.log('📤 Envoi du message:', text, 'vers', chat.id);
        const response = await axios.post(`/api/chats/${chat.id}/messages`, {
          text: text,
          provider: chat.provider || (chat.id.startsWith('sms_') ? 'sms-bridge' : 'baileys')
        }, {
          headers: createHeaders()
        });

        console.log('📡 Réponse serveur:', response.data);

        // Mettre à jour avec le vrai message
        if (response.data && response.data.success) {
          // Le message envoyé arrivera via WebSocket push - pas besoin de recharger !
          console.log('✅ Message envoyé, en attente du push...');

          // Mettre à jour le statut local immédiatement à 'sent'
          setMessages(prev => prev.map(msg =>
            msg.key.id === tempMessage.key.id
              ? { ...msg, status: 'sent', messageId: response.data.messageId }
              : msg
          ));

          // Si c'était un draft, le convertir en chat réel
          if (isDraftChat && onDraftConverted) {
            console.log('🔄 Conversion du draft en chat réel:', chat.id);
            onDraftConverted(chat.id);
          }
        } else {
          console.log('⚠️ Réponse négative du serveur:', response.data);
          // En cas d'erreur, marquer comme échoué
          setMessages(prev => prev.map(msg =>
            msg.key.id === tempMessage.key.id
              ? { ...msg, status: 'failed' }
              : msg
          ));
        }
      } else {
        // Ajouter à la file d'attente hors ligne
        await offlineQueueService.queueMessage({
          chatId: chat.id,
          chatName: chat.name,
          text: text,
          delay: typingTime || 1000
        });

        // Marquer comme en attente
        setMessages(prev => prev.map(msg =>
          msg.key.id === tempMessage.key.id
            ? { ...msg, status: 'queued' }
            : msg
        ));

        // Afficher une notification
        const pendingCount = await offlineQueueService.getPendingCount();
        alert(`Message en file d'attente (${pendingCount} en attente)`);
      }

      // Notifier le parent
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);

      // Si erreur réseau, ajouter à la file
      if (!navigator.onLine || error.code === 'NETWORK_ERROR') {
        await offlineQueueService.queueMessage({
          chatId: chat.id,
          chatName: chat.name,
          text: text,
          delay: typingTime || 1000
        });

        setMessages(prev => prev.map(msg =>
          msg.key.id === tempMessage.key.id
            ? { ...msg, status: 'queued' }
            : msg
        ));
      } else {
        // Marquer comme erreur
        setMessages(prev => prev.map(msg =>
          msg.key.id === tempMessage.key.id
            ? { ...msg, status: 'error' }
            : msg
        ));
      }
    } finally {
      setSending(false);
    }
  };

  // Formater le timestamp - gère secondes ET millisecondes automatiquement
  const formatTime = (timestamp) => {
    if (!timestamp) {
      console.warn('⚠️ formatTime appelé avec timestamp falsy:', timestamp);
      return '';
    }
    // Si timestamp > 10 chiffres, c'est en millisecondes, sinon en secondes
    const ms = timestamp > 9999999999 ? timestamp : timestamp * 1000;
    const date = new Date(ms);
    if (isNaN(date.getTime())) {
      console.warn('⚠️ formatTime: date invalide pour timestamp:', timestamp);
      return '';
    }
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formater la date pour les séparateurs - gère secondes ET millisecondes
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    // Si timestamp > 10 chiffres, c'est en millisecondes, sinon en secondes
    const ms = timestamp > 9999999999 ? timestamp : timestamp * 1000;
    const date = new Date(ms);
    if (isNaN(date.getTime())) return '';
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    }
  };

  // Grouper les messages par jour
  const groupMessagesByDate = () => {
    const groups = [];
    let currentDate = null;

    messages.forEach(message => {
      // Gérer différents formats de timestamp (secondes ou millisecondes)
      const rawTimestamp = message.messageTimestamp || message.timestamp || Date.now() / 1000;
      // Si > 10 chiffres = millisecondes, sinon secondes
      const ms = rawTimestamp > 9999999999 ? rawTimestamp : rawTimestamp * 1000;
      const messageDate = new Date(ms).toDateString();

      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({
          type: 'date',
          date: rawTimestamp
        });
      }

      groups.push({
        type: 'message',
        data: message
      });
    });

    return groups;
  };

  // Obtenir le texte du message
  const getMessageText = (message) => {
    // Support pour l'API Meta
    if (message.type === 'text' && message.content) {
      return message.content;
    }
    // Pour les médias Meta, ne pas afficher le texte ici (géré dans renderMediaMessage)
    if (message.type === 'image' || message.type === 'video' || message.type === 'audio' || message.type === 'document') {
      return null;
    }

    // Support pour WhatsApp API
    // Ignorer les messages de réaction
    if (message.message?.reactionMessage) {
      return null; // Retourner null pour ne pas afficher
    }
    if (message.message?.extendedTextMessage?.text) {
      return message.message.extendedTextMessage.text;
    }
    if (message.message?.conversation) {
      return message.message.conversation;
    }
    if (message.message?.imageMessage?.caption) {
      return message.message.imageMessage.caption;
    }
    if (message.message?.documentMessage?.caption) {
      return message.message.documentMessage.caption;
    }
    return '';
  };

  // Vérifier si c'est un média
  const isMediaMessage = (message) => {
    // Support pour l'API Meta - toujours vrai si c'est un type média
    if (message.type === 'image' || message.type === 'video' || message.type === 'audio' || message.type === 'document') {
      return true;
    }
    // Support pour WhatsApp API
    return !!(
      message.message?.imageMessage ||
      message.message?.videoMessage ||
      message.message?.audioMessage ||
      message.message?.documentMessage ||
      message.message?.stickerMessage
    );
  };

  // Rendu d'un message média
  const renderMediaMessage = (message) => {
    // Support pour l'API Meta - structure simplifiée
    if (message.type === 'image' && message.media) {
      let imageSrc = '/placeholder-image.png';

      // Si on a une URL locale
      if (message.media.localUrl) {
        imageSrc = message.media.localUrl;
      } else if (message.media.localMediaId) {
        imageSrc = `/api/media/${message.media.localMediaId}`;
      }

      return (
        <div className="media-message">
          <img
            src={imageSrc}
            alt="Media"
            style={{ maxWidth: '300px', maxHeight: '300px', cursor: 'pointer' }}
            onClick={() => {
              setViewerImage({
                src: imageSrc,
                caption: message.content || '',
                isLowQuality: false,
                loading: false
              });
            }}
          />
          {(message.content || message.message?.conversation) && (
            <p className="media-caption">{message.content || message.message?.conversation}</p>
          )}
        </div>
      );
    }

    // Support pour l'audio Meta
    if (message.type === 'audio') {
      // Si pas encore de média, afficher un placeholder
      if (!message.media || (!message.media.url && !message.media.localUrl)) {
        return (
          <div className="media-message audio-loading">
            <span className="material-icons">mic</span>
            <span>Message vocal en cours de chargement...</span>
          </div>
        );
      }
      // Sinon utiliser le player
      return (
        <AudioPlayerUnified
          message={message}
          isFromMe={message.key?.fromMe || message.fromMe}
        />
      );
    }

    // Support pour WhatsApp API - structure existante
    if (message.message?.imageMessage) {
      // Pour les images, utiliser notre serveur de médias ou le thumbnail
      let imageSrc = '/placeholder-image.png';

      // Si on a un ID de média local, l'utiliser en priorité
      if (message.message.imageMessage.localMediaId) {
        imageSrc = `/api/media/${message.message.imageMessage.localMediaId}`;
      } else if (message.message.imageMessage.jpegThumbnail) {
        // Sinon, utiliser le thumbnail s'il existe
        imageSrc = `data:image/jpeg;base64,${message.message.imageMessage.jpegThumbnail}`;
      }

      return (
        <div className="media-message">
          <img
            src={imageSrc}
            alt="Media"
            style={{ maxWidth: '300px', maxHeight: '300px', cursor: 'pointer' }}
            onClick={async () => {
              try {
                // Afficher d'abord le thumbnail pendant le chargement
                setViewerImage({
                  src: imageSrc,
                  caption: message.message.imageMessage.caption,
                  isLowQuality: true,
                  loading: true
                });

                // Télécharger l'image complète
                try {
                  const mediaData = await whatsappApi.downloadMediaMessage(message.key);

                  if (mediaData.base64) {
                    // Mettre à jour avec l'image complète
                    setViewerImage({
                      src: `data:${mediaData.mimetype || 'image/jpeg'};base64,${mediaData.base64}`,
                      caption: message.message.imageMessage.caption,
                      isLowQuality: false,
                      loading: false
                    });
                  }
                } catch (downloadError) {
                  console.error('Erreur téléchargement image complète:', downloadError);
                  // Garder le thumbnail en cas d'erreur
                  setViewerImage({
                    src: imageSrc,
                    caption: message.message.imageMessage.caption,
                    isLowQuality: true,
                    loading: false,
                    error: true
                  });
                }

              } catch (error) {
                // En cas d'erreur, garder le thumbnail
                setViewerImage({
                  src: imageSrc,
                  caption: message.message.imageMessage.caption,
                  isLowQuality: true,
                  error: true
                });
              }
            }}
          />
          {message.message.imageMessage.caption && (
            <p className="media-caption">{message.message.imageMessage.caption}</p>
          )}
        </div>
      );
    }

    if (message.message?.videoMessage) {
      const thumbnailData = message.message.videoMessage.jpegThumbnail;
      let videoSrc = '/placeholder-image.png';

      if (thumbnailData) {
        videoSrc = `data:image/jpeg;base64,${thumbnailData}`;
      }

      return (
        <div className="media-message">
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={videoSrc}
              alt="Video"
              style={{ maxWidth: '300px', maxHeight: '300px', cursor: 'pointer' }}
              onClick={() => {
                if (message.message.videoMessage.url) {
                  window.open(message.message.videoMessage.url, '_blank');
                } else {
                  alert('Vidéo non disponible');
                }
              }}
            />
            <span className="material-icons" style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '48px',
              color: 'white',
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderRadius: '50%',
              padding: '8px'
            }}>play_circle_filled</span>
          </div>
          {message.message.videoMessage.caption && (
            <p className="media-caption">{message.message.videoMessage.caption}</p>
          )}
        </div>
      );
    }

    // Support audio pour les deux APIs
    if (message.message?.audioMessage || (message.type === 'audio' && message.media)) {
      return (
        <AudioPlayerUnified
          message={message}
          isFromMe={message.key?.fromMe || message.fromMe}
        />
      );
    }

    if (message.message?.documentMessage) {
      return (
        <div className="document-message"
          style={{ cursor: 'pointer', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
          onClick={() => {
            if (message.message.documentMessage.url) {
              window.open(message.message.documentMessage.url, '_blank');
            }
          }}
        >
          <span className="material-icons">description</span>
          <span className="document-name">
            {message.message.documentMessage.fileName || 'Document'}
          </span>
        </div>
      );
    }

    return null;
  };

  if (!chat) {
    return (
      <div className="chat-window-empty">
        <div className="empty-state">
          <img src="/logo-192.png" alt="L'ekip-Chat" className="empty-logo" />
          <h2>L'ekip-Chat</h2>
          <p>Sélectionnez une conversation pour commencer</p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate();

  // Gestion de l'appel VoIP
  const handleVoIPCall = () => {
    if (!chat) return;
    // Extraire le numéro du chat.id (ex: 33612345678@s.whatsapp.net -> 33612345678)
    const number = chat.id.replace('@s.whatsapp.net', '').replace('sms_', '');
    if (number && isConnected) {
      call(number);
    } else {
      alert('Service téléphonique non connecté ou numéro invalide');
    }
  };

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-window-header" style={{ padding: '8px', gap: '4px' }}>
        {onBack && (
          <button
            className="btn"
            onClick={onBack}
            style={{ padding: '4px', margin: '0', width: '32px', height: '32px', minWidth: '32px' }}
          >
            <span className="material-icons" style={{ fontSize: '24px' }}>arrow_back</span>
          </button>
        )}

        {chat.profilePicture ? (
          <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '14px', margin: '0 4px' }}>
            <img src={chat.profilePicture} alt={chat.name} onError={(e) => e.target.style.display = 'none'} />
          </div>
        ) : (
          <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '14px', margin: '0 4px' }}>
            {chat.name?.charAt(0) || '#'}
          </div>
        )}

        <div className="chat-header-info" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 className="chat-header-name truncate" style={{ fontSize: '15px', lineHeight: '1.2', margin: 0 }}>
            {chat.name || chat.id.replace('@s.whatsapp.net', '')}
          </h2>

          {/* Toujours afficher le numéro (partie de l'ID) si c'est un chat WhatsApp personnel */}
          {chat.id.includes('@s.whatsapp.net') && (
            <span style={{ fontSize: '11px', color: '#555', display: 'block', lineHeight: '1.1', marginTop: '1px' }}>
              {chat.id.replace('@s.whatsapp.net', '')}
            </span>
          )}

          {/* Numéro local (Via...) */}
          {chat.localPhoneNumber && (
            <span className="chat-header-local-number" style={{ fontSize: '10px', opacity: 0.5, display: 'block', lineHeight: '1.1', marginTop: '1px' }}>
              Via {chat.localPhoneNumber.replace('@s.whatsapp.net', '')}
            </span>
          )}

          {/* Indicateur de nouvelle conversation (draft) */}
          {isDraftChat && (
            <span style={{ fontSize: '10px', color: '#00a884', fontWeight: '500', display: 'block', lineHeight: '1.1', marginTop: '2px' }}>
              Nouvelle conversation
            </span>
          )}
        </div>

        <div className="header-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {/* Bouton d'appel VoIP */}
          {(chat.id.includes('@s.whatsapp.net') || chat.id.startsWith('sms_')) && (
            <button
              className="action-btn"
              onClick={handleVoIPCall}
              title="Appeler"
              disabled={!isConnected}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}
            >
              <span className={`material-icons ${!isConnected ? 'disabled' : ''}`} style={{ color: isConnected ? '#00a884' : '#ccc' }}>call</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : isDraftChat && messages.length === 0 ? (
          /* État vide pour les nouvelles conversations */
          <div className="draft-empty-state" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#667781',
            textAlign: 'center',
            padding: '20px'
          }}>
            <span className="material-icons" style={{ fontSize: '64px', opacity: 0.5, marginBottom: '16px' }}>chat_bubble_outline</span>
            <p style={{ fontSize: '14px', margin: '0 0 8px 0' }}>Nouvelle conversation avec</p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#111b21', margin: '0' }}>
              {chat.name || chat.phoneNumber || chat.id}
            </p>
            <p style={{ fontSize: '13px', marginTop: '16px', opacity: 0.7 }}>
              Écrivez votre premier message ci-dessous
            </p>
          </div>
        ) : (
          <>
            {messageGroups.map((item, index) => {
              if (item.type === 'date') {
                return (
                  <div key={`date-${index}`} className="date-separator">
                    <span>{formatDate(item.date)}</span>
                  </div>
                );
              }

              const message = item.data;

              // Ne pas afficher les messages de réaction
              if (message.message?.reactionMessage) {
                return null;
              }

              const messageText = getMessageText(message);

              return (
                <div
                  key={`${message.key?.id || message.id}-${index}`}
                  className={`message ${message.key?.fromMe ? 'sent' : 'received'}`}
                >
                  <div className="message-bubble">
                    {isMediaMessage(message) ? (
                      renderMediaMessage(message)
                    ) : messageText !== null ? (
                      <p className="message-text">
                        {messageText ||
                          (message.messageType ? `[${message.messageType}]` : '[Message]')}
                      </p>
                    ) : null}

                    <div className="message-meta">
                      <span className="message-time" title={`Raw: ${message.messageTimestamp || message.timestamp}`}>
                        {formatTime(message.messageTimestamp || message.timestamp)}
                      </span>

                      {message.key?.fromMe && (
                        <span className={`message-status ${message.status}`}>
                          {message.status === 'error' ? (
                            <span className="material-icons error">error</span>
                          ) : message.status === 'sending' ? (
                            <span className="material-icons sending">schedule</span>
                          ) : message.status === 'sent' ? (
                            <span className="material-icons sent">done</span>
                          ) : message.status === 'delivered' ? (
                            <span className="material-icons delivered">done_all</span>
                          ) : message.status === 'read' ? (
                            <span className="material-icons read">done_all</span>
                          ) : (
                            <span className="material-icons">done</span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Afficher les réactions */}
                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                      <div className="message-reactions">
                        {Object.entries(message.reactions).map(([emoji, users]) => (
                          <div key={emoji} className="reaction-bubble" title={users.map(u => u.senderName || 'Utilisateur').join(', ')}>
                            <span className="reaction-emoji">{emoji}</span>
                            {users.length > 1 && <span className="reaction-count">{users.length}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={sending}
        chatId={chat.id}
        activeSessionId={activeSessionId}
      />

      {/* Image Viewer */}
      {viewerImage && (
        <SimpleImageViewer
          image={viewerImage}
          onClose={() => {
            setViewerImage(null);
          }}
        />
      )}
    </div>
  );
}

export default ChatWindow;