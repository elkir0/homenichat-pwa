import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  SwapHoriz as SwapHorizIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import axios from 'axios';

const APIConfiguration = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showSecrets, setShowSecrets] = useState({});
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [message, setMessage] = useState(null);

  // Configuration WhatsApp API
  const [baileysConfig, setBaileysConfig] = useState({
    enabled: true,
    apiUrl: '',
    apiKey: '',
    instanceName: ''
  });

  // Configuration Meta Cloud API
  const [metaConfig, setMetaConfig] = useState({
    enabled: false,
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    webhookVerifyToken: '',
    appId: '',
    appSecret: ''
  });

  useEffect(() => {
    loadProviderStatus();
  }, []);

  const loadProviderStatus = async () => {
    try {
      setLoading(true);
      
      // Charger le statut
      const statusRes = await axios.get('/api/providers/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(statusRes.data);

      // Charger la configuration
      const configRes = await axios.get('/api/providers/config', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(configRes.data.config);
      
      // Mettre à jour les états locaux
      if (configRes.data.config.providers.baileys) {
        setBaileysConfig(configRes.data.config.providers.baileys);
      }
      if (configRes.data.config.providers.meta) {
        setMetaConfig(configRes.data.config.providers.meta);
      }
    } catch (error) {
      console.error('Erreur chargement config:', error);
      setMessage({
        type: 'error',
        text: 'Erreur lors du chargement de la configuration'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBaileys = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      await axios.put('/api/providers/config/baileys', baileysConfig, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({
        type: 'success',
        text: 'Configuration WhatsApp API sauvegardée'
      });
      
      loadProviderStatus();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Erreur lors de la sauvegarde'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMeta = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      await axios.put('/api/providers/config/meta', metaConfig, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({
        type: 'success',
        text: 'Configuration Meta Cloud API sauvegardée'
      });
      
      loadProviderStatus();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Erreur lors de la sauvegarde'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (provider) => {
    try {
      setTestResults(prev => ({ ...prev, [provider]: { testing: true } }));
      
      const response = await axios.post(`/api/providers/test/${provider}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          testing: false,
          success: response.data.success,
          message: response.data.message
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          testing: false,
          success: false,
          message: error.response?.data?.error || 'Test échoué'
        }
      }));
    }
  };

  const handleSwitchProvider = async (provider) => {
    try {
      setMessage(null);
      
      await axios.post('/api/providers/switch', { provider }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({
        type: 'success',
        text: `Basculé vers ${provider === 'baileys' ? 'WhatsApp API' : 'Meta Cloud API'}`
      });
      
      loadProviderStatus();
    } catch (error) {
      console.error('Erreur switch:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Erreur lors du basculement'
      });
    }
  };

  const toggleShowSecret = (field) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsIcon />
        Configuration des APIs WhatsApp (v0.9.02)
      </Typography>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      {/* Statut actuel */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Statut actuel
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography color="text.secondary">
                Provider actif :
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip
                  label={status?.activeProvider === 'baileys' ? 'WhatsApp API' : 'Meta Cloud API'}
                  color={status?.activeProvider ? 'primary' : 'default'}
                  icon={status?.activeProvider ? <CheckCircleIcon /> : <ErrorIcon />}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography color="text.secondary">
                État de connexion :
              </Typography>
              <Chip
                label={status?.health?.providers[status?.activeProvider]?.connected ? 'Connecté' : 'Déconnecté'}
                color={status?.health?.providers[status?.activeProvider]?.connected ? 'success' : 'error'}
                size="small"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs pour les providers */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="WhatsApp API" />
          <Tab label="Meta Cloud API" />
        </Tabs>

        {/* WhatsApp API Tab */}
        {activeTab === 0 && (
          <Box p={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={baileysConfig.enabled}
                  onChange={(e) => setBaileysConfig({
                    ...baileysConfig,
                    enabled: e.target.checked
                  })}
                />
              }
              label="Activer WhatsApp API"
              sx={{ mb: 3 }}
            />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="URL de l'API"
                  value={baileysConfig.apiUrl}
                  onChange={(e) => setBaileysConfig({
                    ...baileysConfig,
                    apiUrl: e.target.value
                  })}
                  placeholder="http://192.168.1.141:8080"
                  disabled={!baileysConfig.enabled}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Clé API"
                  type={showSecrets.baileysApiKey ? 'text' : 'password'}
                  value={baileysConfig.apiKey}
                  onChange={(e) => setBaileysConfig({
                    ...baileysConfig,
                    apiKey: e.target.value
                  })}
                  disabled={!baileysConfig.enabled}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => toggleShowSecret('baileysApiKey')}
                          edge="end"
                        >
                          {showSecrets.baileysApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nom de l'instance"
                  value={baileysConfig.instanceName}
                  onChange={(e) => setBaileysConfig({
                    ...baileysConfig,
                    instanceName: e.target.value
                  })}
                  placeholder="lekipchat"
                  disabled={!baileysConfig.enabled}
                />
              </Grid>
            </Grid>

            <Box mt={3} display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveBaileys}
                disabled={saving}
              >
                Sauvegarder
              </Button>
              
              <Button
                variant="outlined"
                startIcon={testResults.baileys?.testing ? <CircularProgress size={20} /> : <RefreshIcon />}
                onClick={() => handleTestConnection('baileys')}
                disabled={!baileysConfig.enabled || testResults.baileys?.testing}
              >
                Tester la connexion
              </Button>
              
              {status?.activeProvider !== 'baileys' && baileysConfig.enabled && (
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<SwapHorizIcon />}
                  onClick={() => handleSwitchProvider('baileys')}
                >
                  Activer ce provider
                </Button>
              )}
            </Box>

            {testResults.baileys && !testResults.baileys.testing && (
              <Alert
                severity={testResults.baileys.success ? 'success' : 'error'}
                sx={{ mt: 2 }}
              >
                {testResults.baileys.message}
              </Alert>
            )}
          </Box>
        )}

        {/* Meta Cloud API Tab */}
        {activeTab === 1 && (
          <Box p={3}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Pour utiliser WhatsApp Cloud API, vous devez créer une app Facebook et configurer WhatsApp Business.
                <br />
                Consultez la <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer">documentation officielle</a>.
              </Typography>
            </Alert>

            <FormControlLabel
              control={
                <Switch
                  checked={metaConfig.enabled}
                  onChange={(e) => setMetaConfig({
                    ...metaConfig,
                    enabled: e.target.checked
                  })}
                />
              }
              label="Activer Meta Cloud API"
              sx={{ mb: 3 }}
            />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Access Token"
                  type={showSecrets.metaAccessToken ? 'text' : 'password'}
                  value={metaConfig.accessToken}
                  onChange={(e) => setMetaConfig({
                    ...metaConfig,
                    accessToken: e.target.value
                  })}
                  disabled={!metaConfig.enabled}
                  helperText="Token d'accès permanent ou temporaire"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => toggleShowSecret('metaAccessToken')}
                          edge="end"
                        >
                          {showSecrets.metaAccessToken ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number ID"
                  value={metaConfig.phoneNumberId}
                  onChange={(e) => setMetaConfig({
                    ...metaConfig,
                    phoneNumberId: e.target.value
                  })}
                  disabled={!metaConfig.enabled}
                  helperText="ID du numéro WhatsApp Business"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Business Account ID"
                  value={metaConfig.businessAccountId}
                  onChange={(e) => setMetaConfig({
                    ...metaConfig,
                    businessAccountId: e.target.value
                  })}
                  disabled={!metaConfig.enabled}
                  helperText="ID du compte WhatsApp Business"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="App ID"
                  value={metaConfig.appId}
                  onChange={(e) => setMetaConfig({
                    ...metaConfig,
                    appId: e.target.value
                  })}
                  disabled={!metaConfig.enabled}
                  helperText="ID de votre app Facebook"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="App Secret"
                  type={showSecrets.metaAppSecret ? 'text' : 'password'}
                  value={metaConfig.appSecret}
                  onChange={(e) => setMetaConfig({
                    ...metaConfig,
                    appSecret: e.target.value
                  })}
                  disabled={!metaConfig.enabled}
                  helperText="Secret de votre app Facebook"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => toggleShowSecret('metaAppSecret')}
                          edge="end"
                        >
                          {showSecrets.metaAppSecret ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Webhook Verify Token"
                  value={metaConfig.webhookVerifyToken}
                  onChange={(e) => setMetaConfig({
                    ...metaConfig,
                    webhookVerifyToken: e.target.value
                  })}
                  disabled={!metaConfig.enabled}
                  helperText="Token de vérification pour les webhooks (à définir dans Facebook)"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" gutterBottom>
              Configuration Webhook
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                URL du webhook à configurer dans Facebook :
                <br />
                <code>{window.location.origin}/webhook/meta</code>
              </Typography>
            </Alert>

            <Box mt={3} display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveMeta}
                disabled={saving}
              >
                Sauvegarder
              </Button>
              
              <Button
                variant="outlined"
                startIcon={testResults.meta?.testing ? <CircularProgress size={20} /> : <RefreshIcon />}
                onClick={() => handleTestConnection('meta')}
                disabled={!metaConfig.enabled || testResults.meta?.testing}
              >
                Tester la connexion
              </Button>
              
              {status?.activeProvider !== 'meta' && metaConfig.enabled && (
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<SwapHorizIcon />}
                  onClick={() => handleSwitchProvider('meta')}
                >
                  Activer ce provider
                </Button>
              )}
            </Box>

            {testResults.meta && !testResults.meta.testing && (
              <Alert
                severity={testResults.meta.success ? 'success' : 'error'}
                sx={{ mt: 2 }}
              >
                {testResults.meta.message}
              </Alert>
            )}
          </Box>
        )}
      </Paper>

      {/* Informations supplémentaires */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Informations importantes
          </Typography>
          
          <List dense>
            <ListItem>
              <ListItemText
                primary="WhatsApp API"
                secondary="Solution open-source auto-hébergée, gratuite, connexion via QR code"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Meta Cloud API"
                secondary="Solution officielle Meta, payante à l'usage, nécessite validation business"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Basculement"
                secondary="Vous pouvez basculer entre les providers à tout moment sans perte de données"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Templates"
                secondary="Meta requiert l'utilisation de templates approuvés pour les messages initiaux"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default APIConfiguration;