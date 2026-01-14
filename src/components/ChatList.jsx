import React, { useState, useEffect } from 'react';
import './ChatList.css';
import VersionInfo from './VersionInfo';

function ChatList({ chats, selectedChat, onChatSelect, onRefresh, onNewChat }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState(chats);

  // Filtrer les chats selon la recherche uniquement
  // (le filtrage par source est fait dans App.jsx via la bottom navigation)
  useEffect(() => {
    let filtered = [...chats];

    // Filtre par recherche
    if (searchQuery) {
      filtered = filtered.filter(chat => {
        const nameMatch = chat.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const messageMatch = typeof chat.lastMessage === 'string' &&
          chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
        return nameMatch || messageMatch;
      });
    }

    // Tri par date décroissante
    filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    setFilteredChats(filtered);
  }, [searchQuery, chats]);

  // Formater le timestamp (identique)
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now - date;
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 48 * 60 * 60 * 1000) return 'Hier';
    if (diff < 7 * 24 * 60 * 60 * 1000) return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) return parts[0][0] + parts[1][0];
    return name.substring(0, 2);
  };

  const formatPhoneNumber = (number) => {
    if (!number) return '';
    // Si le numéro contient du texte (comme 'Via chiro...') on le retourne tel quel
    if (number.toString().match(/[a-z]/i) || number.includes('-')) return number;

    const phone = number.replace('@s.whatsapp.net', '');
    if (phone.startsWith('590')) return phone.replace(/(\d{3})(\d{3})(\d{2})(\d{2})(\d{2})/, '+$1 $2 $3 $4 $5');
    return '+' + phone;
  };

  return (
    <div className="chat-list">
      {/* Header avec gradient */}
      <div className="chat-list-header">
        <div className="header-gradient">
          <div className="header-top">
            <div className="app-branding">
              <img src="/logo-chirosteo.png" alt="ChiroStéo" className="chirosteo-logo" />
              <div className="app-info">
                <h1>Homenichat</h1>
                <span className="app-subtitle">ChiroStéo Guadeloupe</span>
              </div>
            </div>
            <div className="header-actions">
              <button className="btn btn-refresh" onClick={onRefresh} title="Rafraîchir">
                <span className="material-icons">refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="search-bar">
          <span className="material-icons">search</span>
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="btn clear-search" onClick={() => setSearchQuery('')}>
              <span className="material-icons">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Liste des conversations */}
      <div className="chat-list-content">
        {filteredChats.length === 0 ? (
          <div className="empty-state">
            <span className="material-icons">chat_bubble_outline</span>
            <p>Aucune conversation</p>
          </div>
        ) : (
          filteredChats.map(chat => (
            <div
              key={chat.id}
              className={`chat-item ${selectedChat?.id === chat.id ? 'selected' : ''} ripple`}
              onClick={() => onChatSelect(chat)}
            >
              <div className="avatar">
                {chat.profilePicture ? (
                  <img src={chat.profilePicture} alt={chat.name} />
                ) : (
                  <span>{getInitials(chat.name || formatPhoneNumber(chat.id))}</span>
                )}
                {/* Petit badge de source */}
                <span className={`source-badge ${chat.source || 'whatsapp'}`}>
                  {chat.source === 'sms' ? 'sms' : 'chat'}
                </span>
              </div>

              <div className="chat-info">
                <div className="chat-header">
                  <h3 className="chat-name truncate">
                    {chat.name || formatPhoneNumber(chat.id)}
                  </h3>
                  {chat.localPhoneNumber && (
                    <span className="local-number-badge" style={{ fontSize: '10px', color: '#666', display: 'block' }}>
                      Via {formatPhoneNumber(chat.localPhoneNumber)}
                    </span>
                  )}
                  <span className="chat-time">
                    {formatTimestamp(chat.timestamp)}
                  </span>
                </div>

                <div className="chat-preview">
                  <div className="chat-message truncate">
                    {chat.isTyping ? (
                      <span className="typing-indicator">
                        <span className="material-icons">edit</span>
                        En train d'écrire...
                      </span>
                    ) : (
                      typeof chat.lastMessage === 'string' ? chat.lastMessage : 'Aucun message'
                    )}
                  </div>

                  {chat.unreadCount > 0 && (
                    <span className="badge">{chat.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <VersionInfo />

      {/* Bouton nouvelle conversation */}
      <button
        className="fab btn-primary"
        title="Nouvelle conversation"
        onClick={onNewChat}
      >
        <span className="material-icons">chat</span>
      </button>
    </div>
  );
}

export default ChatList;