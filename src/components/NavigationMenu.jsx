import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './NavigationMenu.css';

function NavigationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      <button
        className="menu-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="material-icons">menu</span>
      </button>

      {isOpen && (
        <>
          <div
            className="menu-overlay"
            onClick={() => setIsOpen(false)}
          />
          <div className="menu-drawer">
            <div className="menu-header">
              <h3>Menu</h3>
              <button
                className="close-button"
                onClick={() => setIsOpen(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="menu-user">
              <span className="material-icons">account_circle</span>
              <div>
                <div className="username">{user?.username}</div>
                <div className="role">{user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</div>
              </div>
            </div>

            <nav className="menu-nav">
              <button
                onClick={() => handleNavigate('/')}
                className="menu-item"
              >
                <span className="material-icons">chat</span>
                <span>Messages</span>
              </button>

              {isAdmin() && (
                <button
                  onClick={() => handleNavigate('/admin')}
                  className="menu-item"
                >
                  <span className="material-icons">admin_panel_settings</span>
                  <span>Administration</span>
                </button>
              )}

              <button
                onClick={() => handleNavigate('/change-password')}
                className="menu-item"
              >
                <span className="material-icons">lock</span>
                <span>Changer mot de passe</span>
              </button>

              <div className="menu-divider"></div>

              <button
                onClick={handleLogout}
                className="menu-item logout"
              >
                <span className="material-icons">logout</span>
                <span>Déconnexion</span>
              </button>
            </nav>
          </div>
        </>
      )}
    </>
  );
}

export default NavigationMenu;