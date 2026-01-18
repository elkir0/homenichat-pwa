import React, { useState, useRef, useEffect } from 'react';
import { useHumanBehavior } from '../utils/humanBehavior';
import whatsappApi from '../services/whatsappApi';
import FileUpload from './FileUpload';
import './MessageInput.css';

function MessageInput({ onSendMessage, disabled, chatId, activeSessionId }) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [simulatedText, setSimulatedText] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [sendingFile, setSendingFile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  const { typeMessage, estimateTypingTime } = useHumanBehavior();

  // Helper pour créer les headers avec session
  const createHeaders = (additionalHeaders = {}) => {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Authorization': `Bearer ${token}`,
      ...additionalHeaders
    };

    if (activeSessionId) {
      headers['X-Session-Id'] = activeSessionId;
    }

    return headers;
  };

  // Focus sur l'input au montage - DÉSACTIVÉ pour mobile
  /*
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  */

  // Gérer la simulation de frappe
  const handleInputChange = (e) => {
    const text = e.target.value;
    setMessage(text);

    // Envoyer l'indicateur de frappe
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      whatsappApi.sendTypingIndicator(chatId, true);
    }

    // Réinitialiser le timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Arrêter l'indicateur après 3 secondes d'inactivité
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        whatsappApi.sendTypingIndicator(chatId, false);
      }
    }, 3000);
  };

  // Gérer l'envoi du message
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim() || disabled) return;

    const messageText = message.trim();
    setMessage('');
    setIsTyping(false);

    // Nettoyer le timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Simuler la frappe avant l'envoi
    const typingTime = estimateTypingTime(messageText);

    // Afficher l'indicateur de frappe
    whatsappApi.sendTypingIndicator(chatId, true);

    // Simuler la frappe (optionnel, peut être désactivé pour l'envoi rapide)
    if (process.env.REACT_APP_SIMULATE_TYPING === 'true') {
      await typeMessage(messageText, setSimulatedText);
    } else {
      // Délai minimal pour paraître naturel
      await new Promise(resolve => setTimeout(resolve, Math.min(typingTime, 2000)));
    }

    // Arrêter l'indicateur de frappe
    whatsappApi.sendTypingIndicator(chatId, false);

    // Envoyer le message
    onSendMessage(messageText, typingTime);
    setSimulatedText('');
  };

  // Gérer les raccourcis clavier
  const handleKeyDown = (e) => {
    // Envoyer avec Entrée (sans Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Insérer un emoji
  const insertEmoji = (emoji) => {
    const start = inputRef.current.selectionStart;
    const end = inputRef.current.selectionEnd;
    const newMessage = message.substring(0, start) + emoji + message.substring(end);
    setMessage(newMessage);

    // Repositionner le curseur
    setTimeout(() => {
      inputRef.current.selectionStart = start + emoji.length;
      inputRef.current.selectionEnd = start + emoji.length;
      inputRef.current.focus();
    }, 0);
  };

  // Mode urgence médicale
  const [urgentMode, setUrgentMode] = useState(false);

  const handleUrgentMessage = () => {
    setUrgentMode(!urgentMode);
    if (!urgentMode) {
      // Préfixe automatique pour les urgences
      setMessage('🚨 URGENT MÉDICAL: ');
      inputRef.current?.focus();
    }
  };

  // Gestion de l'enregistrement vocal
  const startRecording = async () => {
    try {
      // Vérifier si on est en contexte sécurisé (HTTPS requis pour le micro)
      if (!window.isSecureContext) {
        alert('L\'enregistrement vocal nécessite une connexion HTTPS sécurisée. En HTTP, le navigateur bloque l\'accès au microphone.');
        return;
      }

      // Vérifier si l'API mediaDevices est disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Votre navigateur ne supporte pas l\'enregistrement audio ou l\'accès est bloqué (HTTPS requis).');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Utiliser un format supporté par le navigateur ET Meta
      let mimeType = 'audio/webm;codecs=opus'; // Par défaut
      let fileExtension = 'webm';

      // Essayer d'utiliser un format directement supporté par Meta
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
        fileExtension = 'mp4';
      } else if (MediaRecorder.isTypeSupported('audio/mpeg')) {
        mimeType = 'audio/mpeg';
        fileExtension = 'mp3';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
        fileExtension = 'ogg';
      }

      console.log('Format audio sélectionné:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await sendVoiceMessage(audioBlob, mimeType, fileExtension);

        // Arrêter le stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Démarrer le compteur
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Erreur accès microphone:', error);
      alert('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      // Arrêter le stream sans envoyer
      const stream = mediaRecorderRef.current.stream;
      stream.getTracks().forEach(track => track.stop());

      audioChunksRef.current = [];
      setRecordingDuration(0);
    }
  };

  const sendVoiceMessage = async (audioBlob, mimeType, fileExtension = 'webm') => {
    if (!audioBlob || sendingFile) return;

    setSendingFile(true);

    try {
      // Utiliser l'extension passée en paramètre
      const fileName = `voice-message.${fileExtension}`;

      // Créer un fichier à partir du blob
      const audioFile = new File([audioBlob], fileName, {
        type: mimeType.split(';')[0], // Enlever les codecs pour le type de fichier
        lastModified: Date.now()
      });

      // Uploader le fichier audio
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('chatId', chatId);

      const token = localStorage.getItem('authToken');
      const uploadResponse = await fetch('/api/media/upload', {
        method: 'POST',
        headers: createHeaders(),
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload audio failed');
      }

      const uploadResult = await uploadResponse.json();
      console.log('Upload result:', JSON.stringify(uploadResult, null, 2));

      // Récupérer l'ID du média - plusieurs formats possibles selon le backend
      const mediaId = uploadResult.media?.metaMediaId || uploadResult.media?.id || uploadResult.mediaId;
      const mediaUrl = uploadResult.media?.url || `/api/media/${mediaId}`;
      console.log('Media ID to send:', mediaId);
      console.log('Media URL:', mediaUrl);

      if (!mediaId) {
        console.error('No media ID found in upload result!');
        throw new Error('Upload succeeded but no media ID returned');
      }

      // Envoyer le message audio
      console.log('Sending audio message to chat:', chatId);
      const sendResponse = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: createHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          media: {
            type: 'audio',
            id: mediaId,
            metaMediaId: mediaId,
            localMediaId: mediaId,
            url: mediaUrl,
            fileName: uploadResult.media?.fileName || 'voice-message.mp4'
          }
        })
      });

      if (!sendResponse.ok) {
        const errorData = await sendResponse.text();
        console.error('Send response error:', errorData);
        throw new Error('Send audio failed: ' + errorData);
      }

      const result = await sendResponse.json();
      console.log('Send response:', result);
      console.log('Message audio envoyé avec succès');

      // Notifier le parent
      if (onSendMessage) {
        onSendMessage();
      }

    } catch (error) {
      console.error('Erreur envoi message vocal:', error);
      alert('Erreur lors de l\'envoi du message vocal');
    } finally {
      setSendingFile(false);
      setRecordingDuration(0);
    }
  };

  // Formater la durée d'enregistrement
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Gérer l'envoi de fichiers
  const handleFileSelect = async (file, caption) => {
    if (!file || sendingFile) return;

    setSendingFile(true);

    try {
      // D'abord uploader le fichier
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', chatId);

      const token = localStorage.getItem('authToken');
      const uploadResponse = await fetch('/api/media/upload', {
        method: 'POST',
        headers: createHeaders(),
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadResult = await uploadResponse.json();

      // Ensuite envoyer le message avec le média
      const sendResponse = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: createHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          media: {
            type: file.type.split('/')[0], // image, video, audio
            id: uploadResult.media.metaMediaId,
            url: uploadResult.media.url,
            caption: caption,
            fileName: file.name,
            mimeType: file.type
          }
        })
      });

      if (!sendResponse.ok) {
        throw new Error('Send failed');
      }

      // Le message arrivera via push - pas besoin de rafraîchir
      console.log('✅ Fichier envoyé avec succès');

    } catch (error) {
      alert('Erreur lors de l\'envoi du fichier');
    } finally {
      setSendingFile(false);
    }
  };

  return (
    <div className={`message-input ${urgentMode ? 'urgent-mode' : ''}`}>
      <form onSubmit={handleSubmit} className="input-form">
        {/* Boutons d'action */}
        <div className="input-actions">
          <button
            type="button"
            className="btn"
            onClick={() => insertEmoji('😊')}
            title="Emojis"
          >
            <span className="material-icons">sentiment_satisfied_alt</span>
          </button>

          <button
            type="button"
            className="btn"
            title="Joindre un fichier"
            onClick={() => setShowFileUpload(true)}
            disabled={sendingFile}
          >
            <span className="material-icons">
              {sendingFile ? 'hourglass_empty' : 'attach_file'}
            </span>
          </button>

          <button
            type="button"
            className={`btn ${urgentMode ? 'urgent-active' : ''}`}
            onClick={handleUrgentMessage}
            title="Mode urgence médicale"
          >
            <span className="material-icons">medical_services</span>
          </button>
        </div>

        {/* Zone de texte */}
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              // Petit délai pour laisser le clavier s'ouvrir
              setTimeout(() => {
                // Scroll dans la fenêtre parente si nécessaire
                const event = new CustomEvent('messageInputFocus');
                window.dispatchEvent(event);
              }, 300);
            }}
            placeholder={urgentMode ? "Message urgent..." : "Tapez un message..."}
            rows="1"
            disabled={disabled}
            className="message-textarea"
          />

          {/* Aperçu de la simulation (debug) */}
          {simulatedText && process.env.NODE_ENV === 'development' && (
            <div className="typing-preview">{simulatedText}</div>
          )}
        </div>

        {/* Bouton d'envoi / Enregistrement */}
        {message.trim() ? (
          <button
            type="submit"
            className="btn btn-send"
            disabled={disabled}
          >
            <span className="material-icons">send</span>
          </button>
        ) : (
          <button
            type="button"
            className={`btn btn-send ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || sendingFile}
          >
            <span className="material-icons">
              {isRecording ? 'stop' : 'mic'}
            </span>
          </button>
        )}
      </form>

      {/* Indicateur d'envoi */}
      {disabled && (
        <div className="sending-indicator">
          <span className="material-icons rotating">sync</span>
          <span>Envoi en cours...</span>
        </div>
      )}

      {/* Indicateur d'enregistrement */}
      {isRecording && (
        <div className="recording-indicator">
          <span className="recording-dot"></span>
          <span>Enregistrement... {formatDuration(recordingDuration)}</span>
          <button
            type="button"
            className="btn btn-cancel"
            onClick={cancelRecording}
          >
            <span className="material-icons">close</span>
          </button>
        </div>
      )}

      {/* Barre d'emojis rapides */}
      <div className="quick-emojis">
        {['👍', '❤️', '😂', '😊', '🙏', '👌', '✅', '🔥'].map(emoji => (
          <button
            key={emoji}
            type="button"
            className="emoji-btn"
            onClick={() => insertEmoji(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Modal d'upload de fichier */}
      {showFileUpload && (
        <FileUpload
          onFileSelect={handleFileSelect}
          onClose={() => setShowFileUpload(false)}
        />
      )}
    </div>
  );
}

export default MessageInput;