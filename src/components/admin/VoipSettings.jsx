import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    Grid,
    Alert,
    CircularProgress
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

function VoipSettings() {
    const [config, setConfig] = useState({
        server: '',
        domain: '',
        extension: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/admin/voip/config', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setConfig(data);
            } else {
                throw new Error('Impossible de charger la configuration');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setConfig({
            ...config,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(null);
        setError(null);

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/admin/voip/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                setSuccess('Configuration sauvegardée avec succès');
            } else {
                throw new Error('Erreur lors de la sauvegarde');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                Configuration WebRTC / VoIP
            </Typography>

            <Paper sx={{ p: 3 }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                {loading && !config.server ? (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Serveur SIP (WSS)"
                                    name="server"
                                    value={config.server || ''}
                                    onChange={handleChange}
                                    helperText="Ex: wss://192.168.1.15:8089/ws"
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Domaine SIP"
                                    name="domain"
                                    value={config.domain || ''}
                                    onChange={handleChange}
                                    helperText="Ex: 192.168.1.15"
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Extension / Utilisateur"
                                    name="extension"
                                    value={config.extension || ''}
                                    onChange={handleChange}
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Mot de passe SIP"
                                    name="password"
                                    type="password"
                                    value={config.password || ''}
                                    onChange={handleChange}
                                    variant="outlined"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    startIcon={<SaveIcon />}
                                    disabled={loading}
                                >
                                    Sauvegarder
                                </Button>
                            </Grid>
                        </Grid>
                    </form>
                )}
            </Paper>
        </Box>
    );
}

export default VoipSettings;
