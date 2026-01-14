/**
 * Utilitaires pour simuler le comportement humain
 * CRITIQUE pour éviter les bans WhatsApp/META
 */

class HumanBehaviorSimulator {
  constructor() {
    // Paramètres de frappe réalistes
    this.typingSpeed = {
      min: 50,   // ms entre les caractères (rapide)
      max: 200,  // ms entre les caractères (lent)
      avg: 100   // vitesse moyenne
    };
    
    // Pauses naturelles
    this.pauses = {
      comma: { min: 300, max: 500 },      // pause après virgule
      period: { min: 500, max: 800 },     // pause après point
      question: { min: 400, max: 700 },   // pause après question
      thinking: { min: 1000, max: 3000 }, // pause de réflexion
      paragraph: { min: 800, max: 1500 }  // pause entre paragraphes
    };
    
    // Probabilités d'événements
    this.probabilities = {
      typo: 0.02,          // 2% de chance de faire une faute
      correction: 0.8,     // 80% de chance de corriger une faute
      pause: 0.15,         // 15% de chance de faire une pause
      speedVariation: 0.3  // 30% de chance de changer de vitesse
    };
    
    // État de frappe
    this.isTyping = false;
    this.currentSpeed = this.typingSpeed.avg;
  }
  
  /**
   * Génère un délai aléatoire entre min et max
   */
  randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * Simule la frappe d'un texte caractère par caractère
   */
  async typeText(text, callbacks = {}) {
    const {
      onChar = () => {},
      onTypingStart = () => {},
      onTypingEnd = () => {},
      onCorrection = () => {}
    } = callbacks;
    
    this.isTyping = true;
    onTypingStart();
    
    let currentText = '';
    const chars = text.split('');
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      
      // Variation de vitesse aléatoire
      if (Math.random() < this.probabilities.speedVariation) {
        this.currentSpeed = this.randomDelay(this.typingSpeed.min, this.typingSpeed.max);
      }
      
      // Simulation de faute de frappe
      if (Math.random() < this.probabilities.typo && i > 0) {
        // Ajouter un caractère erroné
        const wrongChar = this.getRandomChar();
        currentText += wrongChar;
        onChar(currentText);
        
        await this.sleep(this.currentSpeed);
        
        // Correction de la faute
        if (Math.random() < this.probabilities.correction) {
          await this.sleep(this.randomDelay(200, 400));
          currentText = currentText.slice(0, -1);
          onCorrection(currentText);
          await this.sleep(this.randomDelay(100, 200));
        }
      }
      
      // Ajouter le bon caractère
      currentText += char;
      onChar(currentText);
      
      // Pauses naturelles selon la ponctuation
      let pauseDuration = this.currentSpeed;
      
      if (char === ',') {
        pauseDuration = this.randomDelay(this.pauses.comma.min, this.pauses.comma.max);
      } else if (char === '.' || char === '!' || char === ':') {
        pauseDuration = this.randomDelay(this.pauses.period.min, this.pauses.period.max);
      } else if (char === '?') {
        pauseDuration = this.randomDelay(this.pauses.question.min, this.pauses.question.max);
      } else if (char === '\n') {
        pauseDuration = this.randomDelay(this.pauses.paragraph.min, this.pauses.paragraph.max);
      }
      
      // Pause de réflexion aléatoire
      if (Math.random() < this.probabilities.pause) {
        pauseDuration += this.randomDelay(this.pauses.thinking.min, this.pauses.thinking.max);
      }
      
      await this.sleep(pauseDuration);
    }
    
    // Délai avant envoi (relecture simulée)
    await this.sleep(this.randomDelay(300, 1000));
    
    this.isTyping = false;
    onTypingEnd();
    
    return currentText;
  }
  
  /**
   * Simule l'indicateur "en train d'écrire"
   */
  async simulateTypingIndicator(duration = 3000) {
    const startTime = Date.now();
    const pulseInterval = 500; // Pulsation toutes les 500ms
    
    while (Date.now() - startTime < duration) {
      // Envoyer l'indicateur de frappe
      if (this.onTypingIndicator) {
        this.onTypingIndicator(true);
      }
      
      await this.sleep(pulseInterval);
    }
    
    if (this.onTypingIndicator) {
      this.onTypingIndicator(false);
    }
  }
  
  /**
   * Simule une session de lecture avant réponse
   */
  async simulateReading(messageLength) {
    // Temps de lecture basé sur la longueur du message (60-80 mots/minute)
    const wordsPerMinute = this.randomDelay(60, 80);
    const wordCount = messageLength / 5; // Estimation moyenne
    const readingTime = (wordCount / wordsPerMinute) * 60 * 1000;
    
    await this.sleep(Math.min(readingTime, 5000)); // Max 5 secondes
  }
  
  /**
   * Génère un caractère aléatoire pour les fautes de frappe
   */
  getRandomChar() {
    const chars = 'azertyuiopqsdfghjklmwxcvbn';
    return chars[Math.floor(Math.random() * chars.length)];
  }
  
  /**
   * Fonction sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Calcule le temps total estimé pour taper un message
   */
  estimateTypingTime(text) {
    const baseTime = text.length * this.typingSpeed.avg;
    const punctuationCount = (text.match(/[,.!?:]/g) || []).length;
    const pauseTime = punctuationCount * 400; // Moyenne des pauses
    
    return baseTime + pauseTime + this.randomDelay(300, 1000); // + délai final
  }
  
  /**
   * Génère un pattern de frappe réaliste pour l'analyse
   */
  generateTypingPattern(text) {
    const pattern = [];
    let timestamp = 0;
    
    for (const char of text) {
      const delay = this.randomDelay(this.typingSpeed.min, this.typingSpeed.max);
      timestamp += delay;
      
      pattern.push({
        char,
        timestamp,
        delay
      });
    }
    
    return pattern;
  }
}

// Hook React pour utiliser le simulateur
export function useHumanBehavior() {
  const simulator = new HumanBehaviorSimulator();
  
  const typeMessage = async (text, onUpdate) => {
    return simulator.typeText(text, {
      onChar: onUpdate,
    });
  };
  
  const simulateTyping = async (duration) => {
    return simulator.simulateTypingIndicator(duration);
  };
  
  const simulateReading = async (messageLength) => {
    return simulator.simulateReading(messageLength);
  };
  
  return {
    typeMessage,
    simulateTyping,
    simulateReading,
    estimateTypingTime: (text) => simulator.estimateTypingTime(text)
  };
}

export default HumanBehaviorSimulator;