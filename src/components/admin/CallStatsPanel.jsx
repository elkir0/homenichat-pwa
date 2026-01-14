import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Phone as PhoneIcon,
  PhoneMissed as MissedIcon,
  PhoneCallback as AnsweredIcon,
  CallMade as OutgoingIcon,
  CallReceived as IncomingIcon,
  Timer as TimerIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';

/**
 * CallStatsPanel - Dashboard statistiques d'appels (Admin only)
 */
const CallStatsPanel = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(30); // Jours

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/calls/stats?days=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 403) {
        setError('Accès réservé aux administrateurs');
      } else {
        setError('Erreur lors du chargement des statistiques');
      }
    } catch (err) {
      console.error('Erreur fetch stats:', err);
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const formatTotalDuration = (seconds) => {
    if (!seconds) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const getAnswerRate = () => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.answered / stats.total) * 100);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
          <TrendingIcon color="primary" />
          <Typography variant="h6">Statistiques d'appels</Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Période</InputLabel>
            <Select
              value={period}
              label="Période"
              onChange={(e) => setPeriod(e.target.value)}
            >
              <MenuItem value={7}>7 jours</MenuItem>
              <MenuItem value={30}>30 jours</MenuItem>
              <MenuItem value={60}>60 jours</MenuItem>
              <MenuItem value={90}>90 jours</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Rafraîchir">
            <IconButton onClick={fetchStats} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Stats Cards */}
      <Grid container spacing={3}>
        {/* Total appels */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {stats?.total || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Appels totaux
                  </Typography>
                </Box>
                <PhoneIcon sx={{ fontSize: 48, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Appels répondus */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {stats?.answered || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Appels répondus ({getAnswerRate()}%)
                  </Typography>
                </Box>
                <AnsweredIcon sx={{ fontSize: 48, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Appels manqués */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {stats?.missed || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Appels manqués
                  </Typography>
                </Box>
                <MissedIcon sx={{ fontSize: 48, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Appels entrants */}
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <IncomingIcon color="info" />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {stats?.incoming || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Entrants
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Appels sortants */}
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <OutgoingIcon color="primary" />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {stats?.outgoing || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sortants
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Durée moyenne */}
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <TimerIcon color="warning" />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {formatDuration(stats?.avgDuration || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Durée moyenne
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Durée totale */}
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <TimerIcon color="secondary" />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {formatTotalDuration(stats?.totalDuration || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Temps total
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Info supplémentaire */}
      <Box mt={3} pt={2} borderTop={1} borderColor="divider">
        <Typography variant="caption" color="text.secondary">
          Statistiques des {period} derniers jours. Les données sont calculées à partir de l'historique partagé des appels.
        </Typography>
      </Box>
    </Paper>
  );
};

export default CallStatsPanel;
