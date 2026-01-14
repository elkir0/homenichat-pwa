import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PasswordChangeModal from './PasswordChangeModal';
import UserVoipModal from './UserVoipModal';
import './UserManagement.css';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Modals state
    const [passwordModal, setPasswordModal] = useState({ show: false, user: null });
    const [voipModal, setVoipModal] = useState({ show: false, user: null });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.get('/api/auth/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Erreur chargement utilisateurs:', error);
            setError('Impossible de charger les utilisateurs');
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (newUser.username.length < 3) {
            setError('Le nom d\'utilisateur doit contenir au moins 3 caractères');
            return;
        }
        if (newUser.password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            await axios.post('/api/auth/users', newUser, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess('Utilisateur créé avec succès');
            setNewUser({ username: '', password: '', role: 'user' });
            setShowAddForm(false);
            fetchUsers();
        } catch (error) {
            if (error.response?.data?.error) {
                setError(error.response.data.error);
            } else if (error.response?.data?.errors) {
                setError(error.response.data.errors.map(e => e.msg).join(', '));
            } else {
                setError('Erreur lors de la création');
            }
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (!window.confirm(`Voulez-vous vraiment supprimer l'utilisateur "${username}" ?`)) {
            return;
        }

        setError(null);
        setSuccess(null);

        try {
            const token = localStorage.getItem('authToken');
            await axios.delete(`/api/auth/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess('Utilisateur supprimé');
            fetchUsers();
        } catch (error) {
            if (error.response?.data?.error) {
                setError(error.response.data.error);
            } else {
                setError('Erreur lors de la suppression');
            }
        }
    };

    // Changer le rôle d'un utilisateur
    const handleRoleChange = async (userId, newRole) => {
        setError(null);
        setSuccess(null);

        try {
            const token = localStorage.getItem('authToken');
            await axios.put(`/api/auth/users/${userId}/role`, { role: newRole }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess('Rôle modifié avec succès');
            fetchUsers();
        } catch (error) {
            if (error.response?.data?.error) {
                setError(error.response.data.error);
            } else {
                setError('Erreur lors de la modification du rôle');
            }
        }
    };

    // Ouvrir modal mot de passe
    const openPasswordModal = (user) => {
        setPasswordModal({ show: true, user });
    };

    // Ouvrir modal VoIP
    const openVoipModal = (user) => {
        setVoipModal({ show: true, user });
    };

    // Callback succès depuis les modals
    const handleModalSuccess = (message) => {
        setSuccess(message);
        fetchUsers();
    };

    if (loading) {
        return <div className="user-management loading">Chargement...</div>;
    }

    return (
        <div className="user-management">
            <div className="user-management-header">
                <h2>Gestion des Utilisateurs</h2>
                <button
                    className="btn-add-user"
                    onClick={() => setShowAddForm(!showAddForm)}
                >
                    {showAddForm ? 'Annuler' : '+ Ajouter un utilisateur'}
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {showAddForm && (
                <form className="add-user-form" onSubmit={handleAddUser}>
                    <h3>Nouvel utilisateur</h3>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Nom d'utilisateur</label>
                            <input
                                type="text"
                                value={newUser.username}
                                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                placeholder="Minimum 3 caractères"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Mot de passe</label>
                            <input
                                type="password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                placeholder="Minimum 6 caractères"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Rôle</label>
                            <select
                                value={newUser.role}
                                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                            >
                                <option value="user">Utilisateur</option>
                                <option value="admin">Administrateur</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="btn-submit">Créer l'utilisateur</button>
                </form>
            )}

            <div className="users-list">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nom d'utilisateur</th>
                            <th>Rôle</th>
                            <th>Créé le</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.id}</td>
                                <td>
                                    <span className="username">{user.username}</span>
                                </td>
                                <td>
                                    <select
                                        className={`role-select ${user.role}`}
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    >
                                        <option value="user">Utilisateur</option>
                                        <option value="admin">Administrateur</option>
                                    </select>
                                </td>
                                <td>{new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            className="btn-action btn-password"
                                            onClick={() => openPasswordModal(user)}
                                            title="Changer le mot de passe"
                                        >
                                            <span className="material-icons">key</span>
                                        </button>
                                        <button
                                            className="btn-action btn-voip"
                                            onClick={() => openVoipModal(user)}
                                            title="Configuration VoIP"
                                        >
                                            <span className="material-icons">phone</span>
                                        </button>
                                        <button
                                            className="btn-action btn-delete"
                                            onClick={() => handleDeleteUser(user.id, user.username)}
                                            title="Supprimer"
                                        >
                                            <span className="material-icons">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {users.length === 0 && (
                    <div className="no-users">Aucun utilisateur trouvé</div>
                )}
            </div>

            {/* Modals */}
            {passwordModal.show && passwordModal.user && (
                <PasswordChangeModal
                    user={passwordModal.user}
                    onClose={() => setPasswordModal({ show: false, user: null })}
                    onSuccess={handleModalSuccess}
                />
            )}

            {voipModal.show && voipModal.user && (
                <UserVoipModal
                    user={voipModal.user}
                    onClose={() => setVoipModal({ show: false, user: null })}
                    onSuccess={handleModalSuccess}
                />
            )}
        </div>
    );
};

export default UserManagement;
