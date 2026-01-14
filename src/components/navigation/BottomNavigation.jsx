import React from 'react';
import './BottomNavigation.css';

/**
 * BottomNavigation - Barre de navigation inférieure
 *
 * Trois onglets principaux:
 * - SMS: Messages SMS via SMS Bridge
 * - WhatsApp: Messages WhatsApp via Baileys
 * - Téléphone: Appels VoIP via WebRTC/Yeastar
 */
const BottomNavigation = ({ activeTab, onTabChange, badges = {} }) => {
  const tabs = [
    {
      id: 'sms',
      label: 'SMS',
      icon: 'chat',
      badge: badges.sms || 0
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: 'smartphone',
      badge: badges.whatsapp || 0
    },
    {
      id: 'phone',
      label: 'Téléphone',
      icon: 'call',
      badge: badges.phone || 0
    }
  ];

  return (
    <nav className="bottom-navigation">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-label={tab.label}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <div className="bottom-nav-icon-wrapper">
            <span className="material-icons bottom-nav-icon">
              {tab.icon}
            </span>
            {tab.badge > 0 && (
              <span className="bottom-nav-badge" aria-label={`${tab.badge} notifications`}>
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </div>
          <span className="bottom-nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNavigation;
