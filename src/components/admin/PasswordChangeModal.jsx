import React, { useState } from 'react';
import axios from 'axios';
import './PasswordChangeModal.css';

/**
 * Modal pour changer le mot de passe d'un utilisateur (Admin)
 */
const PasswordChangeModal = ({ user, onClose, onSuccess }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (newPassword.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('authToken');
            await axios.put(`/api/auth/users/${user.id}/password`, {
                newPassword
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onSuccess('Mot de passe modifié avec succès');
            onClose();
        } catch (err) {
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else if (err.response?.data?.errors) {
                setError(err.response.data.errors.map(e => e.msg).join(', '));
            } else {
                setError('Erreur lors de la modification');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-content password-modal">
                <div className="modal-header">
                    <h3>Changer le mot de passe</h3>
                    <button className="modal-close" onClick={onClose}>
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <div className="modal-body">
                    <p className="modal-subtitle">
                        Utilisateur: <strong>{user.username}</strong>
                    </p>

                    {error && <div className="alert alert-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Nouveau mot de passe</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Minimum 6 caractères"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label>Confirmer le mot de passe</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Répéter le mot de passe"
                                required
                            />
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                className="btn-save"
                                disabled={loading}
                            >
                                {loading ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PasswordChangeModal;
