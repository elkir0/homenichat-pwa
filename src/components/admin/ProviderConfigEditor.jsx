import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Tooltip,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  PowerSettingsNew as PowerIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import providerApi from '../../services/providerApi';

// Configuration des champs par type de provider
const PROVIDER_FIELDS = {
  // WhatsApp
  baileys: [
    { name: 'sessionName', label: 'Nom de session', type: 'text', required: true },
    { name: 'syncFullHistory', label: 'Sync historique complet', type: 'boolean' },
    { name: 'markOnlineOnConnect', label: 'Marquer en ligne', type: 'boolean' }
  ],
  meta_cloud: [
    { name: 'phone_number_id', label: 'Phone Number ID', type: 'text', required: true },
    { name: 'waba_id', label: 'WABA ID', type: 'text', required: true },
    { name: 'access_token', label: 'Access Token', type: 'secret', required: true },
    { name: 'verify_token', label: 'Verify Token', type: 'secret', required: true },
    { name: 'webhook_url', label: 'Webhook URL', type: 'text' }
  ],

  // SMS
  sms_bridge: [
    { name: 'apiUrl', label: 'URL API', type: 'text', required: true },
    { name: 'apiToken', label: 'Token API', type: 'secret', required: true },
    { name: 'syncIntervalMs', label: 'Intervalle sync (ms)', type: 'number', default: 30000 }
  ],
  ovh: [
    { name: 'endpoint', label: 'Endpoint', type: 'select', options: ['ovh-eu', 'ovh-us', 'ovh-ca'], required: true },
    { name: 'app_key', label: 'Application Key', type: 'text', required: true },
    { name: 'app_secret', label: 'Application Secret', type: 'secret', required: true },
    { name: 'consumer_key', label: 'Consumer Key', type: 'secret', required: true },
    { name: 'service_name', label: 'Nom du service SMS', type: 'text', required: true },
    { name: 'sender', label: 'Expéditeur', type: 'text' }
  ],
  twilio: [
    { name: 'account_sid', label: 'Account SID', type: 'text', required: true },
    { name: 'auth_token', label: 'Auth Token', type: 'secret', required: true },
    { name: 'from_number', label: 'Numéro expéditeur', type: 'text', required: true },
    { name: 'messaging_service_sid', label: 'Messaging Service SID', type: 'text' }
  ],
  plivo: [
    { name: 'auth_id', label: 'Auth ID', type: 'text', required: true },
    { name: 'auth_token', label: 'Auth Token', type: 'secret', required: true },
    { name: 'from_number', label: 'Numéro expéditeur', type: 'text', required: true }
  ],
  messagebird: [
    { name: 'access_key', label: 'Access Key', type: 'secret', required: true },
    { name: 'originator', label: 'Originator', type: 'text', required: true }
  ],
  vonage: [
    { name: 'api_key', label: 'API Key', type: 'text', required: true },
    { name: 'api_secret', label: 'API Secret', type: 'secret', required: true },
    { name: 'from_number', label: 'Numéro expéditeur', type: 'text', required: true }
  ],
  smpp: [
    { name: 'host', label: 'Hôte SMPP', type: 'text', required: true },
    { name: 'port', label: 'Port', type: 'number', default: 2775, required: true },
    { name: 'system_id', label: 'System ID', type: 'text', required: true },
    { name: 'password', label: 'Mot de passe', type: 'secret', required: true },
    { name: 'source_addr', label: 'Adresse source', type: 'text' }
  ],
  gammu: [
    { name: 'device', label: 'Device (ex: /dev/ttyUSB0)', type: 'text', required: true },
    { name: 'connection', label: 'Type connexion', type: 'select', options: ['at', 'at115200'], default: 'at' }
  ],

  // VoIP
  freepbx: [
    { name: 'ami_host', label: 'Hôte AMI', type: 'text', required: true },
    { name: 'ami_port', label: 'Port AMI', type: 'number', default: 5038, required: true },
    { name: 'ami_user', label: 'Utilisateur AMI', type: 'text', required: true },
    { name: 'ami_secret', label: 'Secret AMI', type: 'secret', required: true },
    { name: 'default_context', label: 'Contexte par défaut', type: 'text', default: 'from-internal' }
  ],
  generic_sip: [
    { name: 'server', label: 'Serveur SIP', type: 'text', required: true },
    { name: 'port', label: 'Port', type: 'number', default: 5060 },
    { name: 'transport', label: 'Transport', type: 'select', options: ['udp', 'tcp', 'tls', 'wss'], default: 'udp' },
    { name: 'domain', label: 'Domaine', type: 'text' },
    { name: 'username', label: 'Nom utilisateur', type: 'text', required: true },
    { name: 'password', label: 'Mot de passe', type: 'secret', required: true }
  ],
  ovh_trunk: [
    { name: 'sip_server', label: 'Serveur SIP', type: 'text', required: true },
    { name: 'sip_user', label: 'Utilisateur SIP', type: 'text', required: true },
    { name: 'sip_password', label: 'Mot de passe SIP', type: 'secret', required: true },
    { name: 'api_key', label: 'API Key OVH', type: 'secret' }
  ],
  twilio_voice: [
    { name: 'account_sid', label: 'Account SID', type: 'text', required: true },
    { name: 'auth_token', label: 'Auth Token', type: 'secret', required: true },
    { name: 'twiml_app_sid', label: 'TwiML App SID', type: 'text', required: true },
    { name: 'caller_id', label: 'Caller ID', type: 'text', required: true }
  ],
  telnyx: [
    { name: 'api_key', label: 'API Key', type: 'secret', required: true },
    { name: 'connection_id', label: 'Connection ID', type: 'text', required: true },
    { name: 'from_number', label: 'Numéro sortant', type: 'text', required: true }
  ]
};

