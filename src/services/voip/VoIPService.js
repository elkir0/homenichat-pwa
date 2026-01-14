/**
 * VoIPService - Service de téléphonie WebRTC/SIP
 *
 * Gère la connexion avec le PBX Yeastar P550 via WebRTC
 * Utilise SIP.js pour la signalisation SIP over WebSocket
 *
 * @see https://sipjs.com/guides/
 */

// États de connexion possibles
export const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  REGISTERED: 'registered',
  ERROR: 'error'
};

// États d'appel possibles
export const CallState = {
  IDLE: 'idle',
  RINGING_OUTGOING: 'ringing_outgoing',   // Appel sortant en attente
  RINGING_INCOMING: 'ringing_incoming',   // Appel entrant
  ANSWERED: 'answered',                    // En cours
  ON_HOLD: 'on_hold',                      // En attente
  ENDED: 'ended'                           // Terminé
};

// Direction d'appel
export const CallDirection = {
  INCOMING: 'incoming',
  OUTGOING: 'outgoing'
};

class VoIPService {
  constructor() {
    this.userAgent = null;
    this.registerer = null;
    this.currentSession = null;

    // État
    this.connectionState = ConnectionState.DISCONNECTED;
    this.callState = CallState.IDLE;
    this.currentCall = null;

    // Configuration (sera chargée depuis les settings)
    this.config = {
      server: '',           // wss://yeastar.local:8089/ws
      domain: '',           // yeastar.local
      extension: '',        // Extension SIP (ex: 1001)
      password: '',         // Mot de passe SIP
      displayName: ''       // Nom affiché
    };

    // Callbacks pour les événements
    this.listeners = {
      connectionStateChange: [],
      callStateChange: [],
      incomingCall: [],
      callEnded: [],
      error: []
    };

    // Audio elements
    this.remoteAudio = null;
    this.localStream = null;
    this.persistentAudioStream = null; // Stream audio gardé en mémoire pour éviter les prompts répétés

    // Call history (synced with server)
    this.callHistory = [];
    this.callHistoryLoaded = false;
  }

  /**
   * Récupère le token d'authentification
   */
  _getAuthToken() {
    return localStorage.getItem('authToken');
  }

  /**
   * Récupère l'utilisateur courant depuis le localStorage
   */
  _getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Configure le service avec les paramètres du PBX
   */
  configure(config) {
    this.config = { ...this.config, ...config };
    console.log('[VoIP] Configuration mise à jour:', {
      server: this.config.server,
      domain: this.config.domain,
      extension: this.config.extension
    });
  }

  /**
   * Diagnostic complet de l'environnement WebRTC
   */
  static diagnose() {
    const diagnosis = {
      isSecureContext: window.isSecureContext,
      hasMediaDevices: !!navigator.mediaDevices,
      hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      hasRTCPeerConnection: !!window.RTCPeerConnection,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      isSupported: false
    };
    diagnosis.isSupported = diagnosis.isSecureContext &&
                            diagnosis.hasMediaDevices &&
                            diagnosis.hasGetUserMedia &&
                            diagnosis.hasRTCPeerConnection;
    console.log('[VoIP] Diagnostic WebRTC:', diagnosis);
    return diagnosis;
  }

