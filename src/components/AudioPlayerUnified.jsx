import React, { useState, useRef, useEffect } from 'react';
import whatsappApi from '../services/whatsappApi';
import './AudioPlayer.css';

/**
 * AudioPlayer unifié qui fonctionne avec WhatsApp API et Meta API
 * Pour WhatsApp: utilise downloadMediaMessage avec messageKey
 * Pour Meta: utilise directement l'URL locale du média
 */
function AudioPlayerUnified({ message, isFromMe }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioSrc, setAudioSrc] = useState(null);
  const [error, setError] = useState(null);
  
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  // Déterminer le type d'API et extraire les données audio
  const getAudioData = () => {
    // Meta API
    if (message.type === 'audio' && message.media) {
      return {
        type: 'meta',
        audioData: message.media,
        duration: message.media.duration || 0,
        voice: message.media.voice || false,
        localUrl: message.media.localUrl || message.media.url
      };
    }
    
    // WhatsApp API
    if (message.message?.audioMessage) {
      return {
        type: 'baileys',
        audioData: message.message.audioMessage,
        duration: message.message.audioMessage.seconds || 0,
        messageKey: message.key
      };
    }
    
    return null;
  };

  const audioInfo = getAudioData();

  // Format de temps MM:SS
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Charger l'audio selon le type d'API
  const loadAudio = async () => {
    if (audioSrc) return; // Déjà chargé
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (audioInfo.type === 'meta' && audioInfo.localUrl) {
        // Pour Meta, on a déjà l'URL locale
        setAudioSrc(audioInfo.localUrl);
      } else if (audioInfo.type === 'baileys' && audioInfo.messageKey) {
        // Pour WhatsApp, télécharger via l'API
        const mediaData = await whatsappApi.downloadMediaMessage(audioInfo.messageKey);
        
        if (mediaData.base64) {
          // Créer un blob URL à partir du base64
          const byteCharacters = atob(mediaData.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mediaData.mimetype || 'audio/ogg' });
          const url = URL.createObjectURL(blob);
          
          setAudioSrc(url);
        } else {
          throw new Error('Pas de données audio');
        }
      } else {
        throw new Error('Type d\'API non supporté ou données manquantes');
      }
    } catch (error) {
      console.error('Erreur chargement audio:', error);
      setError('Impossible de charger l\'audio');
    } finally {
      setIsLoading(false);
    }
  };

  // Nettoyage de l'URL quand le composant est démonté
  useEffect(() => {
    return () => {
      if (audioSrc && audioInfo.type === 'baileys') {
        // Ne nettoyer que les blob URLs créées pour WhatsApp
        URL.revokeObjectURL(audioSrc);
      }
    };
  }, [audioSrc, audioInfo.type]);

  // Gestionnaires audio
  const handlePlay = async () => {
    if (!audioSrc) {
      await loadAudio();
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleProgressClick = (e) => {
    if (audioRef.current && progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const progressWidth = rect.width;
      const newTime = (clickX / progressWidth) * duration;
      
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Calculer la progression
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Si pas de données audio, ne rien afficher
  if (!audioInfo) return null;

  return (
    <div className={`audio-player ${isFromMe ? 'from-me' : 'from-them'}`}>
      <div className="audio-controls">
        {/* Bouton play/pause */}
        <button 
          className="play-button"
          onClick={handlePlay}
          disabled={isLoading || error}
        >
          <span className="material-icons">
            {isLoading ? 'sync' : (isPlaying ? 'pause' : 'play_arrow')}
          </span>
        </button>

        {/* Barre de progression */}
        <div className="audio-progress-container">
          {/* Indicateur de message vocal (si c'est un vocal) */}
          {audioInfo.voice && (
            <span className="voice-indicator material-icons">mic</span>
          )}
          
          {/* Waveform visuelle (WhatsApp uniquement) */}
          {audioInfo.type === 'baileys' && audioInfo.audioData?.waveform && !audioSrc && (
            <div className="waveform">
              <div className="waveform-bars">
                {/* Simplifié: quelques barres statiques */}
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i} 
                    className="waveform-bar"
                    style={{ height: `${20 + Math.random() * 40}%` }}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Barre de progression classique */}
          {(audioSrc || audioInfo.type === 'meta') && (
            <div 
              className="progress-bar"
              ref={progressRef}
              onClick={handleProgressClick}
            >
              <div 
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
              <div 
                className="progress-handle"
                style={{ left: `${progress}%` }}
              />
            </div>
          )}
          
          {/* Temps */}
          <div className="time-display">
            <span className="current-time">
              {formatTime(currentTime)}
            </span>
            <span className="duration">
              {formatTime(duration || audioInfo.duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Élément audio caché */}
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          preload="metadata"
        />
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="audio-error">
          <span className="material-icons">error</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default AudioPlayerUnified;