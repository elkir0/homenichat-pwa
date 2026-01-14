import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge
} from '@mui/material';
import {
  People as PeopleIcon,
  Dashboard as DashboardIcon,
  ExitToApp as LogoutIcon,
  AccountCircle as AccountIcon,
  Notifications as NotificationsIcon,
  SettingsInputAntenna as AntennaIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import ProviderStatus from './admin/ProviderStatus';
import ProviderSettings from './admin/ProviderSettings';
import UserManagement from './admin/UserManagement';
import CallStatsPanel from './admin/CallStatsPanel';
import VoipSettings from './admin/VoipSettings';
import notificationService from '../services/notificationService';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ height: '100%' }}>
      {value === index && (
        <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function AdminPanelEnhanced() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);
  const [notifPermission, setNotifPermission] = useState(notificationService.getPermissionStatus());

  useEffect(() => {
    loadProviderStatus();
  }, []);

  const handleEnableNotifications = async () => {
    const permission = await notificationService.requestPermission();
    setNotifPermission(permission);
    if (permission === 'granted') {
      alert('Notifications activées !');
    } else if (permission === 'denied') {
      alert('Notifications refusées. Activez-les dans les réglages iOS.');
    }
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
      }
    } catch (error) {
      console.error('Erreur chargement statut:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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
            L'ekip-Chat Admin
          </Typography>

          {/* Indicateur de provider */}
          {providerStatus && (
            <Box sx={{ mr: 2 }}>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Provider : {providerStatus.activeProvider === 'baileys' ? 'WhatsApp (Baileys)' :
                  providerStatus.activeProvider === 'sms-bridge' ? 'SMS Bridge' :
                    providerStatus.activeProvider === 'meta' ? 'Meta Cloud API' :
                      providerStatus.activeProvider}
              </Typography>
            </Box>
          )}

          {/* Notifications - Cliquer pour activer */}
          <IconButton
            color="inherit"
            sx={{ mr: 1 }}
            onClick={handleEnableNotifications}
            title={notifPermission === 'granted' ? 'Notifications activées' : 'Cliquez pour activer les notifications'}
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

      {/* Tabs */}
      <Paper sx={{ borderRadius: 0 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab
            icon={<DashboardIcon />}
            label="Tableau de bord"
            iconPosition="start"
          />
          <Tab
            icon={<AntennaIcon />}
            label="Canaux WhatsApp / SMS"
            iconPosition="start"
          />
          <Tab
            icon={<PeopleIcon />}
            label="Utilisateurs"
            iconPosition="start"
          />
          <Tab
            icon={<AntennaIcon />} // Reusing icon or new one
            label="Configuration WebRTC"
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Contenu des tabs */}
      <Container
        maxWidth="xl"
        sx={{
          mt: 0,
          component: 'main',
          flexGrow: 1,
          p: 0,
          height: 'calc(100vh - 112px)',
          overflow: 'hidden'
        }}
      >
        {/* Tab 0: Dashboard (Vue d'ensemble) */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <ProviderStatus token={localStorage.getItem('authToken')} />
            <CallStatsPanel />
          </Box>
        </TabPanel>

        {/* Tab 1: Configuration Canaux (Fusionné) */}
        <TabPanel value={activeTab} index={1}>
          <ProviderSettings />
        </TabPanel>

        {/* Tab 2: Utilisateurs */}
        <TabPanel value={activeTab} index={2}>
          <UserManagement />
        </TabPanel>

        {/* Tab 3: Configuration WebRTC */}
        <TabPanel value={activeTab} index={3}>
          <VoipSettings />
        </TabPanel>
      </Container>
    </Box>
  );
}

export default AdminPanelEnhanced;