  /**
   * Initialise la connexion au PBX
   */
  async connect() {
    if (this.connectionState === ConnectionState.CONNECTING ||
        this.connectionState === ConnectionState.REGISTERED) {
      console.log('[VoIP] Déjà connecté ou en cours de connexion');
      return;
    }

    if (!this.config.server || !this.config.extension) {
      this.emitError('Configuration VoIP manquante');
      return;
    }

    // Diagnostic de l'environnement
    const diag = VoIPService.diagnose();
    if (!diag.isSecureContext) {
      console.warn('[VoIP] Contexte non sécurisé détecté. Les appels ne fonctionneront pas.');
      console.warn('[VoIP] Protocol:', diag.protocol, 'Hostname:', diag.hostname);
    }

    this.setConnectionState(ConnectionState.CONNECTING);

    try {
      // Import dynamique de SIP.js (sera installé via npm)
      const { UserAgent, Registerer } = await import('sip.js');

      const uri = UserAgent.makeURI(`sip:${this.config.extension}@${this.config.domain}`);

      if (!uri) {
        throw new Error('URI SIP invalide');
      }

      // Créer l'élément audio pour le son distant
      this.remoteAudio = new Audio();
      this.remoteAudio.autoplay = true;

      // Configuration du User Agent
      this.userAgent = new UserAgent({
        uri,
        transportOptions: {
          server: this.config.server,
          traceSip: process.env.NODE_ENV === 'development'
        },
        authorizationUsername: this.config.extension,
        authorizationPassword: this.config.password,
        displayName: this.config.displayName || this.config.extension,
        // Delegate pour gérer les appels entrants
        delegate: {
          onInvite: (invitation) => this.handleIncomingCall(invitation)
        },
        // Configuration média
        sessionDescriptionHandlerFactoryOptions: {
          constraints: {
            audio: true,
            video: false
          }
        }
      });

      // Démarrer le User Agent
      await this.userAgent.start();
      this.setConnectionState(ConnectionState.CONNECTED);

      // S'enregistrer auprès du PBX
      this.registerer = new Registerer(this.userAgent);

      this.registerer.stateChange.addListener((state) => {
        console.log('[VoIP] État registerer:', state);
        if (state === 'Registered') {
          this.setConnectionState(ConnectionState.REGISTERED);
        } else if (state === 'Unregistered') {
          this.setConnectionState(ConnectionState.CONNECTED);
        }
      });

      await this.registerer.register();

    } catch (error) {
      console.error('[VoIP] Erreur de connexion:', error);
      this.setConnectionState(ConnectionState.ERROR);
      this.emitError(error.message);
    }
  }

  /**
   * Déconnexion du PBX
   */
  async disconnect() {
    try {
      if (this.currentSession) {
        await this.hangup();
      }

      if (this.registerer) {
        await this.registerer.unregister();
      }

      if (this.userAgent) {
        await this.userAgent.stop();
      }

      this.setConnectionState(ConnectionState.DISCONNECTED);
    } catch (error) {
      console.error('[VoIP] Erreur de déconnexion:', error);
    }
  }

  /**
   * Passer un appel
   */
  async call(target) {
    if (this.connectionState !== ConnectionState.REGISTERED) {
      this.emitError('Non connecté au PBX');
      return null;
    }

    if (this.callState !== CallState.IDLE) {
      this.emitError('Un appel est déjà en cours');
      return null;
    }

    // Vérifier le contexte sécurisé
    if (!VoIPService.isSecureContext()) {
      this.emitError('WebRTC nécessite une connexion HTTPS sécurisée');
      console.error('[VoIP] Secure context check failed. window.isSecureContext =', window.isSecureContext);
      return null;
    }

    // Vérifier le support WebRTC
    if (!VoIPService.isSupported()) {
      this.emitError('WebRTC n\'est pas supporté par ce navigateur');
      return null;
    }

    // Utiliser le stream persistant ou en acquérir un nouveau
    const audioStream = await this.acquirePersistentAudioStream();
    if (!audioStream) {
      this.emitError('Permission microphone refusée');
      return null;
    }

    // Activer les tracks audio pour l'appel
    audioStream.getAudioTracks().forEach(track => {
      track.enabled = true;
    });
    this.localStream = audioStream;
    console.log('[VoIP] Stream audio prêt pour l\'appel');

    try {
      const { Inviter, UserAgent } = await import('sip.js');

      // Formater le numéro cible (makeURI est une méthode statique)
      const targetUri = UserAgent.makeURI(`sip:${target}@${this.config.domain}`);

      if (!targetUri) {
        throw new Error('Numéro invalide');
      }

      // Créer la session d'appel sortant
      const inviter = new Inviter(this.userAgent, targetUri, {
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: false },
          // Passer notre stream pré-acquis pour éviter un nouveau getUserMedia
          offerOptions: {
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
          }
        },
        // Injecter notre stream local
        sessionDescriptionHandlerModifiers: [
          (description) => {
            // Le stream est déjà acquis, pas besoin de modifier
            return Promise.resolve(description);
          }
        ]
      });

