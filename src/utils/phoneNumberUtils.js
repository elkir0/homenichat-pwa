/**
 * Utilitaires pour la gestion des numéros de téléphone internationaux
 * Version 0.5.09-beta - Support étendu aux formats internationaux
 */

// Configuration des pays supportés
export const countryValidation = {
  // Europe
  '33': { name: 'France', flag: '🇫🇷', minLength: 11, maxLength: 11 },
  '34': { name: 'Espagne', flag: '🇪🇸', minLength: 11, maxLength: 11 },
  '39': { name: 'Italie', flag: '🇮🇹', minLength: 11, maxLength: 13 },
  '44': { name: 'Royaume-Uni', flag: '🇬🇧', minLength: 12, maxLength: 13 },
  '49': { name: 'Allemagne', flag: '🇩🇪', minLength: 12, maxLength: 13 },
  
  // Amérique du Nord
  '1': { name: 'USA/Canada', flag: '🇺🇸', minLength: 11, maxLength: 11 },
  
  // Caraïbes/DOM-TOM français
  '590': { name: 'Guadeloupe', flag: '🇬🇵', minLength: 12, maxLength: 12 },
  '594': { name: 'Guyane', flag: '🇬🇫', minLength: 12, maxLength: 12 },
  '596': { name: 'Martinique', flag: '🇲🇶', minLength: 12, maxLength: 12 },
  '262': { name: 'Réunion', flag: '🇷🇪', minLength: 12, maxLength: 12 },
  
  // Amérique du Sud
  '55': { name: 'Brésil', flag: '🇧🇷', minLength: 12, maxLength: 13 },
  '54': { name: 'Argentine', flag: '🇦🇷', minLength: 11, maxLength: 12 },
  
  // Afrique
  '212': { name: 'Maroc', flag: '🇲🇦', minLength: 12, maxLength: 12 },
  '213': { name: 'Algérie', flag: '🇩🇿', minLength: 12, maxLength: 12 },
  '225': { name: 'Côte d\'Ivoire', flag: '🇨🇮', minLength: 12, maxLength: 12 },
  
  // Asie
  '81': { name: 'Japon', flag: '🇯🇵', minLength: 11, maxLength: 12 },
  '86': { name: 'Chine', flag: '🇨🇳', minLength: 12, maxLength: 13 },
  '91': { name: 'Inde', flag: '🇮🇳', minLength: 12, maxLength: 13 }
};

/**
 * Nettoie un numéro de téléphone en supprimant tous les caractères non numériques
 * sauf le + en début qui est géré spécialement
 * 
 * @param {string} input - Numéro brut saisi par l'utilisateur
 * @returns {string} - Numéro nettoyé (chiffres uniquement)
 */
export const cleanPhoneNumber = (input) => {
  if (!input) return '';
  
  let cleaned = input.toString().trim();
  
  // Gérer le + en début (le supprimer)
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Supprimer tous les caractères non numériques (espaces, tirets, points, parenthèses)
  cleaned = cleaned.replace(/\D/g, '');
  
  return cleaned;
};

/**
 * Gère les formats locaux et les convertit en format international
 * 
 * @param {string} input - Numéro saisi par l'utilisateur
 * @param {string} defaultCountry - Code pays par défaut (ex: '590' pour Guadeloupe)
 * @returns {string} - Numéro au format international
 */
export const handleLocalFormats = (input, defaultCountry = '590') => {
  const cleaned = cleanPhoneNumber(input);
  
  if (!cleaned) return '';
  
  // Guadeloupe - formats locaux
  if (defaultCountry === '590') {
    if (cleaned.startsWith('0690') || cleaned.startsWith('0691')) {
      return '590' + cleaned.substring(1);
    }
    if (cleaned.startsWith('690') || cleaned.startsWith('691') && cleaned.length === 9) {
      return '590' + cleaned;
    }
  }
  
  // France - format local
  if (defaultCountry === '33') {
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '33' + cleaned.substring(1);
    }
  }
  
  // USA/Canada - format local
  if (defaultCountry === '1') {
    if (cleaned.length === 10) {
      return '1' + cleaned;
    }
  }
  
  return cleaned;
};

/**
 * Valide un numéro de téléphone international
 * 
 * @param {string} number - Numéro à valider
 * @param {string} defaultCountry - Code pays par défaut
 * @returns {Object} - Résultat de validation avec détails
 */
