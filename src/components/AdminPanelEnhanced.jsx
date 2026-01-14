import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ExitToApp as LogoutIcon,
  AccountCircle as AccountIcon,
  Notifications as NotificationsIcon,
  Refresh as RefreshIcon,
  CheckCircle as ConnectedIcon,
  Cancel as DisconnectedIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import CallStatsPanel from './admin/CallStatsPanel';
import notificationService from '../services/notificationService';

/**
 * AdminPanelEnhanced - Panneau de statut simplifié
 *
 * La configuration se fait exclusivement via l'interface admin du backend
 * (http://server:3001/admin ou via le port configuré)
 *
 * Ce panneau affiche uniquement:
 * - Statut des providers (lecture seule)
 * - Statistiques d'appels
 */
function AdminPanelEnhanced() {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifPermission, setNotifPermission] = useState(notificationService.getPermissionStatus());

  useEffect(() => {
    loadProviderStatus();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadProviderStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleEnableNotifications = async () => {
    const permission = await notificationService.requestPermission();
    setNotifPermission(permission);
  };

  const loadProviderStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/providers/status', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProviderStatus(data);
        setError(null);
      } else {
        throw new Error('Impossible de charger le statut');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  const getStatusChip = (isConnected, label) => {
    return (
      <Chip
        icon={isConnected ? <ConnectedIcon /> : <DisconnectedIcon />}
        label={label}
        color={isConnected ? 'success' : 'default'}
        variant={isConnected ? 'filled' : 'outlined'}
        size="small"
      />
    );
  };

  return (
    <Box sx={{
      flexGrow: 1,
      bgcolor: 'background.default',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* AppBar */}
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Homenichat
          </Typography>

          {/* Rafraîchir */}
          <IconButton
            color="inherit"
            onClick={loadProviderStatus}
            title="Rafraîchir"
            sx={{ mr: 1 }}
          >
            <RefreshIcon />
          </IconButton>

          {/* Notifications */}
          <IconButton
            color="inherit"
            sx={{ mr: 1 }}
            onClick={handleEnableNotifications}
            title={notifPermission === 'granted' ? 'Notifications activées' : 'Activer les notifications'}
          >
            <Badge
              badgeContent={notifPermission === 'granted' ? '✓' : '!'}
              color={notifPermission === 'granted' ? 'success' : 'warning'}
            >
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* Menu utilisateur */}
          <Box>
            <IconButton
              onClick={handleMenuOpen}
              color="inherit"
              sx={{ ml: 1 }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark' }}>
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem disabled>
                <AccountIcon sx={{ mr: 1 }} />
                {user?.username}
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} />
                Déconnexion
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Contenu principal */}
      <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
        {/* Alerte info */}
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
          La configuration des providers se fait via l'interface admin du serveur.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {/* Statut des providers */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Statut des connexions
          </Typography>

          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : providerStatus ? (
            <Grid container spacing={2}>
              {/* Provider actif */}
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Provider actif
                </Typography>
                <Chip
                  label={
                    providerStatus.activeProvider === 'baileys' ? 'WhatsApp (Baileys)' :
                    providerStatus.activeProvider === 'meta' ? 'Meta Cloud API' :
                    providerStatus.activeProvider === 'sms-bridge' ? 'SMS Bridge' :
                    providerStatus.activeProvider || 'Aucun'
                  }
                  color="primary"
                  variant="filled"
                />
              </Grid>

              {/* Liste des providers */}
              {providerStatus.health?.providers && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                    Tous les providers
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {Object.entries(providerStatus.health.providers).map(([name, status]) => (
                      <Box key={name}>
                        {getStatusChip(
                          status.connected || status.isConnected,
                          name === 'baileys' ? 'Baileys' :
                          name === 'meta' ? 'Meta Cloud' :
                          name === 'sms-bridge' ? 'SMS' : name
                        )}
                      </Box>
                    ))}
                  </Box>
                </Grid>
              )}

              {/* Numéro connecté */}
              {providerStatus.health?.providers?.baileys?.phoneNumber && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    WhatsApp connecté: {providerStatus.health.providers.baileys.phoneNumber}
                  </Typography>
                </Grid>
              )}
            </Grid>
          ) : (
            <Typography color="text.secondary">
              Aucune information disponible
            </Typography>
          )}
        </Paper>

        {/* Statistiques d'appels */}
        <CallStatsPanel />
      </Box>
    </Box>
  );
}

export default AdminPanelEnhanced;
