import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Button,
  Alert,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  Sms as SmsIcon,
  Phone as PhoneIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  QrCode as QrCodeIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useWebSocket } from '../../hooks/useWebSocket';
import providerApi from '../../services/providerApi';
import ProviderConfigEditor from './ProviderConfigEditor';
import './ProviderSettings.css';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`provider-tabpanel-${index}`}
      aria-labelledby={`provider-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ProviderSettings = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // QR Code state for Baileys
  const [qrCode, setQrCode] = useState(null);
  const [connectionState, setConnectionState] = useState('unknown');

  // WebSocket for real-time QR updates
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = process.env.REACT_APP_WS_URL || `${wsProtocol}//${window.location.host}/ws`;
  const token = localStorage.getItem('authToken');
  const { lastMessage } = useWebSocket(wsUrl, token);

  useEffect(() => {
    loadStatus();
  }, []);

  // Handle WebSocket messages for QR Code
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'connection_update') {
      const data = lastMessage.data;
      const newStatus = data.status?.status || data.status?.state || 'connected';
      setConnectionState(newStatus);

      if (data.status?.qrCode) {
        setQrCode(data.status.qrCode);
      } else if (newStatus === 'connected') {
        setQrCode(null);
      }
    }
  }, [lastMessage]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await providerApi.getProvidersStatus();
      setStatus(response);

      // Set initial connection state from API
      const baileysHealth = response?.health?.providers?.baileys;
      if (baileysHealth) {
        if (baileysHealth.connected) {
          setConnectionState('connected');
        } else if (baileysHealth.state === 'connecting') {
          setConnectionState('connecting');
        } else {
          setConnectionState('disconnected');
        }
      }
    } catch (err) {
      console.error('Error loading status:', err);
      setError('Impossible de charger le statut');
    } finally {
      setLoading(false);
    }
  };

  const handleReloadConfig = async () => {
    try {
      setReloading(true);
      await providerApi.reloadConfig();
      setSuccess('Configuration rechargée avec succès');
      loadStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du rechargement');
    } finally {
      setReloading(false);
    }
  };

  const handleRequestQrCode = async () => {
    try {
      setConnectionState('connecting');
      setQrCode(null);
      await axios.post('/api/providers/connect/baileys', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Error requesting QR Code:', err);
      setConnectionState('disconnected');
      setError('Erreur lors de la demande de QR Code');
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Voulez-vous vraiment déconnecter WhatsApp ?')) return;

    try {
      await axios.post('/api/providers/disconnect/baileys', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConnectionState('disconnected');
      setQrCode(null);
      setSuccess('WhatsApp déconnecté');
    } catch (err) {
      setError('Erreur lors de la déconnexion');
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="provider-settings-container">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          Configuration des Canaux
        </Typography>
        <Box>
          <Tooltip title="Rafraîchir le statut">
            <IconButton onClick={loadStatus}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            onClick={handleReloadConfig}
            disabled={reloading}
            startIcon={reloading ? <CircularProgress size={20} /> : <RefreshIcon />}
          >
            Recharger Config YAML
          </Button>
        </Box>
      </Box>

      {/* Status banner */}
      {status && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.dark', color: 'white' }}>
          <Typography variant="h6">
            Provider Actif: <Chip label={status.activeProvider?.toUpperCase()} color="success" sx={{ ml: 1 }} />
          </Typography>
        </Paper>
      )}

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<WhatsAppIcon />}
            label="WhatsApp"
            iconPosition="start"
          />
          <Tab
            icon={<SmsIcon />}
            label="SMS"
            iconPosition="start"
          />
          <Tab
            icon={<PhoneIcon />}
            label="VoIP"
            iconPosition="start"
          />
        </Tabs>

        {/* WhatsApp Tab */}
        <TabPanel value={activeTab} index={0}>
          {/* Baileys QR Code Section */}
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QrCodeIcon />
              Connexion WhatsApp (Baileys)
            </Typography>

            <Box className="qr-section">
              <Box className="connection-status" display="flex" alignItems="center" gap={2}>
                <Box
                  className={`status-indicator ${connectionState}`}
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: connectionState === 'connected' ? 'success.main' :
                             connectionState === 'connecting' ? 'warning.main' : 'error.main'
                  }}
                />
                <Typography>
                  {connectionState === 'connected' && 'Connecté'}
                  {connectionState === 'connecting' && 'Connexion en cours...'}
                  {connectionState === 'disconnected' && 'Déconnecté'}
                  {connectionState === 'unknown' && 'Chargement...'}
                </Typography>

                <Box sx={{ ml: 'auto' }}>
                  {connectionState === 'connected' && (
                    <Button variant="outlined" color="warning" onClick={handleDisconnect}>
                      Déconnecter
                    </Button>
                  )}
                  {(connectionState === 'disconnected' || connectionState === 'unknown') && !qrCode && (
                    <Button variant="contained" onClick={handleRequestQrCode}>
                      Afficher QR Code
                    </Button>
                  )}
                </Box>
              </Box>

              {/* QR Code Display */}
              {(qrCode || connectionState === 'connecting') && connectionState !== 'connected' && (
                <Box className="qr-display" sx={{ mt: 3, textAlign: 'center' }}>
                  {qrCode ? (
                    <Box className="qr-code-container">
                      <img src={qrCode} alt="WhatsApp QR Code" style={{ maxWidth: 300 }} />
                      <Box sx={{ mt: 2, textAlign: 'left', maxWidth: 400, mx: 'auto' }}>
                        <Typography variant="subtitle2" gutterBottom>Pour connecter WhatsApp :</Typography>
                        <ol>
                          <li>Ouvrez WhatsApp sur votre téléphone</li>
                          <li>Allez dans <b>Réglages</b> → <b>Appareils connectés</b></li>
                          <li>Tapez sur <b>Connecter un appareil</b></li>
                          <li>Scannez ce code QR</li>
                        </ol>
                      </Box>
                    </Box>
                  ) : (
                    <Box>
                      <CircularProgress />
                      <Typography sx={{ mt: 2 }}>Génération du QR Code...</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </Paper>

          <Divider sx={{ my: 3 }} />

          {/* WhatsApp Providers Config */}
          <ProviderConfigEditor category="whatsapp" />
        </TabPanel>

        {/* SMS Tab */}
        <TabPanel value={activeTab} index={1}>
          <ProviderConfigEditor category="sms" />
        </TabPanel>

        {/* VoIP Tab */}
        <TabPanel value={activeTab} index={2}>
          <ProviderConfigEditor category="voip" />
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default ProviderSettings;
