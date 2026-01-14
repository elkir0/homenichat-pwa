import React, { useState, useEffect, useCallback } from 'react';
import ringtoneService, { RingtoneService } from '../../../services/RingtoneService';
import './PhoneSettings.css';

/**
 * PhoneSettings - Paramètres utilisateur du module téléphone
 *
 * Paramètres disponibles:
 * - Gain micro (slider)
 * - Volume écouteur (slider)
 * - Suppression écho (toggle)
 * - Réduction bruit (toggle)
 * - Sonnerie (sélecteur)
 * - Vibration (toggle)
 * - Mode silencieux auto (toggle + heures)
 */

const STORAGE_KEY = 'lekip_phone_settings';

// Sonneries disponibles (générées via Web Audio API)
const RINGTONES = RingtoneService.getRingtoneList();

const DEFAULT_SETTINGS = {
  micGain: 100,
  speakerVolume: 80,
  echoCancellation: true,
  noiseReduction: true,
  ringtone: 'default',
  vibration: true,
  autoSilent: false,
  silentStartHour: 20,
  silentStartMinute: 0,
  silentEndHour: 8,
  silentEndMinute: 0,
};

const PhoneSettings = ({ isOpen, onClose, connectionInfo = {} }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [testingRingtone, setTestingRingtone] = useState(false);

  // Charger les paramètres depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (e) {
      console.warn('Erreur chargement paramètres téléphone:', e);
    }
  }, []);

  // Sauvegarder les paramètres
  const saveSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Erreur sauvegarde paramètres:', e);
    }
  }, []);

  // Mettre à jour un paramètre
  const updateSetting = useCallback((key, value) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  // Tester la sonnerie sélectionnée
  const testRingtone = useCallback(async () => {
    if (testingRingtone) {
      ringtoneService.stop();
      setTestingRingtone(false);
      return;
    }

    setTestingRingtone(true);
    ringtoneService.setVolume(settings.speakerVolume / 100);
    await ringtoneService.preview(settings.ringtone, 3000);
    setTestingRingtone(false);
  }, [settings.ringtone, settings.speakerVolume, testingRingtone]);

  // Nettoyer l'audio à la fermeture
  useEffect(() => {
    return () => {
      ringtoneService.stop();
    };
  }, []);

  // Formater l'heure
  const formatTime = (hour, minute) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="phone-settings-overlay" onClick={onClose}>
      <div className="phone-settings-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="phone-settings-header">
          <h2>Paramètres Téléphone</h2>
          <button className="close-btn" onClick={onClose} aria-label="Fermer">
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="phone-settings-content">
          {/* === SECTION: État de connexion === */}
          <div className="settings-section">
            <h3 className="settings-section-title">
              <span className="material-icons">wifi</span>
              État de connexion
            </h3>
            <div className="connection-status-card">
              <div className="connection-status-row">
                <span className="status-label">Statut</span>
                <span className={`status-value ${connectionInfo.isConnected ? 'connected' : 'disconnected'}`}>
                  <span className={`status-dot ${connectionInfo.isConnected ? 'connected' : 'disconnected'}`} />
                  {connectionInfo.isConnected ? 'Connecté' : 'Déconnecté'}
                </span>
              </div>
              {connectionInfo.server && (
                <div className="connection-status-row">
                  <span className="status-label">Serveur</span>
                  <span className="status-value">{connectionInfo.server}</span>
                </div>
              )}
              {connectionInfo.extension && (
                <div className="connection-status-row">
                  <span className="status-label">Extension</span>
                  <span className="status-value">{connectionInfo.extension}</span>
                </div>
              )}
              {connectionInfo.latency !== undefined && (
                <div className="connection-status-row">
                  <span className="status-label">Latence</span>
                  <span className="status-value">{connectionInfo.latency}ms</span>
                </div>
              )}
            </div>
          </div>

          {/* === SECTION: Audio === */}
          <div className="settings-section">
            <h3 className="settings-section-title">
              <span className="material-icons">volume_up</span>
              Audio
            </h3>

            {/* Gain micro */}
            <div className="setting-item">
              <div className="setting-label">
                <span className="material-icons">mic</span>
                <span>Gain microphone</span>
              </div>
              <div className="setting-control slider-control">
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={settings.micGain}
                  onChange={e => updateSetting('micGain', parseInt(e.target.value))}
                  className="settings-slider"
                />
                <span className="slider-value">{settings.micGain}%</span>
              </div>
            </div>

            {/* Volume écouteur */}
            <div className="setting-item">
              <div className="setting-label">
                <span className="material-icons">headphones</span>
                <span>Volume écouteur</span>
              </div>
              <div className="setting-control slider-control">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.speakerVolume}
                  onChange={e => updateSetting('speakerVolume', parseInt(e.target.value))}
                  className="settings-slider"
                />
                <span className="slider-value">{settings.speakerVolume}%</span>
              </div>
            </div>

            {/* Suppression écho */}
            <div className="setting-item">
              <div className="setting-label">
                <span className="material-icons">spatial_audio_off</span>
                <span>Suppression d'écho</span>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.echoCancellation}
                    onChange={e => updateSetting('echoCancellation', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            {/* Réduction bruit */}
            <div className="setting-item">
              <div className="setting-label">
                <span className="material-icons">noise_aware</span>
                <span>Réduction du bruit</span>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.noiseReduction}
                    onChange={e => updateSetting('noiseReduction', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* === SECTION: Notifications === */}
          <div className="settings-section">
            <h3 className="settings-section-title">
              <span className="material-icons">notifications</span>
              Notifications
            </h3>

            {/* Sonnerie */}
            <div className="setting-item">
              <div className="setting-label">
                <span className="material-icons">ring_volume</span>
                <span>Sonnerie</span>
              </div>
              <div className="setting-control ringtone-control">
                <select
                  value={settings.ringtone}
                  onChange={e => updateSetting('ringtone', e.target.value)}
                  className="settings-select"
                >
                  {RINGTONES.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <button
                  className={`test-ringtone-btn ${testingRingtone ? 'playing' : ''}`}
                  onClick={testRingtone}
                  aria-label={testingRingtone ? 'Arrêter' : 'Tester'}
                >
                  <span className="material-icons">
                    {testingRingtone ? 'stop' : 'play_arrow'}
                  </span>
                </button>
              </div>
            </div>

            {/* Vibration */}
            <div className="setting-item">
              <div className="setting-label">
                <span className="material-icons">vibration</span>
                <span>Vibration</span>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.vibration}
                    onChange={e => updateSetting('vibration', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* === SECTION: Mode silencieux === */}
          <div className="settings-section">
            <h3 className="settings-section-title">
              <span className="material-icons">do_not_disturb_on</span>
              Mode silencieux automatique
            </h3>

            {/* Toggle mode silencieux */}
            <div className="setting-item">
              <div className="setting-label">
                <span className="material-icons">schedule</span>
                <span>Activer automatiquement</span>
              </div>
              <div className="setting-control">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.autoSilent}
                    onChange={e => updateSetting('autoSilent', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            {/* Plage horaire */}
            {settings.autoSilent && (
              <div className="setting-item time-range">
                <div className="time-range-row">
                  <div className="time-input-group">
                    <label>De</label>
                    <input
                      type="time"
                      value={formatTime(settings.silentStartHour, settings.silentStartMinute)}
                      onChange={e => {
                        const [h, m] = e.target.value.split(':').map(Number);
                        updateSetting('silentStartHour', h);
                        updateSetting('silentStartMinute', m);
                      }}
                      className="time-input"
                    />
                  </div>
                  <span className="time-separator">→</span>
                  <div className="time-input-group">
                    <label>À</label>
                    <input
                      type="time"
                      value={formatTime(settings.silentEndHour, settings.silentEndMinute)}
                      onChange={e => {
                        const [h, m] = e.target.value.split(':').map(Number);
                        updateSetting('silentEndHour', h);
                        updateSetting('silentEndMinute', m);
                      }}
                      className="time-input"
                    />
                  </div>
                </div>
                <p className="time-hint">
                  Les appels seront silencieux de {formatTime(settings.silentStartHour, settings.silentStartMinute)} à {formatTime(settings.silentEndHour, settings.silentEndMinute)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="phone-settings-footer">
          <button className="reset-btn" onClick={() => saveSettings(DEFAULT_SETTINGS)}>
            <span className="material-icons">restart_alt</span>
            Réinitialiser
          </button>
          <button className="save-btn" onClick={onClose}>
            <span className="material-icons">check</span>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhoneSettings;

// Export pour utiliser les settings ailleurs
export const getPhoneSettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const isInSilentMode = () => {
  const settings = getPhoneSettings();
  if (!settings.autoSilent) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = settings.silentStartHour * 60 + settings.silentStartMinute;
  const endMinutes = settings.silentEndHour * 60 + settings.silentEndMinute;

  // Gère le cas où la plage traverse minuit
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
};
