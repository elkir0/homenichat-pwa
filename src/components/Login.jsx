import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

// Fonction retry pour gérer les erreurs temporaires 502
const fetchWithRetry = async (url, options, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status !== 502 || i === maxRetries - 1) {
        return response;
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
    // Attendre avant de retry
    await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
  }
};

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetchWithRetry('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Stocker le token dans localStorage pour persistance
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Appeler la fonction onLogin avec les données utilisateur
        onLogin(data.token, data.user);

        // Rediriger vers l'application principale
        navigate('/');
      } else {
        setError(data.error || 'Erreur de connexion');
      }
    } catch (error) {
      console.error('Erreur connexion:', error);
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img
            src="/chirosteo-logo.png"
            alt="ChiroStéo"
            className="login-logo"
          />
          <h1>L'ekip-Chat</h1>
          <p>Connectez-vous pour continuer</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <input
              type="email"
              inputMode="email"
              placeholder="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="login-input"
              style={{ textTransform: 'none', color: '#333', WebkitTextFillColor: '#333' }}
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="login-input"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="login-button"
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="login-footer">
          <p>Powered by L'ekip-Chat v0.9.7</p>
        </div>
      </div>
    </div>
  );
}

export default Login;