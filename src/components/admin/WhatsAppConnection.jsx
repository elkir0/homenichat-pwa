import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid
} from '@mui/material';
import {
  QrCode2 as QrCodeIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  WhatsApp as WhatsAppIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import axios from 'axios';

function WhatsAppConnection() {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState('');
  const [qrDialog, setQrDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    loadConnectionStatus();
    // Vérifier le statut toutes les 5 secondes
    const interval = setInterval(loadConnectionStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConnectionStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('/api/providers/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const baileys = response.data.health?.baileys || {};
      setConnectionStatus(baileys.state || 'disconnected');
      setPhoneNumber(baileys.phoneNumber || '');
    } catch (error) {
      console.error('Error loading status:', error);
      setConnectionStatus('error');
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('authToken');
      
      // Démarrer la connexion
      await axios.post('/api/providers/connect/baileys', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Attendre un peu puis récupérer le QR code
      setTimeout(async () => {
        try {
          const qrResponse = await axios.get('/api/providers/qr/baileys', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (qrResponse.data.qrCode) {
            // Le QR code vient déjà en format data URL depuis Baileys
            setQrCode(qrResponse.data.qrCode);
            setQrDialog(true);
          }
        } catch (error) {
          setError('Impossible de récupérer le QR code');
        }
      }, 2000);
      
    } catch (error) {
      setError('Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      await axios.post('/api/providers/disconnect/baileys', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setConnectionStatus('disconnected');
      setPhoneNumber('');
    } catch (error) {
      setError('Erreur lors de la déconnexion');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'qr': return 'info';
      case 'disconnected': return 'default';
      default: return 'error';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected': return 'Connecté';
      case 'connecting': return 'Connexion en cours...';
      case 'qr': return 'En attente de scan QR';
      case 'disconnected': return 'Déconnecté';
      default: return 'Erreur';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return <CheckCircleIcon />;
      case 'connecting': return <CircularProgress size={20} />;
      case 'qr': return <QrCodeIcon />;
      default: return <ErrorIcon />;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Connexion WhatsApp
      </Typography>
      
      <Grid container spacing={3}>
        {/* Statut de connexion */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">
                  <WhatsAppIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  État de la connexion
                </Typography>
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={loadConnectionStatus}
                  size="small"
                >
                  Actualiser
                </Button>
              </Box>

              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Chip
                  icon={getStatusIcon(connectionStatus)}
                  label={getStatusText(connectionStatus)}
                  color={getStatusColor(connectionStatus)}
                  size="medium"
                />
                {phoneNumber && (
                  <Typography variant="body2" color="text.secondary">
                    Numéro: {phoneNumber}
                  </Typography>
                )}
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box display="flex" gap={2}>
                {connectionStatus === 'connected' ? (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<LogoutIcon />}
                    onClick={handleDisconnect}
                    disabled={loading}
                  >
                    Déconnecter
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <QrCodeIcon />}
                    onClick={handleConnect}
                    disabled={loading}
                  >
                    {loading ? 'Connexion...' : 'Se connecter'}
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Instructions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Comment se connecter ?
              </Typography>
              <Typography variant="body2" paragraph>
                1. Cliquez sur "Se connecter"
              </Typography>
              <Typography variant="body2" paragraph>
                2. Scannez le QR code avec votre téléphone
              </Typography>
              <Typography variant="body2" paragraph>
                3. Ouvrez WhatsApp → Plus d'options → Appareils liés
              </Typography>
              <Typography variant="body2">
                4. Scannez le code QR affiché
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog QR Code */}
      <Dialog 
        open={qrDialog} 
        onClose={() => setQrDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <QrCodeIcon sx={{ mr: 1 }} />
            Scanner ce QR Code avec WhatsApp
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box textAlign="center" p={2}>
            {qrCode ? (
              <img 
                src={qrCode} 
                alt="QR Code WhatsApp" 
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            ) : (
              <CircularProgress />
            )}
            <Typography variant="body2" color="text.secondary" mt={2}>
              Ouvrez WhatsApp sur votre téléphone et scannez ce code
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialog(false)}>
            Fermer
          </Button>
          <Button onClick={handleConnect} startIcon={<RefreshIcon />}>
            Nouveau QR Code
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default WhatsAppConnection;