      // Injecter le stream local dans la session (méthode alternative)
      inviter.sessionDescriptionHandlerOptionsReconnect = {
        constraints: { audio: true, video: false }
      };

      this.currentSession = inviter;
      this.currentCall = {
        id: Date.now().toString(),
        direction: CallDirection.OUTGOING,
        target,
        startTime: null,
        endTime: null,
        answered: false
      };

      this.setCallState(CallState.RINGING_OUTGOING);

      // Gérer les changements d'état de la session
      this.setupSessionListeners(inviter);

      // Lancer l'appel avec le stream pré-acquis
      await inviter.invite({
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: false }
        }
      });

      return this.currentCall;

    } catch (error) {
      console.error('[VoIP] Erreur appel sortant:', error);
      this.emitError(error.message);
      // Libérer le stream en cas d'erreur
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
      this.resetCallState();
      return null;
    }
  }

  /**
   * Gérer un appel entrant (SIP.js INVITE)
   */
  handleIncomingCall(invitation) {
    console.log('[VoIP] Appel entrant SIP de:', invitation.remoteIdentity?.uri?.user);

    if (this.callState !== CallState.IDLE) {
      // Déjà en appel - rejeter automatiquement
      invitation.reject();
      return;
    }

    this.currentSession = invitation;
    this.currentCall = {
      id: Date.now().toString(),
      direction: CallDirection.INCOMING,
      callerId: invitation.remoteIdentity?.uri?.user,
      callerName: invitation.remoteIdentity?.displayName,
      startTime: null,
      endTime: null,
      answered: false,
      source: 'sip' // Appel direct via SIP.js
    };

    this.setCallState(CallState.RINGING_INCOMING);
    this.setupSessionListeners(invitation);

    // Émettre l'événement d'appel entrant
    this.emit('incomingCall', this.currentCall);
  }

  /**
   * Gérer un appel entrant détecté par AMI (via WebSocket push)
   * Cet appel n'a pas de session SIP - il sonne sur le téléphone physique
   * L'utilisateur peut voir qui appelle et potentiellement répondre via WebRTC
   */
  handleAMIIncomingCall(callData) {
    console.log('[VoIP] 📞 Appel entrant AMI:', callData);

    // Si déjà en appel ou en sonnerie, ignorer
    if (this.callState !== CallState.IDLE) {
      console.log('[VoIP] Déjà en appel, ignorer notification AMI');
      return;
    }

    // Stocker les données de l'appel AMI
    this.currentCall = {
      id: callData.callId || Date.now().toString(),
      direction: CallDirection.INCOMING,
      callerId: callData.callerNumber,
      callerName: callData.callerName,
      lineName: callData.lineName,
      extension: callData.extension,
      startTime: callData.startTime || Date.now(),
      endTime: null,
      answered: false,
      source: 'ami' // Appel détecté via AMI (pas de session SIP directe)
    };

    // Pas de session SIP pour les appels AMI
    this.currentSession = null;

    this.setCallState(CallState.RINGING_INCOMING);

    // Émettre l'événement d'appel entrant
    this.emit('incomingCall', this.currentCall);
  }

  /**
   * Gérer la fin d'un appel détecté par AMI (via WebSocket push)
   */
  handleAMICallEnded(callData) {
    console.log('[VoIP] 📞 Appel AMI terminé:', callData);

    // Vérifier que c'est bien l'appel en cours
    if (this.currentCall && this.currentCall.id === callData.callId) {
      const status = callData.status || 'ended';

      // Mettre à jour l'appel
      this.currentCall.endTime = Date.now();

      // Ajouter à l'historique si c'était un appel manqué
      if (status === 'missed' || (this.callState === CallState.RINGING_INCOMING && !this.currentCall.answered)) {
        this.addToHistory(this.currentCall, 'missed');
      }

      // Émettre l'événement de fin d'appel
      this.emit('callEnded', { ...this.currentCall, status });

      // Réinitialiser l'état
      this.resetCallState();
    }
  }

  /**
   * Répondre à un appel entrant
   */
  async answer() {
    if (this.callState !== CallState.RINGING_INCOMING || !this.currentSession) {
      console.warn('[VoIP] Pas d\'appel entrant à répondre');
      return;
    }

    try {
      await this.currentSession.accept();
      this.currentCall.answered = true;
      this.currentCall.startTime = Date.now();
      this.setCallState(CallState.ANSWERED);
    } catch (error) {
      console.error('[VoIP] Erreur réponse appel:', error);
      this.emitError(error.message);
    }
  }

  /**
   * Rejeter/Refuser un appel entrant
   */
  async reject() {
    if (this.callState !== CallState.RINGING_INCOMING || !this.currentSession) {
      return;
    }

    try {
      await this.currentSession.reject();
      this.addToHistory(this.currentCall, 'rejected');
      this.resetCallState();
    } catch (error) {
      console.error('[VoIP] Erreur rejet appel:', error);
    }
  }

  /**
   * Raccrocher l'appel en cours
   */
  async hangup() {
    if (!this.currentSession) {
      return;
    }

    try {
      // Selon l'état, utiliser la bonne méthode
      if (this.currentSession.state === 'Established') {
        await this.currentSession.bye();
      } else {
        await this.currentSession.cancel();
      }
    } catch (error) {
      console.error('[VoIP] Erreur hangup:', error);
    } finally {
      this.addToHistory(this.currentCall, 'completed');
      this.resetCallState();
    }
  }

  /**
   * Mettre en attente
   */
  async hold() {
    if (this.callState !== CallState.ANSWERED || !this.currentSession) {
      return;
    }

    try {
      await this.currentSession.hold();
      this.setCallState(CallState.ON_HOLD);
    } catch (error) {
      console.error('[VoIP] Erreur hold:', error);
    }
  }

  /**
   * Reprendre depuis l'attente
   */
  async unhold() {
    if (this.callState !== CallState.ON_HOLD || !this.currentSession) {
      return;
    }

    try {
      await this.currentSession.unhold();
      this.setCallState(CallState.ANSWERED);
    } catch (error) {
      console.error('[VoIP] Erreur unhold:', error);
    }
  }

  /**
   * Activer/Désactiver le mute
   */
  setMute(muted) {
    if (!this.currentSession) return;

    try {
      const pc = this.currentSession.sessionDescriptionHandler?.peerConnection;
      if (pc) {
        pc.getSenders().forEach(sender => {
          if (sender.track?.kind === 'audio') {
            sender.track.enabled = !muted;
          }
        });
      }
    } catch (error) {
      console.error('[VoIP] Erreur mute:', error);
    }
  }

  /**
   * Envoyer un DTMF (touche clavier)
   */
  sendDTMF(digit) {
    if (!this.currentSession || this.callState !== CallState.ANSWERED) {
      return;
    }

    try {
      this.currentSession.info({
        requestOptions: {
          body: {
            contentType: 'application/dtmf-relay',
            content: `Signal=${digit}\r\nDuration=100`
          }
        }
      });
    } catch (error) {
      console.error('[VoIP] Erreur DTMF:', error);
    }
  }

  /**
   * Configure les listeners sur une session
   */
  setupSessionListeners(session) {
    session.stateChange.addListener((state) => {
      console.log('[VoIP] État session:', state);

      switch (state) {
        case 'Established':
          this.currentCall.startTime = Date.now();
          this.currentCall.answered = true;
          this.setCallState(CallState.ANSWERED);
          this.setupAudio(session);
          break;

        case 'Terminated':
          this.currentCall.endTime = Date.now();
          if (!this.currentCall.answered && this.currentCall.direction === CallDirection.INCOMING) {
            this.addToHistory(this.currentCall, 'missed');
          } else {
            this.addToHistory(this.currentCall, 'completed');
          }
          this.emit('callEnded', this.currentCall);
          this.resetCallState();
          break;

        default:
          break;
      }
    });
  }

  /**
   * Configure l'audio pour la session
   */
  setupAudio(session) {
    try {
      const pc = session.sessionDescriptionHandler?.peerConnection;
      if (pc && this.remoteAudio) {
        const remoteStream = new MediaStream();
        pc.getReceivers().forEach(receiver => {
          if (receiver.track) {
            remoteStream.addTrack(receiver.track);
          }
        });
        this.remoteAudio.srcObject = remoteStream;
      }
    } catch (error) {
      console.error('[VoIP] Erreur setup audio:', error);
    }
  }

  /**
   * Réinitialise l'état d'appel
   */
  resetCallState() {
    this.currentSession = null;
    this.currentCall = null;
    this.setCallState(CallState.IDLE);

    // Nettoyer l'audio distant
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null;
    }

    // Muter les tracks du stream persistant (mais ne pas le fermer!)
    if (this.persistentAudioStream) {
      this.persistentAudioStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      console.log('[VoIP] Stream audio persistant muté (gardé pour prochain appel)');
    }

    this.localStream = null;
  }

  /**
   * Ajoute un appel à l'historique et persiste sur le serveur
   */
  async addToHistory(call, status) {
    if (!call) return;

    const user = this._getCurrentUser();
    const duration = call.endTime && call.startTime
      ? Math.round((call.endTime - call.startTime) / 1000)
      : 0;

    // Mapper le statut vers le format backend
    const backendStatus = status === 'completed' ? 'answered' : status;

    const historyEntry = {
      id: call.id,
      direction: call.direction,
      callerNumber: call.direction === 'incoming' ? (call.callerId || 'unknown') : (this.config.extension || 'unknown'),
      calledNumber: call.direction === 'outgoing' ? (call.target || 'unknown') : (this.config.extension || 'unknown'),
      callerName: call.callerName || null,
      startTime: call.startTime ? Math.floor(call.startTime / 1000) : Math.floor(Date.now() / 1000),
      answerTime: call.answered && call.startTime ? Math.floor(call.startTime / 1000) : null,
      endTime: call.endTime ? Math.floor(call.endTime / 1000) : Math.floor(Date.now() / 1000),
      duration,
      answeredByUserId: call.answered && user ? user.id : null,
      answeredByUsername: call.answered && user ? user.username : null,
      status: backendStatus,
      source: 'pwa'
    };

    // Ajouter à l'historique local
    this.callHistory.unshift({
      ...historyEntry,
      status // Garder le status original pour l'UI
    });

    // Limiter l'historique en mémoire
    if (this.callHistory.length > 100) {
      this.callHistory = this.callHistory.slice(0, 100);
    }

    // Persister sur le serveur
    try {
      const token = this._getAuthToken();
      if (token) {
        const response = await fetch('/api/calls', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(historyEntry)
        });

        if (response.ok) {
          console.log('[VoIP] Appel persisté sur le serveur:', historyEntry.id);
        } else if (response.status === 409) {
          console.log('[VoIP] Appel déjà enregistré sur le serveur');
        } else {
          console.warn('[VoIP] Erreur persistance serveur:', response.status);
        }
      }
    } catch (error) {
      console.error('[VoIP] Erreur envoi historique au serveur:', error);
    }
  }

  /**
   * Synchronise l'historique avec le serveur
   */
  async syncCallHistory(limit = 50) {
    try {
      const token = this._getAuthToken();
      if (!token) {
        console.warn('[VoIP] Pas de token, impossible de synchroniser');
        return this.callHistory;
      }

      const response = await fetch(`/api/calls?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Normaliser les données du serveur pour l'UI
        this.callHistory = (data.calls || []).map(call => ({
          ...call,
          // Mapper 'answered' -> 'completed' pour l'UI
          status: call.status === 'answered' ? 'completed' : call.status
        }));
        this.callHistoryLoaded = true;
        console.log('[VoIP] Historique synchronisé:', this.callHistory.length, 'appels');
        return this.callHistory;
      } else {
        console.warn('[VoIP] Erreur sync historique:', response.status);
        return this.callHistory;
      }
    } catch (error) {
      console.error('[VoIP] Erreur sync historique:', error);
      return this.callHistory;
    }
  }

  /**
   * Récupère l'historique des appels (depuis le cache local)
   */
  getCallHistory() {
    return this.callHistory;
  }

  /**
   * Récupère le nombre d'appels manqués non vus (depuis le serveur)
   */
  async getMissedCallsCount() {
    try {
      const token = this._getAuthToken();
      if (!token) {
        return this.callHistory.filter(c => c.status === 'missed' && !c.seen).length;
      }

      const response = await fetch('/api/calls/missed/count', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.count || 0;
      }
    } catch (error) {
      console.error('[VoIP] Erreur récupération missed count:', error);
    }

    // Fallback sur le cache local
    return this.callHistory.filter(c => c.status === 'missed' && !c.seen).length;
  }

  /**
   * Marque tous les appels manqués comme vus (sur le serveur)
   */
  async markMissedCallsAsSeen() {
    // Marquer en local d'abord
    this.callHistory.forEach(call => {
      if (call.status === 'missed') {
        call.seen = true;
      }
    });

    // Synchroniser avec le serveur
    try {
      const token = this._getAuthToken();
      if (token) {
        await fetch('/api/calls/mark-all-seen', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('[VoIP] Appels manqués marqués comme vus sur le serveur');
      }
    } catch (error) {
      console.error('[VoIP] Erreur markMissedCallsAsSeen:', error);
    }
  }

  // =====================
  // Gestion des événements
  // =====================

  setConnectionState(state) {
    this.connectionState = state;
    this.emit('connectionStateChange', state);
  }

  setCallState(state) {
    this.callState = state;
    this.emit('callStateChange', { state, call: this.currentCall });
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[VoIP] Erreur callback ${event}:`, error);
        }
      });
    }
  }

  emitError(message) {
    this.emit('error', { message, timestamp: Date.now() });
  }

  // =====================
  // Utilitaires
  // =====================

  /**
   * Vérifie si le contexte est sécurisé (HTTPS ou localhost)
   */
  static isSecureContext() {
    return window.isSecureContext === true;
  }

  /**
   * Vérifie si le navigateur supporte WebRTC
   */
  static isSupported() {
    // First check secure context
    if (!VoIPService.isSecureContext()) {
      console.warn('[VoIP] WebRTC requires a secure context (HTTPS)');
      return false;
    }
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.RTCPeerConnection
    );
  }

  /**
   * Clé localStorage pour mémoriser l'état de la permission micro
   */
  static PERMISSION_STORAGE_KEY = 'homenichat_mic_permission';

  /**
   * Vérifie l'état actuel de la permission micro (sans déclencher de prompt)
   */
  static async checkAudioPermissionState() {
    // 1. D'abord vérifier localStorage (fonctionne sur tous les navigateurs)
    const storedState = localStorage.getItem(VoIPService.PERMISSION_STORAGE_KEY);
    if (storedState === 'granted' || storedState === 'denied') {
      console.log('[VoIP] Permission micro (localStorage):', storedState);
      return storedState;
    }

    // 2. Essayer l'API Permissions (Chrome/Firefox, pas Safari)
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'microphone' });
        console.log('[VoIP] Permission micro (API):', result.state);
        // Sauvegarder si déjà granted/denied
        if (result.state === 'granted' || result.state === 'denied') {
          localStorage.setItem(VoIPService.PERMISSION_STORAGE_KEY, result.state);
        }
        return result.state;
      }
    } catch (e) {
      // Safari ne supporte pas cette API
      console.log('[VoIP] permissions.query non supporté');
    }

    return 'prompt'; // État inconnu
  }

  /**
   * Demande les permissions audio et GARDE le stream en mémoire
   * Le stream persistant évite les prompts répétés sur iOS Safari
   */
  async acquirePersistentAudioStream() {
    // Si on a déjà un stream actif, le réutiliser
    if (this.persistentAudioStream) {
      const tracks = this.persistentAudioStream.getAudioTracks();
      if (tracks.length > 0 && tracks[0].readyState === 'live') {
        console.log('[VoIP] Réutilisation du stream audio existant');
        return this.persistentAudioStream;
      }
    }

    // Vérifier le contexte sécurisé
    if (!VoIPService.isSecureContext()) {
      console.error('[VoIP] Cannot request audio permission: insecure context');
      return null;
    }

    // Vérifier que l'API existe
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('[VoIP] navigator.mediaDevices.getUserMedia not available');
      return null;
    }

    try {
      console.log('[VoIP] Acquisition du stream audio persistant...');
      this.persistentAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      // Mettre les tracks en mute par défaut (économie batterie)
      this.persistentAudioStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });

      localStorage.setItem(VoIPService.PERMISSION_STORAGE_KEY, 'granted');
      console.log('[VoIP] Stream audio persistant acquis (tracks muted)');
      return this.persistentAudioStream;
    } catch (error) {
      console.error('[VoIP] Impossible d\'acquérir le stream audio:', error.name);
      if (error.name === 'NotAllowedError') {
        localStorage.setItem(VoIPService.PERMISSION_STORAGE_KEY, 'denied');
      }
      return null;
    }
  }

  /**
   * Demande les permissions audio (vérifie d'abord si déjà accordée)
   * Utilise le stream persistant si disponible
   */
  static async requestAudioPermission() {
    // Vérifier d'abord le contexte sécurisé
    if (!VoIPService.isSecureContext()) {
      console.error('[VoIP] Cannot request audio permission: insecure context');
      return false;
    }

    // Vérifier que l'API existe
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('[VoIP] navigator.mediaDevices.getUserMedia not available');
      return false;
    }

    // Vérifier si permission déjà accordée (localStorage ou API)
    const currentState = await VoIPService.checkAudioPermissionState();
    console.log('[VoIP] État permission micro:', currentState);

    if (currentState === 'granted') {
      console.log('[VoIP] Permission micro déjà accordée (localStorage)');
      return true;
    }

    if (currentState === 'denied') {
      console.error('[VoIP] Permission micro refusée dans les paramètres');
      return false;
    }

    // État 'prompt' - on ne fait rien ici, l'acquisition se fera au moment de l'appel
    console.log('[VoIP] Permission micro: sera demandée au premier appel');
    return true; // On retourne true pour ne pas bloquer
  }

  /**
   * Réinitialiser l'état de permission (pour les paramètres)
   */
  static resetAudioPermission() {
    localStorage.removeItem(VoIPService.PERMISSION_STORAGE_KEY);
    console.log('[VoIP] État permission micro réinitialisé');
  }

  /**
   * Formate un numéro pour l'affichage
   */
  static formatPhoneNumber(number) {
    if (!number) return '';

    // Supprimer les caractères non numériques sauf +
    const cleaned = number.replace(/[^\d+]/g, '');

    // Format français
    if (cleaned.startsWith('+33') && cleaned.length === 12) {
      return cleaned.replace(/(\+33)(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5 $6');
    }

    // Format avec indicatif
    if (cleaned.startsWith('+') && cleaned.length > 10) {
      return cleaned.replace(/(\+\d{2,3})(\d{1,2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5 $6');
    }

    // Format local français (10 chiffres)
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }

    return number;
  }

  /**
   * Formate la durée d'un appel
   */
  static formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Export singleton
export const voipService = new VoIPService();
export default voipService;
