import React, { useEffect } from 'react';
import './Notification.css';

function Notification({ message, type = 'info', duration = 3000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };
  
  return (
    <div className={`notification ${type}`}>
      <span className="material-icons">{getIcon()}</span>
      <span className="notification-message">{message}</span>
      <button className="notification-close" onClick={onClose}>
        <span className="material-icons">close</span>
      </button>
    </div>
  );
}

export default Notification;