export const validateInternationalNumber = (number, defaultCountry = '590') => {
  // Gérer les formats locaux d'abord
  const processedNumber = handleLocalFormats(number, defaultCountry);
  const cleaned = cleanPhoneNumber(processedNumber);
  
  if (!cleaned || cleaned.length < 8) {
    return { 
      valid: false, 
      error: 'Numéro trop court (minimum 8 chiffres)',
      cleanedNumber: cleaned
    };
  }
  
  if (cleaned.length > 15) {
    return { 
      valid: false, 
      error: 'Numéro trop long (maximum 15 chiffres)',
      cleanedNumber: cleaned
    };
  }
  
  // Essayer de trouver un indicatif pays correspondant
  // Trier par longueur décroissante pour matcher les codes les plus spécifiques d'abord
  const sortedCodes = Object.keys(countryValidation).sort((a, b) => b.length - a.length);
  
  for (const code of sortedCodes) {
    if (cleaned.startsWith(code)) {
      const config = countryValidation[code];
      const isValidLength = cleaned.length >= config.minLength && 
                           cleaned.length <= config.maxLength;
      
      return {
        valid: isValidLength,
        country: config.name,
        countryCode: code,
        flag: config.flag,
        cleanedNumber: cleaned,
        displayNumber: formatDisplayNumber(cleaned, code),
        error: isValidLength ? null : `Longueur invalide pour ${config.name} (${config.minLength}-${config.maxLength} chiffres)`
      };
    }
  }
  
  // Si aucun indicatif reconnu, accepter quand même si longueur raisonnable
  if (cleaned.length >= 8 && cleaned.length <= 15) {
    return {
      valid: true,
      country: 'International',
      countryCode: null,
      flag: '🌍',
      cleanedNumber: cleaned,
      displayNumber: formatDisplayNumber(cleaned),
      error: null
    };
  }
  
  return { 
    valid: false, 
    error: 'Format de numéro non reconnu',
    cleanedNumber: cleaned
  };
};

/**
 * Formate un numéro pour l'affichage (avec espaces)
 * 
 * @param {string} number - Numéro nettoyé
 * @param {string} countryCode - Code pays (optionnel)
 * @returns {string} - Numéro formaté pour affichage
 */
export const formatDisplayNumber = (number, countryCode = null) => {
  if (!number) return '';
  
  // Formats spécifiques par pays
  switch (countryCode) {
    case '33': // France: +33 6 12 34 56 78
      if (number.length === 11) {
        return `+${number.substring(0, 2)} ${number.substring(2, 3)} ${number.substring(3, 5)} ${number.substring(5, 7)} ${number.substring(7, 9)} ${number.substring(9)}`;
      }
      break;
      
    case '590': // Guadeloupe: +590 690 12 34 56
    case '594': // Guyane
    case '596': // Martinique
    case '262': // Réunion
      if (number.length === 12) {
        return `+${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6, 8)} ${number.substring(8, 10)} ${number.substring(10)}`;
      }
      break;
      
    case '1': // USA/Canada: +1 555 123 4567
      if (number.length === 11) {
        return `+${number.substring(0, 1)} ${number.substring(1, 4)} ${number.substring(4, 7)} ${number.substring(7)}`;
      }
      break;
  }
  
  // Format générique: +XXX XXX XXX XXX
  if (number.length >= 8) {
    const groups = [];
    let remaining = number;
    
    // Code pays (2-3 chiffres)
    if (remaining.length > 8) {
      const countryLength = remaining.length <= 11 ? 2 : 3;
      groups.push(remaining.substring(0, countryLength));
      remaining = remaining.substring(countryLength);
    }
    
    // Groupes de 3 chiffres
    while (remaining.length > 3) {
      groups.push(remaining.substring(0, 3));
      remaining = remaining.substring(3);
    }
    
    // Derniers chiffres
    if (remaining) {
      groups.push(remaining);
    }
    
    return '+' + groups.join(' ');
  }
  
  return '+' + number;
};

/**
 * Obtient un message d'aide contextuel selon le pays
 * 
 * @param {string} countryCode - Code pays
 * @returns {string} - Message d'aide
 */
export const getHelpMessage = (countryCode = null) => {
  const helpMessages = {
    '590': 'Formats acceptés: +590 690 12 34 56, 0690123456, 690123456',
    '33': 'Formats acceptés: +33 6 12 34 56 78, 0612345678',
    '1': 'Formats acceptés: +1 555 123 4567, 15551234567',
    'default': 'Format international: +XXX XXXXXXXXX (sans +, espaces, tirets)'
  };
  
  return helpMessages[countryCode] || helpMessages.default;
};

/**
 * Liste des exemples de numéros par pays (pour tests)
 */
export const exampleNumbers = {
  '590': ['0690123456', '+590 690 12 34 56', '590690123456'],
  '33': ['0612345678', '+33 6 12 34 56 78', '33612345678'],
  '1': ['5551234567', '+1 555 123 4567', '15551234567'],
  '55': ['+55 11 99988 7766', '5511999887766'],
  '212': ['+212 6 12 34 56 78', '212612345678']
};

// Export par défaut
export default {
  cleanPhoneNumber,
  handleLocalFormats,
  validateInternationalNumber,
  formatDisplayNumber,
  getHelpMessage,
  countryValidation,
  exampleNumbers
};