const ProviderConfigEditor = ({ category }) => {
  const [providers, setProviders] = useState([]);
  const [providerTypes, setProviderTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Dialog pour ajout/édition
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' ou 'edit'
  const [editingProvider, setEditingProvider] = useState(null);
  const [formData, setFormData] = useState({});

  // Visibilité des secrets
  const [visibleSecrets, setVisibleSecrets] = useState({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [providersRes, typesRes] = await Promise.all([
        providerApi.getProvidersByType(category),
        providerApi.getProviderTypes()
      ]);

      setProviders(providersRes.providers || []);
      setProviderTypes(typesRes.types?.[category] || []);
    } catch (err) {
      console.error('Error loading providers:', err);
      setError('Impossible de charger les providers');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddClick = () => {
    setDialogMode('add');
    setEditingProvider(null);
    setFormData({
      id: '',
      type: providerTypes[0]?.type || '',
      enabled: false,
      config: {}
    });
    setDialogOpen(true);
  };

  const handleEditClick = (provider) => {
    setDialogMode('edit');
    setEditingProvider(provider);
    setFormData({
      id: provider.id,
      type: provider.type,
      enabled: provider.enabled,
      config: { ...provider.config }
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = async (provider) => {
    if (!window.confirm(`Supprimer le provider "${provider.id}" ?`)) return;

    try {
      setSaving(true);
      await providerApi.deleteProvider(category, provider.id);
      setSuccess(`Provider "${provider.id}" supprimé`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (provider) => {
    try {
      const result = await providerApi.toggleProvider(category, provider.id);
      setSuccess(`Provider "${provider.id}" ${result.enabled ? 'activé' : 'désactivé'}`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du toggle');
    }
  };

  const handleDialogSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (dialogMode === 'add') {
        await providerApi.addProvider(category, formData);
        setSuccess(`Provider "${formData.id}" ajouté`);
      } else {
        await providerApi.updateProvider(category, editingProvider.id, {
          enabled: formData.enabled,
          config: formData.config
        });
        setSuccess(`Provider "${editingProvider.id}" mis à jour`);
      }

      setDialogOpen(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value
      }
    }));
  };

  const toggleSecretVisibility = (field) => {
    setVisibleSecrets(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const renderConfigField = (field) => {
    const value = formData.config?.[field.name] || field.default || '';
    const isSecret = field.type === 'secret';
    const isVisible = visibleSecrets[field.name];

    if (field.type === 'boolean') {
      return (
        <FormControlLabel
          key={field.name}
          control={
            <Switch
              checked={!!formData.config?.[field.name]}
              onChange={(e) => handleConfigChange(field.name, e.target.checked)}
            />
          }
          label={field.label}
        />
      );
    }

    if (field.type === 'select') {
      return (
        <FormControl key={field.name} fullWidth margin="normal">
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={value}
            onChange={(e) => handleConfigChange(field.name, e.target.value)}
            label={field.label}
          >
            {field.options.map(opt => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    return (
      <TextField
        key={field.name}
        fullWidth
        margin="normal"
        label={field.label}
        type={isSecret && !isVisible ? 'password' : (field.type === 'number' ? 'number' : 'text')}
        value={value}
        onChange={(e) => handleConfigChange(field.name, field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
        required={field.required}
        placeholder={isSecret && value === '********' ? 'Masqué (inchangé)' : ''}
        InputProps={isSecret ? {
          endAdornment: (
            <IconButton onClick={() => toggleSecretVisibility(field.name)} edge="end">
              {isVisible ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </IconButton>
          )
        } : undefined}
      />
    );
  };

  const getStatusIcon = (provider) => {
    if (provider.status?.connected) {
      return <CheckCircleIcon color="success" fontSize="small" />;
    }
    if (provider.enabled) {
      return <WarningIcon color="warning" fontSize="small" />;
    }
    return <ErrorIcon color="disabled" fontSize="small" />;
  };

  const getProviderTypeName = (typeId) => {
    const type = providerTypes.find(t => t.type === typeId);
    return type?.name || typeId;
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
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Providers {category.toUpperCase()}
        </Typography>
        <Box>
          <Tooltip title="Rafraîchir">
            <IconButton onClick={loadData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
          >
            Ajouter
          </Button>
        </Box>
      </Box>

      {/* Alertes */}
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

      {/* Liste des providers */}
      {providers.length === 0 ? (
        <Alert severity="info">
          Aucun provider {category} configuré. Cliquez sur "Ajouter" pour en créer un.
        </Alert>
      ) : (
        providers.map(provider => (
          <Accordion key={provider.id} defaultExpanded={provider.enabled}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={2} width="100%">
                {getStatusIcon(provider)}
                <Typography sx={{ fontWeight: provider.enabled ? 'bold' : 'normal' }}>
                  {provider.id}
                </Typography>
                <Chip
                  label={getProviderTypeName(provider.type)}
                  size="small"
                  variant="outlined"
                />
                <Box sx={{ ml: 'auto', mr: 2 }}>
                  <Chip
                    label={provider.enabled ? 'Actif' : 'Inactif'}
                    color={provider.enabled ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {/* Config résumée */}
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Configuration
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    {Object.entries(provider.config || {}).map(([key, value]) => (
                      <Typography key={key} variant="body2" component="div">
                        <strong>{key}:</strong> {value === '********' ? '••••••••' : String(value)}
                      </Typography>
                    ))}
                  </Box>
                </Grid>

                {/* Actions */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      startIcon={<PowerIcon />}
                      onClick={() => handleToggle(provider)}
                      color={provider.enabled ? 'warning' : 'success'}
                    >
                      {provider.enabled ? 'Désactiver' : 'Activer'}
                    </Button>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditClick(provider)}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteClick(provider)}
                      color="error"
                    >
                      Supprimer
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* Dialog Add/Edit */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Ajouter un provider' : `Modifier ${editingProvider?.id}`}
        </DialogTitle>
        <DialogContent>
          {dialogMode === 'add' && (
            <>
              <TextField
                fullWidth
                margin="normal"
                label="ID du provider"
                value={formData.id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                helperText="Identifiant unique (lettres minuscules, chiffres, underscores)"
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Type de provider</InputLabel>
                <Select
                  value={formData.type || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value, config: {} }))}
                  label="Type de provider"
                >
                  {providerTypes.map(type => (
                    <MenuItem key={type.type} value={type.type}>
                      <Box>
                        <Typography>{type.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {type.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={formData.enabled || false}
                onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
              />
            }
            label="Activé"
            sx={{ mt: 2 }}
          />

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Configuration
          </Typography>

          {formData.type && PROVIDER_FIELDS[formData.type]?.map(field => renderConfigField(field))}

          {formData.type && !PROVIDER_FIELDS[formData.type] && (
            <Alert severity="info">
              Type de provider non reconnu. Configuration manuelle requise.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleDialogSave}
            variant="contained"
            disabled={saving || !formData.id || !formData.type}
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProviderConfigEditor;
