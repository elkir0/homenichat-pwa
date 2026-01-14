import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Tab,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  WhatsApp as WhatsAppIcon,
  Cloud as CloudIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import axios from 'axios';
import './SessionTabs.css';

function SessionTabs({ onSessionChange }) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    name: '',
    providerType: 'baileys',
    phoneNumber: '',
    config: {}
  });

  // Charger les sessions au montage
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('/api/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSessions(response.data.sessions);
      setActiveSessionId(response.data.activeSessionId);
      setLoading(false);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setLoading(false);
    }
  };

  const handleSessionChange = async (event, newValue) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`/api/sessions/${newValue}/activate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setActiveSessionId(newValue);
      if (onSessionChange) {
        onSessionChange(newValue);
      }
    } catch (error) {
      console.error('Error changing session:', error);
    }
  };

  const handleMenuOpen = (event, session) => {
    setAnchorEl(event.currentTarget);
    setSelectedSession(session);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSession(null);
  };

  const handleCreateSession = async () => {
    try {
      const token = localStorage.getItem('authToken');

      // Configuration spécifique selon le provider
      let config = {};
      if (newSession.providerType === 'baileys') {
        config = {
          apiUrl: process.env.REACT_APP_EVOLUTION_URL || 'http://192.168.1.141:8080',
          apiKey: newSession.baileysApiKey || '',
          instanceName: newSession.instanceName || `instance-${Date.now()}`
        };
      } else if (newSession.providerType === 'meta') {
        config = {
          accessToken: newSession.metaAccessToken || '',
          phoneNumberId: newSession.metaPhoneNumberId || '',
          businessAccountId: newSession.metaBusinessAccountId || ''
        };
      }

      await axios.post('/api/sessions', {
        name: newSession.name,
        providerType: newSession.providerType,
        phoneNumber: newSession.phoneNumber,
        config
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDialogOpen(false);
      setNewSession({
        name: '',
        providerType: 'baileys',
        phoneNumber: '',
        config: {}
      });
      loadSessions();
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSession) return;

    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`/api/sessions/${selectedSession.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      handleMenuClose();
      loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleToggleSession = async () => {
    if (!selectedSession) return;

    try {
      const token = localStorage.getItem('authToken');
      await axios.patch(`/api/sessions/${selectedSession.id}/toggle`, {
        enabled: !selectedSession.enabled
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      handleMenuClose();
      loadSessions();
    } catch (error) {
      console.error('Error toggling session:', error);
    }
  };

  const getSessionIcon = (session) => {
    if (session.providerType === 'baileys') {
      return <WhatsAppIcon />;
    } else if (session.providerType === 'meta') {
      return <CloudIcon />;
    }
    return null;
  };

  const getSessionStatus = (session) => {
    if (!session.enabled) {
      return <Chip size="small" label="Désactivé" color="default" />;
    }

    switch (session.state) {
      case 'connected':
        return <Chip size="small" icon={<CheckCircleIcon />} label="Connecté" color="success" />;
      case 'connecting':
        return <Chip size="small" icon={<CircularProgress size={16} />} label="Connexion..." color="warning" />;
      case 'error':
        return <Chip size="small" icon={<ErrorIcon />} label="Erreur" color="error" />;
      default:
        return <Chip size="small" label="Déconnecté" color="default" />;
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box className="session-tabs-container">
      <Tabs
        value={activeSessionId}
        onChange={handleSessionChange}
        variant="scrollable"
        scrollButtons="auto"
        className="session-tabs"
      >
        {sessions.map((session) => (
          <Tab
            key={session.id}
            value={session.id}
            label={
              <Box className="session-tab-content">
                <Box className="session-tab-header">
                  {getSessionIcon(session)}
                  <span className="session-name">{session.name}</span>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuOpen(e, session);
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box className="session-tab-info">
                  <span className="phone-number">{session.phoneNumber}</span>
                  {getSessionStatus(session)}
                </Box>
              </Box>
            }
            className={`session-tab ${!session.enabled ? 'disabled' : ''}`}
          />
        ))}


      </Tabs>

      {/* Menu contextuel */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleToggleSession}>
          {selectedSession?.enabled ? 'Désactiver' : 'Activer'}
        </MenuItem>
        <MenuItem onClick={() => {
          handleMenuClose();
          // Ouvrir dialog de configuration
        }}>
          <SettingsIcon fontSize="small" sx={{ mr: 1 }} />
          Configurer
        </MenuItem>
        <MenuItem onClick={handleDeleteSession} sx={{ color: 'error.main' }}>
          Supprimer
        </MenuItem>
      </Menu>

      {/* Dialog de création */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvelle session WhatsApp</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nom de la session"
            value={newSession.name}
            onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
            margin="normal"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Type de provider</InputLabel>
            <Select
              value={newSession.providerType}
              onChange={(e) => setNewSession({ ...newSession, providerType: e.target.value })}
            >
              <MenuItem value="baileys">WhatsApp API (WhatsApp Web)</MenuItem>
              <MenuItem value="meta">Meta Cloud API (Officiel)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Numéro de téléphone"
            value={newSession.phoneNumber}
            onChange={(e) => setNewSession({ ...newSession, phoneNumber: e.target.value })}
            margin="normal"
            placeholder="+33612345678"
          />

          {/* Champs spécifiques selon le provider */}
          {newSession.providerType === 'baileys' && (
            <>
              <TextField
                fullWidth
                label="Clé API WhatsApp"
                value={newSession.baileysApiKey || ''}
                onChange={(e) => setNewSession({ ...newSession, baileysApiKey: e.target.value })}
                margin="normal"
                type="password"
              />
              <TextField
                fullWidth
                label="Nom de l'instance"
                value={newSession.instanceName || ''}
                onChange={(e) => setNewSession({ ...newSession, instanceName: e.target.value })}
                margin="normal"
              />
            </>
          )}

          {newSession.providerType === 'meta' && (
            <>
              <TextField
                fullWidth
                label="Token d'accès Meta"
                value={newSession.metaAccessToken || ''}
                onChange={(e) => setNewSession({ ...newSession, metaAccessToken: e.target.value })}
                margin="normal"
                type="password"
              />
              <TextField
                fullWidth
                label="Phone Number ID"
                value={newSession.metaPhoneNumberId || ''}
                onChange={(e) => setNewSession({ ...newSession, metaPhoneNumberId: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Business Account ID"
                value={newSession.metaBusinessAccountId || ''}
                onChange={(e) => setNewSession({ ...newSession, metaBusinessAccountId: e.target.value })}
                margin="normal"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleCreateSession} variant="contained" color="primary">
            Créer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SessionTabs;