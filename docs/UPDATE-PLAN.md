# Plan de Mise à Jour PWA - Homenichat

> Migration l'ekip-chat → Homenichat + Alignement API Backend
> Date: 2026-01-14

---

## Résumé des changements

| Catégorie | Fichiers | Priorité | Complexité |
|-----------|----------|----------|------------|
| Renommage branding | 21 fichiers | Haute | Faible |
| API WhatsApp | 1 fichier | Haute | Faible |
| Multi-provider support | 2 fichiers | Moyenne | Moyenne |
| Version sync | 2 fichiers | Faible | Triviale |

---

## 1. Renommage l'ekip-chat → Homenichat

### Fichiers à modifier

| Fichier | Occurrences | Type de changement |
|---------|-------------|-------------------|
| `package.json` | 2 | name, description |
| `public/manifest.json` | 2 | name, short_name |
| `public/index.html` | 7 | title, meta, noscript |
| `public/service-worker.js` | 5 | CACHE_NAME, title, tag, dbName |
| `src/services/offlineQueueService.js` | 2 | dbName, API endpoint |
| `src/services/notificationService.js` | 1 | tag |
| `src/services/voip/VoIPService.js` | 1 | PERMISSION_STORAGE_KEY |
| `src/components/ChatList.jsx` | 1 | h1 title |
| `src/components/ChatWindow.jsx` | 2 | alt, h2 |
| `src/components/Login.jsx` | 2 | h1, powered by |
| `src/components/AdminPanelEnhanced.jsx` | 1 | title |
| `src/components/phone/PhoneSettings.jsx` | 1 | STORAGE_KEY |
| `src/components/admin/SessionManagement.jsx` | 1 | placeholder |
| `src/components/admin/APIConfiguration.jsx` | 1 | placeholder |
| CSS files (5) | 5 | comments only |

### Valeurs de remplacement

```
l'ekip-chat → Homenichat
L'ekip-Chat → Homenichat
lekip-chat → homenichat
lekipchat → homenichat
LekipChatDB → HomenichatDB
lekip_mic_permission → homenichat_mic_permission
lekip_phone_settings → homenichat_phone_settings
lekip-notification → homenichat-notification
```

---

## 2. API WhatsApp - Nouvelles méthodes

### Méthodes à ajouter dans `src/services/whatsappApi.js`

```javascript
/**
 * Marque un message spécifique comme lu
 * POST /api/chats/:chatId/messages/:messageId/read
 */
async markMessageAsRead(chatId, messageId) {
  try {
    const response = await fetch(
      `${API_URL}/api/chats/${encodeURIComponent(chatId)}/messages/${messageId}/read`,
      {
        method: 'POST',
        headers: this.getHeaders()
      }
    );

    if (!response.ok) throw new Error('Failed to mark message as read');
    return await response.json();
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
}

/**
 * Envoie une réaction emoji sur un message
 * POST /api/chats/:chatId/messages/:messageId/reaction
 *
 * @param chatId - ID du chat
 * @param messageId - ID du message
 * @param emoji - Emoji (chaîne vide pour supprimer)
 */
async sendReaction(chatId, messageId, emoji) {
  try {
    const response = await fetch(
      `${API_URL}/api/chats/${encodeURIComponent(chatId)}/messages/${messageId}/reaction`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ emoji })
      }
    );

    if (!response.ok) throw new Error('Failed to send reaction');
    return await response.json();
  } catch (error) {
    console.error('Error sending reaction:', error);
    throw error;
  }
}
```

---

## 3. Support Multi-Provider (X-Session-Id)

### Objectif

Permettre à la PWA de cibler un provider spécifique (Baileys ou Meta Cloud) quand les deux sont connectés simultanément.

### Modifications dans `src/services/whatsappApi.js`

```javascript
class WhatsAppApi {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.sessionId = null; // Nouveau: ID de session pour multi-provider
  }

  /**
   * Définit le provider à utiliser pour les requêtes
   * @param sessionId - 'baileys' | 'meta' | null (auto)
   */
  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  getHeaders() {
    const headers = {
      'Authorization': `Bearer ${this.token || localStorage.getItem('authToken')}`,
      'Content-Type': 'application/json'
    };

    // Ajouter X-Session-Id si défini
    if (this.sessionId) {
      headers['X-Session-Id'] = this.sessionId;
    }

    return headers;
  }

  // ... reste du code
}
```

