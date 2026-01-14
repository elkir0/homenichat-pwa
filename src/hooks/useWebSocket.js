import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook personnalisé pour gérer la connexion WebSocket
 */
export function useWebSocket(url, token) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const keepAliveIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const lastActivityRef = useRef(Date.now());

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;
  const KEEP_ALIVE_INTERVAL = 30000; // 30 secondes

  // Fonction pour se connecter au WebSocket
  const connect = useCallback(() => {
    try {
      // Éviter les connexions multiples - protection renforcée pour React.StrictMode
      if (wsRef.current) {
        const currentState = wsRef.current.readyState;
        if (currentState === WebSocket.CONNECTING) {
          console.log('🚫 Connexion WebSocket déjà en cours, abandon');
          return;
        }
        if (currentState === WebSocket.OPEN) {
          console.log('🚫 WebSocket déjà connecté, réutilisation de la connexion existante');
          return;
        }

        // Nettoyer la connexion fermée ou en erreur
        if (currentState === WebSocket.CLOSED || currentState === WebSocket.CLOSING) {
          console.log('🔄 Nettoyage de la connexion WebSocket fermée');
          wsRef.current = null;
        }
      }

      // console.log(`🔌 Création d'une nouvelle connexion WebSocket vers: ${wsUrl}`);

      // Créer une nouvelle connexion
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        lastActivityRef.current = Date.now();

        // Authentifier la connexion
        if (token) {
          ws.send(JSON.stringify({
            type: 'auth',
            token
          }));
        }

        // Démarrer le keep-alive
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
        }

        keepAliveIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            // Vérifier l'inactivité
            const timeSinceLastActivity = Date.now() - lastActivityRef.current;
            if (timeSinceLastActivity > KEEP_ALIVE_INTERVAL * 2) {
              ws.close();
              return;
            }

            // Envoyer un ping
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, KEEP_ALIVE_INTERVAL);
      };

      ws.onmessage = (event) => {
        try {
          lastActivityRef.current = Date.now();
          const data = JSON.parse(event.data);

          // console.log('📡 WebSocket message reçu:', data);

          // Gérer les messages d'authentification
          if (data.type === 'auth_success') {
            // console.log('✅ Authentification WebSocket réussie');
          } else if (data.type === 'auth_error') {
            console.error('❌ Erreur authentification WebSocket:', data.error);
            // Ne pas tenter de reconnecter si l'authentification échoue
            reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS;
          } else if (data.type === 'sync_request') {
            console.log('🔄 Demande de synchronisation intelligente reçue:', data.reason);
            // Déclencher une synchronisation immédiate
            setLastMessage({
              type: 'trigger_sync',
              reason: data.reason,
              timestamp: Date.now()
            });
          } else if (data.type !== 'pong') {
            // Ignorer les pongs et transmettre les autres messages
            setLastMessage(data);
            console.log('✅ Message transmis à App.jsx');
          }
        } catch (error) {
          console.error('❌ Erreur parsing WebSocket:', error);
        }
      };

      ws.onerror = (error) => {
      };

      ws.onclose = () => {
        setIsConnected(false);

        // Nettoyer le keep-alive
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
        }

        // Tentative de reconnexion
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY * reconnectAttemptsRef.current);
        }
      };
    } catch (error) {
    }
  }, [url, token]);

  // Fonction pour envoyer un message
  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Fonction pour s'abonner à un chat
  const subscribeToChat = useCallback((chatId) => {
    sendMessage({
      type: 'subscribe',
      chatId
    });
  }, [sendMessage]);

  // Fonction pour envoyer l'indicateur de frappe
  const sendTypingIndicator = useCallback((chatId, isTyping) => {
    sendMessage({
      type: 'typing',
      chatId,
      isTyping
    });
  }, [sendMessage]);

  // Connexion initiale avec protection contre les doubles montages React.StrictMode
  useEffect(() => {
    // Prevent duplicate connections in React.StrictMode
    let isMounted = true;

    const initConnection = () => {
      if (isMounted) {
        connect();
      }
    };

    // Small delay to allow cleanup of previous connection in StrictMode
    const connectionTimer = setTimeout(initConnection, 100);

    // Nettoyage
    return () => {
      isMounted = false;
      clearTimeout(connectionTimer);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
      if (wsRef.current) {
        console.log('🔌 Closing WebSocket connection (cleanup)');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Reconnexion si le token change
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && token) {
      // Renvoyer l'authentification avec le nouveau token
      wsRef.current.send(JSON.stringify({
        type: 'auth',
        token
      }));
    }
  }, [token]);

  // Reconnexion si l'application repasse en ligne
  useEffect(() => {
    const handleOnline = () => {
      if (!isConnected) {
        connect();
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [isConnected, connect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    subscribeToChat,
    sendTypingIndicator
  };
}