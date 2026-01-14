// IMPORTANT: Charger les polyfills en premier
import './polyfills';

// Ensuite charger React et l'application
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';


// Marquer que React a commencé à se charger

// Service Worker registration avec gestion des mises à jour
// IMPORTANT: Nécessaire pour les push notifications !
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker enregistré avec succès');
        
        // Vérifier les mises à jour toutes les heures
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
        
        // Gérer les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // Nouvelle version disponible, proposer de recharger
              if (window.confirm('Une nouvelle version de l\'application est disponible. Voulez-vous recharger ?')) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch(error => {
        console.error('Erreur Service Worker:', error);
      });
  });
}

const rootElement = document.getElementById('root');

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
