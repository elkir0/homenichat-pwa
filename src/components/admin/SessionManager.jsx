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
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Fab
} from '@mui/material';
import {
  QrCode2 as QrCodeIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  WhatsApp as WhatsAppIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Cloud as CloudIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import axios from 'axios';

function SessionManager() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [qrDialog, setQrDialog] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [currentQrSession, setCurrentQrSession] = useState(null);

  const [newSession, setNewSession] = useState({
    name: '',
    providerType: 'baileys',
    phoneNumber: '',
    metaConfig: {
      accessToken: '',
      phoneNumberId: '',
      businessAccountId: ''
    }
  });

  useEffect(() => {
    loadSessions();
    // Actualiser toutes les 10 secondes
    const interval = setInterval(loadSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    try {
      const token = localStorage.getItem('authToken');

      // Charger le statut général des providers
      const statusResponse = await axios.get('/api/providers/status', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Simuler des sessions basées sur les providers actifs
      const mockSessions = [];

      // Session Baileys (toujours présente)
      const baileysHealth = statusResponse.data.health?.providers?.baileys || {};
      const baileysProvider = statusResponse.data.providers?.baileys || {};
      mockSessions.push({
        id: 'baileys-1',
        name: 'WhatsApp Web',
        providerType: 'baileys',
        status: baileysHealth.state || 'disconnected',
        phoneNumber: baileysHealth.phoneNumber || '',
        isConnected: baileysHealth.connected || false
      });

      // Session Meta si configurée
      const metaHealth = statusResponse.data.health?.providers?.meta || {};
      const metaProvider = statusResponse.data.providers?.meta || {};
      if (metaProvider.enabled || metaHealth.connected) {
        mockSessions.push({
          id: 'meta-1',
          name: 'WhatsApp Business',
          providerType: 'meta',
          status: metaHealth.state || 'disconnected',
          phoneNumber: metaHealth.phoneNumber || '',
          isConnected: metaHealth.connected || false
        });
      }

      setSessions(mockSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setError('Erreur lors du chargement des sessions');
    }
  };

  const handleConnect = async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('authToken');

      if (session.providerType === 'baileys') {
        // Démarrer la connexion Baileys
        await axios.post('/api/providers/connect/baileys', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setCurrentQrSession(sessionId);

        // Attendre le QR code
        // Attendre le QR code avec polling (5 tentatives max)
        let attempts = 0;
        const maxAttempts = 15;

        const checkQR = async () => {
          try {
            const qrResponse = await axios.get('/api/providers/qr/baileys', {
              headers: { Authorization: `Bearer ${token}` }
            });

            if (qrResponse.data.qrCode) {
              setQrCode(qrResponse.data.qrCode);
              setQrDialog(true);
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(checkQR, 1000); // Réessayer dans 1s
            } else {
              setError('Le QR Code tarde à arriver. Vérifiez les logs ou réessayez.');
            }
          } catch (error) {
            if (attempts < maxAttempts) {
              attempts++;
              setTimeout(checkQR, 1000);
            } else {
              setError('Impossible de récupérer le QR code');
            }
          }
        };

        setCurrentQrSession(sessionId);
        setTimeout(checkQR, 1000);

      } else if (session.providerType === 'meta') {
        // Activer le provider Meta
        await axios.post('/api/providers/activate/meta', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

    } catch (error) {
      setError(`Erreur lors de la connexion: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      await axios.post(`/api/providers/deactivate/${session.providerType}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Recharger les sessions
      setTimeout(loadSessions, 1000);

    } catch (error) {
      setError(`Erreur lors de la déconnexion: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    // Pour l'instant, on ne fait que fermer le dialog
    // La création de vraies sessions multiples nécessiterait plus de backend
    setCreateDialog(false);
    setNewSession({
      name: '',
      providerType: 'baileys',
      phoneNumber: '',
      metaConfig: {
        accessToken: '',
        phoneNumberId: '',
        businessAccountId: ''
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'success';
      case 'connecting': case 'qr': return 'warning';
      case 'disconnected': return 'default';
      default: return 'error';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected': return 'Connecté';
      case 'connecting': return 'Connexion...';
      case 'qr': return 'QR Code';
      case 'disconnected': return 'Déconnecté';
      default: return 'Erreur';
    }
  };

  const getProviderIcon = (providerType) => {
    return providerType === 'baileys' ? <WhatsAppIcon /> : <CloudIcon />;
  };

  const canAddMore = sessions.length < 3;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Gestion des Sessions WhatsApp
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={loadSessions}
          variant="outlined"
        >
          Actualiser
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Liste des sessions */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Sessions actives ({sessions.length}/3)
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Téléphone</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {getProviderIcon(session.providerType)}
                        <Box ml={1}>
                          <Typography variant="body2" fontWeight="medium">
                            {session.name}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={session.providerType === 'baileys' ? 'WhatsApp Web' : 'Business API'}
                        size="small"
                        color={session.providerType === 'baileys' ? 'primary' : 'secondary'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(session.status)}
                        color={getStatusColor(session.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {session.phoneNumber ? (
                        <Box display="flex" alignItems="center">
                          <PhoneIcon fontSize="small" sx={{ mr: 0.5 }} />
                          {session.phoneNumber}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Non configuré
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        {session.isConnected ? (
                          <Tooltip title="Déconnecter">
                            <IconButton
                              color="error"
                              onClick={() => handleDisconnect(session.id)}
                              disabled={loading}
                              size="small"
                            >
                              <LogoutIcon />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Se connecter">
                            <IconButton
                              color="primary"
                              onClick={() => handleConnect(session.id)}
                              disabled={loading}
                              size="small"
                            >
                              {session.providerType === 'baileys' ? <QrCodeIcon /> : <CheckCircleIcon />}
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                WhatsApp Web (Baileys)
              </Typography>
              <Typography variant="body2" paragraph>
                • Gratuit et illimité
              </Typography>
              <Typography variant="body2" paragraph>
                • Connexion via QR code
              </Typography>
              <Typography variant="body2">
                • Nécessite un téléphone actif
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                WhatsApp Business API (Meta)
              </Typography>
              <Typography variant="body2" paragraph>
                • API officielle Meta
              </Typography>
              <Typography variant="body2" paragraph>
                • Payant à l'usage
              </Typography>
              <Typography variant="body2">
                • Nécessite validation business
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
            Scanner avec WhatsApp
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box textAlign="center" p={2}>
            {qrCode ? (
              <img
                src={qrCode}
                alt="QR Code WhatsApp"
                style={{ maxWidth: '100%', height: 'auto', maxHeight: '300px' }}
              />
            ) : (
              <CircularProgress />
            )}
            <Typography variant="body2" color="text.secondary" mt={2}>
              1. Ouvrez WhatsApp sur votre téléphone
              <br />
              2. Menu → Appareils liés
              <br />
              3. Scannez ce QR Code
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialog(false)}>
            Fermer
          </Button>
          <Button
            onClick={() => handleConnect(currentQrSession)}
            startIcon={<RefreshIcon />}
            disabled={loading}
          >
            Nouveau QR Code
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SessionManager;