### Où utiliser X-Session-Id

| Composant | Usage |
|-----------|-------|
| `SessionTabs.jsx` | Sélecteur de provider actif |
| `ProviderStatus.jsx` | Affichage état multi-provider |
| Toutes les requêtes API | Si l'utilisateur a sélectionné un provider spécifique |

---

## 4. Synchronisation des versions

### Problème actuel

- `package.json`: version `0.9.11`
- `Login.jsx`: affiche `v0.9.7`

### Solution

Modifier `Login.jsx` pour lire la version depuis `package.json`:

```javascript
// En haut du fichier
import packageJson from '../../package.json';

// Dans le rendu
<p>Powered by Homenichat v{packageJson.version}</p>
```

---

## 5. Composant UI: Reaction Picker (Optionnel)

### Nouveau composant suggéré

```jsx
// src/components/ReactionPicker.jsx
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function ReactionPicker({ onSelect, onClose }) {
  return (
    <div className="reaction-picker">
      {QUICK_REACTIONS.map(emoji => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="reaction-btn"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
```

### Intégration dans ChatWindow

- Long press sur un message → afficher ReactionPicker
- Appel `whatsappApi.sendReaction(chatId, messageId, emoji)`

---

## 6. Ordre d'implémentation recommandé

### Phase 1: Renommage (30 min)
1. `package.json` - name, description
2. `public/manifest.json` - name, short_name
3. `public/index.html` - tous les textes
4. `public/service-worker.js` - cache, notifications
5. Services (offlineQueue, notification, voip)
6. Composants UI

### Phase 2: API WhatsApp (15 min)
1. Ajouter `markMessageAsRead()` dans whatsappApi.js
2. Ajouter `sendReaction()` dans whatsappApi.js
3. Tester avec le backend

### Phase 3: Multi-Provider (30 min)
1. Ajouter `sessionId` et `setSessionId()` dans whatsappApi.js
2. Modifier `getHeaders()` pour inclure X-Session-Id
3. Mettre à jour `SessionTabs.jsx` pour utiliser setSessionId

### Phase 4: UI Réactions (optionnel, 1h)
1. Créer `ReactionPicker.jsx`
2. Modifier `ChatWindow.jsx` pour long-press → reactions
3. Gérer l'affichage des réactions sur les messages

---

## 7. Tests à effectuer après mise à jour

| Test | Endpoint | Résultat attendu |
|------|----------|------------------|
| Login | POST /api/auth/login | Token JWT |
| Liste chats | GET /api/chats | Array de chats |
| Messages | GET /api/chats/:id/messages | Array de messages |
| Envoi message | POST /api/chats/:id/messages | { success: true, messageId } |
| Mark read | POST /api/chats/:id/read | { success: true } |
| Mark message read | POST /api/chats/:id/messages/:mid/read | { success: true } |
| Réaction | POST /api/chats/:id/messages/:mid/reaction | { success: true } |
| Multi-provider | X-Session-Id: baileys | Requête routée vers Baileys |

---

## 8. Fichiers modifiés (résumé)

```
src/services/whatsappApi.js          # Nouvelles méthodes + X-Session-Id
src/components/Login.jsx             # Renommage + version dynamique
src/components/ChatList.jsx          # Renommage
src/components/ChatWindow.jsx        # Renommage + (optionnel) réactions
src/components/AdminPanelEnhanced.jsx # Renommage
src/services/offlineQueueService.js  # Renommage DB
src/services/notificationService.js  # Renommage tag
src/services/voip/VoIPService.js     # Renommage storage key
public/manifest.json                 # Renommage PWA
public/index.html                    # Renommage meta
public/service-worker.js             # Renommage cache
package.json                         # Renommage nom projet
```

---

*Document créé le 2026-01-14*
*Plan de mise à jour PWA Homenichat*
