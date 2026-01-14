import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Paper,
  CircularProgress,
  Badge
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Speed as SpeedIcon,
  WhatsApp as WhatsAppIcon,
  Sms as SmsIcon,
  Phone as PhoneIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import providerApi from '../../services/providerApi';

const ProviderStatusDashboard = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [yamlConfig, setYamlConfig] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      if (autoRefresh) {
        loadData(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      const [statusRes, configRes] = await Promise.all([
        providerApi.getProvidersStatus(),
        providerApi.getYamlConfig().catch(() => null)
      ]);

      setStatus(statusRes);
      setYamlConfig(configRes);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'whatsapp': return <WhatsAppIcon />;
      case 'sms': return <SmsIcon />;
      case 'voip': return <PhoneIcon />;
      default: return <SettingsIcon />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'whatsapp': return '#25D366';
      case 'sms': return '#2196F3';
      case 'voip': return '#9C27B0';
      default: return '#757575';
    }
  };

  const getProviderDisplayName = (providerId, type) => {
    const names = {
      'baileys': 'WhatsApp QR (Baileys)',
      'meta_cloud': 'Meta Cloud API',
      'sms_bridge': 'SMS Bridge (SIP)',
      'ovh': 'OVH SMS',
      'twilio': 'Twilio',
      'plivo': 'Plivo',
      'messagebird': 'MessageBird',
      'vonage': 'Vonage (Nexmo)',
      'smpp': 'SMPP Gateway',
      'gammu': 'Gammu USB Modem',
      'freepbx': 'FreePBX/Asterisk',
      'generic_sip': 'SIP Générique',
      'ovh_trunk': 'OVH Trunk SIP',
      'twilio_voice': 'Twilio Voice',
      'telnyx': 'Telnyx'
    };
    return names[type] || providerId;
  };

  const getConnectionStatus = (providerId) => {
    const health = status?.health?.providers?.[providerId];
    if (health?.connected) return 'connected';
    if (health?.state === 'connecting') return 'connecting';
    return 'disconnected';
  };

  const countProviders = () => {
    if (!yamlConfig?.config?.providers) return { total: 0, enabled: 0, connected: 0 };

    let total = 0;
    let enabled = 0;
    let connected = 0;

    ['whatsapp', 'sms', 'voip'].forEach(category => {
      const providers = yamlConfig.config.providers[category] || [];
      total += providers.length;
      enabled += providers.filter(p => p.enabled).length;
      connected += providers.filter(p => getConnectionStatus(p.id) === 'connected').length;
    });

    return { total, enabled, connected };
  };

  const renderProviderCard = (provider, category) => {
    const connectionStatus = getConnectionStatus(provider.id);
    const isLegacyActive = status?.activeProvider === provider.id ||
                          (provider.id === 'baileys_debug' && status?.activeProvider === 'baileys');

    return (
      <Card
        key={provider.id}
        variant={isLegacyActive ? 'elevation' : 'outlined'}
        sx={{
          height: '100%',
          borderLeft: 4,
          borderLeftColor: provider.enabled ? getCategoryColor(category) : 'grey.400',
          opacity: provider.enabled ? 1 : 0.7
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            {getCategoryIcon(category)}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', flex: 1 }}>
              {provider.id}
            </Typography>
            {isLegacyActive && (
              <Chip label="ACTIF" size="small" color="primary" />
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            {getProviderDisplayName(provider.id, provider.type)}
          </Typography>

          <Box display="flex" gap={1} mt={2}>
            <Chip
              size="small"
              label={provider.enabled ? 'Activé' : 'Désactivé'}
              color={provider.enabled ? 'success' : 'default'}
              variant="outlined"
            />
            {provider.enabled && (
              <Chip
                size="small"
                icon={connectionStatus === 'connected' ? <LinkIcon /> : <LinkOffIcon />}
                label={connectionStatus === 'connected' ? 'Connecté' :
                       connectionStatus === 'connecting' ? 'Connexion...' : 'Déconnecté'}
                color={connectionStatus === 'connected' ? 'success' :
                       connectionStatus === 'connecting' ? 'warning' : 'error'}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight={300}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Chargement du dashboard...
        </Typography>
      </Box>
    );
  }

  if (!status) {
    return (
      <Alert severity="error">
        Impossible de charger le statut des providers
      </Alert>
    );
  }

  const counts = countProviders();

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SpeedIcon />
          Dashboard Multi-Provider
        </Typography>

        <Tooltip title="Rafraîchir">
          <IconButton onClick={() => loadData()} disabled={refreshing}>
            <RefreshIcon className={refreshing ? 'spinning' : ''} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Résumé global */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
            <Typography variant="h3" color="primary">{counts.total}</Typography>
            <Typography variant="body2" color="text.secondary">Providers configurés</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
            <Typography variant="h3" color="success.main">{counts.enabled}</Typography>
            <Typography variant="body2" color="text.secondary">Providers activés</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
            <Typography variant="h3" color="info.main">{counts.connected}</Typography>
            <Typography variant="body2" color="text.secondary">Providers connectés</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Provider actif legacy */}
      {status.activeProvider && (
        <Card sx={{ mb: 3, bgcolor: 'primary.dark', color: 'white' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Provider Actif (Legacy)
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              {getCategoryIcon('whatsapp')}
              <Typography variant="h4">
                {status.activeProvider.toUpperCase()}
              </Typography>
              <Chip
                icon={status.health?.providers?.[status.activeProvider]?.connected ? <LinkIcon /> : <LinkOffIcon />}
                label={status.health?.providers?.[status.activeProvider]?.connected ? 'Connecté' : 'Déconnecté'}
                color={status.health?.providers?.[status.activeProvider]?.connected ? 'success' : 'error'}
                sx={{ ml: 'auto' }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Providers par catégorie */}
      {['whatsapp', 'sms', 'voip'].map(category => {
        const providers = yamlConfig?.config?.providers?.[category] || [];

        if (providers.length === 0) return null;

        return (
          <Box key={category} sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Badge badgeContent={providers.length} color="primary">
                {getCategoryIcon(category)}
              </Badge>
              <span style={{ marginLeft: 8 }}>
                {category === 'whatsapp' ? 'WhatsApp' :
                 category === 'sms' ? 'SMS' : 'VoIP'}
              </span>
              <Chip
                size="small"
                label={`${providers.filter(p => p.enabled).length} actif(s)`}
                sx={{ ml: 'auto' }}
              />
            </Typography>

            <Grid container spacing={2}>
              {providers.map(provider => (
                <Grid item xs={12} sm={6} md={4} key={provider.id}>
                  {renderProviderCard(provider, category)}
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      })}

      {/* Message si aucun provider configuré via YAML */}
      {!yamlConfig && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Configuration YAML non disponible. Les providers sont gérés via l'ancienne configuration.
        </Alert>
      )}

      {/* Version info */}
      {yamlConfig?.version && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, textAlign: 'right' }}>
          Configuration v{yamlConfig.version} - Instance: {yamlConfig.instance || 'default'}
        </Typography>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </Box>
  );
};

export default ProviderStatusDashboard;
