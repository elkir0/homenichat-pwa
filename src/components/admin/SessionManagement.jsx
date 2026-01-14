import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  QrCode2 as QrCodeIcon,
  WhatsApp as WhatsAppIcon,
  Cloud as CloudIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import axios from 'axios';

function SessionManagement() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [qrDialog, setQrDialog] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [stats, setStats] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    providerType: 'baileys',
    phoneNumber: '',
    config: {}
  });

  useEffect(() => {
    loadSessions();
    loadStats();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await axios.get('/api/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(response.data.sessions);
    } catch (error) {
      showSnackbar('Erreur lors du chargement des sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('/api/sessions/stats/global', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleCreateOrUpdate = async () => {
    try {
      const token = localStorage.getItem('authToken');

      // Préparer la configuration selon le provider
      let config = {};
      if (formData.providerType === 'baileys') {
        config = {
          apiUrl: formData.baileysApiUrl || 'http://192.168.1.141:8080',
          apiKey: formData.baileysApiKey || '',
          instanceName: formData.instanceName || `instance-${Date.now()}`
        };
      } else if (formData.providerType === 'meta') {
        config = {
          accessToken: formData.metaAccessToken || '',
          phoneNumberId: formData.metaPhoneNumberId || '',
          businessAccountId: formData.metaBusinessAccountId || '',
          webhookVerifyToken: formData.metaWebhookToken || ''
        };
      }

      const payload = {
        name: formData.name,
        providerType: formData.providerType,
        phoneNumber: formData.phoneNumber,
        config
      };

      if (editMode && selectedSession) {
        await axios.put(`/api/sessions/${selectedSession.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Session mise à jour avec succès', 'success');
      } else {
        await axios.post('/api/sessions', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSnackbar('Session créée avec succès', 'success');
      }

      handleCloseDialog();
      loadSessions();
      loadStats();
    } catch (error) {
      showSnackbar('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette session ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Session supprimée avec succès', 'success');
      loadSessions();
      loadStats();
    } catch (error) {
      showSnackbar('Erreur lors de la suppression', 'error');
    }
  };

  const handleToggle = async (sessionId, currentEnabled) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.patch(`/api/sessions/${sessionId}/toggle`,
        { enabled: !currentEnabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadSessions();
    } catch (error) {
      showSnackbar('Erreur lors du changement d\'état', 'error');
    }
  };

  const handleActivate = async (sessionId) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`/api/sessions/${sessionId}/activate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSnackbar('Session activée', 'success');
      loadSessions();
    } catch (error) {
      showSnackbar('Erreur lors de l\'activation', 'error');
    }
  };

  const handleShowQR = async (sessionId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`/api/sessions/${sessionId}/qr`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQrCode(response.data.qrCode);
      setQrDialog(true);
    } catch (error) {
      showSnackbar('Erreur lors de la récupération du QR code', 'error');
    }
  };

  const handleEdit = (session) => {
    setSelectedSession(session);
    setEditMode(true);
    setFormData({
      name: session.name,
      providerType: session.providerType,
      phoneNumber: session.phoneNumber,
      ...session.config
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setSelectedSession(null);
    setFormData({
      name: '',
      providerType: 'baileys',
      phoneNumber: '',
      config: {}
    });
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getProviderIcon = (providerType) => {
    switch (providerType) {
      case 'baileys':
        return <WhatsAppIcon />;
      case 'meta':
        return <CloudIcon />;
      default:
        return null;
    }
  };

  const getStatusChip = (session) => {
    if (!session.enabled) {
      return <Chip size="small" label="Désactivé" />;
    }

    switch (session.state) {
      case 'connected':
        return <Chip size="small" icon={<CheckCircleIcon />} label="Connecté" color="success" />;
      case 'connecting':
        return <Chip size="small" icon={<CircularProgress size={14} />} label="Connexion..." color="warning" />;
      case 'error':
        return <Chip size="small" icon={<ErrorIcon />} label="Erreur" color="error" />;
      default:
        return <Chip size="small" icon={<WarningIcon />} label="Déconnecté" color="default" />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Gestion des Sessions WhatsApp
      </Typography>

      {/* Statistiques */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Sessions totales
                </Typography>
                <Typography variant="h4">
                  {stats.totalSessions}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Sessions actives
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.activeSessions}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  WhatsApp API
                </Typography>
                <Typography variant="h4">
                  {stats.providerBreakdown?.baileys || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Meta Cloud API
                </Typography>
                <Typography variant="h4">
                  {stats.providerBreakdown?.meta || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Actions */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton onClick={loadSessions}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Table des sessions */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Téléphone</TableCell>
              <TableCell>État</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Activée</TableCell>
              <TableCell>Créée le</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {session.name}
                    {session.isActive && (
                      <Chip size="small" label="Active" color="primary" />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getProviderIcon(session.providerType)}
                    {session.providerType}
                  </Box>
                </TableCell>
                <TableCell>{session.phoneNumber || '-'}</TableCell>
                <TableCell>{getStatusChip(session)}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant={session.isActive ? "contained" : "outlined"}
                    onClick={() => handleActivate(session.id)}
                    disabled={session.isActive}
                  >
                    {session.isActive ? 'Active' : 'Activer'}
                  </Button>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={session.enabled}
                    onChange={() => handleToggle(session.id, session.enabled)}
                  />
                </TableCell>
                <TableCell>
                  {new Date(session.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    {session.providerType === 'baileys' && session.enabled && (
                      <Tooltip title="Afficher QR Code">
                        <IconButton size="small" onClick={() => handleShowQR(session.id)}>
                          <QrCodeIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Modifier">
                      <IconButton size="small" onClick={() => handleEdit(session)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(session.id)}
                        disabled={session.isActive}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de création/édition */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Modifier la session' : 'Nouvelle session WhatsApp'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nom de la session"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Type de provider</InputLabel>
                <Select
                  value={formData.providerType}
                  onChange={(e) => setFormData({ ...formData, providerType: e.target.value })}
                  disabled={editMode}
                >
                  <MenuItem value="baileys">WhatsApp API</MenuItem>
                  <MenuItem value="meta">Meta Cloud API</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Numéro de téléphone"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+33612345678"
              />
            </Grid>

            {/* Configuration WhatsApp API */}
            {formData.providerType === 'baileys' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    Configuration WhatsApp API
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="URL de l'API"
                    value={formData.baileysApiUrl || ''}
                    onChange={(e) => setFormData({ ...formData, baileysApiUrl: e.target.value })}
                    placeholder="http://192.168.1.141:8080"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Clé API"
                    type="password"
                    value={formData.baileysApiKey || ''}
                    onChange={(e) => setFormData({ ...formData, baileysApiKey: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nom de l'instance"
                    value={formData.instanceName || ''}
                    onChange={(e) => setFormData({ ...formData, instanceName: e.target.value })}
                    placeholder="lekipchat-session1"
                  />
                </Grid>
              </>
            )}

            {/* Configuration Meta Cloud API */}
            {formData.providerType === 'meta' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    Configuration Meta Cloud API
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Token d'accès"
                    type="password"
                    value={formData.metaAccessToken || ''}
                    onChange={(e) => setFormData({ ...formData, metaAccessToken: e.target.value })}
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Phone Number ID"
                    value={formData.metaPhoneNumberId || ''}
                    onChange={(e) => setFormData({ ...formData, metaPhoneNumberId: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Business Account ID"
                    value={formData.metaBusinessAccountId || ''}
                    onChange={(e) => setFormData({ ...formData, metaBusinessAccountId: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Webhook Verify Token"
                    value={formData.metaWebhookToken || ''}
                    onChange={(e) => setFormData({ ...formData, metaWebhookToken: e.target.value })}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button
            onClick={handleCreateOrUpdate}
            variant="contained"
            disabled={!formData.name}
          >
            {editMode ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog QR Code */}
      <Dialog open={qrDialog} onClose={() => setQrDialog(false)}>
        <DialogTitle>QR Code WhatsApp</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center" p={2}>
            {qrCode ? (
              <img src={qrCode} alt="QR Code" style={{ maxWidth: '100%' }} />
            ) : (
              <CircularProgress />
            )}
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            Scannez ce QR code avec WhatsApp sur votre téléphone
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default SessionManagement;