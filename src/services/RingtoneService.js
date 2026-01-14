/**
 * RingtoneService - Génération et lecture de sonneries via Web Audio API
 *
 * Pas besoin de fichiers MP3 - tout est généré programmatiquement
 * Compatible PWA offline
 */

class RingtoneService {
  constructor() {
    this.audioContext = null;
    this.gainNode = null;
    this.oscillatorNodes = [];
    this.isPlaying = false;
    this.currentRingtone = null;
    this.intervalId = null;
    this.volume = 0.5;
    this.isUnlocked = false;

    // Auto-unlock sur iOS au premier touch/click
    this._setupAutoUnlock();
  }

  /**
   * Configure le déverrouillage automatique sur iOS
   * Doit être déclenché par une interaction utilisateur
   */
  _setupAutoUnlock() {
    const unlockHandler = () => {
      this.unlock();
      // Retirer les listeners après le premier unlock
      document.removeEventListener('touchstart', unlockHandler, true);
      document.removeEventListener('touchend', unlockHandler, true);
      document.removeEventListener('click', unlockHandler, true);
    };

    document.addEventListener('touchstart', unlockHandler, true);
    document.addEventListener('touchend', unlockHandler, true);
    document.addEventListener('click', unlockHandler, true);
  }

  /**
   * Déverrouille l'AudioContext pour iOS
   * Joue un son silencieux pour débloquer l'audio
   */
  unlock() {
    if (this.isUnlocked) return;

    try {
      this.init();

      // Jouer un son silencieux pour débloquer iOS
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);

      // Aussi créer et démarrer un oscillateur silencieux
      const oscillator = this.audioContext.createOscillator();
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0;
      oscillator.connect(silentGain);
      silentGain.connect(this.audioContext.destination);
      oscillator.start(0);
      oscillator.stop(0.001);

      this.isUnlocked = true;
      console.log('[RingtoneService] Audio déverrouillé pour iOS');
    } catch (e) {
      console.warn('[RingtoneService] Erreur unlock:', e);
    }
  }

  /**
   * Initialise le contexte audio (doit être appelé après interaction utilisateur)
   */
  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    }
    // Resume si suspendu (politique autoplay)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Définit le volume (0-1)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  /**
   * Joue une note simple
   */
  playTone(frequency, duration, type = 'sine') {
    if (!this.audioContext) this.init();

    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    oscillator.connect(envelope);
    envelope.connect(this.gainNode);

    // Envelope pour éviter les clics
    const now = this.audioContext.currentTime;
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(this.volume, now + 0.01);
    envelope.gain.linearRampToValueAtTime(this.volume * 0.7, now + duration - 0.05);
    envelope.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);

    this.oscillatorNodes.push(oscillator);

    oscillator.onended = () => {
      const index = this.oscillatorNodes.indexOf(oscillator);
      if (index > -1) this.oscillatorNodes.splice(index, 1);
    };

    return oscillator;
  }

  /**
   * Sonneries disponibles
   */
  static RINGTONES = {
    default: {
      id: 'default',
      name: 'Par défaut',
      play: (service) => service.playDefaultRingtone()
    },
    nokia: {
      id: 'nokia',
      name: 'Nokia Tune',
      play: (service) => service.playNokiaRingtone()
    },
    classic: {
      id: 'classic',
      name: 'Classique',
      play: (service) => service.playClassicRingtone()
    },
    modern: {
      id: 'modern',
      name: 'Moderne',
      play: (service) => service.playModernRingtone()
    },
    soft: {
      id: 'soft',
      name: 'Douce',
      play: (service) => service.playSoftRingtone()
    },
    urgent: {
      id: 'urgent',
      name: 'Urgente',
      play: (service) => service.playUrgentRingtone()
    }
  };

  /**
   * Sonnerie par défaut - Pattern de téléphone classique
   */
  playDefaultRingtone() {
    const pattern = () => {
      // Double bip classique
      this.playTone(480, 0.4, 'sine');
      setTimeout(() => this.playTone(480, 0.4, 'sine'), 500);
    };

    pattern();
    this.intervalId = setInterval(pattern, 2000);
  }

  /**
   * Nokia Tune (simplifié)
   */
  playNokiaRingtone() {
    const notes = [
      { freq: 659.25, dur: 0.15 },  // E5
      { freq: 587.33, dur: 0.15 },  // D5
      { freq: 369.99, dur: 0.3 },   // F#4
      { freq: 415.30, dur: 0.3 },   // G#4
      { freq: 554.37, dur: 0.15 },  // C#5
      { freq: 493.88, dur: 0.15 },  // B4
      { freq: 329.63, dur: 0.3 },   // E4
      { freq: 369.99, dur: 0.3 },   // F#4
      { freq: 493.88, dur: 0.15 },  // B4
      { freq: 440.00, dur: 0.15 },  // A4
      { freq: 277.18, dur: 0.3 },   // C#4
      { freq: 329.63, dur: 0.3 },   // E4
      { freq: 440.00, dur: 0.6 },   // A4
    ];

    const playSequence = () => {
      let time = 0;
      notes.forEach(note => {
        setTimeout(() => {
          if (this.isPlaying) {
            this.playTone(note.freq, note.dur, 'square');
          }
        }, time * 1000);
        time += note.dur + 0.02;
      });
    };

    playSequence();
    this.intervalId = setInterval(playSequence, 4000);
  }

  /**
   * Sonnerie classique - Téléphone à l'ancienne
   */
  playClassicRingtone() {
    const ring = () => {
      // Son de cloche de téléphone mécanique
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          if (this.isPlaying) {
            this.playTone(1400 + Math.random() * 200, 0.03, 'triangle');
          }
        }, i * 50);
      }
    };

    ring();
    setTimeout(() => { if (this.isPlaying) ring(); }, 150);
    this.intervalId = setInterval(() => {
      ring();
      setTimeout(() => { if (this.isPlaying) ring(); }, 150);
    }, 2000);
  }

  /**
   * Sonnerie moderne - Clean et douce
   */
  playModernRingtone() {
    const pattern = () => {
      // Arpège montant
      this.playTone(523.25, 0.2, 'sine');  // C5
      setTimeout(() => this.playTone(659.25, 0.2, 'sine'), 200);  // E5
      setTimeout(() => this.playTone(783.99, 0.3, 'sine'), 400);  // G5
    };

    pattern();
    this.intervalId = setInterval(pattern, 1500);
  }

  /**
   * Sonnerie douce - Calme
   */
  playSoftRingtone() {
    const pattern = () => {
      // Note longue et douce
      this.playTone(392.00, 0.8, 'sine');  // G4
      setTimeout(() => this.playTone(440.00, 0.8, 'sine'), 900);  // A4
    };

    pattern();
    this.intervalId = setInterval(pattern, 2500);
  }

  /**
   * Sonnerie urgente - Rapide et intense
   */
  playUrgentRingtone() {
    const pattern = () => {
      // Bips rapides
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          if (this.isPlaying) {
            this.playTone(880, 0.1, 'square');
          }
        }, i * 150);
      }
    };

    pattern();
    this.intervalId = setInterval(pattern, 1000);
  }

  /**
   * Lance la sonnerie sélectionnée
   */
  async play(ringtoneId = 'default') {
    this.stop();
    this.init();

    // iOS: Forcer le resume du contexte audio
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('[RingtoneService] AudioContext resumed');
      } catch (e) {
        console.warn('[RingtoneService] Impossible de resume AudioContext:', e);
      }
    }

    const ringtone = RingtoneService.RINGTONES[ringtoneId] || RingtoneService.RINGTONES.default;
    this.currentRingtone = ringtoneId;
    this.isPlaying = true;
    this.gainNode.gain.value = this.volume;

    console.log('[RingtoneService] Playing:', ringtoneId, 'volume:', this.volume, 'state:', this.audioContext.state);
    ringtone.play(this);
  }

  /**
   * Joue un aperçu court de la sonnerie (pour les paramètres)
   */
  async preview(ringtoneId = 'default', duration = 3000) {
    this.play(ringtoneId);

    return new Promise(resolve => {
      setTimeout(() => {
        this.stop();
        resolve();
      }, duration);
    });
  }

  /**
   * Arrête la sonnerie
   */
  stop() {
    this.isPlaying = false;
    this.currentRingtone = null;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Arrêter tous les oscillateurs en cours
    this.oscillatorNodes.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Déjà arrêté
      }
    });
    this.oscillatorNodes = [];

    // Réduire le gain à 0 pour libérer l'audio sans suspendre le contexte
    if (this.gainNode) {
      this.gainNode.gain.value = 0;
    }
  }

  /**
   * Tonalité de retour d'appel (ringback tone)
   * Joue quand on attend que l'interlocuteur décroche
   * Standard français: 1.5s de tonalité 440Hz, 3.5s de silence
   */
  async playRingback() {
    this.stop();
    this.init();

    // iOS: Forcer le resume du contexte audio
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (e) {
        console.warn('[RingtoneService] Impossible de resume AudioContext:', e);
      }
    }

    this.isPlaying = true;
    this.currentRingtone = 'ringback';
    this.gainNode.gain.value = this.volume * 0.4; // Volume plus faible pour le ringback

    const playRingbackTone = () => {
      if (!this.isPlaying) return;
      // Tonalité 440Hz pendant 1.5 secondes
      this.playTone(440, 1.5, 'sine');
    };

    // Jouer immédiatement puis toutes les 5 secondes (1.5s son + 3.5s silence)
    playRingbackTone();
    this.intervalId = setInterval(playRingbackTone, 5000);

    console.log('[RingtoneService] Playing ringback tone');
  }

  /**
   * Tonalité d'occupation (busy tone)
   * Bips rapides quand la ligne est occupée
   */
  async playBusyTone() {
    this.stop();
    this.init();

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (e) {
        console.warn('[RingtoneService] Impossible de resume AudioContext:', e);
      }
    }

    this.isPlaying = true;
    this.currentRingtone = 'busy';
    this.gainNode.gain.value = this.volume * 0.4;

    const playBusyPattern = () => {
      if (!this.isPlaying) return;
      // Bip court 480Hz
      this.playTone(480, 0.5, 'sine');
    };

    playBusyPattern();
    this.intervalId = setInterval(playBusyPattern, 1000); // 0.5s son + 0.5s silence

    console.log('[RingtoneService] Playing busy tone');
  }

  /**
   * Liste des sonneries disponibles
   */
  static getRingtoneList() {
    return Object.values(RingtoneService.RINGTONES).map(r => ({
      id: r.id,
      name: r.name
    }));
  }

  /**
   * Vérifier si Web Audio API est supportée
   */
  static isSupported() {
    return !!(window.AudioContext || window.webkitAudioContext);
  }
}

// Singleton
const ringtoneService = new RingtoneService();

export default ringtoneService;
export { RingtoneService };
