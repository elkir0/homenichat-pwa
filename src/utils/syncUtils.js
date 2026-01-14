/**
 * Utilitaires pour la synchronisation différentielle
 */

/**
 * Compare deux listes de chats et retourne les changements
 */
export const diffChats = (oldChats, newChats) => {
  const changes = {
    added: [],
    updated: [],
    removed: []
  };

  // Créer des maps pour faciliter la comparaison
  const oldMap = new Map(oldChats.map(chat => [chat.id, chat]));
  const newMap = new Map(newChats.map(chat => [chat.id, chat]));

  // Trouver les ajouts et mises à jour
  newChats.forEach(newChat => {
    const oldChat = oldMap.get(newChat.id);
    if (!oldChat) {
      changes.added.push(newChat);
    } else if (hasChanged(oldChat, newChat)) {
      changes.updated.push(newChat);
    }
  });

  // Trouver les suppressions
  oldChats.forEach(oldChat => {
    if (!newMap.has(oldChat.id)) {
      changes.removed.push(oldChat);
    }
  });

  return changes;
};

/**
 * Vérifie si un chat a changé
 */
const hasChanged = (oldChat, newChat) => {
  return (
    oldChat.lastMessage !== newChat.lastMessage ||
    oldChat.timestamp !== newChat.timestamp ||
    oldChat.unreadCount !== newChat.unreadCount ||
    oldChat.isTyping !== newChat.isTyping ||
    oldChat.name !== newChat.name
  );
};

/**
 * Applique les changements à une liste de chats
 */
export const applyChanges = (currentChats, changes) => {
  let updatedChats = [...currentChats];

  // Retirer les chats supprimés
  if (changes.removed.length > 0) {
    const removedIds = new Set(changes.removed.map(chat => chat.id));
    updatedChats = updatedChats.filter(chat => !removedIds.has(chat.id));
  }

  // Mettre à jour les chats modifiés
  if (changes.updated.length > 0) {
    const updateMap = new Map(changes.updated.map(chat => [chat.id, chat]));
    updatedChats = updatedChats.map(chat => 
      updateMap.has(chat.id) ? updateMap.get(chat.id) : chat
    );
  }

  // Ajouter les nouveaux chats
  if (changes.added.length > 0) {
    updatedChats = [...updatedChats, ...changes.added];
  }

  // Trier par timestamp
  return updatedChats.sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * Compare deux listes de messages
 */
export const diffMessages = (oldMessages, newMessages) => {
  const oldIds = new Set(oldMessages.map(msg => msg.key?.id || msg.id));
  const newIds = new Set(newMessages.map(msg => msg.key?.id || msg.id));

  return {
    hasNewMessages: newMessages.some(msg => !oldIds.has(msg.key?.id || msg.id)),
    hasRemovedMessages: oldMessages.some(msg => !newIds.has(msg.key?.id || msg.id)),
    newCount: newMessages.length - oldMessages.length
  };
};

/**
 * Merge les messages sans dupliquer
 */
export const mergeMessages = (existingMessages, newMessages) => {
  const messageMap = new Map();
  
  // Ajouter les messages existants
  existingMessages.forEach(msg => {
    const id = msg.key?.id || msg.id;
    if (id) messageMap.set(id, msg);
  });
  
  // Ajouter/mettre à jour avec les nouveaux messages
  newMessages.forEach(msg => {
    const id = msg.key?.id || msg.id;
    if (id) messageMap.set(id, msg);
  });
  
  // Retourner un tableau trié
  return Array.from(messageMap.values()).sort((a, b) => {
    const aTime = a.messageTimestamp || a.timestamp || 0;
    const bTime = b.messageTimestamp || b.timestamp || 0;
    return aTime - bTime;
  });
};