import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UserVoipModal.css';

/**
 * Modal pour configurer le VoIP/WebRTC d'un utilisateur (Admin)
 *
 * Champs configurables:
 * - wssUrl: URL du serveur WebSocket (ex: wss://192.168.1.160:8089/ws)
 * - domain: Domaine SIP (ex: 192.168.1.160)
 * - extension: Numéro de poste (ex: 2001)
 * - password: Mot de passe SIP
 * - displayName: Nom affiché pour l'appelant
 */
const UserVoipModal = ({ user, onClose, onSuccess }) => {
    const [config, setConfig] = useState({
        enabled: false,
        wssUrl: '',
        domain: '',
        extension: '',
        password: '',
        displayName: ''
    });
    const [globalConfig, setGlobalConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Charger la config existante
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const token = localStorage.getItem('authToken');

                // Charger config user et config globale en parallèle
                const [userRes, globalRes] = await Promise.all([
                    axios.get(`/api/auth/users/${user.id}/voip`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get('/api/config/voip/global', {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                // Fusionner avec les valeurs par défaut
                setConfig({
                    enabled: userRes.data.enabled || false,
                    wssUrl: userRes.data.wssUrl || '',
                    domain: userRes.data.domain || '',
                    extension: userRes.data.extension || '',
                    password: userRes.data.password || '',
                    displayName: userRes.data.displayName || ''
                });
                setGlobalConfig(globalRes.data);
            } catch (err) {
                console.error('Erreur chargement config VoIP:', err);
                setError('Impossible de charger la configuration');
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, [user.id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validation si VoIP activé
        if (config.enabled) {
            if (!config.wssUrl) {
                setError('L\'URL WebSocket est requise');
                return;
            }
            if (!config.domain) {
                setError('Le domaine SIP est requis');
                return;
            }
            if (!config.extension) {
                setError('L\'extension est requise');
                return;
            }
            if (!config.password) {
                setError('Le mot de passe SIP est requis');
                return;
            }
        }

        setSaving(true);

        try {
            const token = localStorage.getItem('authToken');
            await axios.put(`/api/auth/users/${user.id}/voip`, config, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onSuccess('Configuration VoIP sauvegardée');
            onClose();
        } catch (err) {
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError('Erreur lors de la sauvegarde');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Pré-remplir avec les valeurs globales si disponibles
    const useGlobalDefaults = () => {
        if (globalConfig) {
            setConfig(prev => ({
                ...prev,
                wssUrl: prev.wssUrl || globalConfig.server || 'wss://192.168.1.160:8089/ws',
                domain: prev.domain || globalConfig.domain || '192.168.1.160'
            }));
        }
    };

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-content voip-modal voip-modal-large">
                <div className="modal-header">
                    <h3>Configuration VoIP / WebRTC</h3>
                    <button className="modal-close" onClick={onClose}>
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <div className="modal-body">
                    <p className="modal-subtitle">
                        Utilisateur: <strong>{user.username}</strong>
                    </p>

                    {error && <div className="alert alert-error">{error}</div>}

                    {loading ? (
                        <div className="loading-state">Chargement...</div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {/* Toggle VoIP activé */}
                            <div className="form-group toggle-group">
                                <label className="toggle-label">
                                    <span>VoIP activé</span>
                                    <div className="toggle-description">
                                        Active la téléphonie WebRTC pour cet utilisateur
                                    </div>
                                </label>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={config.enabled}
                                        onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            {/* Champs VoIP (désactivés si VoIP non activé) */}
                            <div className={`voip-fields ${!config.enabled ? 'disabled' : ''}`}>

                                {/* Section Serveur */}
                                <div className="voip-section">
                                    <h4 className="voip-section-title">
                                        <span className="material-icons">dns</span>
                                        Serveur WebRTC
                                    </h4>

                                    <div className="form-group">
                                        <label>URL WebSocket (WSS)</label>
                                        <input
                                            type="text"
                                            value={config.wssUrl}
                                            onChange={(e) => setConfig({ ...config, wssUrl: e.target.value })}
                                            placeholder="wss://192.168.1.160:8089/ws"
                                            disabled={!config.enabled}
                                        />
                                        <span className="field-hint">
                                            Ex: wss://192.168.1.160:8089/ws (interne) ou wss://rtc.example.com/ws (externe)
                                        </span>
                                    </div>

                                    <div className="form-group">
                                        <label>Domaine SIP</label>
                                        <input
                                            type="text"
                                            value={config.domain}
                                            onChange={(e) => setConfig({ ...config, domain: e.target.value })}
                                            placeholder="192.168.1.160"
                                            disabled={!config.enabled}
                                        />
                                        <span className="field-hint">
                                            IP ou domaine du serveur FreePBX/Asterisk
                                        </span>
                                    </div>

                                    {globalConfig && (
                                        <button
                                            type="button"
                                            className="btn-use-defaults"
                                            onClick={useGlobalDefaults}
                                            disabled={!config.enabled}
                                        >
                                            <span className="material-icons">content_copy</span>
                                            Utiliser les valeurs par défaut
                                        </button>
                                    )}
                                </div>

                                {/* Section Extension */}
                                <div className="voip-section">
                                    <h4 className="voip-section-title">
                                        <span className="material-icons">phone</span>
                                        Extension SIP
                                    </h4>

                                    <div className="form-row-2col">
                                        <div className="form-group">
                                            <label>Extension</label>
                                            <input
                                                type="text"
                                                value={config.extension}
                                                onChange={(e) => setConfig({ ...config, extension: e.target.value })}
                                                placeholder="2001"
                                                disabled={!config.enabled}
                                            />
                                            <span className="field-hint">Numéro de poste (ex: 2001)</span>
                                        </div>

                                        <div className="form-group">
                                            <label>Mot de passe SIP</label>
                                            <input
                                                type="password"
                                                value={config.password}
                                                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                                                placeholder="••••••••"
                                                disabled={!config.enabled}
                                            />
                                            <span className="field-hint">Secret SIP configuré dans FreePBX</span>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Nom affiché (Display Name)</label>
                                        <input
                                            type="text"
                                            value={config.displayName}
                                            onChange={(e) => setConfig({ ...config, displayName: e.target.value })}
                                            placeholder={`${user.username} PWA`}
                                            disabled={!config.enabled}
                                        />
                                        <span className="field-hint">
                                            Nom affiché lors des appels sortants
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={onClose}
                                    disabled={saving}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="btn-save"
                                    disabled={saving}
                                >
                                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserVoipModal;
